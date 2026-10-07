import os
from dotenv import load_dotenv

load_dotenv()


class Config:

    SECRET_KEY = os.getenv("SECRET_KEY")

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    IPL_DB = {
        "host": os.getenv("IPL_DB_HOST"),
        "port": int(os.getenv("IPL_DB_PORT", 3306)),
        "user": os.getenv("IPL_DB_USER"),
        "password": os.getenv("IPL_DB_PASSWORD"),
        "database": os.getenv("IPL_DB_NAME")
    }

    AUTH_DB = {
        "host": os.getenv("AUTH_DB_HOST"),
        "port": int(os.getenv("AUTH_DB_PORT", 3306)),
        "user": os.getenv("AUTH_DB_USER"),
        "password": os.getenv("AUTH_DB_PASSWORD"),
        "database": os.getenv("AUTH_DB_NAME")
    }