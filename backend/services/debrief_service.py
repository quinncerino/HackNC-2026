"""Rule-based feedback for a completed practice transcript."""

import re


def _strip_tone_markers(text: str) -> str:
    text = re.sub(r"\[[A-Za-z]+\]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _get_turns(transcript: list[dict], role: str) -> list[str]:
    return [
        cleaned
        for turn in transcript
        if turn.get("role") == role and turn.get("text")
        if (cleaned := _strip_tone_markers(str(turn["text"])))
    ]


def _matches(text: str, pattern: str) -> bool:
    return bool(re.search(pattern, text, re.IGNORECASE))


def build_debrief(scenario: dict, transcript: list[dict]) -> dict:
    user_turns = _get_turns(transcript, "user")
    protective_actions = []
    risky_actions = []
    evidence = []

    def add_evidence(quote: str, explanation: str) -> None:
        item = {"quote": quote, "explanation": explanation}
        if item not in evidence:
            evidence.append(item)

    verification_pattern = (
        r"\b(?:call back|official number|official website|"
        r"number on (?:my|the) card|contact (?:my|the) bank|"
        r"verify independently|check independently|in person)\b"
    )

    verification_quote = next(
        (
            turn for turn in user_turns
            if _matches(turn, verification_pattern)
            and not _matches(
                turn,
                r"\b(?:won['’]t|will not|can['’]t|cannot|"
                r"don['’]t|do not|not going to)\b",
            )
        ),
        None,
    )

    if verification_quote:
        description = (
            "You mentioned checking through a separate channel. "
            "Using contact information you choose can keep the caller "
            "from directing you to another fake number or website. "
            "End the call before verifying."
        )
        protective_actions.append(description)
        add_evidence(verification_quote, description)

    refusal_pattern = (
        r"\b(?:"
        r"no(?: thanks| thank you)?[.!]?$|"
        r"(?:won['’]t|will not|not going to|refuse to) "
        r"(?:share|give|send|pay|buy|click|provide|tell)|"
        r"(?:not sharing|not giving|not sending|not paying)|"
        r"stop asking|this (?:is|sounds like) a scam"
        r")\b"
    )

    refusal_quote = next(
        (turn for turn in user_turns if _matches(turn, refusal_pattern)),
        None,
    )

    if refusal_quote:
        description = (
            "You refused or questioned the request. A clear boundary "
            "can interrupt the pressure to act immediately. "
            "Keep that boundary if the caller changes their story "
            "or insists that cooperating is necessary."
        )
        protective_actions.append(description)
        add_evidence(refusal_quote, description)

    ending_quote = next(
        (
            turn for turn in user_turns
            if _matches(
                turn,
                r"\b(?:"
                r"(?:i['’]m|i am) (?:going to hang up|ending (?:this|the) call)|"
                r"i(?:['’]ll| will) hang up"
                r")\b",
            )
        ),
        None,
    )

    if ending_quote:
        description = (
            "You said you would end the call. Leaving the conversation "
            "gives you time to check the claim without continued pressure. "
            "Follow through and verify before taking any requested action."
        )
        protective_actions.append(description)
        add_evidence(ending_quote, description)

    for turn in user_turns:
        # Flag code-like numbers for review; context can change their meaning.
        if re.search(r"\b\d{6}\b", turn):
            if _matches(
                turn,
                r"\b(?:won['’]t|will not|don['’]t|do not|"
                r"not sharing|not giving|not my code)\b",
            ):
                continue

            description = (
                "Your response included a six-digit number. If you gave "
                "it as a verification code, that would be risky in a real "
                "call: a caller could use it to approve a sign-in or "
                "transaction. Keep codes private and contact the "
                "organization yourself. A fictional practice code does "
                "not access a real account."
            )
            risky_actions.append(description)
            add_evidence(turn, description)
            break

    payment_quote = next(
        (
            turn for turn in user_turns
            if _matches(
                turn,
                r"\b(?:"
                r"i(?:['’]ll| will) (?:pay|send (?:the )?money|buy (?:the )?gift cards)|"
                r"i (?:paid|sent (?:the )?money|bought (?:the )?gift cards)|"
                r"(?:i['’]m|i am) (?:paying|sending (?:the )?money)"
                r")\b",
            )
            and not _matches(turn, r"\b(?:if|unless)\b")
        ),
        None,
    )

    if payment_quote:
        description = (
            "You appeared to agree to or report a payment. Before paying "
            "an unexpected caller, verify both their identity and the "
            "reason for the request. Pressure, secrecy, or a demand for "
            "gift cards is a reason to stop and check independently."
        )
        risky_actions.append(description)
        add_evidence(payment_quote, description)

    if not protective_actions:
        protective_actions.append(
            "The rule-based review did not identify a clear refusal, "
            "independent verification plan, or plan to end the call. "
            "This may reflect wording the rules missed. Next time, "
            "practice saying: 'I will verify this myself before acting.'"
        )

    tactic_details = {
        "fear": (
            "Fear — a threat to your money, account, or someone you care "
            "about can make you act before checking the story. Pause "
            "and verify through a trusted channel."
        ),
        "urgency": (
            "Urgency — an immediate deadline reduces your time to think "
            "and verify. You can end the call and check the claim yourself."
        ),
        "claimed security procedure": (
            "Claimed security procedure — a risky request may be presented "
            "as a way to protect your account. Use the official app or "
            "contact the organization yourself before following instructions."
        ),
        "discouraging verification": (
            "Discouraging verification — preventing you from checking "
            "independently keeps the caller in control of the story. "
            "Choose your own contact information."
        ),
        "secrecy": (
            "Secrecy — being told not to involve anyone else removes "
            "a chance to get a second opinion. Check with someone you trust."
        ),
        "emotional pressure": (
            "Emotional pressure — concern or guilt can push you to help "
            "before confirming who is calling. Contact the person involved "
            "using a number you already trust."
        ),
        "irreversible payment request": (
            "Irreversible payment request — gift-card details or similar "
            "payments can be used quickly and may be difficult to recover. "
            "Verify the request before paying."
        ),
        "upfront payment": (
            "Upfront payment — a job or opportunity may be used to request "
            "money before you verify it. Confirm the offer with the company "
            "through independently found contact information."
        ),
    }

    # These explain the scenario's configured tactics, rather than claiming
    # that each tactic was observed in this particular transcript.
    tactics = [
        "Scenario warning sign: " + tactic_details.get(
            label.strip().lower(),
            f"{label} — pause before acting and verify the request independently.",
        )
        for label in scenario.get("tactics", [])
    ]

    return {
        "tactics": tactics,
        "protectiveActions": protective_actions,
        "riskyActions": risky_actions,
        "evidence": evidence,
        "saferResponse": scenario["saferResponse"],
    }