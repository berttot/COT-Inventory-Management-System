import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Loader2,
  User,
  PlusCircle,
  Pencil,
  Home,
  ClipboardList,
  UserCog,
  ChevronDown,
  ChevronUp,
  LogOut,
  Package,
  Calendar,
  Archive,
  FileText,
} from "lucide-react";
import { toast } from 'react-toastify';


const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showLogout, setShowLogout] = useState(false);
  const location = useLocation();
  const [sendingInvite, setSendingInvite] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false); //for logout button, it will disable the button if it clicked it once
  

  const getLinkClass = (path) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
    location.pathname === path
      ? "bg-white text-[#0a2a66] font-medium"
      : "text-white hover:bg-white/10"
  }`;

  const [form, setForm] = useState({
    accessID: "",
    name: "",
    email: "",
    department: "",
    role: "staff",
    password: "",
  });

  // logout
  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/");
  // };

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


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  

 // ✅ CREATE USER
const handleInviteUser = async (e) => {
  e.preventDefault();
  setSendingInvite(true);

  const token = localStorage.getItem("token"); // 🔥 GET token

  try {
    const response = await fetch("http://localhost:5000/api/invite", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}) // 🔥 SEND token
      },
      body: JSON.stringify({ 
        email: form.email, 
        role: "departmentadmin" 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to send invite");
    }

    toast.success("Invitation email sent successfully!");
    setShowModal(false);
    setForm({ email: "" });
  } catch (err) {
    console.error(err);
    toast.error(err.message || "Error sending invite");
  } finally {
    setSendingInvite(false);
  }
};


  // ✅ FETCH USERS
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    if (storedName) setUserName(storedName);

    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/users?archived=false");
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();

    const eventSource = new EventSource("http://localhost:5000/api/users/locks/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update the specific user in UI
        if (data.type === "lock") {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === data.userId
                ? { ...u, lockedBy: data.lockedBy, lockExpiresAt: data.expiresAt }
                : u
            )
          );
        }

        if (data.type === "unlock") {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === data.userId
                ? { ...u, lockedBy: null, lockExpiresAt: null }
                : u
            )
          );
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    // Cleanup
    return () => eventSource.close();
  }, []);

  // ✅ DELETE USER
  // const handleDeleteUser = async (id) => {
  //   if (!window.confirm("Are you sure you want to delete this user?")) return;

  //   try {
  //     const response = await fetch(`http://localhost:5000/api/users/${id}`, {
  //       method: "DELETE",
  //     });
  //     if (!response.ok) throw new Error("Failed to delete user");
  //     setUsers(users.filter((u) => u._id !== id));
  //     toast.success("User deleted successfully!");
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Error deleting user");
  //   }
  // };

  // const handleArchiveUser = async (id) => {
  //   if (!window.confirm("Archive this user?")) return;

  //   try {
  //     const res = await fetch(`http://localhost:5000/api/users/archive/${id}`, {
  //       method: "PUT",
  //     });

  //     if (!res.ok) throw new Error("Failed to archive user");

  //     toast.success("User archived!");
  //     setUsers(users.filter((u) => u._id !== id));
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Error archiving user");
  //   }
  // };
  // HANDLES THE ARCHIVING THE USER (STAFF!!!!)
    const handleArchiveUser = async (id) => {
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


  // ✅ EDIT USER
 const handleEditClick = async (user) => {
    const adminName = localStorage.getItem("userName");

    const res = await fetch(`http://localhost:5000/api/users/lock/${user._id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminName }),
    });

    if (!res.ok) {
      const msg = await res.json();
      toast.error(msg.message);
      return;
    }

    setEditUser(user);
    setForm(user);
    setShowEditModal(true);
  };


  const handleUpdateUser = async (e) => {
  e.preventDefault();
  

  // Only send editable fields
  const updateData = {
    department: form.department,
    role: form.role,
  };

  try {
    const response = await fetch(
      `http://localhost:5000/api/users/${editUser._id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) throw new Error("Failed to update user");

    const updatedUser = await response.json();
    setUsers(users.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
    setShowEditModal(false);

    toast.success("User updated successfully!");
  } catch (err) {
    console.error(err);
    toast.error("Error updating user");
  }
  
  await fetch(`http://localhost:5000/api/users/unlock/${editUser._id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminName: localStorage.getItem("userName") }),
  });

};


  // ✅ Filter users and exclude superadmins
const filteredUsers = users
  .filter(
    (u) =>
      (u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.accessID?.toLowerCase().includes(search.toLowerCase()) ||
        u.role?.toLowerCase().includes(search.toLowerCase())) &&
      u.role !== "superadmin" // exclude super admins
  );


  const renderTable = (title, data, colorClass) => (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 mb-8">
      <div className={`px-6 py-3 border-b ${colorClass}`}>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <table className="w-full text-left">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3 w-1/5 text-sm font-semibold text-gray-600 uppercase">
              Access ID
            </th>
            <th className="p-3 w-1/3 text-sm font-semibold text-gray-600 uppercase">
              Name
            </th>
            <th className="p-3 w-1/5 text-sm font-semibold text-gray-600 uppercase">
              Role
            </th>
            <th className="p-3 text-sm font-semibold text-gray-600 uppercase text-center">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((user) => (
              <tr
                key={user._id}
                className="border-b hover:bg-blue-50 transition duration-150"
              >
                <td className="p-3 font-medium text-gray-700">{user.accessID}</td>
                <td className="p-3 text-gray-700">{user.name}</td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.role === "superadmin"
                        ? "bg-red-100 text-red-700 border border-red-300" 
                        : user.role === "departmentadmin"
                        ? "bg-[#FF7701]/10 text-[#FF7701] border border-[#FF7701]/30"
                        : "bg-[#F9FBFF] text-[#002879] border border-[#002879]/20"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-3 text-center flex justify-center gap-2">
                  <button
                    disabled={user.lockedBy && user.lockedBy !== userName && (
                      <span className="text-red-500 text-xs">
                        Being edited by {user.lockedBy}
                      </span>
                    )}
                    onClick={() => handleEditClick(user)}
                    className={`text-blue-600 hover:text-blue-800 ${
                      user.lockedBy && user.lockedBy !== userName ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    disabled={user.lockedBy && user.lockedBy !== userName && (
                      <span className="text-red-500 text-xs">
                        Being edited by {user.lockedBy}
                      </span>
                    )}
                    // onClick={() => handleArchiveUser(user._id)}
                    // className="text-orange-600 hover:text-orange-800"
                    onClick={() => handleArchiveUser(user._id)}
                    className={`text-orange-600 hover:text-orange-800 ${
                      user.lockedBy && user.lockedBy !== userName ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Archive size={18} />
                  </button>

                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="4"
                className="text-center py-8 text-gray-500 italic"
              >
                No users found.
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
          <p className="text-sm text-gray-300 opacity-70 mb-10">Super Admin Portal</p>

          <nav className="space-y-2">
            <Link to="/super-admin" className={getLinkClass("/super-admin")}>
              <Home size={18} />
              Dashboard
            </Link>
            <Link to="/super-admin/requests" className={getLinkClass("/super-admin/requests")}>
              <ClipboardList size={18} />
              Request Log
            </Link>
            <Link
              to="/super-admin/manage-inventory"
              className={getLinkClass("/super-admin/manage-inventory")}
            >
              <Package size={18} />
              Manage Inventory
            </Link>
            <Link
              to="/super-admin/calendar-alerts"
              className={getLinkClass("/super-admin/calendar-alerts")}
            >
              <Calendar size={18} />
              Calendar Alerts
            </Link>
            <Link
              to="/super-admin/archived-records"
              className={getLinkClass("/super-admin/archived-records")}
            >
              <Archive size={18} />
              Archived Records
            </Link>
            <Link to="/super-admin/system-logs" className={getLinkClass("/super-admin/system-logs")}>
              <FileText size={18} /> System Logs
            </Link>
          </nav>
        </div>

        {/* Bottom User Section */}
        <div className="p-5 border-t border-white/20 bg-[#002B7F] flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-[220px]">
            {/* Left section: icon + text */}
            <div className="flex items-center gap-2">
              <UserCog size={22} className="opacity-80" />
              <div>
                <p className="text-sm font-medium text-white mb-1">{userName || "Super Admin"}</p>
                <p className="text-xs opacity-70 text-white mb-3">College of Technology</p>
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

          {/* Slide-down logout */}
          {showLogout && (
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className={`mt-4 w-full max-w-[220px] py-2 rounded-lg font-medium flex items-center justify-center gap-2
                ${logoutLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#f97316] hover:bg-orange-600 text-white"
                }`}
            >
              <LogOut size={16} />
              {logoutLoading ? "Logging out..." : "Log Out"}
            </button>
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
              Add, update, or remove users and assign roles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#0a2a66] text-white px-4 py-2 rounded-lg hover:bg-[#0b347a] transition"
            >
              <PlusCircle size={18} /> Add User
            </button>
            <div className="relative mt-4">
              <input
                type="text"
                placeholder="Search users..."
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
            <span className="ml-3 text-gray-600 text-lg">Loading users...</span>
          </div>
        ) : (
          <>
      {search.trim() ? (
        // 🔍 Focused Search Results
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Search Results for "<span className="text-cotOrange">{search}</span>"
          </h3>
          {filteredUsers.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase">Access ID</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase">Name</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase">Role</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase">Department</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b hover:bg-blue-50 transition">
                    <td className="p-4">{user.accessID}</td>
                    <td className="p-4">{user.name}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.role === "superadmin"
                            ? "bg-red-100 text-red-700"
                            : user.role === "departmentadmin"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">{user.department}</td>
                    <td className="p-4 text-center flex justify-center gap-3">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleArchiveUser(user._id)}
                        className="text-orange-600 hover:text-orange-800"
                      >
                        <Archive size={18} />
                      </button>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 italic">No matching users found.</p>
          )}
        </div>
      ) : (
        // 🧩 Default Department-based Layout
        <>
        

          {["Information Technology", "Automotive Technology", "Electronics Technology", "EMC"].map((dept) => {
            const deptAdmins = filteredUsers.filter(
              (u) => u.department === dept && u.role === "departmentadmin"
            );
            const staffMembers = filteredUsers.filter(
              (u) => u.department === dept && u.role === "staff"
            );

            return (
              <div key={dept} className="mb-10">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-4 border-[#FF7701] pb-2">
                  {dept}
                </h2>

                {deptAdmins.length > 0
                  ? renderTable(`${dept} - Department Admins`, deptAdmins, "bg-[#002B7F]")
                  : <p className="text-gray-500 italic mb-6">No Department Admins found.</p>}

                {staffMembers.length > 0
                  ? renderTable(`${dept} - Staff`, staffMembers, "bg-[#002B7F]")
                  : <p className="text-gray-500 italic">No Staff found.</p>}
              </div>
            );
          })}
        </>
      )}
    </>
  )}

      </main>

      {/* --- ADD USER MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Invite Department Admin</h2>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Enter user Gmail address"
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
                    sendingInvite ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {sendingInvite ? "Sending Invite..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">

              {/* Editable fields */}
              <select
                name="department"
                value={form.department || ""}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select Department</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Automotive Technology">Automotive Technology</option>
                <option value="Electronics Technology">Electronics Technology</option>
                <option value="EMC">EMC</option>
              </select>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="departmentadmin">Department Admin</option>
                <option value="staff">Staff</option>
              </select>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={async () => {
                    const adminName = localStorage.getItem("userName");
                    await fetch(`http://localhost:5000/api/users/unlock/${editUser._id}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ adminName }),
                    });
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#002B7F] text-white hover:bg-[#001F5A]"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
