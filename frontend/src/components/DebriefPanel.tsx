import type { Debrief } from "../types";

type DebriefPanelProps = {
  debrief: Debrief;
};

export default function DebriefPanel({ debrief }: DebriefPanelProps) {
  const detailedReviewAvailable = Boolean(debrief.mainTakeaway && debrief.skills && debrief.keyMoments);
  const transcriptUsable = debrief.transcriptUsable ?? debrief.evidence.length > 0;
  const keyMoments = debrief.keyMoments ?? [];
  const skills = debrief.skills ?? [
    { name: "Set a clear boundary", status: "Not enough evidence" as const, detail: "The running API did not return the detailed skill assessment." },
    { name: "Verify independently", status: "Not enough evidence" as const, detail: "The running API did not return the detailed skill assessment." },
    { name: "End the conversation", status: "Not enough evidence" as const, detail: "The running API did not return the detailed skill assessment." },
  ];
  const scenarioWarningSigns = debrief.scenarioWarningSigns ?? debrief.tactics.map((tactic) => {
    const cleanTactic = tactic.replace(/^Scenario warning sign:\s*/, "");
    const [title, ...explanation] = cleanTactic.split(" — ");
    return { title, explanation: explanation.join(" — ") || "Pause and verify the request independently." };
  });

  return (
    <div className="debrief-grid">
      <section className="feedback-card feedback-card--wide feedback-card--takeaway" aria-labelledby="main-takeaway">
        <p className="eyebrow">Your main takeaway</p>
        <h2 id="main-takeaway">{debrief.mainTakeaway ?? "The API returned an older review format. Restart the backend to load evidence-linked insights."}</h2>
        {!detailedReviewAvailable && (
          <p className="debrief-small">This attempt has no personalized skills or key-moment assessment yet.</p>
        )}
        {!transcriptUsable && (
          <p className="debrief-small">No personal skill assessment is available for this attempt.</p>
        )}
      </section>

      <section className="feedback-card feedback-card--wide" aria-labelledby="key-moments">
        <h2 id="key-moments">Key moments</h2>
        {keyMoments.length ? (
          <div className="debrief-moments">
            {keyMoments.map((moment, index) => (
              <article className="debrief-moment" key={`${index}-${moment.youSaid}`}>
                <h3>Exchange {index + 1}</h3>
                <div className="debrief-exchange">
                  <div><strong>Caller said</strong><p>“{moment.callerSaid}”</p></div>
                  <div><strong>You said</strong><p>“{moment.youSaid}”</p></div>
                </div>
                <p className={`debrief-assessment debrief-assessment--${moment.assessment}`}>
                  <strong>{moment.assessment === "helped" ? "Why it helped" : "Where it left an opening"}</strong>
                  <span>{moment.why}</span>
                </p>
                <p className="debrief-stronger-response">
                  <strong>A stronger response to practice</strong>
                  <span>“{moment.strongerResponse}”</span>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p>
            {transcriptUsable
              ? "No relevant exchange was identified in the captured transcript, so this review makes no personalized success claim."
              : "We couldn’t identify a usable caller-and-participant exchange. Try again in a quiet space or use text mode."}
          </p>
        )}
      </section>

      <section className="feedback-card feedback-card--wide" aria-labelledby="skills-demonstrated">
        <h2 id="skills-demonstrated">Skills demonstrated</h2>
        <p className="debrief-small">These labels describe only what appeared in the captured transcript.</p>
        <ul className="debrief-skill-results">
          {skills.map((skill) => (
            <li className={`debrief-skill-result debrief-skill-result--${skill.status.toLowerCase().replaceAll(" ", "-")}`} key={skill.name}>
              <div><strong>{skill.name}</strong><span>{skill.status}</span></div>
              <p>{skill.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="feedback-card feedback-card--wide feedback-card--goal" aria-labelledby="next-goal">
        <p className="eyebrow">Your next practice goal</p>
        <h2 id="next-goal">{debrief.nextPracticeGoal ?? "Try again and practice one clear boundary followed by independent verification."}</h2>
      </section>

      <details className="feedback-card feedback-card--wide scenario-guidance">
        <summary>About this scenario</summary>
        <p>General warning signs in this simulation—not findings about your attempt.</p>
        {scenarioWarningSigns.length ? (
          <ul className="debrief-insights">
            {scenarioWarningSigns.map((item) => (
              <li key={item.title}><strong>{item.title}:</strong> {item.explanation}</li>
            ))}
          </ul>
        ) : <p>No scenario guidance is available.</p>}
      </details>

      <section className="feedback-card feedback-card--wide practice-phrase" aria-labelledby="safer-response">
        <h2 id="safer-response">A response to practice</h2>
        <p>“{debrief.saferResponse}”</p>
      </section>

    </div>
  );
}
