from ..config import Config
from ..extensions.database import get_connection


def get_teams():

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                m.match_won_by AS team,
                COUNT(DISTINCT m.match_id) AS matches_won,
                COALESCE(SUM(d.runs_batter), 0) AS total_runs,
                SUM(
                    CASE
                        WHEN d.wicket_kind IS NOT NULL
                             AND d.wicket_kind != ''
                        THEN 1
                        ELSE 0
                    END
                ) AS total_wickets
            FROM matches m
            LEFT JOIN deliveries d
                ON m.match_id = d.match_id
            WHERE m.match_won_by IS NOT NULL
            GROUP BY m.match_won_by
            ORDER BY m.match_won_by
            """
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_team_summary(team_name):

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return None

    cursor = connection.cursor(dictionary=True)

    try:

        # Matches won
        cursor.execute(
            """
            SELECT COUNT(*) AS matches_won
            FROM matches
            WHERE match_won_by = %s
            """,
            (team_name,)
        )

        matches_won = cursor.fetchone()["matches_won"]

        # Total runs
        cursor.execute(
            """
            SELECT SUM(d.runs_batter) AS runs
            FROM deliveries d
            JOIN matches m
                ON d.match_id = m.match_id
            WHERE m.match_won_by = %s
            """,
            (team_name,)
        )

        total_runs = cursor.fetchone()["runs"] or 0

        # Total wickets
        cursor.execute(
            """
            SELECT COUNT(*) AS wickets
            FROM deliveries d
            JOIN matches m
                ON d.match_id = m.match_id
            WHERE m.match_won_by = %s
              AND wicket_kind != ''
              AND d.wicket_kind IS NOT NULL
            """,
            (team_name,)
        )

        total_wickets = cursor.fetchone()["wickets"]

        # Top batsman
        cursor.execute(
            """
            SELECT
                batter,
                SUM(runs_batter) AS runs
            FROM deliveries
            WHERE batting_team = %s
            GROUP BY batter
            ORDER BY runs DESC
            LIMIT 1
            """,
            (team_name,)
        )

        top_batsman = cursor.fetchone()

        # Top bowler
        cursor.execute(
            """
            SELECT
                bowler,
                COUNT(wicket_kind) AS wickets
            FROM deliveries
            WHERE bowling_team = %s
              AND wicket_kind NOT IN (
                  '',
                  'run out',
                  'retired hurt',
                  'obstructing the field'
              )
              AND wicket_kind IS NOT NULL
            GROUP BY bowler
            ORDER BY wickets DESC
            LIMIT 1
            """,
            (team_name,)
        )

        top_bowler = cursor.fetchone()

        # Last 5 matches
        cursor.execute(
            """
            SELECT
                DATE_FORMAT(m.date, '%Y-%m-%d') AS date,

                (
                    SELECT DISTINCT
                        CASE
                            WHEN d.batting_team = %s
                            THEN d.bowling_team
                            ELSE d.batting_team
                        END
                    FROM deliveries d
                    WHERE d.match_id = m.match_id
                    LIMIT 1
                ) AS opponent,

                m.match_won_by AS won_by,
                m.win_outcome,

                CASE
                    WHEN m.match_won_by = %s THEN 'W'
                    WHEN m.result_type = 'no result' THEN 'NR'
                    ELSE 'L'
                END AS result,

                m.venue

            FROM matches m

            WHERE m.match_id IN (
                SELECT DISTINCT match_id
                FROM deliveries
                WHERE batting_team = %s
                   OR bowling_team = %s
            )

            ORDER BY m.date DESC
            LIMIT 5
            """,
            (
                team_name,
                team_name,
                team_name,
                team_name
            )
        )

        recent_history = cursor.fetchall()

        # Championships
        cursor.execute(
            """
            SELECT COUNT(*) AS titles
            FROM matches
            WHERE stage = 'Final'
              AND match_won_by = %s
            """,
            (team_name,)
        )

        result = cursor.fetchone()
        championships = result["titles"] if result else 0

        return {
            "team": team_name,
            "championships": championships,
            "matches_won": matches_won,
            "total_runs": total_runs,
            "total_wickets": total_wickets,
            "top_batsman": {
                "name": top_batsman["batter"],
                "runs": top_batsman["runs"]
            } if top_batsman else None,
            "top_bowler": {
                "name": top_bowler["bowler"],
                "wickets": top_bowler["wickets"]
            } if top_bowler else None,
            "recent_history": recent_history
        }

    finally:
        cursor.close()
        connection.close()


def get_team_season_trend(team_name):

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                m.season,
                COUNT(DISTINCT m.match_id) AS matches_won,
                SUM(d.runs_batter) AS total_runs,
                SUM(
                    CASE
                        WHEN d.wicket_kind IS NOT NULL
                             AND d.wicket_kind != ''
                        THEN 1
                        ELSE 0
                    END
                ) AS total_wickets
            FROM matches m
            JOIN deliveries d
                ON m.match_id = d.match_id
            WHERE m.match_won_by = %s
            GROUP BY m.season
            ORDER BY m.season
            """,
            (team_name,)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()