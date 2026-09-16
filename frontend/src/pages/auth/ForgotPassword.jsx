// src/pages/auth/ForgotPassword.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [appSettings, setAppSettings] = useState({
    appName: "Loading...",
    logo: "🏦",
  });

  useEffect(() => {
    fetchAppSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAppSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings.php`);
      if (response.ok) {
        const result = await response.json();
        if (result.status === true && result.data?.general) {
          const general = result.data.general;
          setAppSettings({
            appName:
              general.shop_name || general.app_name || "Osittech Contribution",
            logo: general.logo || "🏦",
          });
        } else {
          setAppSettings({
            appName: "Osittech Contribution",
            logo: "🏦",
          });
        }
      }
    } catch {
      setAppSettings({
        appName: "Osittech Contribution",
        logo: "🏦",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/request-password-reset.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: cleanEmail }),
        },
      );

      const data = await res.json();

      if (res.ok && data.status === true) {
        setSubmitted(true);
        toast.success(data.message || "Request submitted");
      } else {
        toast.error(data.error || data.message || "Failed to submit request");
      }
    } catch (err) {
      console.error(err);
      toast.error("Cannot connect to server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    setSubmitted(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, var(--bg-surface) 0%, var(--bg-app) 60%)",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        .fp-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg-surface);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 36px 30px 28px;
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
        }
        .fp-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #059669, #0d9488, var(--accent));
        }
        .fp-logo {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669, #0d9488);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; color: white;
          margin: 0 auto 14px;
          box-shadow: 0 8px 24px rgba(5, 150, 105, 0.4);
        }
        .fp-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          text-align: center;
          margin: 0 0 4px 0;
          letter-spacing: -0.3px;
        }
        .fp-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          margin: 0 0 26px 0;
          line-height: 1.5;
        }
        .fp-field-group { margin-bottom: 16px; }
        .fp-field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 6px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .fp-field-wrap { position: relative; }
        .fp-field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          color: var(--text-dim);
          pointer-events: none;
        }
        .fp-field-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          font-size: 14px;
          color: var(--text);
          background: var(--bg-surface-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .fp-field-input::placeholder { color: var(--text-dim); }
        .fp-field-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-bg);
        }
        .fp-submit-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          background: linear-gradient(135deg, #059669, #0d9488);
          box-shadow: 0 8px 24px -8px rgba(5, 150, 105, 0.5);
          transition: all 0.2s;
          margin-top: 6px;
        }
        .fp-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px -8px rgba(5, 150, 105, 0.7);
        }
        .fp-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .fp-back-link {
          display: block;
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
        }
        .fp-back-link:hover { color: var(--text); text-decoration: underline; }
        .fp-footer-note {
          text-align: center;
          font-size: 10px;
          color: var(--text-dim);
          margin-top: 22px;
        }
        .fp-success-icon {
          font-size: 56px;
          text-align: center;
          margin-bottom: 12px;
        }
        .fp-success-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          text-align: center;
          margin: 0 0 10px 0;
        }
        .fp-success-msg {
          font-size: 14px;
          color: var(--text-muted);
          text-align: center;
          margin: 0 0 22px 0;
          line-height: 1.6;
        }
        .fp-success-email {
          color: var(--text);
          font-weight: 600;
          font-family: monospace;
          word-break: break-all;
        }
        .fp-secondary-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fp-secondary-btn:hover {
          background: var(--bg-surface-2);
        }
      `}</style>

      <div className="fp-card">
        <div className="fp-logo">{appSettings.logo}</div>

        {!submitted ? (
          <>
            <h1 className="fp-title">Forgot Password?</h1>
            <p className="fp-subtitle">
              Enter the email address you used to register. An admin will reset
              your password shortly.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="fp-field-group">
                <label className="fp-field-label">Email Address</label>
                <div className="fp-field-wrap">
                  <span className="fp-field-icon">📧</span>
                  <input
                    type="email"
                    className="fp-field-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="fp-submit-btn"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Reset Request"}
              </button>
            </form>

            <Link to="/login" className="fp-back-link">
              ← Back to Sign In
            </Link>

            <div className="fp-footer-note">
              © {new Date().getFullYear()} {appSettings.appName}. All rights
              reserved.
            </div>
          </>
        ) : (
          <>
            <div className="fp-success-icon">📨</div>
            <h2 className="fp-success-title">Request Submitted</h2>
            <p className="fp-success-msg">
              Your password reset request for{" "}
              <span className="fp-success-email">{email}</span> has been
              received.
              <br />
              <br />
              An admin will reset your password and send you a temporary
              password. Please check back or contact the admin directly.
            </p>

            <button
              className="fp-secondary-btn"
              onClick={() => navigate("/login")}
              style={{ marginBottom: 10 }}
            >
              Back to Sign In
            </button>

            <button className="fp-secondary-btn" onClick={handleReset}>
              Submit Another Request
            </button>

            <div className="fp-footer-note">
              © {new Date().getFullYear()} {appSettings.appName}. All rights
              reserved.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
