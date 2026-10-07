from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..services.player_service import (
    search_players,
    verify_player,
    get_player_detail
)


players_bp = Blueprint("players", __name__)


@players_bp.route("/search", methods=["GET"])
@jwt_required()
def search():

    query = request.args.get("q", "").strip()

    if len(query) < 2:
        return jsonify([]), 200

    players = search_players(query)

    return jsonify(players), 200


@players_bp.route("/verify/<name>", methods=["GET"])
@jwt_required()
def verify(name):

    player = verify_player(name)

    if not player:
        return jsonify({"exists": False}), 404

    return jsonify({
        "exists": True,
        "shortName": player["player_name"]
    }), 200


@players_bp.route("/<player_name>", methods=["GET"])
@jwt_required()
def detail(player_name):

    result = get_player_detail(player_name)

    if result is None:
        return jsonify({"error": "Player not found"}), 404

    return jsonify(result), 200