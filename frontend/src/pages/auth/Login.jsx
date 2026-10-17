// src/pages/auth/Login.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import useBranchBranding from "../../hooks/useBranchBranding";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const didAutoSubmit = useRef(false);
  const pendingRedirectRef = useRef(null);

  const {
    branch,
    name: brandName,
    loading: branchLoading,
  } = useBranchBranding({ allowSaved: true });

  // Prefill + auto-submit + capture redirect
  useEffect(() => {
    // 1) Read from URL query (hard-redirect fallback)
    const params = new URLSearchParams(window.location.search);
    const qEmail = params.get("email");
    const qPass = params.get("password");
    const qRedirect = params.get("redirectTo");
    const qJustReg = params.get("justRegistered");

    // 2) Read from React Router state
    const state = location.state || {};
    const sEmail = state.email;
    const sPass = state.password;
    const sRedirect = state.redirectTo;
    const sJustReg = state.justRegistered;
    const sAutoSubmit = state.autoSubmit;

    const finalEmail = qEmail || sEmail;
    const finalPass = qPass || sPass;
    const finalRedirect = qRedirect || sRedirect;
    const finalJustReg = qJustReg === "1" || sJustReg;

    if (!finalEmail && !finalPass && !finalRedirect) return;

    if (finalRedirect) {
      pendingRedirectRef.current = finalRedirect;
    }

    if (finalEmail || finalPass) {
      setFormData((prev) => ({
        ...prev,
        email: finalEmail || prev.email,
        password: finalPass || prev.password,
      }));
    }

    if (finalJustReg) {
      toast.success("Account created! Logging you in…", { duration: 4000 });
    }

    const shouldAutoSubmit = sAutoSubmit || (qEmail && qPass);
    if (shouldAutoSubmit && finalEmail && finalPass && !didAutoSubmit.current) {
      didAutoSubmit.current = true;
      setTimeout(() => {
        const form = document.querySelector("form");
        if (form) form.requestSubmit();
      }, 350);
    }

    // Clean URL params so refresh doesn't retrigger
    if (qEmail || qPass) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ------------------------------------------------------------
  // Check if the member's profile is complete.
  // Returns true if completed, false if not, null if unknown.
  // ------------------------------------------------------------
  const checkProfileCompletion = async (user) => {
    if (!user?.id) return null;

    // Prefer what login returned
    if (
      user.profile_completed === 1 ||
      user.profile_completed === "1" ||
      user.profile_completed === true
    ) {
      return true;
    }
    if (
      user.profile_completed === 0 ||
      user.profile_completed === "0" ||
      user.profile_completed === false
    ) {
      return false;
    }

    // Otherwise fetch the member record directly by id
    try {
      const res = await apiFetch(`/api/members.php/${user.id}`);
      if (!res.ok) {
        const listRes = await apiFetch("/api/members.php");
        const listData = await listRes.json();
        const found = Array.isArray(listData?.members)
          ? listData.members.find((m) => String(m.id) === String(user.id))
          : null;
        if (found) {
          return (
            found.profile_completed === 1 ||
            found.profile_completed === "1" ||
            found.profile_completed === true
          );
        }
        return null;
      }
      const data = await res.json();
      const m = data.member || data.data || data;
      if (m) {
        return (
          m.profile_completed === 1 ||
          m.profile_completed === "1" ||
          m.profile_completed === true
        );
      }
      return null;
    } catch (err) {
      console.warn("[Login] profile fetch failed:", err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/login.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          ...(branch?.id ? { branch_id: branch.id } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.user) {
        toast.error(data.error || data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      login(data.user, data.token);

      const role = String(data.user?.role || "").toLowerCase();
      const isAdmin = role === "admin" || role === "administrator";

      // 🆕 Determine target destination
      let destination;

      // 1. If the previous page asked for a specific redirect, respect it
      const requestedRedirect =
        pendingRedirectRef.current || location.state?.redirectTo || null;

      if (isAdmin) {
        // Admins → dashboard
        destination = "/admin/dashboard";
      } else {
        // Members: check profile completion
        const profileDone = await checkProfileCompletion(data.user);

        if (profileDone === false) {
          // Profile NOT complete → force them to the profile page
          destination = "/member/profile";
          toast("Please complete your profile to continue.", {
            icon: "📝",
            duration: 5000,
          });
        } else if (requestedRedirect) {
          // Profile done but a specific redirect was requested
          destination = requestedRedirect;
        } else if (profileDone === true) {
          // Profile done → dashboard
          destination = "/member/dashboard";
        } else {
          // Unknown status — safest bet is profile page
          destination = "/member/profile";
        }
      }

      toast.success(`Welcome back, ${data.user.name || "User"}!`);

      // 🆕 HARD redirect so nothing can block it
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("[Login] error:", err);
      toast.error(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const registerPath = branch?.id
    ? `/register-member?branch=${branch.id}`
    : "/register-member";

  return (
    <div className="login-page">
      <style>{css}</style>
      <div className="login-bg" aria-hidden="true" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏦</div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">
            {branchLoading
              ? "Loading…"
              : brandName
                ? `Sign in to ${brandName}`
                : "Sign in to your account"}
          </p>
        </div>

        {branch && (
          <div className="branch-banner">
            <span className="branch-icon">🏢</span>
            <div className="branch-body">
              <div className="branch-name">{branch.name}</div>
              <div className="branch-code">
                Code: <strong>{branch.code}</strong>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              type="email"
              name="email"
              className="field-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="field-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="forgot-row">
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="divider">New here?</div>

        <div className="footer-row">
          <Link to={registerPath} className="footer-link">
            Create an account
          </Link>
        </div>

        <div className="footer-note">
          © {new Date().getFullYear()}
          {brandName ? ` ${brandName}.` : "."} All rights reserved.
        </div>
      </div>
    </div>
  );
};

const css = `
  .login-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: transparent;
    font-family: system-ui, -apple-system, sans-serif;
    color: var(--text, #0f172a);
    overflow: hidden;
  }

  .login-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background-image: url("/backgrounds/login-bg.jpg");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
  }
  .login-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(15, 23, 42, 0.55),
      rgba(15, 23, 42, 0.35)
    );
    backdrop-filter: blur(2px);
  }
  @media (prefers-color-scheme: light) {
    .login-bg::after {
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.55),
        rgba(255, 255, 255, 0.35)
      );
    }
  }

  .login-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 360px;
    background: color-mix(in srgb, var(--bg-surface, #ffffff) 88%, transparent);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 14px;
    padding: 32px 26px 26px;
    box-shadow: 0 24px 60px -24px rgba(15, 23, 42, 0.4);
  }

  .login-header {
    text-align: center;
    margin-bottom: 22px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }

  .login-logo {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--accent, #059669);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #fff;
    margin: 0 auto 12px;
  }

  .login-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text, #0f172a);
    margin: 0 0 6px 0;
    letter-spacing: -0.3px;
  }

  .login-subtitle {
    font-size: 12px;
    color: var(--text-muted, #64748b);
    margin: 0;
  }

  .branch-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    margin-bottom: 16px;
    border: 1px solid color-mix(in srgb, var(--accent, #059669) 35%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent, #059669) 6%, transparent);
    font-size: 12.5px;
    color: var(--text, #0f172a);
  }
  .branch-icon { font-size: 20px; flex-shrink: 0; }
  .branch-body { flex: 1; min-width: 0; }
  .branch-name {
    font-weight: 700;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .branch-code {
    font-size: 11px;
    color: var(--text-muted, #64748b);
  }
  .branch-code strong { color: var(--text, #0f172a); }

  .field-group { margin-bottom: 18px; }

  .field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted, #64748b);
    margin-bottom: 4px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .field-input {
    width: 100%;
    padding: 9px 0;
    font-size: 13px;
    color: var(--text, #0f172a);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border, #e2e8f0);
    border-radius: 0;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;
    font-family: inherit;
  }
  .field-input::placeholder { color: var(--text-muted, #94a3b8); }
  .field-input:focus,
  .field-input:focus-visible {
    border-bottom-color: var(--accent, #10b981);
    outline: none;
    box-shadow: none;
  }

  .password-wrap { position: relative; }
  .password-wrap .field-input { padding-right: 32px; }
  .toggle-password {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    color: var(--text-muted, #64748b);
    outline: none;
  }

  .forgot-row {
    text-align: right;
    margin-top: -8px;
    margin-bottom: 16px;
  }
  .forgot-link {
    color: var(--accent, #10b981);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }
  .forgot-link:hover { text-decoration: underline; }

  .submit-btn {
    width: 100%;
    padding: 11px;
    border: 1px solid color-mix(in srgb, var(--accent, #059669) 45%, transparent);
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--accent, #059669);
    cursor: pointer;
    background: transparent;
    transition: background 0.15s;
    outline: none;
    margin-top: 6px;
  }
  .submit-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent, #059669) 10%, transparent);
  }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .submit-btn:focus,
  .submit-btn:focus-visible { outline: none; }

  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 22px 0 16px;
    color: var(--text-muted, #94a3b8);
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .divider::before,
  .divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--border, #e2e8f0);
  }

  .footer-row {
    text-align: center;
    font-size: 12.5px;
  }
  .footer-link {
    color: var(--accent, #10b981);
    font-weight: 600;
    text-decoration: none;
  }
  .footer-link:hover { text-decoration: underline; }

  .footer-note {
    text-align: center;
    font-size: 10px;
    color: var(--text-muted, #94a3b8);
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid var(--border, #e2e8f0);
  }

  @media (max-width: 640px) {
    .login-card { padding: 26px 20px 22px; }
    .login-title { font-size: 18px; }
  }
`;

export default Login;
