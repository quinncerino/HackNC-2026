"""Voice-session creation endpoints."""

from flask import Blueprint, jsonify, request

from services import code_store
from services.elevenlabs_service import ElevenLabsError, get_conversation_token
from services.scenario_service import ScenarioNotFoundError, load_scenario

sessions_blueprint = Blueprint("sessions", __name__)


@sessions_blueprint.post("/session")
def create_session():
    payload = request.get_json(silent=True) or {}
    scenario_id = payload.get("scenarioId")
    provided_session_id = payload.get("session_id")

    if not isinstance(scenario_id, str) or not scenario_id:
        return jsonify({"error": "scenarioId is required"}), 400

    try:
        scenario = load_scenario(scenario_id)
        token_data = get_conversation_token(scenario["agentEnvVar"])
    except ScenarioNotFoundError:
        return jsonify({"error": "Unknown scenario"}), 404
    except ElevenLabsError as error:
        return jsonify({"error": str(error)}), 502

    dynamic_variables = dict(scenario["agentVariables"])
    if isinstance(provided_session_id, str):
        dynamic_variables["training_code"] = code_store.get_code(provided_session_id) or "000000"
    else:
        dynamic_variables["training_code"] = "000000"

    return jsonify(
        {
            "conversationToken": token_data["token"],
            "conversationId": token_data.get("conversation_id"),
            "scenario": {
                "id": scenario["id"],
                "title": scenario["title"],
                "description": scenario["description"],
            },
            "dynamicVariables": dynamic_variables,
        }
    )
