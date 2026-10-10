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

  if (screen === "practice" && scenario) {
    return (
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

  if (screen === "results" && scenario && debrief) {
    return (
      <ResultsPage
        scenario={scenario}
        debrief={debrief}
        onRestart={() => setScreen("home")}
      />
    );
  }

  return <HomePage onChooseScenario={chooseScenario} />;
}
