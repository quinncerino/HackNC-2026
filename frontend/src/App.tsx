import { useState } from "react";

import characterLogo from "./assets/nice-try-character.png";
import ModePage from "./pages/ModePage";
import TextPracticePage from "./pages/TextPracticePage";
import HomePage from "./pages/HomePage";
import PracticePage from "./pages/PracticePage";
import ResultsPage from "./pages/ResultsPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import type { Debrief, Scenario } from "./types";

type Screen = "mode" | "home" | "practice" | "results";

export default function App() {
  const [showHelp, setShowHelp] = useState(false);
  const [screen, setScreen] = useState<Screen>("mode");
  const [mode, setMode] = useState<"text" | "phone">("phone");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  function chooseScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    setDebrief(null);
    setScreen("practice");
  }

  let content;
  if (screen === "mode") {
    content = <ModePage onHowItWorks={() => setShowHelp(true)} onChoose={(nextMode) => {
      setMode(nextMode);
      setScreen("home");
    }} />;
  } else if (screen === "practice" && scenario && mode === "text") {
    content = <TextPracticePage
      scenario={scenario}
      onCancel={() => setScreen("home")}
      onComplete={(result) => {
        setDebrief(result);
        setScreen("results");
      }}
    />;
  } else if (screen === "practice" && scenario) {
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
        onPracticeAgain={() => {
          setDebrief(null);
          setScreen("practice");
        }}
        onRestart={() => setScreen("home")}
      />
    );
  }

  else { content = <HomePage mode={mode} onBack={() => setScreen("mode")} onChooseScenario={chooseScenario} onHowItWorks={() => setShowHelp(true)} />; }
  return (
    <div className="desktop-window">
      <header className="desktop-titlebar">
        <div className="brand">
          <img className="brand-logo" src={characterLogo} alt="" />
          Nice Try
        </div>
        <nav className="desktop-navigation" aria-label="Main navigation">
          <button
            className={`desktop-tab ${!showHelp ? "desktop-tab--active" : ""}`}
            aria-current={!showHelp ? "page" : undefined}
            onClick={() => setShowHelp(false)}
          >
            Practice
          </button>
          <button
            className={`desktop-tab ${showHelp ? "desktop-tab--active" : ""}`}
            aria-current={showHelp ? "page" : undefined}
            onClick={() => setShowHelp(true)}
          >
            How it Works
          </button>
        </nav>
        <span className="event-label">HackNC 2026</span>
        <div className="window-controls" aria-hidden="true">
          <span>−</span><span>□</span><span>×</span>
        </div>
      </header>
      <div hidden={showHelp}>{content}</div>
      {showHelp && <HowItWorksPage onPractice={() => setShowHelp(false)} />}
    </div>
  );
}
