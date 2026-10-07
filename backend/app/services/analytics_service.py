from ..config import Config
from ..extensions.database import get_connection


def get_dashboard_summary():

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return {}

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT COUNT(*) AS total_matches
            FROM matches
            """
        )

        total_matches = cursor.fetchone()["total_matches"]

        cursor.execute(
            """
            SELECT SUM(runs_total) AS total_runs
            FROM deliveries
            """
        )

        total_runs = cursor.fetchone()["total_runs"] or 0

        cursor.execute(
            """
            SELECT COUNT(wicket_kind) AS total_wickets
            FROM deliveries
            WHERE wicket_kind IS NOT NULL
              AND wicket_kind != ''
            """
        )

        total_wickets = cursor.fetchone()["total_wickets"]

        cursor.execute(
            """
            SELECT
                bowler,
                COUNT(wicket_kind) AS wicket_count
            FROM deliveries
            WHERE wicket_kind IS NOT NULL
              AND wicket_kind != ''
              AND wicket_kind NOT IN (
                  'run out',
                  'retired hurt',
                  'obstructing the field'
              )
            GROUP BY bowler
            ORDER BY wicket_count DESC
            LIMIT 1
            """
        )

        top_bowler_data = cursor.fetchone()

        top_bowler_name = (
            top_bowler_data["bowler"]
            if top_bowler_data
            else "N/A"
        )

        top_bowler_wickets = (
            top_bowler_data["wicket_count"]
            if top_bowler_data
            else 0
        )

        return {
            "total_matches": total_matches,
            "total_runs": total_runs,
            "total_wickets": total_wickets,
            "top_bowler_name": top_bowler_name,
            "top_bowler_wickets": top_bowler_wickets
        }

    finally:
        cursor.close()
        connection.close()


def get_season_performance():

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                m.season AS season,
                COUNT(DISTINCT d.match_id) AS total_matches,
                SUM(d.runs_total) AS total_runs,
                SUM(
                    CASE
                        WHEN d.wicket_kind IS NOT NULL
                         AND d.wicket_kind != ''
                        THEN 1
                        ELSE 0
                    END
                ) AS total_wickets
            FROM deliveries d
            JOIN matches m
                ON d.match_id = m.match_id
            WHERE d.valid_ball = 1
            GROUP BY m.season
            ORDER BY m.season
            """
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_top_batsmen():

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                batter AS name,
                SUM(runs_batter) AS runs
            FROM deliveries
            GROUP BY batter
            ORDER BY runs DESC
            LIMIT 5
            """
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_team_win_ratio():

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                match_won_by AS team,
                COUNT(*) AS wins
            FROM matches
            WHERE match_won_by IS NOT NULL
            GROUP BY match_won_by
            """
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()