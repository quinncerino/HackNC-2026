"""Persistent, privacy-conscious memory for iMessage training sessions."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

DATA_DIRECTORY = Path(__file__).resolve().parent.parent / "data"
DATABASE_PATH = DATA_DIRECTORY / "nice_try.db"


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _connect() -> sqlite3.Connection:
    DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS participants (
            phone_hash TEXT PRIMARY KEY,
            phone_last_four TEXT NOT NULL,
            sessions_completed INTEGER NOT NULL DEFAULT 0,
            strengths_json TEXT NOT NULL DEFAULT '[]',
            risks_json TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS imessage_sessions (
            id TEXT PRIMARY KEY,
            phone_hash TEXT NOT NULL,
            scenario_id TEXT NOT NULL,
            space_id TEXT,
            status TEXT NOT NULL,
            stage TEXT NOT NULL,
            transcript_json TEXT NOT NULL DEFAULT '[]',
            debrief_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (phone_hash) REFERENCES participants(phone_hash)
        );

        CREATE INDEX IF NOT EXISTS idx_imessage_sessions_phone_status
        ON imessage_sessions(phone_hash, status, updated_at);

        CREATE TABLE IF NOT EXISTS processed_imessage_events (
            message_id TEXT PRIMARY KEY,
            processed_at TEXT NOT NULL
        );
        """
    )
    columns = {row["name"] for row in connection.execute("PRAGMA table_info(imessage_sessions)")}
    if "elevenlabs_conversation_id" not in columns:
        connection.execute(
            "ALTER TABLE imessage_sessions ADD COLUMN elevenlabs_conversation_id TEXT"
        )
    return connection


@contextmanager
def _database():
    connection = _connect()
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def phone_hash(phone_number: str) -> str:
    secret = os.getenv("MEMORY_HASH_SECRET")
    if not secret:
        raise RuntimeError("Set MEMORY_HASH_SECRET in backend/.env")
    return hmac.new(secret.encode(), phone_number.encode(), hashlib.sha256).hexdigest()


def _json_list(value: str | None) -> list[str]:
    parsed = json.loads(value or "[]")
    return [str(item) for item in parsed] if isinstance(parsed, list) else []


def _unique(items: list[str]) -> list[str]:
    return list(dict.fromkeys(item for item in items if item))


def create_session(phone_number: str, scenario_id: str) -> tuple[str, dict]:
    participant_key = phone_hash(phone_number)
    session_id = uuid4().hex
    timestamp = _now()

    with _database() as connection:
        connection.execute(
            """
            INSERT INTO participants (phone_hash, phone_last_four, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(phone_hash) DO UPDATE SET updated_at = excluded.updated_at
            """,
            (participant_key, phone_number[-4:], timestamp),
        )
        participant = connection.execute(
            "SELECT * FROM participants WHERE phone_hash = ?", (participant_key,)
        ).fetchone()
        connection.execute(
            """
            INSERT INTO imessage_sessions
                (id, phone_hash, scenario_id, status, stage, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', 'consent', ?, ?)
            """,
            (session_id, participant_key, scenario_id, timestamp, timestamp),
        )

    return session_id, participant_summary(participant)


def participant_summary(row: sqlite3.Row | None) -> dict:
    if row is None:
        return {"sessionsCompleted": 0, "strengths": [], "focusAreas": []}
    return {
        "sessionsCompleted": int(row["sessions_completed"]),
        "strengths": _json_list(row["strengths_json"]),
        "focusAreas": _json_list(row["risks_json"]),
    }


def participant_memory_for_session(session: dict) -> dict:
    with _database() as connection:
        participant = connection.execute(
            "SELECT * FROM participants WHERE phone_hash = ?", (session["phone_hash"],)
        ).fetchone()
    return participant_summary(participant)


def set_space(session_id: str, space_id: str | None) -> None:
    with _database() as connection:
        connection.execute(
            "UPDATE imessage_sessions SET space_id = ?, updated_at = ? WHERE id = ?",
            (space_id, _now(), session_id),
        )


def set_elevenlabs_conversation(session_id: str, conversation_id: str) -> None:
    with _database() as connection:
        connection.execute(
            """
            UPDATE imessage_sessions
            SET elevenlabs_conversation_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (conversation_id, _now(), session_id),
        )


def latest_active_session(phone_number: str) -> dict | None:
    with _database() as connection:
        row = connection.execute(
            """
            SELECT * FROM imessage_sessions
            WHERE phone_hash = ? AND status IN ('pending', 'active')
            ORDER BY updated_at DESC LIMIT 1
            """,
            (phone_hash(phone_number),),
        ).fetchone()
    return dict(row) if row else None


def get_session(session_id: str) -> dict | None:
    with _database() as connection:
        row = connection.execute(
            "SELECT * FROM imessage_sessions WHERE id = ?", (session_id,)
        ).fetchone()
    return dict(row) if row else None


def claim_imessage_event(message_id: str) -> bool:
    """Atomically claim an inbound message so only one listener can reply."""
    with _database() as connection:
        cursor = connection.execute(
            "INSERT OR IGNORE INTO processed_imessage_events (message_id, processed_at) VALUES (?, ?)",
            (message_id, _now()),
        )
    return cursor.rowcount == 1


def save_session(
    session_id: str,
    *,
    status: str,
    stage: str,
    transcript: list[dict],
    debrief: dict | None = None,
) -> None:
    with _database() as connection:
        connection.execute(
            """
            UPDATE imessage_sessions
            SET status = ?, stage = ?, transcript_json = ?, debrief_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                status,
                stage,
                json.dumps(transcript),
                json.dumps(debrief) if debrief else None,
                _now(),
                session_id,
            ),
        )


def complete_participant_memory(session: dict, debrief: dict) -> None:
    participant_key = session["phone_hash"]
    with _database() as connection:
        participant = connection.execute(
            "SELECT * FROM participants WHERE phone_hash = ?", (participant_key,)
        ).fetchone()
        if participant is None:
            return

        strengths = _unique(
            _json_list(participant["strengths_json"])
            + list(debrief.get("protectiveActions", []))
        )[-6:]
        risks = _unique(
            _json_list(participant["risks_json"]) + list(debrief.get("riskyActions", []))
        )[-6:]
        connection.execute(
            """
            UPDATE participants
            SET sessions_completed = sessions_completed + 1,
                strengths_json = ?, risks_json = ?, updated_at = ?
            WHERE phone_hash = ?
            """,
            (json.dumps(strengths), json.dumps(risks), _now(), participant_key),
        )


def deserialize_session(session: dict) -> dict:
    return {
        "id": session["id"],
        "scenarioId": session["scenario_id"],
        "status": session["status"],
        "stage": session["stage"],
        "transcript": json.loads(session["transcript_json"] or "[]"),
        "debrief": json.loads(session["debrief_json"]) if session["debrief_json"] else None,
        "elevenlabsConversationId": session.get("elevenlabs_conversation_id"),
    }
