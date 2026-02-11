import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../../components/AuthShell";
import { API_URL } from "../../config/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ Reset link sent to your email. Check your inbox!");
      } else {
        setMessage(`❌ ${data.message || "Something went wrong."}`);
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your registered email and we’ll send you a reset link."
      footer={
        <div className="flex items-center justify-center gap-2">
          <span>Remembered it?</span>
          <Link
            to="/"
            className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          >
            Back to login
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="auth-label"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            autoComplete="email"
            className="auth-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        {message && (
          <div
            role="status"
            className={`rounded-2xl px-4 py-3 text-sm ${
              message.includes("✅")
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : message.includes("❌")
                ? "border border-red-200 bg-red-50 text-red-800"
                : "border border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </AuthShell>
  );
}

export default ForgotPassword;
