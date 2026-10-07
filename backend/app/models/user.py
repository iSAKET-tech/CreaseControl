from ..config import Config
from ..extensions.database import get_connection


def get_user_by_email(email):

    connection = get_connection(Config.AUTH_DB)

    if connection is None:
        print("AUTH DB CONNECTION FAILED")
        return None

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT user_id, username, email, password, role
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        print("LOGIN EMAIL:", email)
        print("USER FOUND:", user)

        return user

    finally:
        cursor.close()
        connection.close()


def get_user_by_id(user_id):

    connection = get_connection(Config.AUTH_DB)

    if connection is None:
        return None

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT user_id, username, email, role
            FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )

        return cursor.fetchone()

    finally:
        cursor.close()
        connection.close()

