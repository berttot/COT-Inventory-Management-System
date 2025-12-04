import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  ClipboardList,
  Home,
  ChevronUp,
  ChevronDown,
  LogOut,
  User,
  Users,
  BarChart3,
  Settings,
  Archive,
} from "lucide-react";

// import WeatherCard from "../../components/WeatherCard";

const DepartmentAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [department, setDepartment] = useState("");

  const [totalRequests, setTotalRequests] = useState(0);
  // const [successfulRequests, setSuccessfulRequests] = useState(0);
  // const [unsuccessfulRequests, setUnsuccessfulRequests] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once


  // 🧩 Load department and username
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedDept = localStorage.getItem("department");
    if (storedName) setUserName(storedName);
    if (storedDept) setDepartment(storedDept);
  }, []);

  // 📦 Fetch total/successful/unsuccessful requests dynamically
  useEffect(() => {
    if (!department) return;

    const fetchRequestStats = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/requests/stats/${encodeURIComponent(department)}`
        );
        const data = await res.json();
        setTotalRequests(data.total || 0);
        // setSuccessfulRequests(data.successful || 0);
        // setUnsuccessfulRequests(data.unsuccessful || 0);

        const summaryRes = await fetch("http://localhost:5000/api/requests/summary");
        const summaryData = await summaryRes.json();
        setTotalItems(summaryData.totalItems);
      } catch (err) {
        console.error("Error fetching request stats:", err);
      }
    };

    fetchRequestStats();
  }, [department]);

  
  // 🔒 Logout
  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };

  // frontend snippet (all pages where handleLogout used)
  // const handleLogout = async () => {
  //   try {
  //     const token = localStorage.getItem("token");
  //     await fetch("http://localhost:5000/api/logs/logout", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         ...(token ? { Authorization: `Bearer ${token}` } : {}),
  //       },
  //       body: JSON.stringify({ details: "User signed out via UI" }),
  //     });
  //   } catch (err) {
  //     console.warn("Failed to record logout:", err);
  //   } finally {
  //     localStorage.removeItem("token");
  //     navigate("/");
  //   }
  // };

  //handle the logout to prevent double clicking
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
  

  //  Helper for sidebar link styles
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
          <p className="text-sm text-gray-300 opacity-70 mb-10">
            Dept. Admin Portal
          </p>

          <nav className="space-y-2">
            <Link to="/department-admin" className={getLinkClass("/department-admin")}>
              <Home size={18} />
              Dashboard
            </Link>
            <Link
              to="/department-admin/users"
              className={getLinkClass("/department-admin/users")}
            >
              <Users size={18} />
              Manage Staff
            </Link>
            <Link
              to="/department-admin/requests"
              className={getLinkClass("/department-admin/requests")}
            >
              <ClipboardList size={18} />
              Request Log
            </Link>
            <Link to="/department-admin/archived-users" className={getLinkClass("/department-admin/archived-users")}>
              <Archive size={18} /> Archived Staff
            </Link>
          </nav>
        </div>

        {/* Bottom User Section */}
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
                onClick={() => navigate("/department-admin/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2 mb-1"
              >
                <Settings size={16} />
                Settings
              </button>

              {/* <button
                onClick={handleLogout}
                className="bg-[#f97316] text-white py-2 rounded-lg hover:bg-orange-600 transition font-medium flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Log Out
              </button> */}

              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={`w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
                  ${logoutLoading
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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0a2a66]">
              Welcome back, {userName || "User"}!
            </h1>
            <p className="text-gray-600">
              Manage your department’s inventory and requests efficiently.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/department-admin/reports")}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2 rounded-lg hover:bg-[#0b347a] transition shadow-md"
            >
              <BarChart3 size={18} />
              View Reports
            </button>
            <button
              onClick={() => navigate("/department-admin/requests")}
              className="flex items-center gap-2 bg-[#f97316] text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition shadow-md"
            >
              <ClipboardList size={18} />
              View Requests
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Total Items (static for now) */}
          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-[#0a2a66] hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Total Items</h2>
            <p className="text-3xl font-bold mt-2 text-[#0a2a66]">{totalItems}</p>
            <p className="text-sm text-gray-400">All items in inventory</p>
          </div>

          {/* ✅ Successful Requests */}
          {/* <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-green-500 hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Successful Requests</h2>
            <p className="text-3xl font-bold mt-2 text-green-600">
              {successfulRequests}
            </p>
            <p className="text-sm text-gray-400">Succeed and processed</p>
          </div> */}

          {/* ❌ Unsuccessful Requests */}
          {/* <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-red-500 hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Unsuccessful Requests</h2>
            <p className="text-3xl font-bold mt-2 text-red-500">
              {unsuccessfulRequests}
            </p>
            <p className="text-sm text-gray-400">Rejected or insufficient stock</p>
          </div> */}

          {/* 📊 Total Requests */}
          <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-orange-500 hover:shadow-lg transition">
            <h2 className="text-gray-500 text-sm">Total Requests</h2>
            <p className="text-3xl font-bold mt-2 text-orange-500">
              {totalRequests}
            </p>
            <p className="text-sm text-gray-400">Overall Requests of Staffs</p>
          </div>

          {/* <WeatherCard /> */}
        </div>
      </main>
    </div>
  );
};

export default DepartmentAdminDashboard;
