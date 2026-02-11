import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import AuthShell from "../../components/AuthShell";
import { cleanupRecaptcha } from "../../utils/cleanupRecaptcha";
import { API_URL } from "../../config/api";





function LoginPage() {
  const [accessID, setAccessID] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false); //for toggle hide and show password

  // ✅ Create a ref for reCAPTCHA
  const recaptchaRef = useRef(null);

  useEffect(() => {
    cleanupRecaptcha(); // enable silent suppression
  }, []);




  const handleCaptchaExpired = () => {
    console.warn("reCAPTCHA expired — refreshing...");
    setCaptchaToken("");
    recaptchaRef.current?.reset(); // 👈 auto-refresh widget
  };

  const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  if (!captchaToken) {
    setError("Please verify that you are not a robot.");
    setLoading(false);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessID, password, captchaToken }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
      setCaptchaToken(""); // clear old token
    }

    if (!response.ok) {
      setError(data.message || "Login failed. Please try again.");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
    localStorage.setItem("userEmail", data.email);
    localStorage.setItem("userName", data.name);
    localStorage.setItem("role", data.role);
    localStorage.setItem("department", data.department);

    setTimeout(() => {
      if (data.role === "superadmin") navigate("/super-admin");
      else if (data.role === "departmentadmin") navigate("/department-admin");
      else if (data.role === "staff") navigate("/staff");
    }, 200);
  } catch (err) {
    if (err.name === "AbortError") {
      setError("Login request timed out. Please check your internet and try again.");
    } else {
      console.error("❌ Login error:", err);
      setError("Server error. Please try again later.");
    }
  } finally {
    clearTimeout(timeout);
    setLoading(false);
  }
};


  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your Access ID and password to continue."
      footer={
        <div className="flex items-center justify-center gap-2">
          <span>Having trouble?</span>
          <Link
            to="/forgot-password"
            className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          >
            Reset your password
          </Link>
        </div>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label
            htmlFor="accessID"
            className="auth-label"
          >
            Access ID
          </label>
          <input
            id="accessID"
            type="text"
            value={accessID}
            onChange={(e) => setAccessID(e.target.value)}
            placeholder="Enter Access ID"
            required
            autoComplete="username"
            className="auth-input"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="auth-label"
          >
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              required
              autoComplete="current-password"
              className="auth-input pr-12"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-icon-btn"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                /* HIDE PASSWORD ICON (eye slash) */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18M10.584 10.587A3.75 3.75 0 0012 15.75c2.071 0 3.75-1.679 3.75-3.75 0-.414-.07-.81-.199-1.177M6.228 6.228C4.325 7.622 2.957 9.643 2.25 12c1.342 4.13 5.07 7.5 9.75 7.5 1.54 0 2.992-.33 4.299-.927M9.735 4.34c.724-.158 1.48-.24 2.265-.24 4.68 0 8.408 3.37 9.75 7.5-.614 1.888-1.77 3.54-3.288 4.768"
                  />
                </svg>
              ) : (
                /* SHOW PASSWORD ICON (plain eye) */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ✅ reCAPTCHA with ref */}
        <div className="flex justify-center pt-1">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
            onChange={(token) => setCaptchaToken(token)}
            onExpired={handleCaptchaExpired}
            onErrored={() => recaptchaRef.current?.reset()}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthShell>
  );
}

export default LoginPage;
