"""In-memory store for fictional training codes."""

import secrets
import time

STORE_TTL_SECONDS = 15 * 60
_CODES: dict[str, dict[str, object]] = {}


def _purge_expired() -> None:
    now = time.time()
    expired = [
        session_id
        for session_id, entry in _CODES.items()
        if now - float(entry["created"]) > STORE_TTL_SECONDS
    ]
    for session_id in expired:
        _CODES.pop(session_id, None)


def create(phone: str) -> tuple[str, str]:
    """Create and return a new code for a participant phone number."""
    _purge_expired()
    session_id = secrets.token_urlsafe(16)
    code = f"{secrets.randbelow(10 ** 6):06d}"
    _CODES[session_id] = {"code": code, "phone": phone, "created": time.time()}
    return session_id, code


def get_code(session_id: str) -> str | None:
    """Look up a fictional training code by session id."""
    _purge_expired()
    entry = _CODES.get(session_id)
    if not entry:
        return None
    if time.time() - float(entry["created"]) > STORE_TTL_SECONDS:
        _CODES.pop(session_id, None)
        return None
    return str(entry["code"])


def discard(session_id: str) -> None:
    """Remove a stored code and phone pairing."""
    _CODES.pop(session_id, None)
