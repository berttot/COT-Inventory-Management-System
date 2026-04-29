import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/api";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Users,
  Home,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  LogOut,
  RotateCcw,
  Archive,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { logout } from "../../utils/auth";

const DepartmentAdminArchivedUsers = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [archivedStaff, setArchivedStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // Restore confirmation (replaces window.confirm)
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };

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



  // Fetch archived users from same department
  const fetchArchived = async () => {
    try {
      const department = localStorage.getItem("department");

      const res = await fetch(`${API_URL}/users?archived=true`);
      const data = await res.json();

      const staffOnly = data.filter(
        (u) => u.role === "staff" && u.department === department
      );

      setArchivedStaff(staffOnly);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load archived users");
    } finally {
      setLoading(false);
    }
  };

  /** Open restore confirmation (replaces window.confirm) */
  const openRestoreConfirm = (user) => {
    setRestoreConfirm({ id: user._id, name: user.name || user.email || "this staff member" });
  };

  /** Perform restore after user confirms */
  const handleRestoreConfirm = async () => {
    if (!restoreConfirm) return;
    const { id } = restoreConfirm;
    setRestoring(true);
    try {
      const res = await fetch(`${API_URL}/users/unarchive/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Staff restored successfully! They will appear in Manage Staff again.");
      setRestoreConfirm(null);
      fetchArchived();
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore staff");
    } finally {
      setRestoring(false);
    }
  };

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "");
    setDepartment(localStorage.getItem("department") || "");
    fetchArchived();
  }, []);

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
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">Archived Staff</h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {archivedStaff.length} archived staff{archivedStaff.length !== 1 ? " members" : " member"}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Review archived staff accounts from {department || "your department"} and restore users when they need to access the system again.
                </p>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Archive size={16} className="text-[#002B7F]" />
                  Restore Center
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-[#dbe7ff] bg-[#eef4ff] px-3 py-1 text-[#1e3a8a]">
                    Department: {department || "-"}
                  </span>
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">
                    Archived: {archivedStaff.length}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Restored users will reappear in Manage Staff immediately.
                </p>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : archivedStaff.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center text-slate-500">
              No archived staff found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {archivedStaff.map((user) => (
                <div
                  key={user._id}
                  className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="line-clamp-2 text-[15px] font-semibold text-slate-800">{user.name || "Unnamed user"}</h3>
                      <span className="rounded-md bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-700">
                        Archived
                      </span>
                    </div>

                    <p className="text-sm text-slate-500">{user.email || "No email"}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Role: <strong className="text-slate-800">{user.role || "staff"}</strong>
                    </p>
                    <p className="text-sm text-slate-600">
                      Access ID: <strong className="text-slate-800">{user.accessID || "-"}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => openRestoreConfirm(user)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a2a66] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#072051]"
                  >
                    <RotateCcw size={14} /> Restore Staff
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- RESTORE CONFIRMATION (replaces window.confirm) --- */}
      {restoreConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={() => !restoring && setRestoreConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-staff-dialog-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <RotateCcw size={24} />
              </div>
              <h2 id="restore-staff-dialog-title" className="text-xl font-semibold text-slate-800">
                Restore staff member?
              </h2>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              Are you sure you want to restore <strong>{restoreConfirm.name}</strong>? They will appear in Manage Staff again.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !restoring && setRestoreConfirm(null)}
                disabled={restoring}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreConfirm}
                disabled={restoring}
                className="flex items-center gap-2 rounded-lg bg-[#002B7F] px-4 py-2 text-white transition hover:bg-[#001F5A] disabled:opacity-50"
              >
                {restoring ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Restoring…
                  </>
                ) : (
                  "Restore"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAdminArchivedUsers;
