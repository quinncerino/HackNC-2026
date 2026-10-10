import type { Scenario } from "../types";
import RetroIcon from "./RetroIcon";
type ScenarioCardProps = { scenario: Scenario; selected: boolean; onSelect: (scenario: Scenario) => void };
export default function ScenarioCard({ scenario, selected, onSelect }: ScenarioCardProps) {
  const campus = scenario.id.includes("campus");
  const bank = scenario.id.includes("bank");
  const scenarioKey = (scenario.id + " " + scenario.title).toLowerCase();
  const icon = campus ? "laptop"
    : bank ? "bank"
    : scenarioKey.includes("family") ? "family"
    : scenarioKey.includes("job") ? "briefcase"
    : scenarioKey.includes("package") || scenarioKey.includes("delivery") ? "package"
    : "gift-card";
  const description = campus ? "Protect your verification code." : bank ? "Verify before you transfer." : "Recognize payment pressure.";
  return <button type="button" className={`scenario-card ${selected ? "scenario-card--selected" : ""}`} aria-pressed={selected} onClick={() => onSelect(scenario)}>
    <RetroIcon kind={icon} className="scenario-icon" />
    <span className="selection-box" aria-hidden="true">{selected ? "✓" : ""}</span>
    <h2>{campus ? "Campus IT" : bank ? "Bank Alert" : scenario.title}</h2><p>{description}</p><span className="scenario-duration"><span className="clock-icon" aria-hidden="true"/>60 – 90 sec</span>
  </button>;
}
