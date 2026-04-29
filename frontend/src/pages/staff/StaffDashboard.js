import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { API_BASE, API_URL } from "../../config/api";
import { logout } from "../../utils/auth";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
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
  Package,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("Information Technology");
  const [showLogout, setShowLogout] = useState(false);

  const [totalItems, setTotalItems] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  const [recentRequests, setRecentRequests] = useState([]);
  const [userId, setUserId] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Logout Handler - using centralized logout utility
  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);

    await logout({
      recordLogout: true,
      details: "User signed out via UI",
      onComplete: () => {
        setTimeout(() => {
          setLogoutLoading(false);
          navigate("/");
        }, 300);
      },
    });
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

  const [chartData, setChartData] = useState([]);

  // Fetch total items and staff requests (recent list, chart data, and this year's count)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, staffReqsRes] = await Promise.all([
          fetch(`${API_URL}/requests/summary`),
          userId ? fetch(`${API_URL}/requests/staff/${userId}`) : Promise.resolve(null),
        ]);

        const summaryData = await summaryRes.json();
        setTotalItems(summaryData.totalItems || 0);

        if (staffReqsRes && staffReqsRes.ok) {
          const staffReqs = await staffReqsRes.json();
          const list = Array.isArray(staffReqs) ? staffReqs : [];
          setRecentRequests(list.slice(0, 5));

          const year = new Date().getFullYear();
          const thisYearCount = list.filter((r) => {
            const d = r.requestedAt ? new Date(r.requestedAt) : r.createdAt ? new Date(r.createdAt) : null;
            return d && d.getFullYear() === year;
          }).length;
          setTotalRequests(thisYearCount);

          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const byMonth = months.map((label) => ({ month: label, requests: 0 }));
          list.forEach((r) => {
            const d = r.requestedAt ? new Date(r.requestedAt) : r.createdAt ? new Date(r.createdAt) : null;
            if (d && d.getFullYear() === year) {
              const idx = d.getMonth();
              if (byMonth[idx]) byMonth[idx].requests += 1;
            }
          });
          setChartData(byMonth);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    } else {
      fetch(`${API_URL}/requests/summary`)
        .then((r) => r.json())
        .then((d) => setTotalItems(d.totalItems || 0))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(API_BASE, { autoConnect: true });
    socket.on("request-status-updated", (payload) => {
      if (!payload || String(payload.userId) !== String(userId)) return;

      setRecentRequests((prev) =>
        prev.map((r) =>
          String(r._id) === String(payload.requestId)
            ? {
                ...r,
                status: payload.status,
                rejectionReason: payload.rejectionReason || r.rejectionReason || "",
              }
            : r
        )
      );

      if (payload.status === "Approved") {
        toast.success(`Approved: ${payload.itemName} (${payload.quantity})`);
      } else if (payload.status === "Rejected") {
        toast.error(`Rejected: ${payload.itemName}${payload.rejectionReason ? ` - ${payload.rejectionReason}` : ""}`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
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
                <p className="text-sm font-medium text-white mb-1">{userName || "Staff"}</p>
                <p className="text-xs opacity-70 text-white mb-3">{department || "Department"}</p>
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
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2"
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
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="overflow-hidden rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f6f9ff] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">
                    Welcome back, {userName || "User"}!
                  </h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {department || "Department"}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Manage your requests, track request progress, and review your latest request activity from one dashboard.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Items: {loading ? "—" : totalItems}
                  </span>
                  <span className="rounded-full border border-[#cfe1ff] bg-[#e7f0ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                    Requests: {loading ? "—" : totalRequests}
                  </span>
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#1e3a8a]">
                    Recent: {loading ? "—" : recentRequests.length}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ClipboardList className="text-[#002B7F]" size={16} />
                    Dashboard Actions
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    Staff tools
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => navigate("/staff/requests")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0a2a66] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0b347a]"
                  >
                    <PlusCircle size={18} />
                    Make Request
                  </button>
                  <button
                    onClick={() => navigate("/staff/history")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600"
                  >
                    <History size={18} />
                    View History
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Total Items</h2>
                  <p className="mt-2 text-3xl font-bold text-[#0a2a66]">{loading ? "—" : totalItems}</p>
                  <p className="text-sm text-slate-400">Available in inventory</p>
                </div>
                <div className="rounded-full bg-[#eef4ff] p-3 text-[#0a2a66]">
                  <Package size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-500">Total Requests</h2>
                  <p className="mt-2 text-3xl font-bold text-[#f97316]">{loading ? "—" : totalRequests}</p>
                  <p className="text-sm text-slate-400">This year</p>
                </div>
                <div className="rounded-full bg-[#fff4ec] p-3 text-[#f97316]">
                  <ClipboardList size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-[#f8fbff] p-6 shadow-sm transition hover:shadow-md">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <TrendingUp className="text-[#0a2a66]" size={18} />
                My Requests This Year
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} requests`, "Requests"]} />
                  <Bar dataKey="requests" fill="#0a2a66" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ClipboardList className="text-[#0a2a66]" size={18} />
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  to="/staff/requests"
                  className="group flex items-center justify-between rounded-2xl border border-[#dbe7ff] bg-white p-4 transition hover:border-[#c2d7ff] hover:bg-[#f8fbff]"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#eef4ff] p-2.5 text-[#0a2a66]">
                      <PlusCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Make a Request</h3>
                      <p className="text-xs text-slate-500">Request items from inventory</p>
                    </div>
                  </div>
                  <ArrowRight className="text-slate-400 transition group-hover:text-[#0a2a66]" size={18} />
                </Link>

                <Link
                  to="/staff/history"
                  className="group flex items-center justify-between rounded-2xl border border-[#dbe7ff] bg-white p-4 transition hover:border-[#ffd8bd] hover:bg-[#fff8f2]"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#fff4ec] p-2.5 text-[#f97316]">
                      <History size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">View History</h3>
                      <p className="text-xs text-slate-500">See all your past requests</p>
                    </div>
                  </div>
                  <ArrowRight className="text-slate-400 transition group-hover:text-[#f97316]" size={18} />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-[#f8fbff] p-6 shadow-sm transition hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <History className="text-[#0a2a66]" size={18} />
                Recent Requests
              </h2>
              <Link
                to="/staff/history"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#0a2a66] hover:underline"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <p className="py-4 text-sm text-slate-500">Loading...</p>
            ) : recentRequests.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No requests yet. Make your first request from Request Items.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Quantity</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequests.map((req) => (
                      <tr key={req._id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-800">{req.itemName || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{req.quantity ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(req.requestedAt || req.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffDashboard;
