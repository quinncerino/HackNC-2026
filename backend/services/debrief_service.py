"""Deterministic starter analysis for a completed practice transcript."""

import re


def _user_turns(transcript: list[dict]) -> list[str]:
    return [
        str(turn.get("text", "")).strip()
        for turn in transcript
        if turn.get("role") == "user" and turn.get("text")
    ]


def _first_matching_turn(turns: list[str], terms: tuple[str, ...]) -> str | None:
    return next((turn for turn in turns if any(term in turn.lower() for term in terms)), None)


def build_debrief(scenario: dict, transcript: list[dict]) -> dict:
    turns = _user_turns(transcript)
    combined = " ".join(turns).lower()
    protective_actions: list[str] = []
    risky_actions: list[str] = []
    evidence: list[dict[str, str]] = []

    verification_terms = ("call back", "official number", "official website", "contact them", "in person")
    refusal_terms = ("no", "won't", "will not", "not giving", "refuse", "stop")

    verification_quote = _first_matching_turn(turns, verification_terms)
    if verification_quote:
        protective_actions.append("Chose to verify through an independent channel")
        evidence.append(
            {
                "quote": verification_quote,
                "explanation": "Independent verification prevents the caller from controlling the communication channel.",
            }
        )

    refusal_quote = _first_matching_turn(turns, refusal_terms)
    if refusal_quote:
        protective_actions.append("Refused or challenged the caller's request")
        evidence.append(
            {
                "quote": refusal_quote,
                "explanation": "Pausing or refusing creates time to verify the request safely.",
            }
        )

    if re.search(r"\b\d{6}\b", combined):
        risky_actions.append("Shared a six-digit code during the simulation")

    if not protective_actions:
        protective_actions.append("Completed the practice call and reviewed the warning signs")

    return {
        "tactics": scenario["tactics"],
        "protectiveActions": protective_actions,
        "riskyActions": risky_actions,
        "evidence": evidence[:2],
        "saferResponse": scenario["saferResponse"],
    }
