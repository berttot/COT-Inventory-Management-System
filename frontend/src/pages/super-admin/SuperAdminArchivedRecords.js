import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Archive,
  Home,
  Package,
  ClipboardList,
  Calendar,
  UserCog,
  ChevronUp,
  ChevronDown,
  LogOut,
  RotateCcw,
  FileText,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import NotificationBell from "../../components/NotificationBell";
import { logout } from "../../utils/auth";

import { API_URL } from "../../config/api";
const API_ITEMS = `${API_URL}/items`;
const API_USERS = `${API_URL}/users`;

const SuperAdminArchivedRecords = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [showLogout, setShowLogout] = useState(false);

  const [activeTab, setActiveTab] = useState("items"); // items | users

  const [archivedItems, setArchivedItems] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once

  // Restore confirmation (replaces window.confirm) – { type: 'item'|'user', record }
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [restoring, setRestoring] = useState(false);
  

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };

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
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  /** -----------------------
   * Fetch Archived Items
   ------------------------ */
  const fetchArchivedItems = async () => {
    try {
      const res = await fetch(`${API_ITEMS}?archived=true`);
      const data = await res.json();
      setArchivedItems(data);
    } catch (err) {
      toast.error("Error loading archived items");
    }
  };

  /** -----------------------
   * Fetch Archived Users
   ------------------------ */
  const fetchArchivedUsers = async () => {
    try {
      const res = await fetch(`${API_USERS}?archived=true`);
      const data = await res.json();
      setArchivedUsers(data);
    } catch (err) {
      toast.error("Error loading archived users");
    }
  };

  /** Open restore confirmation (replaces window.confirm) */
  const openRestoreConfirm = (type, record) => {
    setRestoreConfirm({ type, record });
  };

  /** Perform restore after user confirms */
  const handleRestoreConfirm = async () => {
    if (!restoreConfirm) return;
    const { type, record } = restoreConfirm;
    const id = record._id;
    setRestoring(true);
    try {
      if (type === "item") {
        const res = await fetch(`${API_ITEMS}/unarchive/${id}`, { method: "PUT" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast.success("Item restored!");
        fetchArchivedItems();
      } else {
        const res = await fetch(`${API_URL}/users/unarchive/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast.success("Staff restored successfully!");
        fetchArchivedUsers();
      }
      setRestoreConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error(type === "item" ? "Error restoring item" : "Failed to restore staff");
    } finally {
      setRestoring(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchArchivedItems(), fetchArchivedUsers()]).finally(() =>
      setLoading(false)
    );
  }, []);

  useEffect(() => {
      const stored = localStorage.getItem("userName");
      if (stored) setUserName(stored);
    }, []);
    
  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#002B7F] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            COT Inventory
          </h2>
          <p className="text-sm text-gray-300 opacity-70 mb-10">
            Super Admin Portal
          </p>

          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} /> Dashboard
            </Link>
            <Link
              to="/super-admin/manage-users"
              className={getLinkClass("/super-admin/manage-users")}
            >
              <UserCog size={18} /> Manage Users
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
              <Archive size={18} /> Archived Records
            </Link>
            <Link to="/super-admin/system-logs" className={getLinkClass("/super-admin/system-logs")}>
              <FileText size={18} /> System Logs
            </Link>
          </nav>
        </div>

        {/* Notification Section */}
        <div className="px-6 py-3 border-t border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Notifications</span>
            <NotificationBell />
          </div>
        </div>

        {/* Bottom User Section */}
        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName || "Super Admin"}</p>
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
            <div className="mt-4 w-full max-w-[220px] flex flex-col gap-2">
              <button
                onClick={() => navigate("/super-admin/settings")}
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

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="overflow-hidden rounded-3xl border border-[#dbe7ff] bg-gradient-to-br from-white to-[#f6f9ff] shadow-sm">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#002B7F] md:text-3xl">Archived Records</h1>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {archivedItems.length + archivedUsers.length} archived record{archivedItems.length + archivedUsers.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  Review archived inventory items and staff accounts, then restore records when they are needed again.
                </p>
              </div>

              <div className="rounded-2xl border border-[#dbe7ff] bg-[#f8fbff] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                    <button
                      onClick={() => setActiveTab("items")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeTab === "items" ? "bg-[#002B7F] text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Archived Items
                    </button>
                    <button
                      onClick={() => setActiveTab("users")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeTab === "users" ? "bg-[#002B7F] text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Archived Users
                    </button>
                  </div>
                  <div className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    Restore records anytime
                  </div>
                </div>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : activeTab === "items" ? (
            <ArchivedItemsSection
              archived={archivedItems}
              onRestore={(item) => openRestoreConfirm("item", item)}
            />
          ) : (
            <ArchivedUsersSection
              archived={archivedUsers}
              onRestore={(user) => openRestoreConfirm("user", user)}
            />
          )}
        </div>
      </main>

      {/* --- RESTORE CONFIRMATION (replaces window.confirm) --- */}
      {restoreConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => !restoring && setRestoreConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-dialog-title"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 pb-2 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <RotateCcw size={24} />
              </div>
              <h2 id="restore-dialog-title" className="text-lg font-semibold text-gray-900">
                {restoreConfirm.type === "item" ? "Restore item?" : "Restore staff member?"}
              </h2>
            </div>
            <div className="space-y-5 p-6">
              <p className="text-sm leading-6 text-gray-600">
                {restoreConfirm.type === "item" ? (
                  <>
                    Are you sure you want to restore <strong>{restoreConfirm.record.name}</strong>? It will appear in Manage Inventory again.
                  </>
                ) : (
                  <>
                    Are you sure you want to restore <strong>{restoreConfirm.record.name || restoreConfirm.record.email}</strong>? They will appear in Manage Users again.
                  </>
                )}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !restoring && setRestoreConfirm(null)}
                  disabled={restoring}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreConfirm}
                  disabled={restoring}
                  className="flex items-center gap-2 rounded-xl bg-[#002B7F] px-4 py-2.5 font-medium text-white transition hover:bg-[#001F5A] disabled:opacity-50"
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
        </div>
      )}
    </div>
  );
};

/** ---------------------------
 * Archived ITEMS Section
 ------------------------------ */
const ArchivedItemsSection = ({ archived, onRestore }) => {
  if (archived.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center text-slate-500">
        No archived items.
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {archived.map((item) => (
        <div
          key={item._id}
          className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div>
            <h3 className="mb-1 line-clamp-2 text-[15px] font-semibold text-slate-800">{item.name}</h3>
            <p className="text-sm text-slate-500">{item.category}</p>
            <p className="mt-1 text-sm text-slate-600">
              Qty: <strong className="text-slate-800">{item.quantity}</strong> {item.unit}
            </p>
          </div>

          <button
            onClick={() => onRestore(item)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b347a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0a2a66]"
          >
            <RotateCcw size={14} /> Restore
          </button>
        </div>
      ))}
    </div>
  );
};

/** ---------------------------
 * Archived USERS Section
 ------------------------------ */
const ArchivedUsersSection = ({ archived, onRestore }) => {
  if (archived.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center text-slate-500">
        No archived users.
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {archived.map((user) => (
        <div
          key={user._id}
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h3 className="line-clamp-2 text-lg font-semibold text-slate-800">{user.name}</h3>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="text-sm text-slate-600">Role: {user.role}</p>
          <p className="text-sm text-slate-600">Dept: {user.department}</p>

          <button
            onClick={() => onRestore(user)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a2a66] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#072051]"
          >
            <RotateCcw size={14} />
            Restore User
          </button>
        </div>
      ))}
    </div>
  );
};

export default SuperAdminArchivedRecords;
