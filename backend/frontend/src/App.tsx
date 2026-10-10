import { useState } from "react";

import HomePage from "./pages/HomePage";
import PracticePage from "./pages/PracticePage";
import ResultsPage from "./pages/ResultsPage";
import type { Debrief, Scenario } from "./types";

type Screen = "home" | "practice" | "results";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  function chooseScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    setDebrief(null);
    setScreen("practice");
  }

  let content;
  if (screen === "practice" && scenario) {
    content = (
      <PracticePage
        scenario={scenario}
        onCancel={() => setScreen("home")}
        onComplete={(result) => {
          setDebrief(result);
          setScreen("results");
        }}
      />
    );
  }

  else if (screen === "results" && scenario && debrief) {
    content = (
      <ResultsPage
        scenario={scenario}
        debrief={debrief}
        onRestart={() => setScreen("home")}
      />
    );
  }

  else { content = <HomePage onChooseScenario={chooseScenario} />; }
  return <div className="desktop-window">
    <header className="desktop-titlebar">
      <div className="brand"><span className="brand-mark" aria-hidden="true">✓</span>Nice Try</div>
      <span className="desktop-tab">Practice</span>
      <details className="help-menu"><summary>How it works</summary><div>Choose a scenario, practice a fictional call, then review its warning signs. Use fictional information only.</div></details>
      <span className="event-label">HackNC 2026</span>
      <div className="window-controls" aria-hidden="true"><span>−</span><span>□</span><span>×</span></div>
    </header>
    {content}
  </div>;
}
