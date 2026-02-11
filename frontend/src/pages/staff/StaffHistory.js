import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "../../config/api";
import {
  Home,
  ClipboardList,
  History,
  Loader2,
  LogOut,
  ChevronUp,
  ChevronDown,
  User,
  Clock,
  Search,
  Settings,
  X,
} from "lucide-react";

const StaffHistory = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState("");

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // table controls
  const PAGE_SIZE = 25;
  const [search, setSearchText] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "requestedAt",
    direction: "desc", // default: newest first
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUserId(storedUser._id);
      setUserName(storedUser.name);
      setDepartment(storedUser.department);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchRequests = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const res = await fetch(`${API_URL}/requests/staff/${userId}`);
        if (!res.ok) throw new Error("Failed to load request history.");
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching request history:", err);
        setFetchError(err.message || "Failed to load request history.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [userId]);

  // frontend snippet (all pages where handleLogout used)
  const handleLogout = async () => {
    if (logoutLoading) return; // ⛔ prevents double click
    setLogoutLoading(true);

    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/logs/logout`, {
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

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: key === "requestedAt" ? "desc" : "asc" };
    });
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return (
      <span className="ml-1 inline-block align-middle text-gray-400">
        {sortConfig.direction === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const formatRequestedAt = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  };

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => {
        if (!q) return true;
        const itemName = (r.itemName || "").toLowerCase();
        const status = (r.status || "").toLowerCase();
        return itemName.includes(q) || status.includes(q);
      });
  }, [requests, search]);

  const sortedRequests = useMemo(() => {
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    const getValue = (r) => {
      if (key === "quantity") return Number(r.quantity ?? 0);
      if (key === "status") return String(r.status || "").toLowerCase();
      if (key === "itemName") return String(r.itemName || "").toLowerCase();
      // requestedAt
      return new Date(r.requestedAt || 0).getTime();
    };

    return [...filteredRequests].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      // tie-breaker: newest first
      const da = new Date(a.requestedAt || 0).getTime();
      const db = new Date(b.requestedAt || 0).getTime();
      return db - da;
    });
  }, [filteredRequests, sortConfig]);

  const total = sortedRequests.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, sortConfig.key, sortConfig.direction]);

  const pagedRequests = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedRequests.slice(start, start + PAGE_SIZE);
  }, [sortedRequests, safePage, PAGE_SIZE]);

  const showingFrom = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(total, safePage * PAGE_SIZE);

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#002B7F]">Request History</h1>
            <p className="text-gray-600 mt-1">
              Review your past requests and their statuses.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <input
                type="text"
                placeholder="Search by item name or status..."
                value={search}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                aria-label="Search request history"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  className="absolute right-2 top-2 p-1 rounded hover:bg-gray-100 text-gray-500"
                  aria-label="Clear search"
                  title="Clear"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-800">{showingFrom}</span>–<span className="font-semibold text-gray-800">{showingTo}</span> of{" "}
              <span className="font-semibold text-gray-800">{total}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={36} />
            <span className="ml-3 text-gray-600 text-lg">Loading history...</span>
          </div>
        ) : fetchError ? (
          <div className="bg-white border border-red-100 rounded-2xl p-6 text-red-700 shadow-sm">
            <p className="font-semibold mb-1">Couldn’t load request history</p>
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
            <History size={34} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-semibold">No request history yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Once you submit requests, they’ll appear here with their status and date.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
            <Search size={34} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-semibold">No matching results</p>
            <p className="text-gray-500 text-sm mt-1">
              Try a different keyword (item name or status).
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-[#002B7F]">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-white">History</h3>
                <div className="text-xs text-white/80">Sorted by {sortConfig.key === "requestedAt" ? "Requested Date" : sortConfig.key}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[760px]">
                <thead className="bg-gray-100 border-b text-gray-700">
                  <tr>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => requestSort("itemName")}
                        className="inline-flex items-center hover:text-gray-900 font-semibold"
                        aria-label="Sort by item name"
                      >
                        Item Name{sortIndicator("itemName")}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => requestSort("quantity")}
                        className="inline-flex items-center hover:text-gray-900 font-semibold"
                        aria-label="Sort by quantity"
                      >
                        Quantity{sortIndicator("quantity")}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => requestSort("status")}
                        className="inline-flex items-center hover:text-gray-900 font-semibold"
                        aria-label="Sort by status"
                      >
                        Status{sortIndicator("status")}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => requestSort("requestedAt")}
                        className="inline-flex items-center hover:text-gray-900 font-semibold"
                        aria-label="Sort by requested date"
                      >
                        Requested Date{sortIndicator("requestedAt")}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRequests.map((req) => (
                    <tr key={req._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{req.itemName}</td>
                      <td className="p-3 text-gray-700">{req.quantity}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusStyle(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock size={14} />
                          {formatRequestedAt(req.requestedAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-white">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm text-gray-600">
                Page <span className="font-semibold text-gray-800">{safePage}</span> of{" "}
                <span className="font-semibold text-gray-800">{totalPages}</span>
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffHistory;
