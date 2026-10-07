from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions.jwt import jwt

from .routes.auth import auth_bp
from .routes.players import players_bp
from .routes.teams import teams_bp
from .routes.matches import matches_bp
from .routes.seasons import seasons_bp


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "http://localhost:5173"
            }
        }
    )

    jwt.init_app(app)

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    app.register_blueprint(
        players_bp,
        url_prefix="/api/players"
    )

    app.register_blueprint(
        teams_bp,
        url_prefix="/api/teams"
    )

    app.register_blueprint(
        matches_bp,
        url_prefix="/api/matches"
    )

    app.register_blueprint(
        seasons_bp,
        url_prefix="/api/seasons"
    )

    @app.route("/")
    def home():
        return {
            "message": "CreaseControl API is running",
            "status": "success"
        }

    

    @app.route("/api/health")
    def health():
        return {
            "status": "healthy"
        }

    return app