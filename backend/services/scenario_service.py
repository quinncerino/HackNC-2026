"""Loads and validates local scenario JSON files."""

import json
from pathlib import Path

SCENARIO_DIRECTORY = Path(__file__).resolve().parent.parent / "scenarios"


class ScenarioNotFoundError(FileNotFoundError):
    """Raised when a requested scenario does not exist."""


def load_scenario(scenario_id: str) -> dict:
    if not scenario_id.replace("_", "").isalnum():
        raise ScenarioNotFoundError(scenario_id)

    path = SCENARIO_DIRECTORY / f"{scenario_id}.json"
    if not path.is_file():
        raise ScenarioNotFoundError(scenario_id)

    with path.open(encoding="utf-8") as scenario_file:
        return json.load(scenario_file)


def list_public_scenarios() -> list[dict]:
    scenarios = []
    for path in sorted(SCENARIO_DIRECTORY.glob("*.json")):
        scenario = load_scenario(path.stem)
        scenarios.append(
            {
                "id": scenario["id"],
                "title": scenario["title"],
                "description": scenario["description"],
                "difficulty": scenario["difficulty"],
            }
        )
    return scenarios
