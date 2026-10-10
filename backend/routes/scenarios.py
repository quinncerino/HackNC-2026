"""Scenario-listing endpoints."""

from flask import Blueprint, jsonify

from services.scenario_service import list_public_scenarios

scenarios_blueprint = Blueprint("scenarios", __name__)


@scenarios_blueprint.get("/scenarios")
def get_scenarios():
    return jsonify(list_public_scenarios())
