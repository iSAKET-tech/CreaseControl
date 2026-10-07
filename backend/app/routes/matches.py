from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..services.match_service import get_matches

from ..services.analytics_service import (
    get_dashboard_summary,
    get_season_performance,
    get_top_batsmen,
    get_team_win_ratio
)


matches_bp = Blueprint("matches", __name__)


@matches_bp.route("/", methods=["GET"])
@jwt_required()
def matches():

    data = get_matches()

    return jsonify(data), 200


@matches_bp.route("/dashboard/summary", methods=["GET"])
@jwt_required()
def dashboard_summary():

    data = get_dashboard_summary()

    return jsonify(data), 200


@matches_bp.route("/dashboard/season-performance", methods=["GET"])
@jwt_required()
def season_performance():

    data = get_season_performance()

    return jsonify(data), 200


@matches_bp.route("/dashboard/top-batsmen", methods=["GET"])
@jwt_required()
def top_batsmen():

    data = get_top_batsmen()

    return jsonify(data), 200


@matches_bp.route("/dashboard/team-win-ratio", methods=["GET"])
@jwt_required()
def team_win_ratio():

    data = get_team_win_ratio()

    return jsonify(data), 200