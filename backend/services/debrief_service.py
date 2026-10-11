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


def _build_legacy_debrief(scenario: dict, transcript: list[dict]) -> dict:
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


def _clean_transcript(transcript: list[dict]) -> list[dict[str, str]]:
    cleaned_turns = []
    for turn in transcript:
        if not isinstance(turn, dict) or turn.get("role") not in {"agent", "user"}:
            continue
        text = _strip_tone_markers(str(turn.get("text") or ""))
        if not text or (turn["role"] == "user" and text.upper() in {"START", "STOP", "REVEAL", "DEBRIEF"}):
            continue
        cleaned_turns.append({"role": turn["role"], "text": text})
    return cleaned_turns


def build_debrief(scenario: dict, transcript: list[dict]) -> dict:
    """Return legacy feedback plus evidence-linked, cautious practice insights."""
    debrief = _build_legacy_debrief(scenario, transcript)
    turns = _clean_transcript(transcript)
    user_turns = [turn["text"] for turn in turns if turn["role"] == "user"]
    caller_turns = [turn["text"] for turn in turns if turn["role"] == "agent"]
    usable = bool(user_turns and caller_turns)

    refusal_pattern = (
        r"(?:\bno(?: thanks| thank you)?(?:[,.!]|$)|"
        r"\b(?:won['’]t|will not|not going to|refuse to) "
        r"(?:share|give|send|pay|buy|purchase|click|provide|tell|do that|go along)\b|"
        r"\b(?:not sharing|not giving|not sending|not paying|not buying|"
        r"not comfortable|not okay with|don't feel comfortable|do not feel comfortable|"
        r"not something i (?:do|will do)|that's not happening|"
        r"stop asking|this (?:is|sounds like) a scam)\b|"
        r"\bi (?:don't|do not) (?:want to|agree to) (?:buy|pay|send|share|give)\b)"
    )
    refusal_opening_pattern = (
        r"\b(?:can['’]t afford|cannot afford|wish i could|maybe later|"
        r"i don['’]t have (?:the )?(?:money|cash)|i(?:['’]m| am) not sure)\b"
    )
    verification_pattern = (
        r"\b(?:call (?:them|back|(?:my|the) (?:bank|company|organization|office|school|delivery company))|"
        r"(?:call|contact|check|verify) (?:it|this|the request) (?:with|through|using) "
        r"(?:my|the|an) (?:bank|company|organization|official website|official number)|"
        r"official number|official website|"
        r"number on (?:my|the) card|contact (?:my|the) bank|"
        r"verify independently|check independently|verify (?:this|it) myself|"
        r"verify (?:this|it) with someone i trust|"
        r"using (?:the )?(?:official|number i already trust)|in person|"
        r"(?:talk|speak|check|ask|call|contact|confirm|verify) (?:with|directly|through) "
        r"(?:my|someone i trust|the official|the company|the bank|my family)|"
        r"(?:check|verify|confirm) (?:with|through) my (?:bank|company|organization|office)|"
        r"ask (?:my|someone i trust)|look (?:it|them) up myself|"
        r"check (?:the|their) (?:website|number|request))\b"
    )
    exit_pattern = (
        r"\b(?:(?:i['’]m|i am) (?:going to hang up|hanging up|ending (?:this|the) call)|"
        r"i(?:['’]ll| will) (?:hang up|end (?:this|the) (?:call|conversation))|"
        r"(?:i need to go|i am done here|i['’]m done here)|end(?:ing)? this conversation)\b"
    )
    code_pattern = r"\b\d{6}\b"
    payment_pattern = (
        r"\b(?:i(?:['’]ll| will) (?:pay|send (?:the )?money|buy (?:the )?gift cards|"
        r"purchase (?:the )?gift cards)|i (?:paid|sent (?:the )?money|bought (?:the )?gift cards)|"
        r"(?:i['’]m|i am) (?:paying|sending (?:the )?money))\b"
    )
    caller_gift_card_pressure = (
        r"\b(?:gift cards?|gift certificates?|buy|purchase|pick up|send|pay|"
        r"payment|money|read (?:me )?(?:the )?codes?|share (?:the )?codes?|"
        r"codes? from (?:the )?cards?)\b"
    )
    code_privacy_pattern = (
        r"\b(?:won['’]t|will not|not going to|refuse to|don't|do not|never|"
        r"not sharing|not giving|keep|won't tell|will not tell|won't give|will not give)\b"
        r".{0,60}\b(?:code|codes|password|pin|"
        r"passcode|account details|personal information)\b"
    )
    trusted_support_pattern = (
        r"\b(?:ask|check|talk|speak|call|contact|show|tell|run this by|"
        r"get advice from|speak to|talk to)\b.{0,60}\b"
        r"(?:someone i trust|my (?:daughter|son|wife|husband|partner|friend|"
        r"family|relative|colleague|manager|teacher|bank|office)|"
        r"a trusted (?:person|friend|family member|colleague))\b"
    )
    pause_pattern = (
        r"\b(?:let me think|i need (?:some )?time|i need to think|"
        r"i want to think|i(?:['’]ll| will) think about it|think (?:it )?over|"
        r"i (?:won['’]t|will not) rush|not right now|give me a moment|"
        r"i need a moment|i(?:['’]ll| will) decide after)\b"
    )
    challenge_pattern = (
        r"\b(?:this (?:is|sounds like|seems) (?:a )?scam|sounds suspicious|"
        r"seems suspicious|that doesn't sound right|that does not sound right|"
        r"prove (?:who you are|that)|how do i know|who (?:are you|is this))\b"
    )

    moments = []
    flags = {
        "boundary": False,
        "verification": False,
        "exit": False,
        "code_privacy": False,
        "trusted_support": False,
        "pause": False,
        "challenge": False,
    }
    skill_evidence = {key: "" for key in flags}
    has_relevant_evidence = False
    for index, turn in enumerate(turns):
        if turn["role"] != "user":
            continue
        text = turn["text"]
        refused = _matches(text, refusal_pattern)
        opening = _matches(text, refusal_opening_pattern)
        verified = _matches(text, verification_pattern) and not _matches(
            text,
            r"\b(?:won['’]t|will not|can['’]t|cannot|don['’]t|do not|not going to) "
            r"(?:verify|check|call back|contact|call)\b",
        )
        exited = _matches(text, exit_pattern)
        protected_code = _matches(text, code_privacy_pattern)
        sought_support = _matches(text, trusted_support_pattern)
        paused = _matches(text, pause_pattern)
        challenged = _matches(text, challenge_pattern)
        shared_code = bool(re.search(code_pattern, text)) and not _matches(
            text, r"\b(?:won['’]t|will not|don['’]t|do not|not sharing|not giving|not my code)\b"
        )
        agreed_to_pay = _matches(text, payment_pattern) and not _matches(text, r"\b(?:if|unless)\b")
        previous_caller = next(
            (turns[prior]["text"] for prior in range(index - 1, -1, -1) if turns[prior]["role"] == "agent"),
            None,
        )
        contextual_pause = paused and previous_caller is not None and _matches(
            previous_caller,
            r"\b(?:urgent|right now|immediately|deadline|act now|send|pay|buy|"
            r"purchase|gift cards?|money|transfer|code|password|account|click|share|give|provide)\b",
        )
        gift_card_context = (
            scenario.get("id") == "gift_card"
            and previous_caller is not None
            and _matches(previous_caller, caller_gift_card_pressure)
        )
        ambiguous_gift_card_reply = gift_card_context and not any(
            (refused, opening, verified, exited, shared_code, agreed_to_pay, protected_code, sought_support, challenged)
        )
        relevant = (
            refused or opening or verified or exited or shared_code or agreed_to_pay
            or protected_code or sought_support or contextual_pause or challenged or ambiguous_gift_card_reply
        )
        if not relevant:
            continue

        has_relevant_evidence = True
        flags["boundary"] |= refused
        flags["verification"] |= verified
        flags["exit"] |= exited
        flags["code_privacy"] |= protected_code
        flags["trusted_support"] |= sought_support
        flags["pause"] |= contextual_pause
        for key, detected in (
            ("boundary", refused),
            ("verification", verified),
            ("exit", exited),
            ("code_privacy", protected_code),
            ("trusted_support", sought_support),
            ("pause", contextual_pause),
            ("challenge", challenged),
        ):
            if detected and not skill_evidence[key]:
                skill_evidence[key] = text
        flags["challenge"] |= challenged
        if not previous_caller:
            continue

        left_opening = opening or shared_code or agreed_to_pay or ambiguous_gift_card_reply
        if left_opening:
            if opening:
                why = "Explaining that you cannot afford it can leave the request open to another payment suggestion; a direct refusal closes that opening."
                stronger = "I won’t buy gift cards or share their codes. I’ll verify this request with someone I trust."
            elif ambiguous_gift_card_reply:
                why = "The caller asked for gift cards, but this reply does not show a clear refusal or verification plan. That is not proof you agreed; practice stating the boundary and how you will verify."
                stronger = "I won’t buy gift cards or share their codes. I’ll verify this request with someone I trust."
            elif shared_code:
                why = "A six-digit number may be a verification code; sharing one can let someone approve an account action. Keep codes private."
                stronger = "I won’t share a verification code. I’ll contact the organization using a number I already trust."
            else:
                why = "Agreeing to pay leaves the caller’s request in motion; pause and verify before sending money or buying anything."
                stronger = scenario.get("saferResponse", "I won’t pay until I verify this request independently.")
            category = "left_opening"
        else:
            reasons = []
            if refused:
                reasons.append("Your direct refusal set a boundary around the requested action.")
                stronger = scenario.get("saferResponse", "I won’t act until I verify this request independently.")
            else:
                stronger = scenario.get("saferResponse", "I’ll verify this request independently before acting.")
            if verified:
                reasons.append("Choosing an independent channel keeps the caller from controlling how you verify.")
            if exited:
                reasons.append("Ending the conversation gives you space to check the claim without pressure.")
            if protected_code:
                reasons.append("You kept sensitive codes or account details private.")
            if sought_support:
                reasons.append("You involved someone you trust before acting.")
            if contextual_pause:
                reasons.append("Pausing gives you time to think instead of responding under pressure.")
            if challenged:
                reasons.append("You questioned the caller’s identity or claim instead of accepting it at face value.")
            why = " ".join(reasons) or "This exchange did not show a clear protective action in the captured response."
            category = "helped" if any((refused, verified, exited, protected_code, sought_support, contextual_pause, challenged)) else "left_opening"

        moments.append({
            "callerSaid": previous_caller,
            "youSaid": text,
            "assessment": category,
            "why": why,
            "strongerResponse": stronger,
        })

    # A usable conversation with no recognized behavior is not proof that a
    # skill was missed; the phrasing may simply be outside these rules.
    skill_specs = (
        ("boundary", "Set a clear boundary", "You directly refused the requested action."),
        ("verification", "Verify independently", "You named a way to verify the request outside the caller’s control."),
        ("exit", "End the conversation", "You said you would end the call or conversation."),
        ("code_privacy", "Protect sensitive information", "You kept a verification code, password, PIN, or personal details private."),
        ("trusted_support", "Get a second opinion", "You involved someone you trust before acting."),
        ("pause", "Pause before acting", "You took time to think instead of responding under pressure."),
        ("challenge", "Question the caller’s claim", "You questioned the caller’s identity or story."),
    )
    skills = [
        {"name": name, "detail": detail, "evidence": skill_evidence[key]}
        for key, name, detail in skill_specs if flags[key]
    ]

    if not usable:
        takeaway = "We couldn’t assess this attempt. Try again in a quiet space or use text mode."
    elif not has_relevant_evidence:
        takeaway = "The captured conversation did not provide enough relevant evidence to assess this attempt."
    elif any(moment["assessment"] == "left_opening" for moment in moments):
        takeaway = (
            "One reply did not clearly stop the caller’s request. This does not mean you agreed; "
            "the transcript just doesn’t show a clear refusal and independent check. "
            "Next time, say no directly and verify through someone or a contact method you trust."
        )
    else:
        demonstrated = [skill["name"].lower() for skill in skills]
        takeaway = "The captured conversation shows these helpful actions: " + ", ".join(demonstrated) + "."

    demonstrated_keys = {key for key, _, _ in skill_specs if flags[key]}
    if (
        scenario.get("id") == "gift_card"
        and any(_matches(text, refusal_opening_pattern) for text in user_turns)
    ):
        next_goal = "Refuse the payment directly instead of explaining why you can’t afford it."
    elif "boundary" not in demonstrated_keys:
        next_goal = "Refuse the requested action directly instead of explaining or negotiating."
    elif "verification" not in demonstrated_keys:
        next_goal = "Name how you’ll verify using contact information you choose."
    elif "exit" not in demonstrated_keys:
        next_goal = "End the conversation before taking action, then verify through a trusted channel."
    else:
        next_goal = "Keep using a clear boundary and independent verification if the caller pushes back."

    improvements = []
    if "boundary" not in demonstrated_keys:
        improvements.append(next_goal if scenario.get("id") == "gift_card" and any(
            _matches(text, refusal_opening_pattern) for text in user_turns
        ) else "Clearly refuse the requested action instead of explaining, hesitating, or negotiating.")
    if "verification" not in demonstrated_keys:
        improvements.append("Say how you will verify using contact information or a person you already trust.")
    if "exit" not in demonstrated_keys:
        improvements.append("End the conversation before taking any requested action.")
    if not improvements:
        improvements.append("Keep applying these skills if the caller changes their story or increases the pressure.")

    warning_signs = []
    for index, label in enumerate(scenario.get("tactics", [])):
        detail = debrief["tactics"][index].split(" — ", 1)[-1] if index < len(debrief["tactics"]) else "Pause and verify the request independently."
        warning_signs.append({"title": label, "explanation": detail})

    debrief.update({
        "transcriptUsable": usable,
        "mainTakeaway": takeaway,
        "keyMoments": moments[:3],
        "skills": skills,
        "improvements": improvements,
        "nextPracticeGoal": next_goal,
        "scenarioWarningSigns": warning_signs,
    })
    return debrief