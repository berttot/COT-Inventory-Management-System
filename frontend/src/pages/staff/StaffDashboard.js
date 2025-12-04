import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Home,
  ClipboardList,
  History,
  LogOut,
  ChevronUp,
  ChevronDown,
  User,
  Settings,
  PlusCircle,
} from "lucide-react";
// import WeatherCard from "../../components/WeatherCard";


const StaffDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("Information Technology");
  const [showLogout, setShowLogout] = useState(false);

  const [totalItems, setTotalItems] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  const [userId, setUserId] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Logout Handler
  const handleLogout = async () => {
    if (logoutLoading) return;
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

      setTimeout(() => {
        setLogoutLoading(false);
        navigate("/");
      }, 300);
    }
  };

  // Load user info
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUserName(storedUser.name);
      setDepartment(storedUser.department);
      setUserId(storedUser._id);
    }
  }, []);

  // Fetch user request summary
  useEffect(() => {
    if (!userId) return;

    const fetchStaffSummary = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/requests/staff-summary/${userId}`
        );
        const data = await res.json();

        setTotalRequests(data.total || 0);
      } catch (err) {
        console.error("Error fetching staff request summary:", err);
      }
    };

    fetchStaffSummary();
  }, [userId]);

  // Fetch total items
  useEffect(() => {
    const fetchRequestStats = async () => {
      try {
        const summaryRes = await fetch("http://localhost:5000/api/requests/summary");
        const summaryData = await summaryRes.json();
        setTotalItems(summaryData.totalItems || 0);
      } catch (err) {
        console.error("Error fetching request stats:", err);
      }
    };

    fetchRequestStats();
  }, []);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Staff Portal</p>

          <nav className="space-y-2">
            <Link to="/staff" className={getLinkClass("/staff")}>
              <Home size={18} /> Dashboard
            </Link>
            <Link to="/staff/requests" className={getLinkClass("/staff/requests")}>
              <ClipboardList size={18} /> Request Items
            </Link>
            <Link to="/staff/history" className={getLinkClass("/staff/history")}>
              <History size={18} /> History
            </Link>
          </nav>
        </div>

        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <User size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName}</p>
                <p className="text-xs opacity-70 text-white mb-3">{department}</p>
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
            <div className="mt-4 w-full max-w-[220px] flex flex-col gap-2">
              <button
                onClick={() => navigate("/staff/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2 mb-1"
              >
                <Settings size={16} />
                Settings
              </button>

              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={` w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
                  ${
                    logoutLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-[#f97316] hover:bg-orange-600 text-white"
                  }`}
              >
                <LogOut size={16} />
                {logoutLoading ? "Logging out..." : "Log Out"}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0a2a66]">
              Welcome back, {userName || "User"}!
            </h1>
            <p className="text-gray-600">
              Manage your requests and track their progress easily
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/staff/requests")}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2 rounded-lg hover:bg-[#0b347a] transition shadow-md"
            >
              <PlusCircle size={18} /> Make Request
            </button>
            <button
              onClick={() => navigate("/staff/history")}
              className="flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition shadow-md"
            >
              <History size={18} /> View History
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Total Items */}
          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-[#0a2a66] hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Total Items</h2>
            <p className="text-3xl font-bold mt-2 text-[#0a2a66]">{totalItems}</p>
            <p className="text-sm text-gray-400">All items in inventory</p>
          </div>

          {/* Total Requests */}
          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-orange-500 hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Total Requests</h2>
            <p className="text-3xl font-bold mt-2 text-orange-500">{totalRequests}</p>
            <p className="text-sm text-gray-400">Overall requests made</p>
          </div>
          {/* <WeatherCard /> */}
        </div>
      </main>
    </div>
  );
};

export default StaffDashboard;
