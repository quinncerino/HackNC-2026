"""Safe, deterministic scam-training dialogue for the iMessage MVP."""

from __future__ import annotations

import re


def opening_message(scenario: dict, memory: dict) -> str:
    variables = scenario["agentVariables"]
    previous = memory.get("sessionsCompleted", 0)
    memory_note = (
        f" You have completed {previous} earlier Nice Try practice session"
        f"{'s' if previous != 1 else ''}."
        if previous
        else ""
    )
    focus_areas = memory.get("focusAreas", [])
    focus_note = f" Your practice focus is: {focus_areas[0]}." if focus_areas else ""
    return (
        f"SIMULATION START — {scenario['title']}."
        f"{memory_note}{focus_note}\n\n"
        f"Hello, this is {variables['caller_identity']}. "
        f"We're contacting you because {variables['fictional_problem']}. "
        f"We need you to {variables['requested_action']} right away."
    )


def next_agent_message(scenario: dict, transcript: list[dict]) -> str:
    user_turns = [turn["text"] for turn in transcript if turn.get("role") == "user"]
    latest = user_turns[-1].lower() if user_turns else ""
    variables = scenario["agentVariables"]

    if any(term in latest for term in ("official", "call back", "website", "in person", "verify")):
        return (
            "There is no time to use another channel—the issue must be handled in this chat. "
            f"Please {variables['requested_action']} now."
        )
    if any(term in latest for term in ("no", "won't", "will not", "refuse", "stop")):
        return (
            "I understand your hesitation, but delaying could make the situation worse. "
            "Are you sure you want to refuse the request?"
        )
    if re.search(r"\b\d{6}\b", latest):
        return (
            "I received that practice code. In a real interaction, a legitimate organization "
            "should not pressure you to share a verification code. Text REVEAL for your debrief."
        )
    if len(user_turns) >= 4:
        return (
            "This is the final moment of the simulation. Would you comply, verify independently, "
            "or end the conversation? Text REVEAL when you want the debrief."
        )
    return (
        "I need a decision immediately. If you do not act now, you may lose access or face a "
        "larger problem. What are you going to do?"
    )


def reveal_message(debrief: dict) -> str:
    strengths = debrief.get("protectiveActions") or ["You completed the simulation"]
    risks = debrief.get("riskyActions") or []
    lines = [
        "SIMULATION REVEALED — Nice Try. This was fictional scam-resistance training.",
        "",
        f"What you did well: {strengths[0]}",
    ]
    if risks:
        lines.append(f"Watch next time: {risks[0]}")
    lines.extend(("", f"Safer response: “{debrief['saferResponse']}”"))
    return "\n".join(lines)
