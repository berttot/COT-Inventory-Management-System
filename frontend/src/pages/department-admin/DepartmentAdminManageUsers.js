import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Loader2,
  User,
  PlusCircle,
  Home,
  Users,
  ChevronDown,
  ChevronUp,
  LogOut,
  Settings,
  ClipboardList,
  Archive,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { API_URL } from "../../config/api";
import { logout } from "../../utils/auth";

const DepartmentAdminManageUsers = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const [form, setForm] = useState({ email: "" });

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // Archive confirmation (replaces window.confirm)
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // table controls
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const storedDepartment = localStorage.getItem("department");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/users?archived=false`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch staff.");
      const data = await response.json();

      const staffInDept = data.filter(
        (u) => u.role === "staff" && u.department === storedDepartment
      );
      setUsers(staffInDept);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setFetchError(err.message || "Failed to load staff.");
      toast.error(err.message || "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

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


  // 📨 Handle input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };


  // ✅ INVITE STAFF (auto-assign current admin's department)
  const handleInviteStaff = async (e) => {
    e.preventDefault();
    setSendingInvite(true);

    const token = localStorage.getItem("token"); // 🔥 GET TOKEN HERE

    try {
      if (!department) {
        throw new Error("Department not found. Please re-login and try again.");
      }
      const response = await fetch(`${API_URL}/invite`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}) // 🔥 SEND TOKEN
        },
        body: JSON.stringify({ 
          email: form.email, 
          role: "staff",
          department
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send invite");
      }

      toast.success("Staff invitation email sent successfully!");
      setShowModal(false);
      setForm({ email: "" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error sending invite");
    } finally {
      setSendingInvite(false);
    }
  };



  // ✅ FETCH STAFF USERS (only from the same department)
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedDepartment = localStorage.getItem("department");
    if (storedName) setUserName(storedName);
    if (storedDepartment) setDepartment(storedDepartment);
    fetchUsers();
  }, [fetchUsers]);

  // Close modals via Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (archiving) return;
      if (sendingInvite) return;
      if (archiveConfirm) setArchiveConfirm(null);
      if (showModal) setShowModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [archiveConfirm, showModal, archiving, sendingInvite]);


  /** Open archive confirmation (replaces window.confirm) */
  const openArchiveConfirm = (user) => {
    setArchiveConfirm({ id: user._id, name: user.name || user.accessID || "this staff member" });
  };

  /** Perform archive after user confirms */
  const handleArchiveStaff = async () => {
    if (!archiveConfirm) return;
    const id = archiveConfirm.id;
    setArchiving(true);
    try {
      const response = await fetch(`${API_URL}/users/archive/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to archive staff");

      setUsers((prev) => prev.filter((u) => u._id !== id));
      setArchiveConfirm(null);
      toast.success("Staff archived successfully! They can be restored from Archived Staff.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error archiving staff");
    } finally {
      setArchiving(false);
    }
  };

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
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

  // ✅ Filter + sort + paginate staff
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const accessID = (u.accessID || "").toLowerCase();
      return name.includes(q) || email.includes(q) || accessID.includes(q);
    });
  }, [users, search]);

  const sortedUsers = useMemo(() => {
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;
    const getValue = (u) => {
      if (key === "accessID") return u.accessID || "";
      if (key === "email") return u.email || "";
      return u.name || "";
    };
    return [...filteredUsers].sort((a, b) => {
      const va = String(getValue(a)).toLowerCase();
      const vb = String(getValue(b)).toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  const total = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    // reset to first page on search/sort/pageSize changes
    setPage(1);
  }, [search, sortConfig.key, sortConfig.direction, pageSize]);

  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, safePage, pageSize]);

  const showingFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingTo = Math.min(total, safePage * pageSize);

  const summaryStats = useMemo(() => {
    return {
      total: filteredUsers.length,
      visible: pagedUsers.length,
    };
  }, [filteredUsers, pagedUsers]);

  // ✅ Render staff table
  const renderTable = (data) => (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-[#0a2a66]">
            Staff Members
          </h3>
          <div className="text-xs text-slate-600">
            Showing <span className="font-semibold text-slate-800">{showingFrom}</span>-<span className="font-semibold text-slate-800">{showingTo}</span> of{" "}
            <span className="font-semibold text-slate-800">{total}</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50/70">
          <tr>
            <th className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <button
                type="button"
                onClick={() => requestSort("accessID")}
                className="inline-flex items-center hover:text-slate-900"
                aria-label="Sort by access ID"
              >
                Access ID{sortIndicator("accessID")}
              </button>
            </th>
            <th className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <button
                type="button"
                onClick={() => requestSort("name")}
                className="inline-flex items-center hover:text-slate-900"
                aria-label="Sort by name"
              >
                Name{sortIndicator("name")}
              </button>
            </th>
            <th className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <button
                type="button"
                onClick={() => requestSort("email")}
                className="inline-flex items-center hover:text-slate-900"
                aria-label="Sort by email"
              >
                Email{sortIndicator("email")}
              </button>
            </th>
            <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length > 0 ? (
            data.map((user) => (
              <tr key={user._id} className="transition-colors hover:bg-slate-50/60">
                <td className="p-3 font-medium text-slate-700">{user.accessID}</td>
                <td className="p-3 text-slate-700">{user.name}</td>
                <td className="p-3 text-slate-700">{user.email || "-"}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => openArchiveConfirm(user)}
                    className="rounded-md p-1.5 text-[#f97316] transition hover:bg-orange-50 hover:text-[#ea580c]"
                    title="Archive staff"
                    aria-label={`Archive ${user.name || user.accessID || "staff member"}`}
                  >
                    <Archive size={18} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="py-10 text-center italic text-slate-500">
                {search.trim()
                  ? "No staff match your search."
                  : "No staff found in your department. Invite one to get started."}
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
            aria-label="Rows per page"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 justify-end">
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
    </div>
  );

  // --- UI ---
  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">COT Inventory</h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">Dept. Admin Portal</p>

          <nav className="space-y-2">
            <Link to="/department-admin" className={getLinkClass("/department-admin")}>
              <Home size={18} />
              Dashboard
            </Link>
            <Link to="/department-admin/users" className={getLinkClass("/department-admin/users")}>
              <Users size={18} />
              Manage Staff
            </Link>
            <Link to="/department-admin/requests" className={getLinkClass("/department-admin/requests")}>
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
            {/* Left section: icon + text */}
            <div className="flex items-center gap-2">
              <User size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName || "Department Admin"}</p>
                <p className="text-xs opacity-70 text-white mb-3">{department || "Department"}</p>
              </div>
            </div>

            {/* Right section: toggle arrow */}
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="p-1 rounded hover:bg-white/10 transition"
            >
              {showLogout ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {/* Slide-down logout & settings */}
          {showLogout && (
            <div className="mt-4 w-full max-w-[220px] flex flex-col gap-2">
              <button
                onClick={() => navigate("/department-admin/settings")}
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2"
              >
                <Settings size={16} />
                Settings
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
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="overflow-hidden rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f6f9ff] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">
                    <User size={24} /> Manage Staff
                  </h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {summaryStats.total} staff
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Invite and manage staff members within {department || "your department"} while keeping records organized.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#cfe1ff] bg-[#e7f0ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                    Department: {department || "-"}
                  </span>
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#1e3a8a]">
                    Total: {summaryStats.total}
                  </span>
                  <span className="rounded-full border border-[#f5e1c5] bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a3412]">
                    Visible: {summaryStats.visible}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Staff Controls
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Send invitation links to onboard staff to your department.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a2a66] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b347a]"
                >
                  <PlusCircle size={16} />
                  Add Staff
                </button>
              </div>
            </div>
          </header>

          <div className="rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f8fbff] p-4 shadow-sm">
            <div className="grid gap-4">
              <label className="relative block">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or access ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-[#dbe7ff] bg-white py-3 pl-10 pr-10 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-[#002B7F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002B7F]/15"
                  aria-label="Search staff by name, email, or access ID"
                />
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Clear search"
                    title="Clear"
                  >
                    <X size={16} />
                  </button>
                )}
              </label>
            </div>
          </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-[#0a2a66]" size={32} />
              <span className="ml-3 text-base text-slate-600">Loading staff...</span>
            </div>
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-red-700 shadow-sm">
            <p className="mb-1 font-semibold">Couldn’t load staff</p>
            <p className="text-sm text-red-700">{fetchError}</p>
          </div>
        ) : (
          renderTable(pagedUsers)
        )}
        </div>
      </main>

      {/* --- ADD STAFF MODAL --- */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={() => !sendingInvite && setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-staff-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="invite-staff-title" className="text-xl font-bold text-[#0a2a66]">
                Invite Staff
              </h2>
              <button
                type="button"
                onClick={() => !sendingInvite && setShowModal(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close invite modal"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleInviteStaff} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Enter staff Gmail address"
                value={form.email}
                onChange={handleChange}
                required
                autoFocus
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-[#002B7F] focus:outline-none focus:ring-2 focus:ring-[#002B7F]/20"
              />

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={sendingInvite}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className={`rounded-lg px-4 py-2 text-white ${
                    sendingInvite
                      ? "cursor-not-allowed bg-slate-400"
                      : "bg-[#0a2a66] hover:bg-[#0b347a]"
                  }`}
                >
                  {sendingInvite ? "Sending Invite..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ARCHIVE CONFIRMATION (replaces window.confirm) --- */}
      {archiveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={() => !archiving && setArchiveConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-staff-dialog-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Archive size={24} />
              </div>
              <h2 id="archive-staff-dialog-title" className="text-xl font-semibold text-slate-800">
                Archive staff?
              </h2>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              Are you sure you want to archive <strong>{archiveConfirm.name}</strong>? They can be restored later from Archived Staff.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !archiving && setArchiveConfirm(null)}
                disabled={archiving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveStaff}
                disabled={archiving}
                className="flex items-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {archiving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Archiving…
                  </>
                ) : (
                  "Archive"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAdminManageUsers;
