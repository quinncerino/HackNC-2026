"""Twilio SMS routes for fictional training-code delivery."""

import re
import time

from flask import Blueprint, current_app, jsonify, request
from twilio.base.exceptions import TwilioRestException

from services import code_store
from services.twilio_service import send_sms

sms_bp = Blueprint("sms", __name__)
E164 = re.compile(r"^\+[1-9]\d{7,14}$")
RATE_LIMIT_SECONDS = 30
PHONE_REQUESTS: dict[str, float] = {}


@sms_bp.post("/sms/code")
def send_training_code():
    payload = request.get_json(silent=True) or {}
    phone = str(payload.get("phone", "")).strip()
    consent = payload.get("consent")

    if not E164.fullmatch(phone) or consent is not True:
        return jsonify({"error": "Valid phone number and consent required"}), 400

    now = time.time()
    previous = PHONE_REQUESTS.get(phone)
    if previous is not None and now - previous < RATE_LIMIT_SECONDS:
        return jsonify({"error": "Please wait before requesting another training code."}), 429

    session_id, _ = code_store.create(phone)
    # Twilio trial accounts require a predefined template name here.
    # The template sends Twilio's sample 2FA message, not this app's code.
    body = "sms_2fa"

    try:
        send_sms(phone, body)
    except TwilioRestException as error:
        current_app.logger.exception("Twilio training-code SMS failed")
        code_store.discard(session_id)
        return jsonify({
            "error": f"The training code could not be texted. Twilio error {error.code}: {error.msg}"
        }), 502
    except Exception as error:
        current_app.logger.exception("Training-code SMS failed unexpectedly")
        code_store.discard(session_id)
        return jsonify({"error": f"Training SMS failed ({type(error).__name__}). Check the backend terminal."}), 502

    PHONE_REQUESTS[phone] = now
    return jsonify({"session_id": session_id})


