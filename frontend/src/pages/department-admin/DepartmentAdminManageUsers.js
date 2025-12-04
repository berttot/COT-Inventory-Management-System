import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Loader2,
  User,
  PlusCircle,
  Trash2,
  Home,
  Users,
  ChevronDown,
  ChevronUp,
  LogOut,
  Settings,
  ClipboardList,
  Archive,
} from "lucide-react";
import { toast } from "react-toastify";

const DepartmentAdminManageUsers = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const [department, setDepartment] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const [form, setForm] = useState({ email: "" });

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once
  

  const getLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
      location.pathname === path
        ? "bg-white text-[#0a2a66] font-medium"
        : "text-white hover:bg-white/10"
    }`;

  // 🔒 Logout
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
      const response = await fetch("http://localhost:5000/api/invite", {
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

    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/users?archived=false");
        const data = await response.json();

        // Only show staff from same department
        const staffInDept = data.filter(
          (u) => u.role === "staff" && u.department === storedDepartment
        );
        setUsers(staffInDept);
      } catch (err) {
        console.error("Error fetching staff:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // ✅ DELETE STAFF
  // const handleDeleteStaff = async (id) => {
  //   if (!window.confirm("Are you sure you want to delete this staff member?")) return;

  //   try {
  //     const response = await fetch(`http://localhost:5000/api/users/${id}`, {
  //       method: "DELETE",
  //     });
  //     if (!response.ok) throw new Error("Failed to delete staff");

  //     setUsers(users.filter((u) => u._id !== id));
  //     toast.success("Staff deleted successfully!");
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Error deleting staff");
  //   }
  // };


  // HANDLES THE ARCHIVING THE USER (STAFF!!!!)
  const handleArchiveStaff = async (id) => {
    if (!window.confirm("Archive this staff member? They can be restored later.")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/archive/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!response.ok) throw new Error("Failed to archive staff");

      setUsers(users.filter((u) => u._id !== id)); // remove from list
      toast.success("Staff archived successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error archiving staff");
    }
  };



  // ✅ Filter staff
  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Render staff table
  const renderTable = (data) => (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 mb-8">
      <div className="px-6 py-3 border-b bg-[#002B7F]">
        <h3 className="text-lg font-semibold text-white">
          {department} Department - Staff Members
        </h3>
      </div>
      <table className="w-full text-left">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase">Access ID</th>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase">Name</th>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase">Email</th>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((user) => (
              <tr key={user._id} className="border-b hover:bg-blue-50 transition duration-150">
                <td className="p-3 font-medium text-gray-700">{user.accessID}</td>
                <td className="p-3 text-gray-700">{user.name}</td>
                <td className="p-3 text-gray-700">{user.email}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleArchiveStaff(user._id)}
                    className="text-red-600 hover:text-red-800"
                    title="Archive Staff"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-8 text-gray-500 italic">
                No staff found in your department.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // --- UI ---
  return (
    <div className="flex h-screen bg-gray-50">
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
                <p className="text-sm font-medium text-white mb-1">{userName}</p>
                <p className="text-xs opacity-70 text-white mb-3">{department}</p>
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
                className="bg-[#2563eb] text-white py-2 rounded-lg hover:bg-[#1d4ed8] transition font-medium flex items-center justify-center gap-2 mb-1"
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
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#0a2a66] flex items-center gap-2">
              <User size={26} /> Manage Users
            </h2>
            <p className="text-gray-600">
              Add, update, or remove staff and assign roles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <PlusCircle size={18} /> Add Staff
            </button>
            <div className="relative mt-4">
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-64"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={36} />
            <span className="ml-3 text-gray-600 text-lg">Loading staff...</span>
          </div>
        ) : (
          renderTable(filteredUsers)
        )}
      </main>

      {/* --- ADD STAFF MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Invite Staff</h2>
            <form onSubmit={handleInviteStaff} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Enter staff Gmail address"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className={`px-4 py-2 rounded-lg text-white ${
                    sendingInvite
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {sendingInvite ? "Sending Invite..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAdminManageUsers;
