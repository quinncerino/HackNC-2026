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
          <h1>{scenario.title} debrief</h1>
          <p>Review what happened, then practice the safer response aloud.</p>
        </div>
        <button type="button" onClick={onRestart}>Choose another scenario</button>
      </header>
      <DebriefPanel debrief={debrief} />
    </main>
  );
}
