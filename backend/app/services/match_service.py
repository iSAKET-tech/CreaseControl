from ..config import Config
from ..extensions.database import get_connection


def get_matches():

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM matches"
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()