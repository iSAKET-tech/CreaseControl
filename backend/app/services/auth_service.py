from flask_jwt_extended import create_access_token

from ..models.user import (
    get_user_by_email,
    get_user_by_id
)


def authenticate_user(email, password):

    user = get_user_by_email(email)

    if not user:
        return None, "Invalid email or password"

    if user["password"] != password:
        return None, "Invalid email or password"

    token = create_access_token(
        identity=str(user["user_id"]),
        additional_claims={
            "role": user["role"],
            "email": user["email"]
        }
    )

    return {
        "access_token": token,
        "user": {
            "id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"]
        }
    }, None