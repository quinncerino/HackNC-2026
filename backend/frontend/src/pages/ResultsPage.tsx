import DebriefPanel from "../components/DebriefPanel";
import type { Debrief, Scenario } from "../types";

type ResultsPageProps = {
  scenario: Scenario;
  debrief: Debrief;
  onRestart: () => void;
};

export default function ResultsPage({ scenario, debrief, onRestart }: ResultsPageProps) {
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
      <div className="start-row"><button type="button" onClick={onRestart}>← Back to scenarios</button></div>
    </main>
  );
}
