import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";

function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Extract token from URL
  const token = new URLSearchParams(location.search).get("token");

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("⚠️ Passwords do not match!");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/users/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage(`❌ ${data.message || "Failed to reset password."}`);
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-100 via-white to-blue-50">
      <form
        onSubmit={handleReset}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
      >
        <h2 className="text-3xl font-bold mb-2 text-center text-[#0a2a66]">
          Reset Password
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Create a secure new password for your account.
        </p>

        {/* New Password Field */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">New Password</label>

          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none pr-12"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
            />

            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showNewPassword ? (
                <EyeClosedIcon className="w-5 h-5" />
              ) : (
                <EyeOpenIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-1">Confirm Password</label>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none pr-12"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? (
                <EyeClosedIcon className="w-5 h-5" />
              ) : (
                <EyeOpenIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold text-white mt-2 transition-all duration-300 ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-[#0a2a66] hover:bg-blue-800 shadow-md"
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                ></path>
              </svg>
              Resetting…
            </div>
          ) : (
            "Reset Password"
          )}
        </button>

        {/* Message */}
        {message && (
          <p
            className={`mt-5 text-center text-sm ${
              message.includes("✅")
                ? "text-green-600"
                : message.includes("⚠️")
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

export default ResetPassword;
