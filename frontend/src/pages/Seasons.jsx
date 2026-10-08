import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

import {
  getSeasonSnapshot,
  getSeasonVitals,
  getPhaseAnalysis,
  getTopBatters,
  getTopBowlers,
  getPointsTable,
} from "../services/api";



const SEASONS = Array.from({ length: 19 }, (_, i) => 2008 + i);

function Seasons() {
  const navigate = useNavigate();

  const [season, setSeason] = useState(2023);

  const [snapshot, setSnapshot] = useState({});
  const [vitals, setVitals] = useState({});
  const [phases, setPhases] = useState([]);
  const [topBatters, setTopBatters] = useState([]);
  const [topBowlers, setTopBowlers] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSeason = async () => {
      setLoading(true);
      setError("");

      try {
        const results = await Promise.all([
          getSeasonSnapshot(season),
          getSeasonVitals(season),
          getPhaseAnalysis(season),
          getTopBatters(season),
          getTopBowlers(season),
          getPointsTable(season),
        ]);

        if (cancelled) return;

        setSnapshot(results[0] || {});
        setVitals(results[1] || {});
        setPhases(Array.isArray(results[2]) ? results[2] : []);
        setTopBatters(Array.isArray(results[3]) ? results[3] : []);
        setTopBowlers(Array.isArray(results[4]) ? results[4] : []);
        setPointsTable(Array.isArray(results[5]) ? results[5] : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load season data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSeason();

    return () => {
      cancelled = true;
    };
  }, [season]);

  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const display = (value, fallback = "—") => {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    return String(value).replace(/\r/g, "");
  };

  const goToTeam = (team) => {
    if (!team || team === "Unknown") return;

    navigate(`/teams/${encodeURIComponent(team)}`);
  };

  if (loading) {
    return (
      <div className="season-page">
        <div className="season-loading">
          <span>LOADING SEASON DATA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="season-page">

      {/* HEADER */}
      <header className="season-header">
        <div>
          <p className="season-kicker">
            CREASECONTROL / SEASONS
          </p>

          <h1>SEASON TRENDS</h1>

          <p className="season-subtitle">
            Explore tactical evolution, player dominance and team
            performance across IPL seasons.
          </p>
        </div>

        <div className="season-selector">
          <label htmlFor="season-select">
            SELECT SEASON
          </label>

          <select
            id="season-select"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
          >
            {SEASONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && (
        <div className="season-error">
          {error}
        </div>
      )}

      {/* SNAPSHOT */}
      <section className="season-snapshot">

        <div className="snapshot-label">
          <span>SEASON</span>
          <strong>{season}</strong>
        </div>

        <button
          type="button"
          className="snapshot-item clickable"
          onClick={() => goToTeam(snapshot.winner)}
        >
          <span>WINNER</span>
          <strong>{display(snapshot.winner)}</strong>
        </button>

        <button
          type="button"
          className="snapshot-item clickable"
          onClick={() => goToTeam(snapshot.runner_up)}
        >
          <span>RUNNER UP</span>
          <strong>{display(snapshot.runner_up)}</strong>
        </button>

        <div className="snapshot-item">
          <span>PLAYER OF TOURNAMENT</span>
          <strong>
            {display(snapshot.player_of_tournament)}
          </strong>
        </div>

      </section>

      {/* VITALS */}
      <section className="season-vitals">

        <div className="vital-block">
          <span>TOTAL RUNS</span>
          <strong>{display(vitals.total_runs)}</strong>
        </div>

        <div className="vital-block">
          <span>TOTAL WICKETS</span>
          <strong>{display(vitals.total_wickets)}</strong>
        </div>

        <div className="vital-block">
          <span>AVG 1ST INNINGS</span>
          <strong>
            {display(vitals.average_first_innings_score)}
          </strong>
        </div>

        <div className="vital-block">
          <span>SIXES</span>
          <strong>{display(vitals.sixes)}</strong>
        </div>

      </section>

      {/* PHASE ANALYSIS */}
      <section className="season-chart-section">

        <div className="section-heading">
          <div>
            <p>01 / TACTICAL EVOLUTION</p>
            <h2>PHASE ANALYSIS</h2>
          </div>

          <span>{season} SEASON</span>
        </div>

        <div className="chart-frame">
          {phases.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={phases}
                margin={{
                  top: 20,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <XAxis
                  dataKey="phase"
                  tick={{
                    fill: "var(--cc-ink)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  axisLine={{
                    stroke: "var(--cc-border)",
                  }}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: "var(--cc-muted)",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "var(--cc-paper)",
                    border: "2px solid var(--cc-ink)",
                    borderRadius: 0,
                    boxShadow: "4px 4px 0 var(--cc-ink)",
                    color: "var(--cc-ink)",
                  }}
                />

                <Legend />

                <Bar
                  dataKey="avg_runs"
                  name="Avg Runs"
                  fill="var(--cc-cyan)"
                  stroke="var(--cc-ink)"
                  strokeWidth={2}
                />

                <Bar
                  dataKey="wickets"
                  name="Wickets"
                  fill="var(--cc-pink)"
                  stroke="var(--cc-ink)"
                  strokeWidth={2}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">
              NO PHASE DATA AVAILABLE
            </div>
          )}
        </div>

      </section>

      {/* TOP BATTERS */}
      <section className="season-chart-section">

        <div className="section-heading">
          <div>
            <p>02 / BATTING DOMINANCE</p>
            <h2>TOP RUN SCORERS</h2>
          </div>

          <span>ORANGE CAP DATA</span>
        </div>

        <div className="chart-frame">

          {topBatters.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart
                data={topBatters}
                margin={{
                  top: 20,
                  right: 20,
                  left: 0,
                  bottom: 55,
                }}
              >
                <XAxis
                  dataKey="player"
                  angle={-35}
                  textAnchor="end"
                  height={80}
                  tick={{
                    fill: "var(--cc-ink)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                  axisLine={{
                    stroke: "var(--cc-border)",
                  }}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: "var(--cc-muted)",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "var(--cc-paper)",
                    border: "2px solid var(--cc-ink)",
                    borderRadius: 0,
                    boxShadow: "4px 4px 0 var(--cc-ink)",
                  }}
                />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="runs"
                  name="Runs"
                  stroke="var(--cc-ink)"
                  strokeWidth={4}
                  dot={{
                    fill: "var(--cc-lime)",
                    stroke: "var(--cc-ink)",
                    strokeWidth: 2,
                    r: 5,
                  }}
                  activeDot={{
                    r: 7,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">
              NO BATTING DATA AVAILABLE
            </div>
          )}

        </div>

      </section>

      {/* TOP BOWLERS */}
      <section className="season-chart-section">

        <div className="section-heading">
          <div>
            <p>03 / BOWLING DOMINANCE</p>
            <h2>TOP WICKET TAKERS</h2>
          </div>

          <span>PURPLE CAP DATA</span>
        </div>

        <div className="chart-frame">

          {topBowlers.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={topBowlers}
                margin={{
                  top: 20,
                  right: 20,
                  left: 0,
                  bottom: 55,
                }}
              >
                <XAxis
                  dataKey="player"
                  angle={-30}
                  textAnchor="end"
                  height={80}
                  tick={{
                    fill: "var(--cc-ink)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                  axisLine={{
                    stroke: "var(--cc-border)",
                  }}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: "var(--cc-muted)",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "var(--cc-paper)",
                    border: "2px solid var(--cc-ink)",
                    borderRadius: 0,
                    boxShadow: "4px 4px 0 var(--cc-ink)",
                  }}
                />

                <Legend />

                <Bar
                  dataKey="wickets"
                  name="Wickets"
                  stroke="var(--cc-ink)"
                  strokeWidth={2}
                >
                  {topBowlers.map((_, index) => {
                    const fills = [
                      "var(--cc-lime)",
                      "var(--cc-cyan)",
                      "var(--cc-pink)",
                      "var(--cc-yellow)",
                      "var(--cc-paper)",
                    ];

                    return (
                      <Cell
                        key={`bowler-${index}`}
                        fill={fills[index % fills.length]}
                      />
                    );
                  })}
                </Bar>

              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">
              NO BOWLING DATA AVAILABLE
            </div>
          )}

        </div>

      </section>

      {/* POINTS TABLE */}
      <section className="points-section">

        <div className="section-heading">
          <div>
            <p>04 / TEAM PERFORMANCE</p>
            <h2>FINAL POINTS TABLE</h2>
          </div>

          <span>{season}</span>
        </div>

        <div className="table-wrapper">

          <table className="points-table">

            <thead>
              <tr>
                <th>#</th>
                <th>TEAM</th>
                <th>M</th>
                <th>W</th>
                <th>L</th>
                <th>PTS</th>
              </tr>
            </thead>

            <tbody>
              {pointsTable.map((team, index) => (
                <tr
                  key={`${team.team}-${index}`}
                  className={team.qualified ? "qualified" : ""}
                  onClick={() => goToTeam(team.team)}
                >
                  <td className="position">
                    {String(index + 1).padStart(2, "0")}
                  </td>

                  <td className="team-name">
                    {display(team.team)}
                  </td>

                  <td>
                    {display(team.matches_played)}
                  </td>

                  <td>
                    {display(team.wins)}
                  </td>

                  <td>
                    {display(team.losses)}
                  </td>

                  <td className="points">
                    {display(team.points)}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

        <p className="qualification-note">
          * Final points table includes playoffs, qualifiers and final.
        </p>

      </section>

    </div>
  );
}

export default Seasons;