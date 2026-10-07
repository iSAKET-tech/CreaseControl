import mysql.connector
from mysql.connector import Error


def get_connection(database_config):

    try:
        connection = mysql.connector.connect(
            host=database_config["host"],
            port=database_config["port"],
            user=database_config["user"],
            password=database_config["password"],
            database=database_config["database"]
        )

        return connection

    except Error as error:

        print(f"Database connection error: {error}")

        return None