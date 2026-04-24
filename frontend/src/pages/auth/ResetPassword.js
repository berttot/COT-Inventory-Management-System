import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { jwtDecode } from "jwt-decode";
import AuthShell from "../../components/AuthShell";
import { API_URL } from "../../config/api";
import {
  getPasswordRequirements,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_REQUIREMENTS,
} from "../../utils/passwordPolicy";

function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [requirements, setRequirements] = useState(getPasswordRequirements(""));

  const requirementScore = Object.values(requirements).filter(Boolean).length;
  const strengthLabel =
    requirementScore <= 1
      ? "Weak"
      : requirementScore <= 2
      ? "Fair"
      : requirementScore === 3
      ? "Good"
      : "Strong";
  const strengthTone =
    requirementScore <= 1
      ? "text-rose-700"
      : requirementScore <= 2
      ? "text-amber-700"
      : requirementScore === 3
      ? "text-blue-700"
      : "text-emerald-700";

  const location = useLocation();
  const navigate = useNavigate();

  // Extract token from URL
  const token = new URLSearchParams(location.search).get("token");

  useEffect(() => {
    if (!token) {
      setLinkInvalid(true);
      setMessage("❌ Missing reset token. Please request a new reset link.");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const isExpired = decoded?.exp && Date.now() >= decoded.exp * 1000;

      if (isExpired) {
        setLinkInvalid(true);
        setMessage("❌ Reset link expired. Please request a new one.");
      }
    } catch (err) {
      setLinkInvalid(true);
      setMessage("❌ Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (linkInvalid) {
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("⚠️ Passwords do not match!");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setMessage(`⚠️ ${PASSWORD_POLICY_MESSAGE}`);
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
      <form onSubmit={handleReset} className="space-y-5">
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
              onChange={(e) => {
                const value = e.target.value;
                setNewPassword(value);
                setRequirements(getPasswordRequirements(value));
                if (
                  message.startsWith("⚠️ Passwords do not match!") ||
                  message.startsWith("⚠️ Password must")
                ) {
                  setMessage("");
                }
              }}
              disabled={linkInvalid}
              required
              placeholder="Enter new password"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="auth-icon-btn rounded-lg"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              disabled={linkInvalid}
            >
              {showNewPassword ? (
                <EyeClosedIcon className="h-5 w-5" />
              ) : (
                <EyeOpenIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Password requirements</p>
            <span className={`text-xs font-semibold ${strengthTone}`}>
              {strengthLabel}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  requirementScore >= step
                    ? requirementScore <= 1
                      ? "bg-rose-500"
                      : requirementScore <= 2
                      ? "bg-amber-500"
                      : requirementScore === 3
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {PASSWORD_REQUIREMENTS.map((req) => (
              <div
                key={req.key}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                  requirements[req.key] ? "bg-emerald-50" : "bg-slate-50"
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-300 ${
                    requirements[req.key]
                      ? "border-emerald-600 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {requirements[req.key] ? "OK" : "-"}
                </div>
                <span
                  className={`text-sm ${
                    requirements[req.key] ? "text-emerald-700" : "text-slate-600"
                  }`}
                >
                  {req.label}
                </span>
              </div>
            ))}
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
              disabled={linkInvalid}
              required
              placeholder="Confirm new password"
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="auth-icon-btn rounded-lg"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              disabled={linkInvalid}
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
          disabled={loading || linkInvalid}
          className="auth-primary-btn disabled:cursor-not-allowed disabled:opacity-70"
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
