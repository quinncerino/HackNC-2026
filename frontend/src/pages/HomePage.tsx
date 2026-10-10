import { useEffect, useState } from "react";

import ScenarioCard from "../components/ScenarioCard";
import { getScenarios } from "../services/api";
import type { Scenario } from "../types";

type HomePageProps = {
  onChooseScenario: (scenario: Scenario) => void;
};

export default function HomePage({ onChooseScenario }: HomePageProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getScenarios().then(setScenarios).catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">Scam-call training</p>
        <h1>Nice Try</h1>
        <p>
          Practice recognizing pressure tactics in a safe, fictional voice simulation, then
          review the warning signs you encountered.
        </p>
      </header>

      <section className="notice" aria-label="Safety notice">
        <strong>Training only.</strong> Never share a real password, account number, payment
        detail, or verification code during a simulation.
      </section>

      {error && <p className="error-message">Could not load scenarios: {error}</p>}
      {!error && scenarios.length === 0 && <p>Loading scenarios…</p>}

      <section className="scenario-grid" aria-label="Training scenarios">
        {scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} onSelect={onChooseScenario} />
        ))}
      </section>
    </main>
  );
}
