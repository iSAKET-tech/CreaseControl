import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaUser } from "react-icons/fa";

import { searchPlayers } from "../services/api";

const getPlayerName = (player) =>
  player?.name ||
  player?.player_name ||
  player?.player ||
  player?.batsman ||
  player?.bowler ||
  "Unknown";

const getTeam = (player) =>
  player?.team || player?.team_name;

function Players() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState([]);

  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");

  const boxRef = useRef(null);
  const listRef = useRef(null);

  /*
   * AUTOCOMPLETE SEARCH
   */
  useEffect(() => {
    const value = query.trim();

    if (!value) {
      setPlayers([]);
      setSearching(false);
      setShowSuggestions(false);
      setActiveIndex(-1);
      return undefined;
    }

    let cancelled = false;

    setSearching(true);
    setShowSuggestions(true);
    setActiveIndex(-1);
    setError("");

    const timer = setTimeout(async () => {
      try {
        const data = await searchPlayers(value);

        if (cancelled) return;

        const results = Array.isArray(data)
          ? data
          : data?.players ||
            data?.data ||
            [];

        setPlayers(results);
      } catch (err) {
        if (cancelled) return;

        setPlayers([]);
        setError(
          err.message ||
            "Failed to search players"
        );
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  /*
   * CLOSE DROPDOWN ON OUTSIDE CLICK
   */
  useEffect(() => {
    const onDown = (e) => {
      if (
        boxRef.current &&
        !boxRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      onDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        onDown
      );
    };
  }, []);

  /*
   * KEEP ACTIVE SUGGESTION VISIBLE
   */
  useEffect(() => {
    listRef.current
      ?.querySelector(
        ".suggestion-item.active"
      )
      ?.scrollIntoView({
        block: "nearest",
      });
  }, [activeIndex]);

  /*
   * PLAYER SELECT
   *
   * Detail API is NOT called here.
   * PlayerDetail.jsx will call getPlayerDetail().
   */
  const selectPlayer = (player) => {
    const name = getPlayerName(player);

    if (!name || name === "Unknown") {
      setError("Unable to identify this player.");
      return;
    }

    setQuery(name);
    setShowSuggestions(false);
    setActiveIndex(-1);
    setError("");

    navigate(
      `/players/${encodeURIComponent(name)}`
    );
  };

  /*
   * KEYBOARD NAVIGATION
   */
  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    if (
      !showSuggestions ||
      players.length === 0
    ) {
      if (
        e.key === "ArrowDown" &&
        query.trim()
      ) {
        setShowSuggestions(true);
      }

      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setActiveIndex(
        (index) =>
          (index + 1) % players.length
      );

      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      setActiveIndex(
        (index) =>
          index <= 0
            ? players.length - 1
            : index - 1
      );

      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      const index =
        activeIndex >= 0
          ? activeIndex
          : 0;

      selectPlayer(players[index]);
    }
  };

  const open =
    showSuggestions &&
    query.trim();

  return (
    <div className="players-page">

      {/* ================= HEADER ================= */}

      <div className="players-header">

        <div>

          <p className="page-kicker">
            CREASECONTROL / PLAYERS
          </p>

          <h1>PLAYERS</h1>

          <p className="players-subtitle">
            Search and explore IPL player
            performance.
          </p>

        </div>

      </div>

      {/* ================= SEARCH ================= */}

      <div
        className="player-search-card"
        ref={boxRef}
      >

        <div className="player-search">

          <FaSearch />

          <input
            type="text"
            placeholder="Search player..."
            value={query}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={Boolean(open)}
            aria-controls="player-suggestions"
            aria-autocomplete="list"
            onChange={(e) => {
              setQuery(e.target.value);
              setError("");
            }}
            onFocus={() => {
              if (query.trim()) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={onKeyDown}
          />

          {searching && (
            <span className="search-status">
              SEARCHING...
            </span>
          )}

        </div>

        {/* ================= SUGGESTIONS ================= */}

        {open && (

          <div
            className="player-suggestions"
            id="player-suggestions"
            role="listbox"
            ref={listRef}
          >

            {searching ? (

              <div className="suggestion-status">
                Searching players...
              </div>

            ) : players.length > 0 ? (

              players.map(
                (player, index) => {

                  const name =
                    getPlayerName(player);

                  const team =
                    getTeam(player);

                  return (
                    <button
                      type="button"
                      key={`${name}-${index}`}
                      className={`suggestion-item${
                        index === activeIndex
                          ? " active"
                          : ""
                      }`}
                      role="option"
                      aria-selected={
                        index === activeIndex
                      }
                      onMouseEnter={() =>
                        setActiveIndex(index)
                      }
                      onClick={() =>
                        selectPlayer(player)
                      }
                    >

                      <div className="suggestion-avatar">
                        <FaUser />
                      </div>

                      <div className="suggestion-info">

                        <strong>
                          {name}
                        </strong>

                        {team && (
                          <span>
                            {team}
                          </span>
                        )}

                      </div>

                      <span className="suggestion-arrow">
                        →
                      </span>

                    </button>
                  );
                }
              )

            ) : (

              <div className="suggestion-status">
                No matching players found.
              </div>

            )}

          </div>

        )}

      </div>

      {/* ================= ERROR ================= */}

      {error && (
        <div className="players-error">
          {error}
        </div>
      )}

    </div>
  );
}

export default Players;