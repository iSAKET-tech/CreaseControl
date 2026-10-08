import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt } from "react-icons/fa";

import { getTeams } from "../services/api";

function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const data = await getTeams();

        setTeams(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Failed to load teams");
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, []);

  const handleTeamClick = (teamName) => {
    navigate(`/teams/${encodeURIComponent(teamName)}`);
  };

  if (loading) {
    return (
      <div className="teams-loader">
        Loading teams...
      </div>
    );
  }

  return (
    <div className="teams-page">
      <div className="teams-header">
        <p className="page-kicker">CREASECONTROL / TEAMS</p>

        <h1>IPL TEAMS</h1>

        <p className="teams-subtitle">
          Explore team performance and statistics across IPL seasons.
        </p>
      </div>

      {error && (
        <div className="players-error">
          {error}
        </div>
      )}

      <div className="teams-grid">
        {teams.map((team) => (
          <div
            key={team.team}
            className="team-card"
            onClick={() => handleTeamClick(team.team)}
          >
            <div className="team-card-top">
              <div className="team-icon">
                <FaShieldAlt />
              </div>

              <span className="team-arrow">→</span>
            </div>

            <h2>{team.team}</h2>

            <div className="team-card-stats">
              <div>
                <span>WINS</span>
                <strong>{team.matches_won}</strong>
              </div>

              <div>
                <span>TOTAL RUNS</span>
                <strong>{team.total_runs}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Teams;