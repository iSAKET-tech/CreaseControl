from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..services.season_service import (
    get_season_snapshot,
    get_season_vitals,
    get_team_momentum,
    get_phase_analysis,
    get_top_batters,
    get_top_bowlers,
    get_points_table
)


seasons_bp = Blueprint("seasons", __name__)


@seasons_bp.route("/snapshot", methods=["GET"])
@jwt_required()
def season_snapshot():

    season = request.args.get("season", type=int)

    data = get_season_snapshot(season)

    return jsonify(data), 200


@seasons_bp.route("/vitals", methods=["GET"])
@jwt_required()
def season_vitals():

    season = request.args.get("season", type=int)

    data = get_season_vitals(season)

    return jsonify(data), 200


@seasons_bp.route("/momentum", methods=["GET"])
@jwt_required()
def team_momentum():

    season = request.args.get("season", type=int)

    data = get_team_momentum(season)

    return jsonify(data), 200


@seasons_bp.route("/phases", methods=["GET"])
@jwt_required()
def phase_analysis():

    season = request.args.get("season", type=int)

    data = get_phase_analysis(season)

    return jsonify(data), 200


@seasons_bp.route("/top-batters", methods=["GET"])
@jwt_required()
def top_batters():

    season = request.args.get("season", type=int)

    data = get_top_batters(season)

    return jsonify(data), 200


@seasons_bp.route("/top-bowlers", methods=["GET"])
@jwt_required()
def top_bowlers():

    season = request.args.get("season", type=int)

    data = get_top_bowlers(season)

    return jsonify(data), 200


@seasons_bp.route(
    "/<int:season>/points-table",
    methods=["GET"]
)
@jwt_required()
def season_points_table(season):

    data = get_points_table(season)

    return jsonify(data), 200