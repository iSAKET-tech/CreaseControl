import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as THREE from "three";
import { FaArrowLeft, FaUser } from "react-icons/fa";

import { getPlayerDetail } from "../services/api";

/* slice colours (also used for the legend swatches) */
const PHASE_COLORS = ["#19D3FF", "#FF2E93", "#B8FF1F", "#FF8A00", "#2B3BFF"];

function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const playerName = useMemo(() => {
    try {
      return decodeURIComponent(id || "");
    } catch {
      return id || "";
    }
  }, [id]);

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("career");
  const [selectedSeason, setSelectedSeason] = useState("");

  useEffect(() => {
    const loadPlayer = async () => {
      if (!playerName) {
        setError("No player selected.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getPlayerDetail(playerName);

        console.log("PLAYER DETAIL RESPONSE:", response);

        setPlayer(response);

        if (
          Array.isArray(response?.seasonal_stats) &&
          response.seasonal_stats.length > 0
        ) {
          setSelectedSeason(
            response.seasonal_stats[response.seasonal_stats.length - 1].season
          );
        }
      } catch (err) {
        console.error("PLAYER DETAIL ERROR:", err);

        setError(err.message || "Failed to load player details.");
      } finally {
        setLoading(false);
      }
    };

    loadPlayer();
  }, [playerName]);

  if (loading) {
    return <div className="player-detail-loader">LOADING PLAYER DATA...</div>;
  }

  if (error || !player) {
    return (
      <div className="player-detail-page">
        <button
          className="player-back-button"
          onClick={() => navigate("/players")}
        >
          <FaArrowLeft />
          BACK TO PLAYERS
        </button>

        <div className="players-error">{error || "PLAYER DATA NOT FOUND"}</div>
      </div>
    );
  }

  const profile = player.profile || {};
  const batting = player.batting || {};
  const bowling = player.bowling || {};
  const fielding = player.fielding || {};
  const phase = Array.isArray(player.phase) ? player.phase : [];
  const seasonalStats = Array.isArray(player.seasonal_stats)
    ? player.seasonal_stats
    : [];
  const teams = Array.isArray(player.teams_played_for)
    ? player.teams_played_for
    : [];

  const selectedSeasonData =
    seasonalStats.find(
      (item) => String(item.season) === String(selectedSeason)
    ) || null;

  /* Career / season data */
  const displayBatting =
    activeTab === "season" && selectedSeasonData
      ? selectedSeasonData
      : batting;

  const displayBowling =
    activeTab === "season" && selectedSeasonData
      ? selectedSeasonData
      : bowling;

  /* Player role */
  const role = String(profile.playingRoles || "").toLowerCase();

  const isAllRounder = role.includes("allrounder") || role.includes("all-rounder");

  const isBowler = role.includes("bowler") || isAllRounder;

  const isBatter =
    role.includes("batter") ||
    role.includes("batsman") ||
    role.includes("keeper") ||
    isAllRounder;

  /* Numeric helper */
  const number = (value) => {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  const runs = number(displayBatting.runs);
  const matches = number(displayBatting.matches);
  const fours = number(displayBatting.fours);
  const sixes = number(displayBatting.sixes);
  const strikeRate = displayBatting.strike_rate || "0.00";

  const wickets = number(displayBowling.wickets);
  const economy = displayBowling.economy || "0.00";
  const overs = displayBowling.overs || "0.0";
  const bowlingStrikeRate = displayBowling.bowling_strike_rate || "0.00";

  const boundaries = fours + sixes;

  const averageScore = matches > 0 ? (runs / matches).toFixed(1) : "0.0";

  /*
   * Phase data from the backend:
   * [{ balls: 2488, phase: "Powerplay", runs: "3019" }]
   */
  const phaseChartData = phase.map((item) => ({
    phase: item.phase,
    runs: number(item.runs),
    balls: number(item.balls),
  }));

  const phaseTotal = phaseChartData.reduce((sum, p) => sum + p.runs, 0);

  return (
    <div className="player-detail-page">
      {/* BACK BUTTON */}
      <button
        className="player-back-button"
        onClick={() => navigate("/players")}
      >
        <FaArrowLeft />
        BACK TO PLAYERS
      </button>

      {/* ================= HEADER ================= */}

      <div className="player-detail-header">
        <div className="player-profile-section">
          <div className="player-avatar">
            {profile.longName ? (
              profile.longName.charAt(0).toUpperCase()
            ) : (
              <FaUser />
            )}
          </div>

          <div className="player-name-section">
            <p className="page-kicker">CREASECONTROL / PLAYER PROFILE</p>

            <h1>{profile.longName || profile.player_name || playerName}</h1>

            <p className="player-role">
              {profile.playingRoles || "Player"}

              {profile.nationality && (
                <>
                  {" • "}
                  {profile.nationality}
                </>
              )}
            </p>
          </div>
        </div>

        {/* CAREER / SEASON */}

        <div className="player-view-controls">
          <button
            className={`player-tab ${activeTab === "career" ? "active" : ""}`}
            onClick={() => setActiveTab("career")}
          >
            CAREER SUMMARY
          </button>

          <button
            className={`player-tab ${activeTab === "season" ? "active" : ""}`}
            onClick={() => setActiveTab("season")}
          >
            SEASON ANALYTICS
          </button>

          {activeTab === "season" && (
            <select
              className="player-season-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              {seasonalStats.map((item) => (
                <option key={item.season} value={item.season}>
                  {item.season}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ================= KPI ================= */}

      <div className="player-kpi-grid">
        {isBatter && (
          <>
            <PlayerKpi label="RUNS" value={runs} type="batting" />
            <PlayerKpi label="STRIKE RATE" value={strikeRate} type="batting" />
            <PlayerKpi label="MATCHES" value={matches} type="batting" />
            <PlayerKpi
              label="6s / 4s"
              value={`${sixes} / ${fours}`}
              type="batting"
            />
          </>
        )}

        {isBowler && (
          <>
            <PlayerKpi label="WICKETS" value={wickets} type="bowling" />
            <PlayerKpi label="ECONOMY" value={economy} type="bowling" />
            <PlayerKpi label="OVERS" value={overs} type="bowling" />
            <PlayerKpi
              label="BOWL SR"
              value={bowlingStrikeRate}
              type="bowling"
            />
          </>
        )}
      </div>

      {/* ================= MAIN ================= */}

      <div className="player-analytics-grid">
        {/* ================= LEFT ================= */}

        <div className="player-analytics-left">
          {/* TECHNICAL PROFILE */}

          <div className="player-card">
            <div className="player-card-header">
              <div>
                <p className="page-kicker">PLAYER INFORMATION</p>
                <h2>TECHNICAL PROFILE</h2>
              </div>
            </div>

            <div className="player-bio-grid">
              <div className="player-bio-item">
                <span>BATTING STYLE</span>
                <strong>{formatStyle(profile.longBattingStyles)}</strong>
              </div>

              <div className="player-bio-item">
                <span>BOWLING STYLE</span>
                <strong>{formatStyle(profile.longBowlingStyles)}</strong>
              </div>

              <div className="player-bio-item">
                <span>NATIONALITY</span>
                <strong>{profile.nationality || "—"}</strong>
              </div>

              <div className="player-bio-item">
                <span>DATE OF BIRTH</span>
                <strong>{profile.dob || "—"}</strong>
              </div>
            </div>
          </div>

          {/* PHASE PERFORMANCE (donut) */}

          <div className="player-card">
            <div className="player-card-header">
              <div>
                <p className="page-kicker">PERFORMANCE / PHASE</p>
                <h2>CAREER SCORING BY PHASE</h2>
              </div>
            </div>

            <PhaseDonut3D data={phaseChartData} total={phaseTotal} />
          </div>
        </div>

        {/* ================= RIGHT ================= */}

        <div className="player-analytics-right">
          {/* HIGHLIGHTS */}

          <div className="player-card">
            <div className="player-card-header">
              <div>
                <p className="page-kicker">PERFORMANCE</p>

                <h2>
                  {activeTab === "season"
                    ? `${selectedSeason} HIGHLIGHTS`
                    : "CAREER HIGHLIGHTS"}
                </h2>
              </div>
            </div>

            <div className="player-highlight-list">
              <div className="player-highlight">
                <span>BOUNDARIES</span>
                <strong>{boundaries}</strong>
              </div>

              <div className="player-highlight">
                <span>AVG SCORE</span>
                <strong>{averageScore}</strong>
              </div>

              <div className="player-highlight">
                <span>TOTAL BALLS</span>
                <strong>{number(displayBatting.balls)}</strong>
              </div>
            </div>
          </div>

          {/* TEAMS */}

          <div className="player-card">
            <div className="player-card-header">
              <div>
                <p className="page-kicker">IPL CAREER</p>
                <h2>PLAYED FOR</h2>
              </div>
            </div>

            <div className="player-team-list">
              {teams.length > 0 ? (
                teams.map((team) => (
                  <span key={team} className="player-team-pill">
                    {team}
                  </span>
                ))
              ) : (
                <span className="player-no-data">NO TEAM DATA</span>
              )}
            </div>
          </div>

          {/* FIELDING */}

          <div className="player-card">
            <div className="player-card-header">
              <div>
                <p className="page-kicker">DEFENSIVE PERFORMANCE</p>
                <h2>FIELDING STATS</h2>
              </div>
            </div>

            <div className="player-field-grid">
              <div className="player-field-stat">
                <span>CATCHES</span>
                <strong>{fielding.catches ?? 0}</strong>
              </div>

              <div className="player-field-stat">
                <span>STUMPINGS</span>
                <strong>{fielding.stumpings ?? 0}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   3D PHASE DONUT (three.js)
   No box, no background. Drag = rotate freely around any axis.
========================================= */

function PhaseDonut3D({ data = [], total = 0 }) {
  const mountRef = useRef(null);
  const resetRef = useRef(() => {});
  const rollRef = useRef(() => {});
  const selRef = useRef(0);
  const [sel, setSel] = useState(0);

  const key = JSON.stringify(data);

  const choose = (i) => {
    selRef.current = i;
    setSel(i);
  };

  useEffect(() => {
    const el = mountRef.current;
    if (!el || data.length === 0 || total <= 0) return undefined;

    selRef.current = 0;
    setSel(0);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    cam.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    el.appendChild(canvas);

    scene.add(new THREE.AmbientLight(0xffffff, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(5, 10, 8);
    scene.add(sun);

    const group = new THREE.Group();
    scene.add(group);

    const home = new THREE.Euler(-0.9, 0.35, 0);
    group.quaternion.setFromEuler(home);

    /* slices: extruded ring segments, centred so they turn around the middle */
    const slices = [];
    let a0 = 0;
    data.forEach((d, i) => {
      if (d.runs <= 0) return;
      const a1 = a0 + (d.runs / total) * Math.PI * 2;

      const shape = new THREE.Shape();
      shape.absarc(0, 0, 5, a0, a1, false);
      shape.absarc(0, 0, 2.4, a1, a0, true);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 1.4,
        bevelEnabled: false,
      });
      geo.translate(0, 0, -0.7);

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshLambertMaterial({
          color: PHASE_COLORS[i % PHASE_COLORS.length],
        })
      );
      mesh.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(geo, 30),
          new THREE.LineBasicMaterial({ color: 0x000000 })
        )
      );

      const mid = (a0 + a1) / 2;
      mesh.userData = { i, mx: Math.cos(mid), my: Math.sin(mid), o: 0 };
      group.add(mesh);
      slices.push(mesh);
      a0 = a1;
    });

    /* rotation about the screen axes, so it can turn any way (no limits, no lock) */
    const AX = new THREE.Vector3(1, 0, 0);
    const AY = new THREE.Vector3(0, 1, 0);
    const AZ = new THREE.Vector3(0, 0, 1);
    const turn = (axis, angle) => {
      group.quaternion.premultiply(
        new THREE.Quaternion().setFromAxisAngle(axis, angle)
      );
    };

    resetRef.current = () => group.quaternion.setFromEuler(home);
    rollRef.current = (angle) => turn(AZ, angle);

    let dragging = false;
    let moved = 0;
    let px = 0;
    let py = 0;

    const onDown = (e) => {
      dragging = true;
      moved = 0;
      px = e.clientX;
      py = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      moved += Math.abs(dx) + Math.abs(dy);

      if (e.shiftKey) {
        turn(AZ, dx * 0.01); // Shift + drag: spin flat
      } else {
        turn(AY, dx * 0.01);
        turn(AX, dy * 0.01);
      }

      px = e.clientX;
      py = e.clientY;
    };

    const onUp = (e) => {
      const wasClick = dragging && moved < 6;
      dragging = false;
      if (!wasClick) return;

      const r = canvas.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1
        ),
        cam
      );
      const hit = ray.intersectObjects(slices, false)[0];
      if (hit) choose(hit.object.userData.i);
    };

    const onCancel = () => {
      dragging = false;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      slices.forEach((m) => {
        const u = m.userData;
        u.o += ((u.i === selRef.current ? 0.8 : 0) - u.o) * 0.15;
        m.position.set(u.mx * u.o, u.my * u.o, 0);
      });
      renderer.render(scene, cam);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose()
          );
        }
      });
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, total]);

  if (data.length === 0 || total <= 0) {
    return <div className="player-no-data">NO PHASE DATA AVAILABLE</div>;
  }

  const share = (runs) => ((runs / total) * 100).toFixed(1);
  const strike = (d) =>
    d.balls > 0 ? ((d.runs / d.balls) * 100).toFixed(1) : "—";

  const current = data[Math.min(sel, data.length - 1)];

  return (
    <>
      <div
        ref={mountRef}
        className="phase-stage"
        role="img"
        aria-label="3D donut chart of career runs by phase"
      />

      <div className="phase-caption">
        <div>
          <strong>{current.phase}</strong>: {current.runs.toLocaleString()} runs (
          {share(current.runs)}%) · SR {strike(current)}
          <small>
            Drag to rotate any way. Shift + drag or the roll buttons spin it
            flat. Click a slice to pull it out.
          </small>
        </div>

        <div className="phase-tools">
          <button
            type="button"
            aria-label="Roll left"
            onClick={() => rollRef.current(-Math.PI / 12)}
          >
            ⟲
          </button>

          <button
            type="button"
            aria-label="Roll right"
            onClick={() => rollRef.current(Math.PI / 12)}
          >
            ⟳
          </button>

          <button type="button" onClick={() => resetRef.current()}>
            RESET VIEW
          </button>
        </div>
      </div>

      <ul className="phase-legend">
        {data.map((item, index) => (
          <li
            key={`${item.phase}-${index}`}
            className={index === sel ? "on" : ""}
            role="button"
            tabIndex={0}
            onClick={() => choose(index)}
            onKeyDown={(e) => e.key === "Enter" && choose(index)}
          >
            <i
              className="phase-swatch"
              style={{ background: PHASE_COLORS[index % PHASE_COLORS.length] }}
            />

            <span className="phase-name">{item.phase}</span>

            <b className="phase-runs">{item.runs.toLocaleString()}</b>

            <em className="phase-meta">
              {share(item.runs)}% · SR {strike(item)}
            </em>
          </li>
        ))}
      </ul>
    </>
  );
}

/* =========================================
   KPI COMPONENT
========================================= */

function PlayerKpi({ label, value, type }) {
  return (
    <div
      className={`player-kpi ${
        type === "bowling" ? "player-kpi-bowling" : "player-kpi-batting"
      }`}
    >
      <div className="player-kpi-circle">
        <strong>{value ?? 0}</strong>
      </div>

      <span>{label}</span>
    </div>
  );
}

/* =========================================
   HELPERS
========================================= */

function formatStyle(value) {
  if (!value) return "—";

  return String(value).replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

export default PlayerDetail;