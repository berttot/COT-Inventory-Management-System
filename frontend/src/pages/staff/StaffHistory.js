import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API_BASE, API_URL } from "../../config/api";
import { apiFetch } from "../../utils/api";
import { logout } from "../../utils/auth";
import { io } from "socket.io-client";
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
import { toast } from "react-toastify";

const StaffHistory = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [cancelLoadingId, setCancelLoadingId] = useState("");
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

  useEffect(() => {
    if (!userId) return;

    const socket = io(API_BASE, { autoConnect: true });
    socket.on("request-status-updated", (payload) => {
      if (!payload || String(payload.userId) !== String(userId)) return;

      setRequests((prev) =>
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
        toast.success(`Your request for ${payload.itemName} was approved.`);
      } else if (payload.status === "Rejected") {
        toast.error(
          `Your request for ${payload.itemName} was rejected.${payload.rejectionReason ? ` Reason: ${payload.rejectionReason}` : ""}`
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // frontend snippet (all pages where handleLogout used)
  const handleLogout = async () => {
    if (logoutLoading) return; // ⛔ prevents double click
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

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-semibold"
        : "text-white hover:bg-white/10"
    }`;

  const getStatusStyle = (status) => {
    if (status === "Approved" || status === "Successful")
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "Rejected" || status === "Unsuccessful")
      return "border-red-200 bg-red-50 text-red-700";
    if (status === "Pending")
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    if (status === "Canceled")
      return "border-slate-200 bg-slate-100 text-slate-600";
    return "border-slate-200 bg-slate-100 text-slate-600";
  };

  const handleCancelRequest = async (requestId) => {
    if (!requestId || cancelLoadingId) return;

    const confirmed = window.confirm("Cancel this pending request?");
    if (!confirmed) return;

    setCancelLoadingId(requestId);
    try {
      const res = await apiFetch(`/requests/${requestId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to cancel request.");
      }

      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? { ...r, ...data.request } : r))
      );
      toast.success("Pending request canceled.");
    } catch (err) {
      console.error("Error canceling request:", err);
      toast.error(err.message || "Failed to cancel request.");
    } finally {
      setCancelLoadingId("");
    }
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

  const summaryStats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "Pending").length;
    const approved = requests.filter(
      (r) => r.status === "Approved" || r.status === "Successful"
    ).length;
    const rejectedOrCanceled = requests.filter(
      (r) => r.status === "Rejected" || r.status === "Unsuccessful" || r.status === "Canceled"
    ).length;
    return {
      total: requests.length,
      pending,
      approved,
      rejectedOrCanceled,
    };
  }, [requests]);

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
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="overflow-hidden rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f6f9ff] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">Request History</h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {summaryStats.total} request{summaryStats.total !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Review your submitted requests, track status updates, and manage pending entries.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#1e3a8a]">
                    Pending: {summaryStats.pending}
                  </span>
                  <span className="rounded-full border border-[#cfe1ff] bg-[#e7f0ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                    Approved: {summaryStats.approved}
                  </span>
                  <span className="rounded-full border border-[#dbe7ff] bg-[#f4f8ff] px-3 py-1 text-xs font-semibold text-[#334155]">
                    Rejected/Canceled: {summaryStats.rejectedOrCanceled}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <History className="text-[#002B7F]" size={16} />
                  History Overview
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Keep track of request outcomes and cancel pending requests if needed.
                </p>
                <div className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  Sorted by {sortConfig.key === "requestedAt" ? "Requested Date" : sortConfig.key}
                </div>
              </div>
            </div>
          </header>

          <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative block w-full lg:max-w-md">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by item name or status..."
                  value={search}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full rounded-2xl border border-[#dbe7ff] bg-white py-3 pl-10 pr-10 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-[#002B7F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002B7F]/15"
                  aria-label="Search request history"
                />
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Clear search"
                    title="Clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </label>

              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-800">{showingFrom}</span>-<span className="font-semibold text-slate-800">{showingTo}</span> of{" "}
                <span className="font-semibold text-slate-800">{total}</span>
              </div>
            </div>
          </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-[#0a2a66]" size={32} />
              <span className="ml-3 text-base text-slate-600">Loading history...</span>
            </div>
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-red-700 shadow-sm">
            <p className="mb-1 font-semibold">Couldn’t load request history</p>
            <p className="text-sm text-red-700">{fetchError}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <History size={34} className="mx-auto mb-3 text-slate-400" />
            <p className="font-semibold text-slate-700">No request history yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Once you submit requests, they’ll appear here with their status and date.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <Search size={34} className="mx-auto mb-3 text-slate-400" />
            <p className="font-semibold text-slate-700">No matching results</p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different keyword (item name or status).
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-[#0a2a66]">History</h3>
                <div className="text-xs text-slate-600">Sorted by {sortConfig.key === "requestedAt" ? "Requested Date" : sortConfig.key}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-700">
                  <tr>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => requestSort("itemName")}
                        className="inline-flex items-center font-semibold hover:text-slate-900"
                        aria-label="Sort by item name"
                      >
                        Item Name{sortIndicator("itemName")}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => requestSort("quantity")}
                        className="inline-flex items-center font-semibold hover:text-slate-900"
                        aria-label="Sort by quantity"
                      >
                        Quantity{sortIndicator("quantity")}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => requestSort("status")}
                        className="inline-flex items-center font-semibold hover:text-slate-900"
                        aria-label="Sort by status"
                      >
                        Status{sortIndicator("status")}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        type="button"
                        onClick={() => requestSort("requestedAt")}
                        className="inline-flex items-center font-semibold hover:text-slate-900"
                        aria-label="Sort by requested date"
                      >
                        Requested Date{sortIndicator("requestedAt")}
                      </button>
                    </th>
                    <th className="p-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRequests.map((req) => (
                    <tr key={req._id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
                      <td className="p-3 font-medium text-slate-900">{req.itemName}</td>
                      <td className="p-3 text-slate-700">{req.quantity}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                              req.status
                            )}`}
                          >
                            {req.status}
                          </span>
                          {(req.status === "Rejected" || req.status === "Unsuccessful") && req.rejectionReason ? (
                            <p className="max-w-[220px] text-xs text-red-600">{req.rejectionReason}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Clock size={14} />
                          {formatRequestedAt(req.requestedAt)}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {req.status === "Pending" ? (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req._id)}
                            disabled={cancelLoadingId === req._id}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {cancelLoadingId === req._id ? "Canceling..." : "Cancel"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-800">{safePage}</span> of{" "}
                <span className="font-semibold text-slate-800">{totalPages}</span>
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default StaffHistory;
