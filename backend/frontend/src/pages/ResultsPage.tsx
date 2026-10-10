import DebriefPanel from "../components/DebriefPanel";
import type { Debrief, Scenario } from "../types";

type ResultsPageProps = {
  scenario: Scenario;
  debrief: Debrief;
  onRestart: () => void;
};

export default function ResultsPage({
  scenario,
  debrief,
  onRestart,
}: ResultsPageProps) {
  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Practice complete</p>
          <h1>Your call, explained.</h1>
          <p>
            {scenario.title} · See how the caller applied pressure,
            where you held your ground, and what to practice next.
          </p>
        </div>
      </header>

      <section className="results-context" aria-labelledby="review-heading">
        <h2 id="review-heading">Turn this call into a safer next move.</h2>
        <p>
          Review the warning signs alongside your responses. Focus on
          one action you can use next time: pause, protect your
          information, or verify the request independently.
        </p>
        <p className="results-note">
          This was a practice simulation. Sharing a fictional practice
          code does not mean a real account was accessed.
        </p>
      </section>

      <DebriefPanel debrief={debrief} />

      <section className="results-context" aria-labelledby="takeaway-heading">
        <h2 id="takeaway-heading">You don’t have to convince the caller.</h2>
        <p>
          You can end the conversation—even if they sound professional,
          know details about you, or insist that something is urgent.
          Verify their claim through an official channel you choose.
        </p>
        <p>
          <strong>Your next practice goal:</strong> Set a clear boundary
          and stick to it when the caller pushes back.
        </p>
      </section>

      <div className="start-row">
        <button type="button" onClick={onRestart}>
          ← Back to scenarios
        </button>
      </div>
    </main>
  );
}