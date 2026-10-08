const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";


async function request(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }

    throw new Error(
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`
    );
  }

  return data;
}



const api = {

  get: (endpoint) =>
    request(endpoint, {
      method: "GET",
    }),

  post: (endpoint, body = {}) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint, body = {}) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (endpoint) =>
    request(endpoint, {
      method: "DELETE",
    }),

};




export const login = (email, password) =>
  api.post("/auth/login", {
    email,
    password,
  });


export const getCurrentUser = () =>
  api.get("/auth/me");


export const logout = () =>
  api.post("/auth/logout");


export const searchPlayers = (query) =>
  api.get(
    `/players/search?q=${encodeURIComponent(query)}`
  );


export const verifyPlayer = (name) =>
  api.get(
    `/players/verify/${encodeURIComponent(name)}`
  );


export const getPlayerDetail = (name) =>
  api.get(
    `/players/${encodeURIComponent(name)}`
  );




export const getTeams = () =>
  api.get("/teams/");


export const getTeamSummary = (team) =>
  api.get(
    `/teams/${encodeURIComponent(team)}/summary`
  );


export const getTeamSeasonPerformance = (team) =>
  api.get(
    `/teams/${encodeURIComponent(team)}/seasons`
  );




export const getMatches = () =>
  api.get("/matches/");


export const getDashboardSummary = () =>
  api.get("/matches/dashboard/summary");


export const getSeasonPerformance = () =>
  api.get("/matches/dashboard/season-performance");


export const getTopBatsmen = () =>
  api.get("/matches/dashboard/top-batsmen");


export const getTeamWinRatio = () =>
  api.get("/matches/dashboard/team-win-ratio");




export const getSeasonSnapshot = (season) =>
  api.get(
    `/seasons/snapshot?season=${encodeURIComponent(season)}`
  );


export const getSeasonVitals = (season) =>
  api.get(
    `/seasons/vitals?season=${encodeURIComponent(season)}`
  );


export const getTeamMomentum = (season) =>
  api.get(
    `/seasons/momentum?season=${encodeURIComponent(season)}`
  );


export const getPhaseAnalysis = (season) =>
  api.get(
    `/seasons/phases?season=${encodeURIComponent(season)}`
  );


export const getTopBatters = (season) =>
  api.get(
    `/seasons/top-batters?season=${encodeURIComponent(season)}`
  );


export const getTopBowlers = (season) =>
  api.get(
    `/seasons/top-bowlers?season=${encodeURIComponent(season)}`
  );


export const getPointsTable = (season) =>
  api.get(
    `/seasons/${encodeURIComponent(season)}/points-table`
  );


export default api;