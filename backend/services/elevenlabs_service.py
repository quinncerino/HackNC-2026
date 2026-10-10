"""Authenticated ElevenLabs API operations."""

import os

import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN_URL = "https://api.elevenlabs.io/v1/convai/conversation/token"


class ElevenLabsError(RuntimeError):
    """Raised when a conversation token cannot be created."""


def get_conversation_token() -> dict:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    agent_id = os.getenv("ELEVENLABS_AGENT_ID")

    if not api_key or not agent_id:
        raise ElevenLabsError(
            "Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in backend/.env"
        )

    try:
        response = requests.get(
            TOKEN_URL,
            params={"agent_id": agent_id},
            headers={"xi-api-key": api_key},
            timeout=15,
        )
        response.raise_for_status()
    except requests.RequestException as error:
        detail = "ElevenLabs did not return a conversation token"
        if error.response is not None:
            try:
                detail = error.response.json().get("detail", detail)
            except ValueError:
                pass
        raise ElevenLabsError(str(detail)) from error

    data = response.json()
    if not data.get("token"):
        raise ElevenLabsError("ElevenLabs returned a response without a token")
    return data
