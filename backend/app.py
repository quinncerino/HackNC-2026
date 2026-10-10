"""Flask application entry point for the Nice Try local API."""

from flask import Flask, jsonify

from routes.debrief import debrief_blueprint
from routes.scenarios import scenarios_blueprint
from routes.sessions import sessions_blueprint


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(scenarios_blueprint, url_prefix="/api")
    app.register_blueprint(sessions_blueprint, url_prefix="/api")
    app.register_blueprint(debrief_blueprint, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
