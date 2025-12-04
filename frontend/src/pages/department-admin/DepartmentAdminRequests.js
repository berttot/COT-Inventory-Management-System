import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ClipboardList,
  Users,
  LogOut,
  ChevronUp,
  ChevronDown,
  User,
  Settings,
  Clock,
  Archive,
} from "lucide-react";

const DepartmentAdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showLogout, setShowLogout] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedDept = localStorage.getItem("department");
    if (storedName) setUserName(storedName);
    if (storedDept) setDepartment(storedDept);
  }, []);

  // ✅ Fetch department requests (optionally filtered)
  useEffect(() => {
    if (!department) return;

    const fetchRequests = async () => {
      try {
        let url = `http://localhost:5000/api/requests/department/${encodeURIComponent(department)}`;
        const params = [];
        if (selectedMonth) params.push(`month=${selectedMonth}`);
        if (selectedYear) params.push(`year=${selectedYear}`);
        if (selectedDay) params.push(`day=${selectedDay}`);

        if (params.length > 0) url += "?" + params.join("&");

        const res = await fetch(url);
        const data = await res.json();
        setRequests(data);
      } catch (err) {
        console.error("Error fetching department requests:", err);
      }
    };

    fetchRequests();
  }, [department, selectedMonth, selectedYear, selectedDay]);

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };


  // frontend snippet (all pages where handleLogout used)
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


  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-semibold"
        : "text-white hover:bg-white/10"
    }`;

  const getStatusStyle = (status) => {
    if (status === "Successful")
      return "bg-green-100 text-green-600 border border-green-300";
    if (status === "Unsuccessful")
      return "bg-red-100 text-red-600 border border-red-300";
    return "bg-gray-100 text-gray-600 border border-gray-300";
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Dept. Admin Portal</p>

          <nav className="space-y-2">
            <Link to="/department-admin" className={getLinkClass("/department-admin")}>
              <Home size={18} /> Dashboard
            </Link>
            <Link to="/department-admin/users" className={getLinkClass("/department-admin/users")}>
              <Users size={18} /> Manage Staff
            </Link>
            <Link to="/department-admin/requests" className={getLinkClass("/department-admin/requests")}>
              <ClipboardList size={18} /> Request Log
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
                <Settings size={16} /> Settings
              </button>

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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#002B7F]">
              Staff Request Logs
            </h1>
            <p className="text-gray-600">
              View and manage all staff logs in the Department.
            </p>
          </div>

          {/* 🗓 Month/Year Filters */}
        <div className="flex items-center gap-3">
          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("en", { month: "long" })}
              </option>
            ))}
          </select>

          {/* Day Dropdown */}
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Days</option>
            {selectedMonth &&
            Array.from(
              { length: new Date(Number(selectedYear), Number(selectedMonth), 0).getDate() },
              (_, i) => i + 1
            ).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>


          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>

          {/* 🧹 Clear Filter Button */}
          <button
            onClick={() => { 
              setSelectedMonth("");
              setSelectedYear(new Date().getFullYear());
              setSelectedDay("");
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            Clear Filter
          </button>
        </div>
        </div>

        {requests.length === 0 ? (
          <p className="text-gray-500 italic">No staff requests found for this department.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
            <table className="w-full text-sm text-left">
              <thead className="border-b text-gray-700">
                <tr>
                  <th className="pb-3">Staff Name</th>
                  <th className="pb-3">Item Name</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Requested Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{req.requestedBy}</td>
                    <td>{req.itemName}</td>
                    <td>{req.quantity}</td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusStyle(req.status)}`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="flex items-center gap-1 text-gray-600">
                      <Clock size={14} />
                      {new Date(req.requestedAt).toLocaleString("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default DepartmentAdminRequests;
