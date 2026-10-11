import DebriefPanel from "../components/DebriefPanel";
import type { Debrief, Scenario } from "../types";

type ResultsPageProps = {
  scenario: Scenario;
  debrief: Debrief;
  onPracticeAgain: () => void;
  onRestart: () => void;
};

export default function ResultsPage({ scenario, debrief, onPracticeAgain, onRestart }: ResultsPageProps) {
  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Practice complete</p>
          <h1>Your call, explained.</h1>
          <p>{scenario.title} · Review what happened and practice a safer response.</p>
        </div>
      </header>
      <DebriefPanel debrief={debrief} />
      <div className="results-actions">
        <button type="button" className="results-primary-action" onClick={onPracticeAgain}>
          Practice that moment again <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="results-secondary-action" onClick={onRestart}>
          ← Back to scenarios
        </button>
      </div>
    </main>
  );
}
