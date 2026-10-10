"""Consent-based iMessage training session endpoints."""

from __future__ import annotations

import json
import hmac
import logging
import os
import re

import requests
from flask import Blueprint, jsonify, request

from services.debrief_service import build_debrief
from services.elevenlabs_chat_service import (
    ElevenLabsChatError,
    end_imessage_chat,
    get_imessage_chat_reply,
)
from services.imessage_agent_service import next_agent_message, opening_message, reveal_message
from services.memory_service import (
    claim_imessage_event,
    complete_participant_memory,
    create_session,
    deserialize_session,
    get_session,
    latest_active_session,
    participant_memory_for_session,
    save_session,
    set_elevenlabs_conversation,
    set_space,
)
from services.scenario_service import ScenarioNotFoundError, load_scenario

imessage_blueprint = Blueprint("imessage", __name__)
logger = logging.getLogger(__name__)

PHONE_PATTERN = re.compile(r"^\+[1-9]\d{7,14}$")
FIRST_NAME_PATTERN = re.compile(r"^[^\s].{0,49}$")


def _normalize_phone(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    phone = re.sub(r"[\s().-]", "", value)
    if not phone.startswith("+") and len(phone) == 10:
        phone = f"+1{phone}"
    return phone if PHONE_PATTERN.fullmatch(phone) else None


def _authorized_internal_request() -> bool:
    expected = os.getenv("NICE_TRY_INTERNAL_TOKEN")
    supplied = request.headers.get("Authorization", "").removeprefix("Bearer ")
    return bool(expected and supplied and hmac.compare_digest(supplied, expected))


@imessage_blueprint.post("/imessage/start")
def start_imessage_session():
    payload = request.get_json(silent=True) or {}
    phone_number = _normalize_phone(payload.get("phoneNumber"))
    first_name = payload.get("firstName")
    scenario_id = payload.get("scenarioId")
    consent = payload.get("consent") is True

    if not consent:
        return jsonify({"error": "Confirm that this is your number or you have permission"}), 400
    if phone_number is None:
        return jsonify({"error": "Enter a valid phone number, including country code"}), 400
    if not isinstance(first_name, str) or not FIRST_NAME_PATTERN.fullmatch(first_name.strip()):
        return jsonify({"error": "Enter a first name (50 characters or fewer)"}), 400
    if not isinstance(scenario_id, str):
        return jsonify({"error": "scenarioId is required"}), 400

    token = os.getenv("NICE_TRY_INTERNAL_TOKEN")
    if not token:
        return jsonify({"error": "Set NICE_TRY_INTERNAL_TOKEN in backend/.env"}), 503
    if not os.getenv("MEMORY_HASH_SECRET"):
        return jsonify({"error": "Set MEMORY_HASH_SECRET in backend/.env"}), 503

    if latest_active_session(phone_number) is not None:
        return jsonify({"error": "This number already has an active training session"}), 409

    try:
        scenario = load_scenario(scenario_id)
    except ScenarioNotFoundError:
        return jsonify({"error": "Unknown scenario"}), 404

    session_id, memory = create_session(phone_number, scenario_id)
    service_url = os.getenv("SPECTRUM_SERVICE_URL", "http://127.0.0.1:5051")

    try:
        response = requests.post(
            f"{service_url.rstrip('/')}/outreach",
            json={
                "sessionId": session_id,
                "firstName": first_name.strip(),
                "phoneNumber": phone_number,
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError) as error:
        save_session(session_id, status="failed", stage="consent", transcript=[])
        detail = "Spectrum service could not prepare the iMessage training"
        if getattr(error, "response", None) is not None:
            try:
                detail = error.response.json().get("error", detail)
            except ValueError:
                pass
        return jsonify({"error": detail}), 502

    opt_in_phone_number = result.get("optInPhoneNumber")
    if not isinstance(opt_in_phone_number, str) or not PHONE_PATTERN.fullmatch(opt_in_phone_number):
        save_session(session_id, status="failed", stage="consent", transcript=[])
        return jsonify({"error": "Photon did not return an assigned iMessage line"}), 502

    return jsonify(
        {
            "sessionId": session_id,
            "status": "pending",
            "maskedPhone": f"••• ••• {phone_number[-4:]}",
            "optInPhoneNumber": opt_in_phone_number,
            "memory": memory,
        }
    )


@imessage_blueprint.post("/imessage/event")
def receive_imessage_event():
    if not _authorized_internal_request():
        return jsonify({"error": "Unauthorized"}), 401
    if not os.getenv("MEMORY_HASH_SECRET"):
        return jsonify({"error": "Memory service is not configured"}), 503

    payload = request.get_json(silent=True) or {}
    phone_number = _normalize_phone(payload.get("phoneNumber"))
    incoming_text = payload.get("text")
    message_id = payload.get("messageId")
    if (
        phone_number is None
        or not isinstance(incoming_text, str)
        or not incoming_text.strip()
        or not isinstance(message_id, str)
        or not message_id
    ):
        return jsonify({"error": "messageId, phoneNumber, and text are required"}), 400

    session = latest_active_session(phone_number)
    if session is None:
        return jsonify({"reply": "No active Nice Try session. Start one from the web app."})

    if not claim_imessage_event(message_id):
        return jsonify({"duplicate": True})

    space_id = payload.get("spaceId")
    if isinstance(space_id, str) and space_id:
        set_space(session["id"], space_id)

    scenario = load_scenario(session["scenario_id"])
    transcript = json.loads(session["transcript_json"] or "[]")
    command = incoming_text.strip().upper()

    if command == "STOP":
        end_imessage_chat(session["id"])
        save_session(session["id"], status="cancelled", stage="complete", transcript=transcript)
        return jsonify({"reply": "Nice Try training stopped. No further messages will be sent."})

    if session["stage"] == "consent":
        if command != "START":
            return jsonify({"reply": "Reply START to begin the fictional training, or STOP to cancel."})
        memory = participant_memory_for_session(session)
        transcript.append({"role": "user", "text": "START"})
        starter = opening_message(scenario, memory)
        try:
            reply, conversation_id = get_imessage_chat_reply(
                session["id"],
                scenario,
                transcript[:-1],
                "START",
                first_message=starter,
            )
            set_elevenlabs_conversation(session["id"], conversation_id)
        except ElevenLabsChatError as error:
            logger.warning("ElevenLabs iMessage chat unavailable; using fallback: %s", error)
            reply = starter
        transcript.append({"role": "agent", "text": reply})
        save_session(session["id"], status="active", stage="scenario", transcript=transcript)
        return jsonify({"reply": reply})

    if command in {"REVEAL", "DEBRIEF"}:
        end_imessage_chat(session["id"])
        debrief = build_debrief(scenario, transcript)
        reply = reveal_message(debrief)
        transcript.append({"role": "agent", "text": reply})
        save_session(
            session["id"], status="complete", stage="complete", transcript=transcript, debrief=debrief
        )
        complete_participant_memory(session, debrief)
        return jsonify({"reply": reply})

    transcript.append({"role": "user", "text": incoming_text.strip()})
    try:
        reply, conversation_id = get_imessage_chat_reply(
            session["id"], scenario, transcript[:-1], incoming_text.strip()
        )
        set_elevenlabs_conversation(session["id"], conversation_id)
    except ElevenLabsChatError as error:
        logger.warning("ElevenLabs iMessage chat unavailable; using fallback: %s", error)
        reply = next_agent_message(scenario, transcript)
    transcript.append({"role": "agent", "text": reply})
    save_session(session["id"], status="active", stage="scenario", transcript=transcript)
    return jsonify({"reply": reply})


@imessage_blueprint.get("/imessage/session/<session_id>")
def imessage_session_status(session_id: str):
    if not re.fullmatch(r"[a-f0-9]{32}", session_id):
        return jsonify({"error": "Unknown session"}), 404
    session = get_session(session_id)
    if session is None:
        return jsonify({"error": "Unknown session"}), 404
    return jsonify(deserialize_session(session))
