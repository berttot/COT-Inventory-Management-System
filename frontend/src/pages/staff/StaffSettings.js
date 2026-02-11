import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import {
  Home,
  ClipboardList,
  History,
  LogOut,
  ChevronUp,
  ChevronDown,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import SettingsShell from "../../components/SettingsShell";
import { API_URL } from "../../config/api";

const StaffSettings = () => {
  const [activeTab, setActiveTab] = useState("editAccount");
  const [user, setUser] = useState({ name: "", email: "", accessID: "", _id: "" });
  const [formData, setFormData] = useState({ name: "", email: "", accessID: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);


  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ✅ Load stored user info
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      setUserName(storedUser.name || "");
      setDepartment(storedUser.department || "");
      setFormData({
        name: storedUser.name || "",
        email: storedUser.email || "",
        accessID: storedUser.accessID || "",
      });
    }
  }, []);

  // Logout Handler (matches dashboard behavior)
  const handleLogout = async () => {
    if (logoutLoading) return;
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

      setTimeout(() => {
        setLogoutLoading(false);
        navigate("/");
      }, 300);
    }
  };

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  // ✅ Edit account field change
  const handleAccountChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Save edited account
  const handleSaveAccount = async (e) => {
    e.preventDefault();

    try {
      const updatedFields = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key].trim() && formData[key] !== user[key]) {
          updatedFields[key] = formData[key];
        }
      });

      if (Object.keys(updatedFields).length === 0) {
        toast.info("No changes detected.");
        return;
      }

      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/users/${user._id}`,
        updatedFields,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      toast.success("Account updated successfully!");
      localStorage.setItem("user", JSON.stringify(response.data));
      if (response.data.name) localStorage.setItem("userName", response.data.name);
      if (response.data.email) localStorage.setItem("userEmail", response.data.email);
      setUser(response.data);

      // ✅ Redirect to Staff Dashboard (name will reflect from updated localStorage)
      setTimeout(() => navigate("/staff"), 1000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update account.");
    }
  };

  // ✅ Password input change
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  // ✅ Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.warning("New passwords do not match!");
      return;
    }

    try {
      const userEmail =
        localStorage.getItem("userEmail") ||
        (user && user.email) ||
        formData.email;

      const response = await fetch(`${API_URL}/users/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password updated successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });

        // ✅ Redirect after success
        setTimeout(() => navigate("/staff"), 1000);
      } else {
        toast.error(data.message || "Failed to update password");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error. Try again later.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      {/* Sidebar (matches staff portal) */}
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
              <UserIcon size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">
                  {userName || "Staff"}
                </p>
                <p className="text-xs opacity-70 text-white mb-3">
                  {department || "College of Technology"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="p-1 rounded hover:bg-white/10 transition"
              type="button"
              aria-label="Account menu"
            >
              {showLogout ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          {showLogout && (
            <div className="mt-4 w-full max-w-[220px] flex flex-col gap-2">
              <button
                onClick={() => navigate("/staff/settings")}
                type="button"
                className={`text-white py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 ${
                  location.pathname === "/staff/settings"
                    ? "bg-[#2563eb] ring-1 ring-white/30 cursor-default"
                    : "bg-[#2563eb] hover:bg-[#1d4ed8]"
                }`}
                disabled={location.pathname === "/staff/settings"}
              >
                <SettingsIcon size={16} />
                Settings
              </button>

              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                type="button"
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

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <SettingsShell
          title="Settings"
          subtitle="Update your personal details and secure your account."
          roleLabel="Staff"
          user={formData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            {
              id: "editAccount",
              label: "Edit account",
              description: "Name, email, and access ID",
            },
            {
              id: "changePassword",
              label: "Password",
              description: "Update your password",
            },
          ]}
        >
          {activeTab === "editAccount" && (
            <form onSubmit={handleSaveAccount} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[color:var(--cot-primary)]">
                    Edit account
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Changes will reflect across the system after saving.
                  </p>
                </div>
                <span className="hidden rounded-full bg-[#f97316]/10 px-3 py-1 text-xs font-semibold text-[#f97316] sm:inline-flex">
                  Profile
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="settings-label" htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleAccountChange}
                    placeholder="Full Name"
                    className="settings-input"
                    autoComplete="name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="settings-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleAccountChange}
                    placeholder="Email"
                    className="settings-input"
                    autoComplete="email"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="settings-label" htmlFor="accessID">
                    Access ID
                  </label>
                  <input
                    id="accessID"
                    type="text"
                    name="accessID"
                    value={formData.accessID}
                    onChange={handleAccountChange}
                    placeholder="Access ID"
                    className="settings-input"
                  />
                </div>
              </div>

              <button type="submit" className="settings-primary-btn">
                Save changes
              </button>
            </form>
          )}

          {activeTab === "changePassword" && (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[color:var(--cot-primary)]">
                    Password
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Use a strong password to keep your account secure.
                  </p>
                </div>
                <span className="hidden rounded-full bg-[#0a2a66]/10 px-3 py-1 text-xs font-semibold text-[color:var(--cot-primary)] sm:inline-flex">
                  Security
                </span>
              </div>

              <div>
                <label className="settings-label" htmlFor="currentPassword">
                  Current password
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    name="currentPassword"
                    placeholder="Current Password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="settings-input pr-12"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="settings-icon-btn"
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? (
                      <EyeClosedIcon className="h-5 w-5" />
                    ) : (
                      <EyeOpenIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="settings-label" htmlFor="newPassword">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      name="newPassword"
                      placeholder="New Password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="settings-input pr-12"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="settings-icon-btn"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? (
                        <EyeClosedIcon className="h-5 w-5" />
                      ) : (
                        <EyeOpenIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="settings-label" htmlFor="confirmPassword">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm New Password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="settings-input pr-12"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="settings-icon-btn"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? (
                        <EyeClosedIcon className="h-5 w-5" />
                      ) : (
                        <EyeOpenIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="settings-primary-btn">
                Update password
              </button>
            </form>
          )}
        </SettingsShell>
      </main>
    </div>
  );
};

export default StaffSettings;
