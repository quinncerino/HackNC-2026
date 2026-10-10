import type { Scenario } from "../types";

type ScenarioCardProps = {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
};

export default function ScenarioCard({ scenario, onSelect }: ScenarioCardProps) {
  return (
    <article className="scenario-card">
      <span className="difficulty">{scenario.difficulty}</span>
      <h2>{scenario.title}</h2>
      <p>{scenario.description}</p>
      <button type="button" onClick={() => onSelect(scenario)}>
        Practice this scenario
      </button>
    </article>
  );
}
