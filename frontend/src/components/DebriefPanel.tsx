import type { Debrief } from "../types";

type DebriefPanelProps = {
  debrief: Debrief;
};

export default function DebriefPanel({ debrief }: DebriefPanelProps) {
  const detailedReviewAvailable = Boolean(debrief.mainTakeaway && debrief.skills && debrief.keyMoments);
  const transcriptUsable = debrief.transcriptUsable ?? debrief.evidence.length > 0;
  const keyMoments = debrief.keyMoments ?? [];
  const skills = (debrief.skills ?? []).filter((skill) => !skill.status || skill.status === "Demonstrated");
  const improvements = debrief.improvements ?? (debrief.nextPracticeGoal ? [debrief.nextPracticeGoal] : []);
  const scenarioWarningSigns = debrief.scenarioWarningSigns ?? debrief.tactics.map((tactic) => {
    const cleanTactic = tactic.replace(/^Scenario warning sign:\s*/, "");
    const [title, ...explanation] = cleanTactic.split(" — ");
    return { title, explanation: explanation.join(" — ") || "Pause and verify the request independently." };
  });

  return (
    <div className="debrief-grid">
      <section className="feedback-card feedback-card--wide feedback-card--takeaway" aria-labelledby="main-takeaway-heading">
        <h2 className="debrief-feature-heading" id="main-takeaway-heading">Your main takeaway</h2>
        <p className="debrief-feature-copy">{debrief.mainTakeaway ?? "The API returned an older review format. Restart the backend to load evidence-linked insights."}</p>
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

      <section className="feedback-card feedback-card--wide feedback-card--positive" aria-labelledby="what-went-well">
        <h2 id="what-went-well">What you did well</h2>
        {skills.length ? (
          <ul className="debrief-strength-list">
            {skills.map((skill) => (
              <li key={skill.name}>
                <strong>{skill.name}</strong>
                {skill.detail && <p>{skill.detail}</p>}
                {skill.evidence && <blockquote>“{skill.evidence}”</blockquote>}
              </li>
            ))}
          </ul>
        ) : <p>No clear strengths were identified in the captured responses this time. Use the suggestions below as a practice plan.</p>}
      </section>

      <section className="feedback-card feedback-card--wide feedback-card--goal" aria-labelledby="what-to-improve">
        <h2 className="debrief-feature-heading" id="what-to-improve">What you could improve next time</h2>
        <p className="debrief-feature-copy">{debrief.nextPracticeGoal ?? "Try again and practice one clear boundary followed by independent verification."}</p>
        {improvements.length > 1 && (
          <ul className="debrief-improvement-list">
            {improvements.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
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
