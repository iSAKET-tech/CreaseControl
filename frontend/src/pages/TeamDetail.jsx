
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as THREE from "three";
import { FaArrowLeft, FaShieldAlt } from "react-icons/fa";

import {
  getTeamSummary,
  getTeamSeasonPerformance,
} from "../services/api";


 
function createStage(el, { tilt = 0.3, rotY = -0.35 } = {}) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  el.appendChild(canvas);

  // intensities are higher than in old three.js builds (physically based lights)
  scene.add(new THREE.AmbientLight(0xffffff, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(5, 10, 8);
  scene.add(sun);

  const group = new THREE.Group();
  scene.add(group);

  const st = {
    scene,
    cam,
    renderer,
    group,
    rx: tilt,
    ry: rotY,
    lockY: false, // true = ignore ry on the outer group (donut spins its own inner group)
    items: [], // meshes that can be clicked
    tick: () => {},
    onPick: () => {},
    dispose: () => {},
  };

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
    st.ry += dx * 0.008;
    st.rx = Math.max(-1.3, Math.min(1.3, st.rx + dy * 0.006));
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
    const hit = ray.intersectObjects(st.items, false)[0];
    if (hit) st.onPick(hit.object.userData.i);
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
    group.rotation.x = st.rx;
    group.rotation.y = st.lockY ? 0 : st.ry;
    st.tick();
    renderer.render(scene, cam);
  };
  loop();

  st.dispose = () => {
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

  return st;
}

const outline = (mesh, threshold = 1) => {
  mesh.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, threshold),
      new THREE.LineBasicMaterial({ color: 0x000000 })
    )
  );
  return mesh;
};

/* ============================================================
   SEASON TREND PANELS (own scale per series)
   ============================================================ */

const PW = 80; // panel height
const GP = 34; // gap (holds the panel tag)
const W = 900;
const LEFT = 90;
const RIGHT = 30;

function TrendPanels({ data = [], series = [], xKey = "season" }) {
  const [on, setOn] = useState(() => series.map(() => true));
  const [hov, setHov] = useState(-1);

  const n = data.length;
  if (n === 0) {
    return <div className="no-chart-data">NO SEASON DATA AVAILABLE</div>;
  }

  const visible = series.map((s, i) => ({ ...s, i })).filter((s) => on[s.i]);
  const H = Math.max(visible.length, 1) * (PW + GP) + 70;
  const span = W - LEFT - RIGHT;
  const X = (i) => LEFT + (n > 1 ? (i * span) / (n - 1) : span / 2);

  const toggle = (i) =>
    setOn((prev) => prev.map((v, j) => (j === i ? !v : v)));

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = n > 1 ? Math.round(((x - LEFT) / span) * (n - 1)) : 0;
    setHov(Math.max(0, Math.min(n - 1, i)));
  };

  const row = hov >= 0 ? data[hov] : null;
  const read = row
    ? `${row[xKey]}:  ` +
      series.map((s) => `${s.short || s.label} ${row[s.key].toLocaleString()}`).join("   ")
    : "Move over the chart to read a season.";

  const yLabels = GP + (visible.length - 1) * (PW + GP) + PW + 20;

  return (
    <div className="trends">
      <div className="trends-controls" role="group" aria-label="Series">
        {series.map((s, i) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={on[i]}
            style={{ "--sc": s.chip }}
            onClick={() => toggle(i)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="trends-read" aria-live="polite">{read}</p>

      {visible.length === 0 ? (
        <p>Turn on a series above.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="One panel per series, each with its own scale"
          onPointerMove={onMove}
          onPointerLeave={() => setHov(-1)}
        >
          {visible.map((s, k) => {
            const y0 = GP + k * (PW + GP);
            const vals = data.map((r) => r[s.key]);
            const mx = Math.max(...vals);
            const lo = Math.min(...vals) * 0.85;
            const range = mx - lo || 1;
            const Y = (v) => y0 + PW - 8 - ((v - lo) / range) * (PW - 24);
            const pts = vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ");

            return (
              <g key={s.key}>
                <rect x="0" y={y0 - 28} width="190" height="26" fill="#000" />
                <text x="8" y={y0 - 9} className="tr-tag">{s.label}</text>

                <rect x="0" y={y0} width={W} height={PW} fill="#fff" stroke="#000" strokeWidth="4" />
                {[0.33, 0.66].map((q) => (
                  <line key={q} x1="0" x2={W} y1={y0 + PW * q} y2={y0 + PW * q}
                    stroke="#000" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="6 6" />
                ))}

                {hov >= 0 && (
                  <rect x={X(hov) - 8} y={y0} width="16" height={PW}
                    fill="#B8FF1F" stroke="#000" strokeWidth="3" />
                )}

                <polyline points={pts} fill="none" stroke="#000" strokeWidth="9" strokeLinejoin="round" />
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth="4" strokeLinejoin="round" />

                {vals.map((v, i) => (
                  <rect key={i} x={X(i) - 5} y={Y(v) - 5} width="10" height="10"
                    fill={s.color} stroke="#000" strokeWidth="3" />
                ))}

                <text x="8" y={y0 + 20}>{Math.round(mx).toLocaleString()}</text>
                <text x="8" y={y0 + PW - 8}>{Math.round(lo).toLocaleString()}</text>
              </g>
            );
          })}

          {data.map((r, i) => (
            <text key={i} x={X(i)} y={yLabels} textAnchor="end"
              transform={`rotate(-40 ${X(i)} ${yLabels})`}
              fontWeight={i === hov ? 900 : 700}>
              {r[xKey]}
            </text>
          ))}
        </svg>
      )}

      <p className="trends-note">
        Each panel has its own scale, so the lines never sit on top of each other.
      </p>
    </div>
  );
}

/* ============================================================
   3D BARS
   ============================================================ */

const BAR_COLORS = ["#FF2E93", "#B8FF1F", "#19D3FF", "#FF8A00", "#2B3BFF"];

/* data: [{ name, value, label }]  value = bar height, label = text shown */
function Bars3D({ data = [], className = "", ariaLabel = "3D bar chart" }) {
  const mountRef = useRef(null);
  const selRef = useRef(0);
  const [sel, setSel] = useState(0);

  const key = JSON.stringify(data);

  const choose = (i) => {
    selRef.current = i;
    setSel(i);
  };

  useEffect(() => {
    const el = mountRef.current;
    if (!el || data.length === 0) return undefined;

    selRef.current = 0;
    setSel(0);

    const n = data.length;
    const top = Math.max(...data.map((d) => d.value), 0.0001);
    const H = 6.5;

    const st = createStage(el, { tilt: 0.35, rotY: -0.4 });
    st.cam.position.set(0, 5, Math.max(17, n * 3.1));
    st.cam.lookAt(0, 2.6, 0);

    const baseW = n * 2.4 + 0.6;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseW, 0.4, 4),
      new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    base.position.y = -0.2;
    st.group.add(base);

    [0.5, 1].forEach((f) => {
      const y = f * H;
      st.group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-baseW / 2, y, -2),
            new THREE.Vector3(baseW / 2, y, -2),
            new THREE.Vector3(baseW / 2, y, 2),
          ]),
          new THREE.LineBasicMaterial({ color: 0x000000 })
        )
      );
    });

    const bars = data.map((d, i) => {
      const m = outline(
        new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 1, 1.7),
          new THREE.MeshLambertMaterial({ color: BAR_COLORS[i % BAR_COLORS.length] })
        )
      );
      m.userData = { i, h: 0, th: Math.max(0.05, (d.value / top) * H) };
      m.position.x = (i - (n - 1) / 2) * 2.4;
      st.group.add(m);
      st.items.push(m);
      return m;
    });

    st.onPick = choose;
    st.tick = () => {
      bars.forEach((b) => {
        const u = b.userData;
        u.h += (u.th - u.h) * 0.1;
        const s = u.i === selRef.current ? 1.15 : 1;
        b.scale.set(s, u.h, s);
        b.position.y = u.h / 2;
      });
    };

    return () => st.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (data.length === 0) {
    return <div className="no-chart-data">NO DATA AVAILABLE</div>;
  }

  const current = data[Math.min(sel, data.length - 1)];

  return (
    <>
      <div
        ref={mountRef}
        className={`three-stage ${className}`}
        role="img"
        aria-label={ariaLabel}
      />

      <div className="chart-caption">
        {current.name}: {current.label}
        <br />
        <small>Drag to rotate. Click a bar to select it. Bars are scaled against each other.</small>
      </div>

      <ul className="chart-legend single">
        {data.map((d, i) => (
          <li
            key={`${d.name}-${i}`}
            className={i === sel ? "on" : ""}
            role="button"
            tabIndex={0}
            onClick={() => choose(i)}
            onKeyDown={(e) => e.key === "Enter" && choose(i)}
          >
            <i style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
            {d.name}
            <b>{d.label}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ============================================================
   TEAM DETAIL PAGE
   ============================================================ */

const SERIES = [
  { key: "total_runs", label: "Total Runs", short: "Runs", color: "#19D3FF", chip: "#19D3FF" },
  { key: "matches_won", label: "Matches Won", short: "Won", color: "#FF2E93", chip: "#FF6FB4" },
  { key: "total_wickets", label: "Total Wickets", short: "Wickets", color: "#2B3BFF", chip: "#8C97FF" },
];

/* first value that is a real number, otherwise null */
const num = (...values) => {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return null;
};

const fmt = (v) => (v === null || v === undefined ? "—" : Number(v).toLocaleString());

/* "Virat Kohli" or { name: "Virat Kohli" } or { player: "..." } */
const nameOf = (value, fallback) => {
  if (typeof value === "string" && value) return value;
  return value?.name || value?.player || value?.player_name || fallback || "—";
};

/* API may answer { data: {...} }, { team: {...} }, { summary: {...} } or the object itself */
const unwrapObject = (res) => {
  if (!res) return null;
  for (const k of ["data", "team", "summary"]) {
    if (res[k] && typeof res[k] === "object" && !Array.isArray(res[k])) return res[k];
  }
  return res;
};

const unwrapList = (res) => {
  const list = Array.isArray(res) ? res : res?.data || res?.seasons || res?.performance || [];
  return Array.isArray(list) ? list : [];
};

/* win / loss / other, so "—" or "No Result" is never painted as a loss */
const outcomeKind = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (/^(w|win|won|victory)/.test(v)) return "win";
  if (/^(l|loss|lost|lose|defeat)/.test(v)) return "loss";
  return "other";
};

function TeamDetail() {
  const params = useParams();
  const navigate = useNavigate();

  /* the route param can be :id or :team depending on App.jsx */
  const rawTeam = params.id ?? params.team ?? params.teamName ?? params.name ?? "";

  let team = rawTeam;
  try {
    team = decodeURIComponent(rawTeam);
  } catch {
    team = rawTeam;
  }

  const [summary, setSummary] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!team) {
      setError("No team selected.");
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const fetchTeamData = async () => {
      setLoading(true);
      setError("");

      const [summaryResult, seasonResult] = await Promise.allSettled([
        getTeamSummary(team),
        getTeamSeasonPerformance(team),
      ]);

      if (cancelled) return;

      if (summaryResult.status === "fulfilled") {
        console.debug("TeamDetail summary response:", summaryResult.value);
        setSummary(unwrapObject(summaryResult.value));
      } else {
        console.error(summaryResult.reason);
        setSummary(null);
        setError(summaryResult.reason?.message || "Unable to load team information.");
      }

      if (seasonResult.status === "fulfilled") {
        console.debug("TeamDetail seasons response:", seasonResult.value);
        setSeasons(unwrapList(seasonResult.value));
      } else {
        console.warn("Season performance failed:", seasonResult.reason);
        setSeasons([]);
      }

      setLoading(false);
    };

    fetchTeamData();

    return () => {
      cancelled = true;
    };
  }, [team]);

  if (loading) {
    return <div className="team-detail-loader">LOADING TEAM...</div>;
  }

  if (error || !summary) {
    return (
      <div className="team-detail-page">
        <button className="team-back-button" onClick={() => navigate("/teams")}>
          <FaArrowLeft />
          BACK TO TEAMS
        </button>

        {error ? (
          <div className="players-error">{error}</div>
        ) : (
          <div className="team-no-data">NO TEAM DATA AVAILABLE</div>
        )}
      </div>
    );
  }

  /* ---------------- NUMBERS ---------------- */
  const matchesPlayed = num(summary.matches, summary.total_matches, summary.matches_played) ?? 0;
  const matchesWon = num(summary.matches_won, summary.wins, summary.total_wins) ?? 0;
  const totalRuns = num(summary.total_runs, summary.runs);
  const totalWickets = num(summary.total_wickets, summary.wickets);
  const winPercentage = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;

  const seasonData = seasons.map((item) => ({
    season: item.season ?? item.year ?? "",
    total_runs: num(item.total_runs, item.runs) ?? 0,
    matches_won: num(item.matches_won, item.wins) ?? 0,
    total_wickets: num(item.total_wickets, item.wickets) ?? 0,
  }));

  /* same scaling the old radar used, shown as 3D bars */
  const balanceData = [
    { name: "Runs", value: (totalRuns ?? 0) / 1000, label: `${fmt(totalRuns ?? 0)} runs` },
    { name: "Wickets", value: (totalWickets ?? 0) / 50, label: `${fmt(totalWickets ?? 0)} wickets` },
    { name: "Wins", value: matchesWon / 10, label: `${fmt(matchesWon)} wins` },
    { name: "Consistency", value: winPercentage / 10, label: `${winPercentage}% win rate` },
  ];

  const history = Array.isArray(summary.recent_history)
    ? summary.recent_history
    : Array.isArray(summary.recentHistory)
    ? summary.recentHistory
    : [];

  return (
    <div className="team-detail-page">
      {/* BACK */}
      <button className="team-back-button" onClick={() => navigate("/teams")}>
        <FaArrowLeft />
        BACK TO TEAMS
      </button>

      {/* HEADER */}
      <div className="team-detail-header">
        <div className="team-detail-logo">
          <FaShieldAlt />
        </div>

        <div>
          <p className="page-kicker">CREASECONTROL / TEAM PROFILE</p>
          <h1>{summary.team || summary.team_name || team}</h1>
          <p>Team performance and historical analytics</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="team-kpi-grid">
        <div className="kpi-cardTD">
          <span>CHAMPIONSHIPS</span>
          <h3>{summary.championships ?? summary.titles ?? "—"}</h3>
        </div>

        <div className="kpi-cardTD">
          <span>TOTAL WICKETS</span>
          <h3>{fmt(totalWickets)}</h3>
        </div>

        <div className="kpi-cardTD">
          <span>TOTAL RUNS</span>
          <h3>{fmt(totalRuns)}</h3>
        </div>

        <div className="kpi-cardTD">
          <span>TOP BATSMAN</span>
          <h3>{nameOf(summary.top_batsman, summary.top_batsman_name)}</h3>
        </div>

        <div className="kpi-cardTD">
          <span>TOP BOWLER</span>
          <h3>{nameOf(summary.top_bowler, summary.top_bowler_name)}</h3>
        </div>
      </div>

      {/* ANALYTICS */}
      <div className="team-analytics-grid">
        <div className="analytics-cardTD analytics-wide">
          <div className="analytics-card-header">
            <div>
              <p className="page-kicker">PERFORMANCE / SEASON</p>
              <h2>SQUAD PERFORMANCE</h2>
            </div>
          </div>

          <TrendPanels data={seasonData} series={SERIES} />
        </div>

        <div className="analytics-cardTD">
          <div className="analytics-card-header">
            <div>
              <p className="page-kicker">TEAM ANALYTICS</p>
              <h2>TEAM BALANCE</h2>
            </div>
          </div>

          <Bars3D
            data={balanceData}
            className="team-balance-chart"
            ariaLabel="3D bar chart comparing runs, wickets, wins and consistency"
          />
        </div>
      </div>

      {/* TEAM FORM */}
      <div className="analytics-cardTD team-form-card">
        <div className="analytics-card-header">
          <div>
            <p className="page-kicker">RECENT RESULTS</p>
            <h2>TEAM FORM</h2>
          </div>

          <span className="form-label">LAST 5 MATCHES</span>
        </div>

        {history.length > 0 ? (
          <div className="team-table-wrapper">
            <table className="team-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>OPPONENT</th>
                  <th>RESULT</th>
                  <th>WIN OUTCOME</th>
                  <th>VENUE</th>
                </tr>
              </thead>

              <tbody>
                {history.slice(0, 5).map((match, index) => {
                  const outcome = match.win_outcome ?? match.outcome;
                  const kind = outcomeKind(outcome);

                  return (
                    <tr key={index} className={`row-${kind}`}>
                      <td>{match.date || "—"}</td>
                      <td>{match.opponent || "—"}</td>
                      <td>{match.result || "—"}</td>
                      <td>
                        <span className={`outcome-tag ${kind}`}>{outcome || "—"}</span>
                      </td>
                      <td>{match.venue || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="team-no-data">NO RECENT MATCH DATA AVAILABLE</div>
        )}
      </div>
    </div>
  );
}

export default TeamDetail;