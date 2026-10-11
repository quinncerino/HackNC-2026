import { useLayoutEffect } from "react";

import DebriefPanel from "../components/DebriefPanel";
import type { Debrief, Scenario } from "../types";

type ResultsPageProps = {
  scenario: Scenario;
  debrief: Debrief;
  onPracticeAgain: () => void;
  onRestart: () => void;
};

export default function ResultsPage({ scenario, debrief, onPracticeAgain, onRestart }: ResultsPageProps) {
  useLayoutEffect(() => {
    // Show the review from the top when either practice mode completes.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [debrief]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Practice complete</p>
          <h1>Your practice, explained.</h1>
          <p>{scenario.title} · Review what happened and practice a safer response.</p>
        </div>
      </header>
      <DebriefPanel debrief={debrief} />
      <div className="start-row">
        <button type="button" onClick={onPracticeAgain}>Practice again</button>
        <button type="button" onClick={onRestart}>← Back to scenarios</button>
      </div>
    </main>
  );
}
