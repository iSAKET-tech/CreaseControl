from functools import wraps

from flask import jsonify
from flask_jwt_extended import (
    verify_jwt_in_request,
    get_jwt
)


def role_required(required_role):

    def decorator(function):

        @wraps(function)
        def wrapper(*args, **kwargs):

            verify_jwt_in_request()

            claims = get_jwt()

            user_role = claims.get("role")

            if user_role != required_role:
                return jsonify({
                    "error": "Access forbidden"
                }), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator


def roles_required(*required_roles):

    def decorator(function):

        @wraps(function)
        def wrapper(*args, **kwargs):

            verify_jwt_in_request()

            claims = get_jwt()

            user_role = claims.get("role")

            if user_role not in required_roles:
                return jsonify({
                    "error": "Access forbidden"
                }), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator