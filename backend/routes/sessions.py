"""Voice-session creation endpoints."""

from flask import Blueprint, jsonify, request

from services.elevenlabs_service import ElevenLabsError, get_conversation_token
from services.scenario_service import ScenarioNotFoundError, load_scenario

sessions_blueprint = Blueprint("sessions", __name__)


@sessions_blueprint.post("/session")
def create_session():
    payload = request.get_json(silent=True) or {}
    scenario_id = payload.get("scenarioId")

    if not isinstance(scenario_id, str) or not scenario_id:
        return jsonify({"error": "scenarioId is required"}), 400

    try:
        scenario = load_scenario(scenario_id)
        token_data = get_conversation_token()
    except ScenarioNotFoundError:
        return jsonify({"error": "Unknown scenario"}), 404
    except ElevenLabsError as error:
        return jsonify({"error": str(error)}), 502

    return jsonify(
        {
            "conversationToken": token_data["token"],
            "conversationId": token_data.get("conversation_id"),
            "scenario": {
                "id": scenario["id"],
                "title": scenario["title"],
                "description": scenario["description"],
            },
            "dynamicVariables": scenario["agentVariables"],
        }
    )
