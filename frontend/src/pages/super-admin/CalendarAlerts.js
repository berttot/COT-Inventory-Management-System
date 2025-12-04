import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ClipboardList,
  Package,
  UserCog,
  LogOut,
  ChevronUp,
  ChevronDown,
  Calendar,
  Archive,
  FileText,
} from "lucide-react";

const CalendarAlerts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("userName");
    if (stored) setUserName(stored);
  }, []);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;


  const handleLogout = async () => {
    if (logoutLoading) return; // ⛔ prevents double click
    setLogoutLoading(true);

    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5000/api/logs/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ details: "User signed out via UI" }),
      });
    } catch (err) {
      console.warn("Failed to record logout:", err);
    } finally {
      localStorage.removeItem("token");

      // Small delay for better UX
      setTimeout(() => {
        setLogoutLoading(false);
        navigate("/");
      }, 300);
    }
  };



  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">

      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">
            Super Admin Portal
          </p>

          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} /> Dashboard
            </Link>

            <Link
              to="/super-admin/requests"
              className={getLinkClass("/super-admin/requests")}
            >
              <ClipboardList size={18} /> Request Log
            </Link>

            <Link
              to="/super-admin/manage-inventory"
              className={getLinkClass("/super-admin/manage-inventory")}
            >
              <Package size={18} /> Manage Inventory
            </Link>

            <Link
              to="/super-admin/calendar-alerts"
              className={getLinkClass("/super-admin/calendar-alerts")}
            >
              <Calendar size={18} /> Calendar Alerts
            </Link>
            <Link
              to="/super-admin/archived-records"
              className={getLinkClass("/super-admin/archived-records")}
            >
              <Archive size={18} />
              Archived Records
            </Link>
            <Link to="/super-admin/system-logs" className={getLinkClass("/super-admin/system-logs")}>
              <FileText size={18} /> System Logs
            </Link>
          </nav>
        </div>

        {/* Bottom User Section */}
        <div className="p-5 border-t border-white/20 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName}</p>
                <p className="text-xs opacity-70 text-white mb-3">
                  College of Technology
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLogout(!showLogout)}
              className="p-1 rounded hover:bg-white/10 transition"
            >
              {showLogout ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {showLogout && (
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className={`mt-4 w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
                ${logoutLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#f97316] hover:bg-orange-600 text-white"
                }`}
            >
              <LogOut size={16} />
              {logoutLoading ? "Logging out..." : "Log Out"}
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* Title */}
        <h1 className="text-3xl font-bold text-[#0a2a66] mb-2">Calendar Alerts</h1>
        <p className="text-gray-600 mb-6">
          Alerts are automatically added to Google Calendar when items become limited, out-of-stock, or restocked.
        </p>

        {/* EMBEDDED GOOGLE CALENDAR */}
        <h2 className="text-xl font-semibold text-[#0a2a66] mb-3">
          Full Google Calendar
        </h2>

        <iframe
          src="https://calendar.google.com/calendar/embed?src=2301101641%40student.buksu.edu.ph&ctz=UTC"
          title="Google Calendar"
          style={{ border: 0 }}
          width="100%"
          height="700"
          frameBorder="0"
          scrolling="no"
        ></iframe>

      </main>
    </div>
  );
};

export default CalendarAlerts;
