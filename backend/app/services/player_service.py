from ..config import Config
from ..extensions.database import get_connection


def search_players(query_text):

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)
    search_term = f"%{query_text}%"

    try:
        cursor.execute(
            """
            SELECT DISTINCT name
            FROM (
                SELECT player_name AS name
                FROM player_stats
                WHERE player_name LIKE %s

                UNION

                SELECT longName AS name
                FROM player_stats
                WHERE longName LIKE %s
            ) AS combined
            ORDER BY name ASC
            LIMIT 10
            """,
            (search_term, search_term)
        )

        return cursor.fetchall()

    except Exception:
        return []

    finally:
        cursor.close()
        connection.close()


def verify_player(name):

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return None

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT player_name
            FROM player_stats
            WHERE LOWER(player_name) = LOWER(%s)
               OR LOWER(longName) = LOWER(%s)
            LIMIT 1
            """,
            (name, name)
        )

        return cursor.fetchone()

    finally:
        cursor.close()
        connection.close()


def get_player_detail(player_name):

    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return None

    cursor = connection.cursor(dictionary=True)

    try:

        # PROFILE
        cursor.execute(
            """
            SELECT player_name, longName, dob, nationality,
                   international_team, playingRoles,
                   longBattingStyles, longBowlingStyles,
                   catches, stumpings
            FROM player_stats
            WHERE LOWER(player_name) = LOWER(%s)
               OR LOWER(longName) = LOWER(%s)
            LIMIT 1
            """,
            (player_name, player_name)
        )

        profile = cursor.fetchone()

        if not profile:
            return None

        short_name = profile["player_name"]

        # CAREER BATTING
        cursor.execute(
            """
            SELECT
                COUNT(DISTINCT match_id) AS matches,
                SUM(runs_batter) AS runs,
                COUNT(CASE WHEN valid_ball = 1 THEN 1 END) AS balls,
                SUM(CASE WHEN runs_batter = 4 THEN 1 ELSE 0 END) AS fours,
                SUM(CASE WHEN runs_batter = 6 THEN 1 ELSE 0 END) AS sixes,
                ROUND(
                    (
                        SUM(runs_batter) /
                        NULLIF(
                            COUNT(CASE WHEN valid_ball = 1 THEN 1 END),
                            0
                        )
                    ) * 100,
                    2
                ) AS strike_rate
            FROM deliveries
            WHERE batter = %s
            """,
            (short_name,)
        )

        batting = cursor.fetchone()

        # CAREER BOWLING
        cursor.execute(
            """
            SELECT
                ROUND(SUM(valid_ball) / 6, 1) AS overs,
                COUNT(player_out) AS wickets,
                SUM(runs_total) AS runs_conceded,
                ROUND(
                    SUM(runs_total) /
                    NULLIF(SUM(valid_ball) / 6, 0),
                    2
                ) AS economy,
                ROUND(
                    SUM(valid_ball) /
                    NULLIF(COUNT(player_out), 0),
                    2
                ) AS bowling_strike_rate
            FROM deliveries
            WHERE bowler = %s
              AND wicket_kind IS NOT NULL
              AND wicket_kind NOT IN ('run out', 'retired hurt')
            """,
            (short_name,)
        )

        bowling = cursor.fetchone()

        # FIELDING
        cursor.execute(
            """
            SELECT catches, stumpings
            FROM player_stats
            WHERE player_name = %s
            """,
            (short_name,)
        )

        fielding = cursor.fetchone()

        # PHASE-WISE
        cursor.execute(
            """
            SELECT
                CASE
                    WHEN over_no BETWEEN 1 AND 6 THEN 'Powerplay'
                    WHEN over_no BETWEEN 7 AND 15 THEN 'Middle'
                    ELSE 'Death'
                END AS phase,
                SUM(runs_batter) AS runs,
                COUNT(
                    CASE WHEN valid_ball = 1 THEN 1 END
                ) AS balls
            FROM deliveries
            WHERE batter = %s
            GROUP BY phase
            ORDER BY FIELD(
                phase,
                'Powerplay',
                'Middle',
                'Death'
            )
            """,
            (short_name,)
        )

        phase = cursor.fetchall()

        # TEAMS
        cursor.execute(
            """
            SELECT DISTINCT batting_team AS team
            FROM deliveries
            WHERE batter = %s
            """,
            (short_name,)
        )

        teams = [
            row["team"]
            for row in cursor.fetchall()
        ]

        # SEASON-WISE
        cursor.execute(
            """
            SELECT
                m.season,
                COUNT(DISTINCT d.match_id) AS matches,
                SUM(d.runs_batter) AS runs,
                COUNT(
                    CASE WHEN d.valid_ball = 1 THEN 1 END
                ) AS balls,
                SUM(
                    CASE WHEN d.runs_batter = 4 THEN 1 ELSE 0 END
                ) AS fours,
                SUM(
                    CASE WHEN d.runs_batter = 6 THEN 1 ELSE 0 END
                ) AS sixes,
                ROUND(
                    (
                        SUM(d.runs_batter) /
                        NULLIF(
                            COUNT(
                                CASE WHEN d.valid_ball = 1 THEN 1 END
                            ),
                            0
                        )
                    ) * 100,
                    2
                ) AS strike_rate,
                ROUND(
                    SUM(
                        CASE
                            WHEN d.bowler = %s
                            THEN d.valid_ball
                            ELSE 0
                        END
                    ) / 6,
                    1
                ) AS overs,
                COUNT(
                    CASE
                        WHEN d.bowler = %s
                         AND d.wicket_kind IS NOT NULL
                         AND d.wicket_kind NOT IN (
                             'run out',
                             'retired hurt'
                         )
                        THEN 1
                    END
                ) AS wickets
            FROM deliveries d
            JOIN matches m
                ON d.match_id = m.match_id
            WHERE d.batter = %s
               OR d.bowler = %s
            GROUP BY m.season
            ORDER BY m.season
            """,
            (
                short_name,
                short_name,
                short_name,
                short_name
            )
        )

        seasonal_stats = cursor.fetchall()

        return {
            "profile": profile,
            "batting": batting,
            "bowling": bowling,
            "fielding": fielding,
            "phase": phase,
            "teams_played_for": teams,
            "seasonal_stats": seasonal_stats
        }

    finally:
        cursor.close()
        connection.close()