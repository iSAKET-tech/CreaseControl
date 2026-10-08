/**
 * Dashboard.jsx: the complete dashboard in ONE file.
 * Needs:  npm install three
 * Styles: index.css (import it once in main.jsx)
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import {
  getDashboardSummary,
  getSeasonPerformance,
  getTopBatsmen,
  getTeamWinRatio,
} from "../services/api";

/* ============================================================
   THREE.JS STAGE HELPER (drag to rotate, click to pick)
   ============================================================ */

/**
 * Creates a three.js scene inside `el`.
 * - No auto-rotation: the chart only moves when the user drags it.
 * - Click (a drag shorter than 6px) picks the mesh under the pointer.
 * - Call stage.dispose() in your effect cleanup.
 */
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
   SEASON TRENDS (three stacked panels, own scale each)
   ============================================================ */

const SERIES = [
  { key: "total_matches", label: "Total Matches", color: "#19D3FF", chip: "#19D3FF" },
  { key: "total_runs", label: "Total Runs", color: "#FF2E93", chip: "#FF6FB4" },
  { key: "total_wickets", label: "Total Wickets", color: "#2B3BFF", chip: "#8C97FF" },
];

const W = 900;
const LEFT = 90;
const RIGHT = 30;
const PW = 80; // panel height (was 110)
const GP = 34; // gap (holds the panel tag)

function SeasonTrends({ data = [] }) {
  const [on, setOn] = useState([true, true, true]);
  const [hov, setHov] = useState(-1);

  const n = data.length;
  if (n === 0) {
    return <div className="no-chart-data">NO SEASON DATA AVAILABLE</div>;
  }

  const visible = SERIES.map((s, i) => ({ ...s, i })).filter((s) => on[s.i]);
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

  const d = hov >= 0 ? data[hov] : null;
  const read = d
    ? `${d.season}:  Matches ${d.total_matches.toLocaleString()}   Runs ${d.total_runs.toLocaleString()}   Wickets ${d.total_wickets.toLocaleString()}`
    : "Move over the chart to read a season.";

  const yLabels = GP + (visible.length - 1) * (PW + GP) + PW + 20;

  return (
    <div className="trends">
      <div className="trends-controls" role="group" aria-label="Series">
        {SERIES.map((s, i) => (
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

      <p className="trends-read" aria-live="polite">
        {read}
      </p>

      {visible.length === 0 ? (
        <p>Turn on a series above.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Matches, runs and wickets per season, one panel each"
          onPointerMove={onMove}
          onPointerLeave={() => setHov(-1)}
        >
          {visible.map((s, k) => {
            const y0 = GP + k * (PW + GP);
            const vals = data.map((row) => row[s.key]);
            const mx = Math.max(...vals);
            const lo = Math.min(...vals) * 0.85;
            const range = mx - lo || 1;
            const Y = (v) => y0 + PW - 8 - ((v - lo) / range) * (PW - 24);
            const pts = vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ");

            return (
              <g key={s.key}>
                <rect x="0" y={y0 - 28} width="190" height="26" fill="#000" />
                <text x="8" y={y0 - 9} className="tr-tag">
                  {s.label}
                </text>

                <rect x="0" y={y0} width={W} height={PW} fill="#fff" stroke="#000" strokeWidth="4" />
                {[0.33, 0.66].map((q) => (
                  <line
                    key={q}
                    x1="0"
                    x2={W}
                    y1={y0 + PW * q}
                    y2={y0 + PW * q}
                    stroke="#000"
                    strokeOpacity="0.2"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                ))}

                {hov >= 0 && (
                  <rect
                    x={X(hov) - 8}
                    y={y0}
                    width="16"
                    height={PW}
                    fill="#B8FF1F"
                    stroke="#000"
                    strokeWidth="3"
                  />
                )}

                <polyline points={pts} fill="none" stroke="#000" strokeWidth="9" strokeLinejoin="round" />
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth="4" strokeLinejoin="round" />

                {vals.map((v, i) => (
                  <rect
                    key={i}
                    x={X(i) - 5}
                    y={Y(v) - 5}
                    width="10"
                    height="10"
                    fill={s.color}
                    stroke="#000"
                    strokeWidth="3"
                  />
                ))}

                <text x="8" y={y0 + 20}>{Math.round(mx).toLocaleString()}</text>
                <text x="8" y={y0 + PW - 8}>{Math.round(lo).toLocaleString()}</text>
              </g>
            );
          })}

          {data.map((row, i) => (
            <text
              key={i}
              x={X(i)}
              y={yLabels}
              textAnchor="end"
              transform={`rotate(-40 ${X(i)} ${yLabels})`}
              fontWeight={i === hov ? 900 : 700}
            >
              {row.season}
            </text>
          ))}
        </svg>
      )}

      <p className="trends-note">
        Each panel has its own scale, so the three trends never sit on top of each other.
      </p>
    </div>
  );
}

/* ============================================================
   TOP 5 BATSMEN (3D bars)
   ============================================================ */

const BAT_COLORS = ["#FF2E93", "#B8FF1F", "#19D3FF", "#FF8A00", "#2B3BFF"];

function Batsmen3D({ data = [] }) {
  const mountRef = useRef(null);
  const selRef = useRef(0);
  const [sel, setSel] = useState(0);

  const rows = data.slice(0, 5);
  const key = JSON.stringify(rows);

  const choose = (i) => {
    selRef.current = i;
    setSel(i);
  };

  useEffect(() => {
    const el = mountRef.current;
    if (!el || rows.length === 0) return undefined;

    selRef.current = 0;
    setSel(0);

    const n = rows.length;
    const maxRuns = Math.max(...rows.map((r) => r.runs), 1);
    const step = maxRuns > 4000 ? 2000 : 500;
    const niceMax = Math.ceil(maxRuns / step) * step;
    const H = 6.5; // world height of the tallest possible bar

    const st = createStage(el, { tilt: 0.35, rotY: -0.4 });
    st.cam.position.set(0, 5, 17);
    st.cam.lookAt(0, 2.6, 0);

    const baseW = n * 2.4 + 0.6;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseW, 0.4, 4),
      new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    base.position.y = -0.2;
    st.group.add(base);

    // gridlines at half and full scale, on the back wall
    [niceMax / 2, niceMax].forEach((v) => {
      const y = (v / niceMax) * H;
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-baseW / 2, y, -2),
          new THREE.Vector3(baseW / 2, y, -2),
          new THREE.Vector3(baseW / 2, y, 2),
        ]),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      st.group.add(line);
    });

    const bars = rows.map((r, i) => {
      const m = outline(
        new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 1, 1.7),
          new THREE.MeshLambertMaterial({ color: BAT_COLORS[i % BAT_COLORS.length] })
        )
      );
      m.userData = { i, h: 0, th: Math.max(0.05, (r.runs / niceMax) * H) };
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

  if (rows.length === 0) {
    return <div className="no-chart-data">NO BATSMEN DATA AVAILABLE</div>;
  }

  const current = rows[Math.min(sel, rows.length - 1)];

  return (
    <>
      <div
        ref={mountRef}
        className="three-stage batting-chart"
        role="img"
        aria-label="3D bar chart of the top five batsmen by runs"
      />

      <div className="chart-caption">
        {current.name}: {current.runs.toLocaleString()} runs
        <br />
        <small>Drag to rotate. Click a bar to select it.</small>
      </div>

      <ul className="chart-legend single">
        {rows.map((r, i) => (
          <li
            key={`${r.name}-${i}`}
            className={i === sel ? "on" : ""}
            role="button"
            tabIndex={0}
            onClick={() => choose(i)}
            onKeyDown={(e) => e.key === "Enter" && choose(i)}
          >
            <i style={{ background: BAT_COLORS[i % BAT_COLORS.length] }} />
            {r.name}
            <b>{r.runs.toLocaleString()}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ============================================================
   TEAM WIN RATIO (3D donut)
   ============================================================ */

const TEAM_COLORS = [
  "#B8FF1F", "#8A8A8A", "#2B3BFF", "#FF8A00", "#19D3FF",
  "#7A00B8", "#5B2BFF", "#00C28A", "#0A1FA8", "#FF2E93",
  "#FF7AC8", "#C4001F", "#FFC400", "#7DFFB0", "#FFFFFF",
];

const fmt = (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

function TeamDonut3D({ data = [] }) {
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
    const total = data.reduce((a, t) => a + t.value, 0);
    if (!el || data.length === 0 || total <= 0) return undefined;

    selRef.current = 0;
    setSel(0);

    const st = createStage(el, { tilt: -0.75, rotY: 0 });
    st.lockY = true; // the donut spins flat on its own axis instead
    st.cam.position.set(0, 0, 15);

    const spin = new THREE.Group();
    st.group.add(spin);
    st.group.position.z = -0.7;

    const slices = [];
    let a0 = 0;
    data.forEach((t, i) => {
      if (t.value <= 0) return;
      const a1 = a0 + (t.value / total) * Math.PI * 2;
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 5, a0, a1, false);
      shape.absarc(0, 0, 2.4, a1, a0, true);
      shape.closePath();

      const mesh = outline(
        new THREE.Mesh(
          new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: false }),
          new THREE.MeshLambertMaterial({ color: TEAM_COLORS[i % TEAM_COLORS.length] })
        ),
        30 // ignore the soft curve edges, keep only the hard outlines
      );
      const mid = (a0 + a1) / 2;
      mesh.userData = { i, mx: Math.cos(mid), my: Math.sin(mid), o: 0 };
      spin.add(mesh);
      st.items.push(mesh);
      slices.push(mesh);
      a0 = a1;
    });

    st.onPick = choose;
    st.tick = () => {
      spin.rotation.z = st.ry; // drag left/right spins the donut
      slices.forEach((m) => {
        const u = m.userData;
        u.o += ((u.i === selRef.current ? 0.7 : 0) - u.o) * 0.15;
        m.position.set(u.mx * u.o, u.my * u.o, 0);
      });
    };

    return () => st.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const total = data.reduce((a, t) => a + t.value, 0);

  if (data.length === 0 || total <= 0) {
    return (
      <div className="no-chart-data">
        {data.length === 0
          ? "NO TEAM DATA AVAILABLE"
          : "TEAM VALUES ARE ALL 0. CHECK THE FIELD NAMES IN THE BROWSER CONSOLE."}
      </div>
    );
  }

  const current = data[Math.min(sel, data.length - 1)];

  return (
    <>
      <div
        ref={mountRef}
        className="three-stage team-chart"
        role="img"
        aria-label="3D donut chart of team win ratios"
      />

      <div className="chart-caption">
        {current.name}: {fmt(current.value)} win ratio
        <br />
        <small>Drag to spin. Click a slice or a team to pull it out.</small>
      </div>

      <ul className="chart-legend">
        {data.map((t, i) => (
          <li
            key={`${t.name}-${i}`}
            className={i === sel ? "on" : ""}
            role="button"
            tabIndex={0}
            onClick={() => choose(i)}
            onKeyDown={(e) => e.key === "Enter" && choose(i)}
          >
            <i style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
            {t.name}
            <b>{fmt(t.value)}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [seasonPerformance, setSeasonPerformance] = useState([]);
  const [topBatsmen, setTopBatsmen] = useState([]);
  const [teamWinRatio, setTeamWinRatio] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [summaryData, seasonData, batsmenData, teamData] =
          await Promise.all([
            getDashboardSummary(),
            getSeasonPerformance(),
            getTopBatsmen(),
            getTeamWinRatio(),
          ]);

        setSummary(summaryData);
        setSeasonPerformance(seasonData || []);
        setTopBatsmen(batsmenData || []);
        setTeamWinRatio(teamData || []);
      } catch (err) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  /* Normalize backend data (MySQL can return numeric strings) */
  const seasonData = seasonPerformance.map((item) => ({
    season: item.season,
    total_matches: Number(item.total_matches || 0),
    total_runs: Number(item.total_runs || 0),
    total_wickets: Number(item.total_wickets || 0),
  }));

  const batsmenData = topBatsmen.slice(0, 5).map((item) => ({
    name:
      item.batsman || item.player || item.player_name || item.name || "Unknown",
    runs: Number(item.total_runs || item.runs || item.run_count || 0),
  }));

  const teamData = teamWinRatio.map((item) => {
    const name =
      item.team || item.team_name || item.name || item.winner || "Unknown";

    // first listed field that holds a real number
    const pick = (...keys) => {
      for (const k of keys) {
        const raw = item[k];
        if (raw !== undefined && raw !== null && raw !== "" && !Number.isNaN(Number(raw))) {
          return Number(raw);
        }
      }
      return null;
    };

    let value = pick(
      "win_ratio", "win_percentage", "win_percent", "win_pct", "winRate",
      "win_rate", "ratio", "percentage", "wins", "total_wins", "win_count", "value"
    );

    // wins / matches played
    if (value === null) {
      const wins = pick("wins", "total_wins");
      const played = pick("matches", "total_matches", "matches_played");
      if (wins !== null && played) value = (wins / played) * 100;
    }

    // last resort: any numeric field that is not a name or an id
    if (value === null) {
      const k = Object.keys(item).find(
        (key) =>
          !/name|team|winner|id$/i.test(key) &&
          item[key] !== null &&
          item[key] !== "" &&
          !Number.isNaN(Number(item[key]))
      );
      value = k ? Number(item[k]) : 0;
    }

    return { name, value: Math.max(0, value) };
  });

  if (teamData.length > 0 && teamData.every((t) => t.value <= 0)) {
    // helps you see what field names your API really returns
    console.warn("Team win ratio: no numeric values found. First row from API:", teamWinRatio[0]);
  }

  return (
    <div className="dashboard-page">
      {/* HEADER */}
      <div className="dashboard-title">
        <h1>IPL Analytics Dashboard</h1>
      </div>

      {/* STAT CARDS */}
      <div className="dashboard-stats">
        <div className="dashboard-card stat-card">
          <span className="stat-label">Total Matches</span>
          <strong>{Number(summary?.total_matches || 0).toLocaleString()}</strong>
        </div>

        <div className="dashboard-card stat-card">
          <span className="stat-label">Total Runs</span>
          <strong>{Number(summary?.total_runs || 0).toLocaleString()}</strong>
        </div>

        <div className="dashboard-card stat-card">
          <span className="stat-label">Total Wickets</span>
          <strong>{Number(summary?.total_wickets || 0).toLocaleString()}</strong>
        </div>

        <div className="dashboard-card stat-card">
          <span className="stat-label">Top Bowler</span>
          <strong className="top-bowler">
            {summary?.top_bowler_name || "N/A"}
          </strong>
          <span className="bowler-wickets">
            ({summary?.top_bowler_wickets || 0})
          </span>
        </div>
      </div>

      {/* SEASON PERFORMANCE */}
      <div className="dashboard-section">
        <h2 className="section-title">Season Performance Trends</h2>
        <SeasonTrends data={seasonData} />
      </div>

      {/* LOWER ANALYTICS (3D) */}
      <div className="dashboard-bottom">
        <div className="dashboard-card analytics-card">
          <h2 className="section-title">Top 5 Batsmen</h2>
          <Batsmen3D data={batsmenData} />
        </div>

        <div className="dashboard-card analytics-card">
          <h2 className="section-title">Team Win Ratio</h2>
          <TeamDonut3D data={teamData} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;