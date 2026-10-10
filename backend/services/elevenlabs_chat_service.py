"""Stateful ElevenLabs Chat Mode conversations for the iMessage transport."""

from __future__ import annotations

import os
import queue
import threading
import time
from dataclasses import dataclass

import certifi
from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation, ConversationInitiationData


class ElevenLabsChatError(RuntimeError):
    """Raised when a text conversation cannot start or return a response."""


@dataclass
class _ChatSession:
    conversation: Conversation
    responses: queue.Queue[str]
    turn_lock: threading.Lock
    conversation_id: str


_sessions: dict[str, _ChatSession] = {}
_sessions_lock = threading.Lock()

# Framework-installed Python builds on macOS don't always inherit the system CA store.
os.environ.setdefault("SSL_CERT_FILE", certifi.where())


def _transcript_context(transcript: list[dict]) -> str:
    lines = ["Continue this existing iMessage simulation from the transcript below."]
    for turn in transcript[-12:]:
        role = "Participant" if turn.get("role") == "user" else "Agent"
        text = str(turn.get("text", "")).strip()[:800]
        if text:
            lines.append(f"{role}: {text}")
    return "\n".join(lines)


def _wait_until_ready(conversation: Conversation, timeout: float = 12.0) -> str:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        conversation_id = getattr(conversation, "_conversation_id", None)
        websocket = getattr(conversation, "_ws", None)
        if conversation_id and websocket is not None:
            return str(conversation_id)
        thread = getattr(conversation, "_thread", None)
        if thread is not None and not thread.is_alive():
            raise ElevenLabsChatError("ElevenLabs Chat Mode connection closed during startup")
        time.sleep(0.05)
    conversation.end_session()
    raise ElevenLabsChatError("ElevenLabs Chat Mode did not connect in time")


def _create_session(
    session_id: str,
    scenario: dict,
    transcript: list[dict],
    first_message: str | None,
) -> _ChatSession:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    agent_id = os.getenv(scenario["agentEnvVar"])
    if not api_key or not agent_id:
        raise ElevenLabsChatError("ElevenLabs iMessage chat is not configured")

    responses: queue.Queue[str] = queue.Queue()
    config = ConversationInitiationData(
        conversation_config_override={"conversation": {"text_only": True}},
        dynamic_variables={**scenario["agentVariables"], "channel": "imessage"},
        user_id=f"nice-try-{session_id}",
    )
    conversation = Conversation(
        ElevenLabs(api_key=api_key),
        agent_id,
        user_id=f"nice-try-{session_id}",
        requires_auth=True,
        audio_interface=None,
        config=config,
        callback_agent_response=lambda response: responses.put(response),
    )
    conversation.start_session()
    conversation_id = _wait_until_ready(conversation)

    chat = _ChatSession(
        conversation=conversation,
        responses=responses,
        turn_lock=threading.Lock(),
        conversation_id=conversation_id,
    )
    if transcript and not first_message:
        # A recovered connection may emit the configured greeting before context arrives.
        # Consume it so it cannot be mistaken for the reply to the participant's next text.
        try:
            responses.get(timeout=3.0)
        except queue.Empty:
            pass
        conversation.send_contextual_update(_transcript_context(transcript))
    return chat


def _session_for(
    session_id: str,
    scenario: dict,
    transcript: list[dict],
    first_message: str | None,
) -> tuple[_ChatSession, bool]:
    with _sessions_lock:
        existing = _sessions.get(session_id)
        if existing:
            return existing, False
        created = _create_session(session_id, scenario, transcript, first_message)
        _sessions[session_id] = created
        return created, True


def get_imessage_chat_reply(
    session_id: str,
    scenario: dict,
    transcript: list[dict],
    user_text: str,
    *,
    first_message: str | None = None,
    timeout: float = 25.0,
) -> tuple[str, str]:
    """Send one iMessage turn through ElevenLabs and wait for its text response."""
    try:
        chat, created = _session_for(session_id, scenario, transcript, first_message)
        with chat.turn_lock:
            if created and first_message:
                try:
                    return chat.responses.get(timeout=8.0), chat.conversation_id
                except queue.Empty:
                    pass

            while True:
                try:
                    chat.responses.get_nowait()
                except queue.Empty:
                    break

            chat.conversation.send_user_message(user_text)
            try:
                response = chat.responses.get(timeout=timeout)
            except queue.Empty as error:
                raise ElevenLabsChatError("ElevenLabs agent did not respond in time") from error
            if not response.strip():
                raise ElevenLabsChatError("ElevenLabs returned an empty agent response")
            return response.strip(), chat.conversation_id
    except ElevenLabsChatError:
        end_imessage_chat(session_id)
        raise
    except Exception as error:
        end_imessage_chat(session_id)
        raise ElevenLabsChatError(str(error)) from error


def end_imessage_chat(session_id: str) -> None:
    with _sessions_lock:
        chat = _sessions.pop(session_id, None)
    if chat:
        chat.conversation.end_session()
