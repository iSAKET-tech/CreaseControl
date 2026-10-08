import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FaChartBar,
  FaUsers,
  FaShieldAlt,
  FaBaseballBall,
  FaCalendarAlt,
  FaSignOutAlt,
  FaBars,
  FaChevronLeft,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarHidden, setSidebarHidden] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Collapse sidebar after selecting a navigation option
  const handleNavigation = () => {
    setSidebarHidden(true);
  };

  return (
    <div
      className={`app-layout ${
        sidebarHidden ? "sidebar-hidden" : ""
      }`}
    >
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>
            CREASE
            <br />
            CONTROL
          </h1>

          <span>IPL ANALYTICS</span>
        </div>

        {/* NAVIGATION */}
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            onClick={handleNavigation}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaChartBar />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/players"
            onClick={handleNavigation}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaUsers />
            <span>Players</span>
          </NavLink>

          <NavLink
            to="/teams"
            onClick={handleNavigation}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaShieldAlt />
            <span>Teams</span>
          </NavLink>

          <NavLink
            to="/matches"
            onClick={handleNavigation}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaBaseballBall />
            <span>Matches</span>
          </NavLink>

          <NavLink
            to="/seasons"
            onClick={handleNavigation}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaCalendarAlt />
            <span>Seasons</span>
          </NavLink>
        </nav>

        {/* USER */}
        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="user-avatar">
              {user?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <strong>
                {user?.username || "User"}
              </strong>

              <span>
                {user?.role || "User"}
              </span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <FaSignOutAlt />
            LOGOUT
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* SIDEBAR TOGGLE */}
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarHidden(!sidebarHidden)}
          title={
            sidebarHidden
              ? "Show sidebar"
              : "Hide sidebar"
          }
        >
          {sidebarHidden ? (
            <FaBars />
          ) : (
            <FaChevronLeft />
          )}
        </button>

        <Outlet />
      </main>
    </div>
  );
}

export default Layout;