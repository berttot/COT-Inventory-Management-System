import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";

const DepartmentAdminSettings = () => {
  const [activeTab, setActiveTab] = useState("editAccount");
  const [user, setUser] = useState({ name: "", email: "", accessID: "", _id: "" });
  const [formData, setFormData] = useState({ name: "", email: "", accessID: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const navigate = useNavigate();


  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ✅ Load stored user info into form
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      setFormData({
        name: storedUser.name || "",
        email: storedUser.email || "",
        accessID: storedUser.accessID || "",
      });
    }
  }, []);

  // ✅ Handle Edit Account input change
  const handleAccountChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Save changes (only send changed fields)
  const handleSaveAccount = async (e) => {
  e.preventDefault();

  try {
    // Get only fields that changed and are not blank
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

    const response = await axios.put(
      `http://localhost:5000/api/users/${user._id}`,
      updatedFields
    );

    toast.success("Account updated successfully!");

    // ✅ Update local storage and state
    localStorage.setItem("user", JSON.stringify(response.data));
    setUser(response.data);

    // ✅ Navigate back to Department Admin Dashboard after 1 second
    setTimeout(() => navigate("/department-admin"), 1000);

  } catch (err) {
    console.error(err);
    toast.error("Failed to update account.");
  }
};


  // ✅ Handle Password Change
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

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

      const response = await fetch("http://localhost:5000/api/users/change-password", {
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

        // 🟢 Redirect to Department Admin Dashboard after 1s
        setTimeout(() => {
          navigate("/department-admin");
        }, 1000);
      } else {
        toast.error(data.message || "Failed to update password");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error. Try again later.");
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-100 via-white to-blue-50 text-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-[#002B7F] text-center">Settings</h1>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          className={`px-6 py-2 rounded-lg font-semibold shadow-sm transition ${
            activeTab === "editAccount"
              ? "bg-[#0a2a66] text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={() => setActiveTab("editAccount")}
        >
          Edit Account
        </button>
        <button
          className={`px-6 py-2 rounded-lg font-semibold shadow-sm transition ${
            activeTab === "changePassword"
              ? "bg-[#0a2a66] text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={() => setActiveTab("changePassword")}
        >
          Change Password
        </button>
      </div>

      {/* Edit Account Form */}
      {activeTab === "editAccount" && (
        <form
          onSubmit={handleSaveAccount}
          className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md mx-auto border border-gray-200"
        >
          <h2 className="text-xl font-bold mb-6 text-center text-orange-600">Edit Account</h2>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleAccountChange}
            placeholder="Full Name"
            className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleAccountChange}
            placeholder="Email"
            className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />

          <input
            type="text"
            name="accessID"
            value={formData.accessID}
            onChange={handleAccountChange}
            placeholder="Access ID"
            className="w-full border p-3 rounded-lg mb-6 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />

          <button
            type="submit"
            className="w-full bg-[#0a2a66] hover:bg-blue-700 text-white py-3 rounded-lg transition font-semibold"
          >
            Save Changes
          </button>
        </form>
      )}

      {/* Change Password Form */}
      {activeTab === "changePassword" && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md mx-auto border border-gray-200"
        >
          <h2 className="text-xl font-bold mb-6 text-center text-orange-600">Change Password</h2>

          <div className="relative mb-1">
            <input
              type={showCurrent ? "text" : "password"}
              name="currentPassword"
              placeholder="Current Password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showCurrent ? <EyeClosedIcon size={18} /> : <EyeOpenIcon size={18} />}
            </button>
          </div>


          <div className="relative mb-1">
            <input
              type={showNew ? "text" : "password"}
              name="newPassword"
              placeholder="New Password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showNew ? <EyeClosedIcon size={18} /> : <EyeOpenIcon size={18} />}
            </button>
          </div>


          <div className="relative mb-3">
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirm ? <EyeClosedIcon size={18} /> : <EyeOpenIcon size={18} />}
            </button>
          </div>


          <button
            type="submit"
            className="w-full bg-[#0a2a66] hover:bg-blue-700 text-white py-3 rounded-lg transition font-semibold"
          >
            Update Password
          </button>
        </form>
      )}
    </div>
  );
};

export default DepartmentAdminSettings;
