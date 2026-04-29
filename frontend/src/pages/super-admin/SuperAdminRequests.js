import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, API_URL } from "../../config/api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { logout } from "../../utils/auth";
import { io } from "socket.io-client";
import {
  Home,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  LogOut,
  UserCog,
  Clock,
  Package,
  Calendar,
  Archive,
  FileText,
  Settings,
  Search,
  CheckCircle2,
  XCircle,
  Hash,
  ArrowDownToLine,
  CalendarDays,
  FileDown,
} from "lucide-react";
import { toast } from "react-toastify";
import NotificationBell from "../../components/NotificationBell";

const flattenRequests = (requestsByDept) =>
  Object.entries(requestsByDept).flatMap(([department, reqs]) =>
    (reqs || []).map((req) => ({ ...req, department }))
  );

const shortId = (id) => (id ? String(id).slice(-8).toUpperCase() : "—");

const getPendingCountFromGrouped = (grouped) => {
  if (!grouped || typeof grouped !== "object") return 0;

  return Object.values(grouped).reduce((sum, list) => {
    if (!Array.isArray(list)) return sum;
    return sum + list.filter((req) => req?.status === "Pending").length;
  }, 0);
};

const SuperAdminRequests = () => {
  const [requestsByDept, setRequestsByDept] = useState({});
  const [periodPreset, setPeriodPreset] = useState("all");
  const [customMonth, setCustomMonth] = useState("");
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingRequestLogReport, setLoadingRequestLogReport] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [rejectModal, setRejectModal] = useState({
    open: false,
    requestId: "",
    requestLabel: "",
    reason: "",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const lastPendingCountRef = useRef(null);
  const fetchDataRef = useRef(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUserName(storedUser.name || "Super Admin");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("status") === "pending") setStatusFilter("pending");
  }, [location.search]);

  const dateParams = useMemo(() => {
    const now = new Date();
    if (periodPreset === "thisMonth") {
      return { month: now.getMonth() + 1, year: now.getFullYear() };
    }
    if (periodPreset === "custom") {
      return { month: customMonth, year: customYear };
    }
    return { month: "", year: "" };
  }, [periodPreset, customMonth, customYear]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/requests/all`;
      const params = [];
      if (dateParams.month) params.push(`month=${dateParams.month}`);
      if (dateParams.year) params.push(`year=${dateParams.year}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const res = await fetch(url);
      const data = await res.json();
      setRequestsByDept(data);
    } catch (err) {
      console.error("Error fetching all requests:", err);
    } finally {
      setLoading(false);
    }
  }, [dateParams.month, dateParams.year]);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const socket = io(API_BASE, { autoConnect: true });

    socket.on("request-alerts", (payload) => {
      const nextPending = Number(payload?.pending ?? 0);

      if (lastPendingCountRef.current === null) {
        lastPendingCountRef.current = nextPending;
      } else if (nextPending > lastPendingCountRef.current) {
        const added = nextPending - lastPendingCountRef.current;
        toast.info(
          added === 1
            ? "New pending staff request received."
            : `${added} new pending staff requests received.`
        );
        lastPendingCountRef.current = nextPending;
      } else {
        lastPendingCountRef.current = nextPending;
      }

      if (fetchDataRef.current) {
        fetchDataRef.current();
      }
    });

    return () => socket.disconnect();
  }, []);

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

  const getLinkClass = (path) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 transition ${
      location.pathname === path
        ? "bg-white font-semibold text-[#0a2a66]"
        : "text-white hover:bg-white/10"
    }`;

  const handleGenerateReport = async () => {
    if (!reportMonth || !reportYear) {
      toast.warning("Please select both month and year for the report.");
      return;
    }

    setLoadingReport(true);
    try {
      const url = `${API_URL}/reports/superadmin/combined?month=${reportMonth}&year=${reportYear}`;
      const response = await apiFetch(url.replace(API_URL, ""), { method: "GET" });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate report");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      toast.success("Transaction report generated successfully!");
    } catch (err) {
      console.error("Error generating report:", err);
      toast.error("Failed to generate transaction report. Please try again.");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleGenerateRequestLogReport = async () => {
    if (!reportMonth || !reportYear) {
      toast.warning("Please select both month and year for the report.");
      return;
    }

    setLoadingRequestLogReport(true);
    try {
      const url = `${API_URL}/reports/superadmin/request-log?month=${reportMonth}&year=${reportYear}`;
      const response = await apiFetch(url.replace(API_URL, ""), { method: "GET" });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate request log report");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      toast.success("Request log report generated successfully!");
    } catch (err) {
      console.error("Error generating request log report:", err);
      toast.error("Failed to generate request log report. Please try again.");
    } finally {
      setLoadingRequestLogReport(false);
    }
  };

  const allRequests = useMemo(() => flattenRequests(requestsByDept), [requestsByDept]);

  const departments = useMemo(
    () => [...new Set(allRequests.map((req) => req.department))].sort(),
    [allRequests]
  );

  const isPendingStatus = (status) => status === "Pending";
  const isApprovedStatus = (status) => status === "Approved" || status === "Successful";
  const isRejectedStatus = (status) =>
    status === "Rejected" || status === "Unsuccessful" || status === "Canceled";

  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      if (departmentFilter && req.department !== departmentFilter) return false;
      if (statusFilter === "pending" && !isPendingStatus(req.status)) return false;
      if (statusFilter === "approved" && !isApprovedStatus(req.status)) return false;
      if (statusFilter === "rejected" && !isRejectedStatus(req.status)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (req.requestedBy || "").toLowerCase().includes(q);
        const matchItem = (req.itemName || "").toLowerCase().includes(q);
        const matchDept = (req.department || "").toLowerCase().includes(q);
        if (!matchName && !matchItem && !matchDept) return false;
      }

      return true;
    });
  }, [allRequests, departmentFilter, searchQuery, statusFilter]);

  const handleApproveRequest = async (requestId) => {
    if (!requestId || actionLoadingId) return;
    setActionLoadingId(requestId);

    try {
      const res = await apiFetch(`/requests/${requestId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to approve request.");

      toast.success(data.message || "Request approved successfully.");
      await fetchData();
    } catch (err) {
      console.error("Error approving request:", err);
      toast.error(err.message || "Failed to approve request.");
    } finally {
      setActionLoadingId("");
    }
  };

  const openRejectModal = (req) => {
    if (!req?._id || actionLoadingId) return;
    setRejectModal({
      open: true,
      requestId: req._id,
      requestLabel: `${req.requestedBy || "Staff"} • ${req.quantity} x ${req.itemName}`,
      reason: "Rejected by superadmin.",
    });
  };

  const closeRejectModal = () => {
    setRejectModal({ open: false, requestId: "", requestLabel: "", reason: "" });
  };

  const submitRejectRequest = async () => {
    const requestId = rejectModal.requestId;
    const reason = rejectModal.reason.trim();
    if (!requestId || actionLoadingId) return;
    if (!reason) {
      toast.warning("Please provide a rejection reason.");
      return;
    }

    setActionLoadingId(requestId);
    try {
      const res = await apiFetch(`/requests/${requestId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reject request.");

      toast.success(data.message || "Request rejected successfully.");
      closeRejectModal();
      await fetchData();
    } catch (err) {
      console.error("Error rejecting request:", err);
      toast.error(err.message || "Failed to reject request.");
    } finally {
      setActionLoadingId("");
    }
  };

  useEffect(() => {
    setPage(1);
  }, [periodPreset, customMonth, customYear, departmentFilter, searchQuery, statusFilter]);

  const total = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRequests = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRequests.slice(start, start + PAGE_SIZE);
  }, [filteredRequests, safePage]);

  const stats = useMemo(() => {
    const totalCount = filteredRequests.length;
    const successful = filteredRequests.filter((req) => isApprovedStatus(req.status)).length;
    const pending = filteredRequests.filter((req) => isPendingStatus(req.status)).length;
    const rejected = filteredRequests.filter((req) => isRejectedStatus(req.status)).length;
    return { total: totalCount, successful, rejected, pending };
  }, [filteredRequests]);

  const summaryStats = useMemo(() => {
    const totalCount = allRequests.length;
    const successful = allRequests.filter((req) => isApprovedStatus(req.status)).length;
    const pending = allRequests.filter((req) => isPendingStatus(req.status)).length;
    const rejected = allRequests.filter((req) => isRejectedStatus(req.status)).length;
    return { total: totalCount, successful, rejected, pending };
  }, [allRequests]);

  const getStatusStyle = (status) => {
    if (isApprovedStatus(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (isRejectedStatus(status)) return "bg-red-50 text-red-700 border-red-200";
    if (isPendingStatus(status)) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const TransactionTable = ({ requests, showDepartment = false, showActions = false }) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
            <th className="px-4 py-3.5">Transaction ID</th>
            <th className="px-4 py-3.5">Date & time</th>
            <th className="px-4 py-3.5">Type</th>
            {showDepartment && <th className="px-4 py-3.5">Department</th>}
            <th className="px-4 py-3.5">Requested by</th>
            <th className="px-4 py-3.5">Item</th>
            <th className="px-4 py-3.5 text-right">Qty</th>
            <th className="px-4 py-3.5">Status</th>
            {showActions && <th className="px-4 py-3.5 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((req) => (
            <tr key={req._id} className="transition-colors hover:bg-slate-50/60">
              <td className="px-4 py-3 font-mono text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Hash size={12} />
                  {shortId(req._id)}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {new Date(req.requestedAt).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  <ArrowDownToLine size={12} />
                  Item request
                </span>
              </td>
              {showDepartment && <td className="px-4 py-3 font-medium text-slate-700">{req.department}</td>}
              <td className="px-4 py-3 font-medium text-slate-800">{req.requestedBy}</td>
              <td className="px-4 py-3 text-slate-700">{req.itemName}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-800">{req.quantity}</td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyle(req.status)}`}>
                    {isApprovedStatus(req.status) ? (
                      <CheckCircle2 size={12} />
                    ) : isPendingStatus(req.status) ? (
                      <Clock size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    {req.status}
                  </span>
                  {isRejectedStatus(req.status) && req.rejectionReason ? (
                    <p className="max-w-[240px] text-[11px] leading-snug text-red-700">{req.rejectionReason}</p>
                  ) : null}
                </div>
              </td>
              {showActions && (
                <td className="px-4 py-3 text-center">
                  {isPendingStatus(req.status) ? (
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req._id)}
                        disabled={actionLoadingId === req._id}
                        className="rounded-md bg-[#1d4ed8] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoadingId === req._id ? "Working..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openRejectModal(req)}
                        disabled={actionLoadingId === req._id}
                        className="rounded-md bg-[#0a2a66] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#0b347a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-4">
        <ClipboardList size={40} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">No requests found</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {searchQuery || departmentFilter || periodPreset !== "all"
          ? "Try adjusting your filters or date range."
          : "Requests from staff will appear here as the request log."}
      </p>
    </div>
  );

  const PaginationBar = ({ totalCount, pageNumber, setPageNumber }) => {
    const pages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const safe = Math.min(pageNumber, pages);
    const from = totalCount === 0 ? 0 : (safe - 1) * PAGE_SIZE + 1;
    const to = Math.min(totalCount, safe * PAGE_SIZE);

    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-800">{from}</span>–<span className="font-semibold text-slate-800">{to}</span> of <span className="font-semibold text-slate-800">{totalCount}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={safe <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Prev
          </button>
          <div className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-800">{safe}</span> of <span className="font-semibold text-slate-800">{pages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(pages, p + 1))}
            disabled={safe >= pages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      <aside className="flex w-64 flex-shrink-0 flex-col justify-between bg-[#002B7F] text-white shadow-lg">
        <div className="p-6">
          <h2 className="mb-1 text-2xl font-bold text-white">COT Inventory</h2>
          <p className="mb-10 text-sm text-gray-300 opacity-70">Super Admin Portal</p>
          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} />
              Dashboard
            </Link>
            <Link to="/super-admin/manage-users" className={getLinkClass("/super-admin/manage-users")}>
              <UserCog size={18} />
              Manage Users
            </Link>
            <Link to="/super-admin/requests" className={getLinkClass("/super-admin/requests")}>
              <ClipboardList size={18} />
              Request Log
            </Link>
            <Link to="/super-admin/manage-inventory" className={getLinkClass("/super-admin/manage-inventory")}>
              <Package size={18} />
              Manage Inventory
            </Link>
            <Link to="/super-admin/calendar-alerts" className={getLinkClass("/super-admin/calendar-alerts")}>
              <Calendar size={18} />
              Calendar Alerts
            </Link>
            <Link to="/super-admin/archived-records" className={getLinkClass("/super-admin/archived-records")}>
              <Archive size={18} />
              Archived Records
            </Link>
            <Link to="/super-admin/system-logs" className={getLinkClass("/super-admin/system-logs")}>
              <FileText size={18} />
              System Logs
            </Link>
          </nav>
        </div>

        <div className="border-t border-white/20 px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-300">Notifications</span>
            <NotificationBell />
          </div>
        </div>

        <div className="flex flex-col items-center border-t border-white/20 bg-[#002B7F] p-5">
          <div className="flex w-full max-w-[220px] items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="mb-1 text-sm font-medium text-white">{userName}</p>
                <p className="mb-3 text-xs text-white opacity-70">College of Technology</p>
              </div>
            </div>
            <button onClick={() => setShowLogout((value) => !value)} className="rounded p-1 transition hover:bg-white/10">
              {showLogout ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
          {showLogout && (
            <div className="mt-4 flex w-full max-w-[220px] flex-col gap-2">
              <button
                onClick={() => navigate("/super-admin/settings")}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] py-2 font-medium text-white transition hover:bg-[#1d4ed8]"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className={`flex w-full max-w-[220px] items-center justify-center gap-2 rounded-lg py-2 font-medium ${
                  logoutLoading ? "cursor-not-allowed bg-gray-400" : "bg-[#f97316] text-white hover:bg-orange-600"
                }`}
              >
                <LogOut size={16} />
                {logoutLoading ? "Logging out..." : "Log Out"}
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="overflow-hidden rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f6f9ff] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">Request Log</h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {summaryStats.total} request{summaryStats.total !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Monitor the full request lifecycle for your selected time period, including pending approvals and final decisions.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#1e3a8a]">Pending: {summaryStats.pending}</span>
                  <span className="rounded-full border border-[#cfe1ff] bg-[#e7f0ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">Approved: {summaryStats.successful}</span>
                  <span className="rounded-full border border-[#dbe7ff] bg-[#f4f8ff] px-3 py-1 text-xs font-semibold text-[#334155]">Rejected/Canceled: {summaryStats.rejected}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileDown size={16} className="text-[#002B7F]" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Exports</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-1 focus:ring-[#002B7F]"
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("en", { month: "long" })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(e.target.value)}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#002B7F] focus:outline-none focus:ring-1 focus:ring-[#002B7F]"
                  >
                    {Array.from({ length: 6 }, (_, i) => {
                      const y = new Date().getFullYear() - i;
                      return (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    disabled={loadingReport}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white transition ${
                      loadingReport ? "cursor-not-allowed bg-slate-400" : "bg-[#0a2a66] hover:bg-[#0b347a]"
                    }`}
                  >
                    {loadingReport ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FileDown size={14} />}
                    {loadingReport ? "Generating..." : "Transaction PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateRequestLogReport}
                    disabled={loadingRequestLogReport}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white transition ${
                      loadingRequestLogReport ? "cursor-not-allowed bg-slate-400" : "bg-[#f97316] hover:bg-orange-600"
                    }`}
                  >
                    {loadingRequestLogReport ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FileText size={14} />}
                    {loadingRequestLogReport ? "Generating..." : "Request Log PDF"}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:items-start">
              <div className="space-y-3">
                <label className="relative block">
                  <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by staff, item, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-[#dbe7ff] bg-white py-3 pl-10 pr-4 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-[#002B7F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002B7F]/15"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-[#f4f8ff] px-2 py-2">
                    <CalendarDays size={14} className="ml-1 text-slate-400" />
                    {[
                      { value: "all", label: "All time" },
                      { value: "thisMonth", label: "Month" },
                      { value: "custom", label: "Custom" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPeriodPreset(value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          periodPreset === value ? "bg-[#002B7F] text-white" : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPeriodPreset("all");
                      setCustomMonth("");
                      setCustomYear(new Date().getFullYear());
                      setDepartmentFilter("");
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                    className="rounded-full border border-[#dbe7ff] bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-[#f4f8ff]"
                  >
                    Clear filters
                  </button>

                  {periodPreset === "custom" && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe7ff] bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      <select
                        value={customMonth}
                        onChange={(e) => setCustomMonth(e.target.value)}
                        className="border-0 bg-transparent py-0 pl-0 pr-4 text-slate-700 focus:ring-0"
                      >
                        <option value="">Month</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleString("en", { month: "short" })}
                          </option>
                        ))}
                      </select>
                      <select
                        value={customYear}
                        onChange={(e) => setCustomYear(Number(e.target.value))}
                        className="border-0 bg-transparent py-0 pl-0 pr-0 text-slate-700 focus:ring-0"
                      >
                        {Array.from({ length: 6 }, (_, i) => {
                          const y = new Date().getFullYear() - i;
                          return (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          );
                        })}
                      </select>
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full rounded-2xl border border-[#dbe7ff] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition focus:border-[#002B7F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002B7F]/15"
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#dbe7ff] bg-[#f4f8ff] p-2 sm:grid-cols-4">
                  {[
                    { value: "all", label: "All" },
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatusFilter(option.value)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        statusFilter === option.value ? "bg-[#002B7F] text-white shadow-sm" : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : filteredRequests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              <PaginationBar totalCount={total} pageNumber={page} setPageNumber={setPage} />
              <TransactionTable requests={pagedRequests} showDepartment={true} showActions={true} />
              {totalPages > 1 && (
                <PaginationBar totalCount={total} pageNumber={page} setPageNumber={setPage} />
              )}
            </div>
          )}
        </div>
      </main>

      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Reject Request</h3>
            <p className="mt-2 text-sm text-slate-600">Provide a clear reason for this request rejection.</p>
            <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{rejectModal.requestLabel}</p>

            <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="reject-reason">
              Rejection reason
            </label>
            <textarea
              id="reject-reason"
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
              placeholder="Reason for rejecting this request..."
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRejectRequest}
                disabled={actionLoadingId === rejectModal.requestId}
                className="rounded-lg bg-[#0a2a66] px-4 py-2 text-sm font-medium text-white hover:bg-[#113b86] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoadingId === rejectModal.requestId ? "Working..." : "Reject request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRequests;