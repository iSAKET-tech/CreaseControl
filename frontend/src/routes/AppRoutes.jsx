import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/Login";
import Layout from "../components/layout/Layout";
import Dashboard from "../pages/Dashboard";
import Players from "../pages/Players";
import Teams from "../pages/Teams";
import TeamDetail from "../pages/TeamDetail";
import PlayerDetail from "../pages/PlayerDetail";
import Matches from "../pages/Matches";
import Seasons from "../pages/Seasons";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>

            <Route path="/" element={<Dashboard />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:teamName" element={<TeamDetail />}/>
            <Route path="/matches" element={<Matches />} />
            <Route path="/seasons" element={<Seasons />} />

          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;