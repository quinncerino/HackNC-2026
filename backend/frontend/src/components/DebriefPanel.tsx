import type { Debrief } from "../types";

type DebriefPanelProps = {
  debrief: Debrief;
};

type Detail = {
  explanation: string;
  action: string;
};

const tacticDetails: Record<string, Detail> = {
  fear: {
    explanation:
      "Threats of losing money, account access, or something important can make a request feel too frightening to question.",
    action:
      "Pause before acting. Verify the claim through an official channel you choose.",
  },
  urgency: {
    explanation:
      "A short deadline pressures you to act before you have time to check the caller's story.",
    action:
      "End the call and verify independently. The caller's deadline is not proof that their request is legitimate.",
  },
  "claimed security procedure": {
    explanation:
      "The caller presents a risky request as a way to protect you. This can make sharing a code or information feel like the responsible choice.",
    action:
      "Don't follow an unexpected caller's verification instructions. Open the official app or contact the organization yourself.",
  },
  "discouraging verification": {
    explanation:
      "Keeping you from contacting the organization independently lets the caller control what information you receive.",
    action:
      "Use contact information you find independently, rather than a number or link the caller supplies.",
  },
  "upfront payment": {
    explanation:
      "An equipment or onboarding fee can turn an appealing job offer into a request for your money before you have verified the employer.",
    action:
      "Don't pay during the call. Confirm the position and payment request with the company through independently sourced contact information.",
  },
  "rushed hiring": {
    explanation:
      "Moving quickly through hiring can discourage you from checking the role, recruiter, and terms of the offer.",
    action:
      "Ask for written details and independently confirm the recruiter and position with the company.",
  },
  "pressure to accept": {
    explanation:
      "The caller makes hesitation feel like a lost opportunity, pushing you toward agreement before you can evaluate the request.",
    action:
      "Say you need time to verify the offer. Avoid committing while the caller is applying pressure.",
  },
  "emotional pressure": {
    explanation:
      "An emergency story can use concern, guilt, or loyalty to push you into helping before checking who is really calling.",
    action:
      "Contact the person involved using a number you already trust before sending money or buying anything.",
  },
  secrecy: {
    explanation:
      "Being told not to involve anyone else removes a chance for someone you trust to spot a problem.",
    action:
      "Pause and check with a trusted person. A demand for secrecy is a reason to question the request.",
  },
  "irreversible payment request": {
    explanation:
      "Gift-card numbers or similar payment details can let someone use the funds quickly, making recovery difficult.",
    action:
      "Don't buy gift cards or share their numbers to resolve an unexpected request. Verify the story independently first.",
  },
};

function getTacticDetail(label: string): Detail {
  return (
    tacticDetails[label.trim().toLowerCase()] ?? {
      explanation:
        "This label identifies a potential pressure tactic. Review the conversation evidence to see whether and how it appeared in your call.",
      action:
        "Pause before sharing information or taking action, and verify the request independently.",
    }
  );
}

function getProtectiveDetail(label: string): Detail {
  const text = label.toLowerCase();

  if (/refus|challeng/.test(text)) {
    return {
      explanation:
        "A refusal or direct challenge can interrupt the caller's attempt to get immediate agreement. Check the evidence below to confirm this finding refers to the caller's request.",
      action:
        'Make the boundary clear: “I won’t do that. I’ll verify this independently.” You don’t need to explain or negotiate.',
    };
  }

  if (/verif|official|independent|call back/.test(text)) {
    return {
      explanation:
        "Choosing your own verification channel reduces the caller's control over who you contact and what you are told.",
      action:
        "End the call before checking. Use an official app, a known number, or independently located contact information.",
    };
  }

  if (/hang|ended|end.*call/.test(text)) {
    return {
      explanation:
        "Ending the call creates space to check the story without ongoing pressure.",
      action:
        "Follow through by verifying through a trusted channel before responding to the request.",
    };
  }

  return {
    explanation:
      "Your analysis identified this as a protective action. Its value depends on what you said and the request you were responding to.",
    action:
      "Review the supporting evidence and practice using the same boundary when the caller pushes back.",
  };
}

function getRiskDetail(label: string): Detail {
  const text = label.toLowerCase();

  if (/code/.test(text)) {
    return {
      explanation:
        "In a real call, sharing a sign-in or verification code could help someone access an account. A fictional practice code does not access a real account.",
      action:
        'Say: “I won’t share verification codes. I’ll contact the organization myself.”',
    };
  }

  if (/gift|payment|paid|money|fee/.test(text)) {
    return {
      explanation:
        "Agreeing to an unverified payment request can move the conversation from pressure into potential financial loss.",
      action:
        "Stop before paying or sharing payment details. Verify both the caller's identity and the reason for the payment independently.",
    };
  }

  if (/password|personal|sensitive|information/.test(text)) {
    return {
      explanation:
        "Information shared with an unverified caller could be used to impersonate you or attempt account access.",
      action:
        "Keep sensitive information private and contact the organization through its official service.",
    };
  }

  return {
    explanation:
      "The analysis flagged this action for review. Check the evidence before treating it as something you actually agreed to or completed.",
    action:
      "Practice pausing at this point and using the safer response below.",
  };
}

export default function DebriefPanel({
  debrief,
}: DebriefPanelProps) {
  function renderItems(
    items: string[],
    getDetail: (label: string) => Detail,
    actionLabel: string,
  ) {
    return (
      <ul className="insight-list">
        {items.map((item, index) => {
          const detail = getDetail(item);

          return (
            <li className="insight-item" key={`${item}-${index}`}>
              <h3>{item}</h3>
              <p>{detail.explanation}</p>
              <p className="insight-action">
                <strong>{actionLabel}</strong> {detail.action}
              </p>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="debrief-grid">
      <section className="feedback-card feedback-card--tactics">
        <h2>⚠ Understand the warning signs</h2>
        <p>What these tactics mean and how to respond.</p>

        {debrief.tactics.length > 0 ? (
          renderItems(debrief.tactics, getTacticDetail, "Your next move:")
        ) : (
          <p>No warning signs were returned by the analysis.</p>
        )}
      </section>

      <section className="feedback-card feedback-card--positive">
        <h2>✓ Why your response helped</h2>

        {debrief.protectiveActions.length > 0 ? (
          renderItems(
            debrief.protectiveActions,
            getProtectiveDetail,
            "Build on this:",
          )
        ) : (
          <p>
            No protective action was identified. This may reflect limited
            conversation evidence rather than a missed opportunity.
          </p>
        )}
      </section>

      {debrief.riskyActions.length > 0 && (
        <section className="feedback-card feedback-card--warning">
          <h2>Where to strengthen your response</h2>
          <p>Use these moments to choose a different next move.</p>
          {renderItems(
            debrief.riskyActions,
            getRiskDetail,
            "Try instead:",
          )}
        </section>
      )}

      <section className="feedback-card feedback-card--wide">
        <h2>Look back at the conversation</h2>
        <p>
          Each quote should support the finding beside it. Unrelated speech
          or transcription errors should not count as evidence of a safe
          or risky decision.
        </p>

        {debrief.evidence.length > 0 ? (
          debrief.evidence.map((item, index) => (
            <blockquote key={`${item.quote}-${index}`}>
              <p>“{item.quote}”</p>
              <footer>{item.explanation}</footer>
            </blockquote>
          ))
        ) : (
          <p>There are no supporting quotes available for this call.</p>
        )}
      </section>

      <section className="feedback-card feedback-card--wide practice-phrase">
        <h2>▤ Practice your exit line</h2>
        <p>“{debrief.saferResponse}”</p>
        <div className="insight-action">
          <strong>Make it an action:</strong> Say your boundary, end the
          call, and verify through a channel you choose. You don’t need
          the caller’s permission to stop.
        </div>
      </section>
    </div>
  );
}