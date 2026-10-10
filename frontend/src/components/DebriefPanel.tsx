import type { Debrief } from "../types";

type DebriefPanelProps = {
  debrief: Debrief;
};

export default function DebriefPanel({ debrief }: DebriefPanelProps) {
  return (
    <div className="debrief-grid">
      <section className="feedback-card">
        <h2>Pressure tactics</h2>
        <ul>{debrief.tactics.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="feedback-card feedback-card--positive">
        <h2>Protective actions</h2>
        <ul>{debrief.protectiveActions.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      {debrief.riskyActions.length > 0 && (
        <section className="feedback-card feedback-card--warning">
          <h2>Risky moments</h2>
          <ul>{debrief.riskyActions.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}

      {debrief.evidence.length > 0 && (
        <section className="feedback-card feedback-card--wide">
          <h2>Conversation evidence</h2>
          {debrief.evidence.map((item) => (
            <blockquote key={item.quote}>
              “{item.quote}”
              <footer>{item.explanation}</footer>
            </blockquote>
          ))}
        </section>
      )}

      <section className="feedback-card feedback-card--wide practice-phrase">
        <h2>A safer response to practice</h2>
        <p>“{debrief.saferResponse}”</p>
      </section>
    </div>
  );
}
