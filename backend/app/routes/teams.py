from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..services.team_service import (
    get_teams,
    get_team_summary,
    get_team_season_trend
)


teams_bp = Blueprint("teams", __name__)


@teams_bp.route("/", methods=["GET"])
@jwt_required()
def teams():

    data = get_teams()

    return jsonify(data), 200


@teams_bp.route("/<team_name>/summary", methods=["GET"])
@jwt_required()
def team_summary(team_name):

    data = get_team_summary(team_name)

    if data is None:
        return jsonify({
            "error": "Unable to fetch team summary"
        }), 500

    return jsonify(data), 200


@teams_bp.route("/<team_name>/seasons", methods=["GET"])
@jwt_required()
def team_seasons(team_name):

    data = get_team_season_trend(team_name)

    return jsonify(data), 200