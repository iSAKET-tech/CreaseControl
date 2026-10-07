from ..config import Config
from ..extensions.database import get_connection


def get_season_snapshot(season):
    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return None

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                m.match_won_by AS winner,
                CASE
                    WHEN m.match_won_by = d.team_a
                    THEN d.team_b
                    ELSE d.team_a
                END AS runner_up
            FROM matches m
            JOIN (
                SELECT
                    match_id,
                    MIN(batting_team) AS team_a,
                    MAX(batting_team) AS team_b
                FROM deliveries
                GROUP BY match_id
            ) d
                ON m.match_id = d.match_id
            WHERE m.season = %s
              AND m.stage = 'Final'
            LIMIT 1
            """,
            (season,)
        )

        final = cursor.fetchone()

        cursor.execute(
            """
            SELECT
                player_of_match,
                COUNT(*) AS awards
            FROM matches
            WHERE season = %s
            GROUP BY player_of_match
            ORDER BY awards DESC
            LIMIT 1
            """,
            (season,)
        )

        pot = cursor.fetchone()

        return {
            "season": season,
            "winner": final["winner"] if final else None,
            "runner_up": final["runner_up"] if final else None,
            "player_of_tournament": (
                pot["player_of_match"] if pot else None
            )
        }

    finally:
        cursor.close()
        connection.close()


def get_season_vitals(season):
    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return {}

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                SUM(d.runs_total) AS total_runs,
                COUNT(
                    CASE
                        WHEN d.wicket_kind IS NOT NULL
                         AND d.wicket_kind != ''
                        THEN 1
                    END
                ) AS total_wickets,
                COUNT(
                    CASE
                        WHEN d.runs_batter = 6
                        THEN 1
                    END
                ) AS sixes
            FROM deliveries d
            JOIN matches m
                ON d.match_id = m.match_id
            WHERE m.season = %s
            """,
            (season,)
        )

        totals = cursor.fetchone()

        cursor.execute(
            """
            SELECT ROUND(AVG(team_runs), 2) AS avg_first_innings
            FROM (
                SELECT
                    match_id,
                    SUM(runs_total) AS team_runs
                FROM deliveries
                WHERE innings = 1
                GROUP BY match_id
            ) t
            """
        )

        avg_score = cursor.fetchone()

        return {
            "total_runs": totals["total_runs"],
            "total_wickets": totals["total_wickets"],
            "average_first_innings_score": (
                avg_score["avg_first_innings"]
            ),
            "sixes": totals["sixes"]
        }

    finally:
        cursor.close()
        connection.close()


def get_team_momentum(season):
    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                match_number,
                match_won_by AS team,
                COUNT(*) OVER (
                    PARTITION BY match_won_by
                    ORDER BY match_number
                ) AS cumulative_wins
            FROM matches
            WHERE season = %s
              AND match_won_by IS NOT NULL
            ORDER BY match_number
            """,
            (season,)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_phase_analysis(season):
    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                CASE
                    WHEN d.over_no BETWEEN 1 AND 6
                        THEN 'Powerplay'
                    WHEN d.over_no BETWEEN 7 AND 15
                        THEN 'Middle'
                    ELSE 'Death'
                END AS phase,
                ROUND(
                    SUM(d.runs_total) /
                    COUNT(DISTINCT d.match_id),
                    2
                ) AS avg_runs,
                COUNT(
                    CASE
                        WHEN d.wicket_kind IS NOT NULL
                         AND d.wicket_kind != ''
                        THEN 1
                    END
                ) AS wickets
            FROM deliveries d
            JOIN matches m
                ON d.match_id = m.match_id
            WHERE m.season = %s
            GROUP BY phase
            """,
            (season,)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_top_batters(season):
    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                d.batter AS player,
                SUM(d.runs_batter) AS runs
            FROM deliveries d
            JOIN matches m
                ON d.match_id = m.match_id
            WHERE m.season = %s
            GROUP BY d.batter
            ORDER BY runs DESC
            LIMIT 10
            """,
            (season,)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_top_bowlers(season):
    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                d.bowler AS player,
                COUNT(*) AS wickets
            FROM deliveries d
            JOIN matches m
                ON d.match_id = m.match_id
            WHERE m.season = %s
              AND d.wicket_kind IS NOT NULL
              AND d.wicket_kind != ''
            GROUP BY d.bowler
            ORDER BY wickets DESC
            LIMIT 10
            """,
            (season,)
        )

        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()


def get_points_table(season):
    connection = get_connection(Config.IPL_DB)

    if connection is None:
        return []

    cursor = connection.cursor(dictionary=True)

    try:
        query = """
            WITH MatchTeams AS (
                SELECT
                    match_id,
                    MAX(
                        CASE
                            WHEN innings = 1
                            THEN batting_team
                        END
                    ) AS team1,
                    MAX(
                        CASE
                            WHEN innings = 1
                            THEN bowling_team
                        END
                    ) AS team2
                FROM deliveries
                GROUP BY match_id
            ),

            MatchResults AS (
                SELECT
                    m.match_won_by AS team,
                    1 AS win,
                    0 AS loss
                FROM matches m
                WHERE m.season = %s
                  AND m.match_won_by IS NOT NULL

                UNION ALL

                SELECT
                    CASE
                        WHEN mt.team1 = m.match_won_by
                        THEN mt.team2
                        ELSE mt.team1
                    END AS team,
                    0 AS win,
                    1 AS loss
                FROM matches m
                JOIN MatchTeams mt
                    ON m.match_id = mt.match_id
                WHERE m.season = %s
                  AND m.match_won_by IS NOT NULL
            )

            SELECT
                team,
                COUNT(*) AS matches_played,
                SUM(win) AS wins,
                SUM(loss) AS losses,
                SUM(win) * 2 AS points
            FROM MatchResults
            GROUP BY team
            ORDER BY points DESC, wins DESC
        """

        cursor.execute(query, (season, season))

        data = cursor.fetchall()

        for index, team in enumerate(data):
            team["qualified"] = index < 4

        return data

    finally:
        cursor.close()
        connection.close()