import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import cotLogo from "../../image/cotlogo.jpg";
import "./LoginPage.css";
import { cleanupRecaptcha } from "../../utils/cleanupRecaptcha";





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

  // useEffect(() => {
  //   // capture the current ref value once
  //   const recaptchaInstance = recaptchaRef.current;

  //   return () => {
  //     if (recaptchaInstance) {
  //       try {
  //         recaptchaInstance.reset();
  //       } catch (err) {
  //         console.warn("⚠️ reCAPTCHA reset skipped:", err.message);
  //       }
  //     }
  //   };
  // }, []);

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

  // 🧩 Timeout controller for safety
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 10 seconds

  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessID, password, captchaToken }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    // ✅ Reset reCAPTCHA after receiving a response (success or fail)
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
      setCaptchaToken(""); // clear old token
    }

    if (!response.ok) {
      setError(data.message || "Login failed. Please try again.");
      return;
    }

    // ✅ Store user info
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
    localStorage.setItem("userEmail", data.email);
    localStorage.setItem("userName", data.name);
    localStorage.setItem("role", data.role);
    localStorage.setItem("department", data.department);

    // ✅ Cleanup before navigation
    // document
    //   .querySelectorAll('iframe[src*="recaptcha"]')
    //   .forEach((iframe) => iframe.remove());

    // ✅ Short delay for cleanup
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
    <div className="login-page">
      <img src={cotLogo} alt="COT Logo" className="login-logo" />
      <h2 className="system-title">COT Inventory System</h2>
      <p className="subtitle">Sign in to your account</p>

      <div className="login-card">
        <h3 className="welcome-text">Welcome Back</h3>
        <p className="subtext">
          Enter your credentials to access COT Inventory System
        </p>

        <form onSubmit={handleLogin}>
          <label>Access ID</label>
          <input
            type="text"
            value={accessID}
            onChange={(e) => setAccessID(e.target.value)}
            placeholder="Enter Access ID"
            required
          />

          {/* Original label password before putting toggle hide and show icon */}
          {/* <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            required
          /> */}

            {/* The updated password field to show password */}
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              required
            />

            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                /* HIDE PASSWORD ICON (eye slash) */
                <>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth="1.5" 
                    stroke="currentColor" 
                    className="eye-icon"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587A3.75 3.75 0 0012 15.75c2.071 0 3.75-1.679 3.75-3.75 0-.414-.07-.81-.199-1.177M6.228 6.228C4.325 7.622 2.957 9.643 2.25 12c1.342 4.13 5.07 7.5 9.75 7.5 1.54 0 2.992-.33 4.299-.927M9.735 4.34c.724-.158 1.48-.24 2.265-.24 4.68 0 8.408 3.37 9.75 7.5-.614 1.888-1.77 3.54-3.288 4.768" />
                  </svg>
                </>
              ) : (
                /* SHOW PASSWORD ICON (plain eye) */
                <>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth="1.5" 
                    stroke="currentColor" 
                    className="eye-icon"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" 
                      d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
                    <path strokeLinecap="round" strokeLinejoin="round" 
                      d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                </>
              )}
            </span>
          </div>


          {/* ✅ reCAPTCHA with ref */}
          <div style={{ margin: "15px 0", textAlign: "center" }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6LeOwQksAAAAANenkVFvPAgT8pIV_WP87BqesH7r"
              onChange={(token) => setCaptchaToken(token)}
              onExpired={handleCaptchaExpired}
              onErrored={() => recaptchaRef.current?.reset()}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`login-btn ${loading ? "loading" : ""}`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <p className="text-center mt-3">
            <a href="/forgot-password" className="text-blue-600 hover:underline">
              Forgot Password?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
