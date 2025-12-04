import React, { useState } from "react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/users/forgot-password", {
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
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-100 via-white to-blue-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100"
      >
        <h2 className="text-3xl font-bold mb-3 text-center text-blue-700">
          Forgot Password
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your registered email, and we’ll send you a reset link.
        </p>

        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-md"
          }`}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {message && (
          <p
            className={`mt-5 text-center text-sm ${
              message.includes("✅")
                ? "text-green-600"
                : message.includes("❌")
                ? "text-red-600"
                : "text-yellow-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

export default ForgotPassword;
