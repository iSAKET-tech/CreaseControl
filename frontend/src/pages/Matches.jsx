import { useEffect, useMemo, useState } from "react";
import { FaSearch, FaCalendarAlt, FaMapMarkerAlt } from "react-icons/fa";
import { getMatches } from "../services/api";

function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("ALL");

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const data = await getMatches();

        const results = Array.isArray(data)
          ? data
          : data?.matches || data?.data || [];

        setMatches(results);
      } catch (err) {
        setError(err.message || "Failed to load matches");
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  const seasons = useMemo(() => {
    const uniqueSeasons = [
      ...new Set(
        matches
          .map((match) => match.season)
          .filter(Boolean)
      ),
    ];

    return uniqueSeasons.sort((a, b) =>
      String(b).localeCompare(String(a), undefined, {
        numeric: true,
      })
    );
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return matches.filter((match) => {
      const matchesSeason =
        season === "ALL" || String(match.season) === season;

      if (!matchesSeason) return false;

      if (!query) return true;

      const searchableText = [
        match.team1,
        match.team2,
        match.match_won_by,
        match.player_of_match,
        match.venue,
        match.city,
        match.season,
        match.match_number,
        match.match_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [matches, search, season]);

  const formatDate = (match) => {
    if (match.day && match.month && match.year) {
      const date = new Date(
        Date.UTC(
          Number(match.year),
          Number(match.month) - 1,
          Number(match.day)
        )
      );

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        });
      }
    }

    return match.date || "Unknown date";
  };

  const cleanValue = (value) => {
    if (!value) return "Unknown";

    const cleaned = String(value)
      .replace(/\r/g, "")
      .trim();

    return cleaned || "Unknown";
  };

  const getTeamName = (team) => cleanValue(team);

  if (loading) {
    return (
      <div className="matches-loader">
        Loading matches...
      </div>
    );
  }

  return (
    <div className="matches-page">
      {/* HEADER */}
      <div className="matches-header">
        <div>
          <p className="page-kicker">
            CREASECONTROL / MATCHES
          </p>

          <h1>MATCHES</h1>

          <p className="matches-subtitle">
            Explore IPL matches, results and match-level details.
          </p>
        </div>

        <div className="matches-count">
          <strong>{filteredMatches.length}</strong>
          <span>MATCHES</span>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="matches-error">
          {error}
        </div>
      )}

      {/* FILTERS */}
      <div className="matches-filters">
        <div className="match-search">
          <FaSearch />

          <input
            type="text"
            placeholder="Search teams, players, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="season-filter">
          <FaCalendarAlt />

          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            <option value="ALL">ALL SEASONS</option>

            {seasons.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MATCH LIST */}
      {filteredMatches.length === 0 ? (
        <div className="matches-empty">
          <h3>NO MATCHES FOUND</h3>
          <p>
            Try changing your search or season filter.
          </p>
        </div>
      ) : (
        <div className="matches-list">
          {filteredMatches.map((match, index) => {
            const team1 = getTeamName(match.batting_team);
            const team2 = getTeamName(match.bowling_team);
            const winner = cleanValue(match.match_won_by);
            const playerOfMatch = cleanValue(
              match.player_of_match
            );

            const matchNumber = cleanValue(
              match.match_number
            );

            const isKnownMatchNumber =
              matchNumber !== "Unknown";

            return (
              <div
                className="match-card"
                key={
                  match.match_id ||
                  `${match.year}-${index}`
                }
              >
                {/* TOP */}
                <div className="match-card-top">
                  <div className="match-meta-left">
                    <span className="match-season">
                      {cleanValue(match.season)}
                    </span>

                    {isKnownMatchNumber && (
                      <span className="match-number">
                        MATCH {matchNumber}
                      </span>
                    )}

                    <span className="match-type">
                      {cleanValue(match.match_type)}
                    </span>
                  </div>

                  <span className="match-date">
                    {formatDate(match)}
                  </span>
                </div>

                {/* TEAMS */}
                <div className="match-teams">
                  <div
                    className={
                      winner === team1
                        ? "match-team winner"
                        : "match-team"
                    }
                  >
                    <span>{team1}</span>

                    {winner === team1 && (
                      <small>WINNER</small>
                    )}
                  </div>

                  <div className="match-vs">
                    VS
                  </div>

                  <div
                    className={
                      winner === team2
                        ? "match-team winner"
                        : "match-team"
                    }
                  >
                    <span>{team2}</span>

                    {winner === team2 && (
                      <small>WINNER</small>
                    )}
                  </div>
                </div>

                {/* RESULT */}
                <div className="match-result">
                  <div className="result-main">
                    <span>RESULT</span>
                    <strong>
                      {winner !== "Unknown"
                        ? `${winner} won`
                        : "Result unavailable"}
                    </strong>
                  </div>

                  <div className="result-margin">
                    <span>OUTCOME</span>
                    <strong>
                      {cleanValue(match.win_outcome)}
                    </strong>
                  </div>
                </div>

                {/* DETAILS */}
                <div className="match-details">
                  <div className="match-detail">
                    <FaMapMarkerAlt />

                    <div>
                      <span>VENUE</span>
                      <strong>
                        {cleanValue(match.venue)}
                      </strong>
                    </div>
                  </div>

                  <div className="match-detail">
                    <div>
                      <span>CITY</span>
                      <strong>
                        {cleanValue(match.city)}
                      </strong>
                    </div>
                  </div>

                  <div className="match-detail">
                    <div>
                      <span>PLAYER OF THE MATCH</span>
                      <strong>
                        {playerOfMatch}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* TOSS */}
                <div className="match-toss">
                  <div>
                    <span>TOSS WINNER</span>
                    <strong>
                      {cleanValue(match.toss_winner)}
                    </strong>
                  </div>

                  <div>
                    <span>DECISION</span>
                    <strong>
                      {cleanValue(match.toss_decision)}
                    </strong>
                  </div>

                  <div>
                    <span>STAGE</span>
                    <strong>
                      {cleanValue(match.event_name)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Matches;