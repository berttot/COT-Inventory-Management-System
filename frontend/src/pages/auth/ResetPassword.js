import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import AuthShell from "../../components/AuthShell";
import { API_URL } from "../../config/api";

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
      const response = await fetch(`${API_URL}/users/reset-password`, {
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
    <AuthShell
      title="Reset password"
      subtitle="Create a secure new password for your account."
      footer={
        <div className="flex items-center justify-center gap-2">
          <span>Go back?</span>
          <Link
            to="/"
            className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          >
            Back to login
          </Link>
        </div>
      }
    >
      <form onSubmit={handleReset} className="space-y-4">
        {/* New Password Field */}
        <div>
          <label
            htmlFor="newPassword"
            className="auth-label"
          >
            New password
          </label>

          <div className="relative mt-1">
            <input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              className="auth-input pr-12"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="auth-icon-btn"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? (
                <EyeClosedIcon className="h-5 w-5" />
              ) : (
                <EyeOpenIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="auth-label"
          >
            Confirm password
          </label>

          <div className="relative mt-1">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              className="auth-input pr-12"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="auth-icon-btn"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeClosedIcon className="h-5 w-5" />
              ) : (
                <EyeOpenIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg
                className="mr-2 h-5 w-5 animate-spin text-white"
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
            "Reset password"
          )}
        </button>

        {/* Message */}
        {message && (
          <div
            role="status"
            className={`rounded-2xl px-4 py-3 text-sm ${
              message.includes("✅")
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : message.includes("⚠️")
                ? "border border-amber-200 bg-amber-50 text-amber-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </AuthShell>
  );
}

export default ResetPassword;
