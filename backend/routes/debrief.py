"""Post-call debrief endpoints."""

from flask import Blueprint, jsonify, request

from services.debrief_service import build_debrief
from services.scenario_service import ScenarioNotFoundError, load_scenario

debrief_blueprint = Blueprint("debrief", __name__)


@debrief_blueprint.post("/debrief")
def create_debrief():
    payload = request.get_json(silent=True) or {}
    scenario_id = payload.get("scenarioId")
    transcript = payload.get("transcript")

    if not isinstance(scenario_id, str) or not isinstance(transcript, list):
        return jsonify({"error": "scenarioId and transcript are required"}), 400

    try:
        scenario = load_scenario(scenario_id)
    except ScenarioNotFoundError:
        return jsonify({"error": "Unknown scenario"}), 404

    return jsonify(build_debrief(scenario, transcript))
