from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..services.auth_service import authenticate_user
from ..models.user import get_user_by_id


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    result, error = authenticate_user(
        email,
        password
    )

    if error:
        return jsonify({
            "error": error
        }), 401

    return jsonify(result), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def current_user():

    user_id = get_jwt_identity()

    user = get_user_by_id(user_id)

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    return jsonify({
        "user": user
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():

    return jsonify({
        "message": "Logout successful"
    }), 200