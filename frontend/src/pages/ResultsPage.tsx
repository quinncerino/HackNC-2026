import { useLayoutEffect } from "react";

import DebriefPanel from "../components/DebriefPanel";
import type { Debrief, Scenario } from "../types";

type ResultsPageProps = {
  scenario: Scenario;
  debrief: Debrief;
  onRestart: () => void;
};

export default function ResultsPage({ scenario, debrief, onRestart }: ResultsPageProps) {
  useLayoutEffect(() => {
    // Cancel the call's smooth scrolling and show the review from the top.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [debrief]);

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
