import { useEffect, useState } from "react";

import ScenarioCard from "../components/ScenarioCard";
import { getScenarios } from "../services/api";
import type { Scenario } from "../types";

type HomePageProps = {
  onChooseScenario: (scenario: Scenario) => void;
  onHowItWorks: () => void;
};

export default function HomePage({ onChooseScenario, onHowItWorks }: HomePageProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getScenarios().then((items) => {
      const rank = (id: string) => id.includes("campus") ? 0 : id.includes("bank") ? 1 : 2;
      setScenarios([...items].sort((a, b) => rank(a.id) - rank(b.id)));
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <main className="page-shell">
      <header className="hero">
        <h1>Practice the call. <span>Spot the scam.</span></h1>
        <p>
          Build confidence with realistic, fictional scam calls.
        </p>
      </header>

      <div className="training-info-row">
        <section className="notice" aria-label="Safety notice">
          <span aria-hidden="true">✓</span>
          <strong>Safe training simulation</strong>
        </section>
        <button
          type="button"
          className="notice training-help"
          onClick={onHowItWorks}
        >
          <span aria-hidden="true">?</span>
          <strong>How It Works</strong>
        </button>
      </div>

      {error && <p className="error-message">Could not load scenarios: {error}</p>}
      {!error && scenarios.length === 0 && <p>Loading scenarios…</p>}

      <section className="scenario-grid" aria-label="Training scenarios">
        {scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} selected={(selectedId ?? scenarios[0]?.id) === scenario.id} onSelect={(item) => setSelectedId(item.id)} onStart={onChooseScenario} />
        ))}
      </section>
      <div className="start-row"><button type="button" className="primary-action" disabled={!scenarios.length} onClick={() => {
        const item = scenarios.find((entry) => entry.id === selectedId) ?? scenarios[0];
        if (item) onChooseScenario(item);
      }}>Start practice <span aria-hidden="true">→</span></button></div>
      <p className="privacy-note">ⓘ Use fictional information only.</p>
    </main>
  );
}
