// src/pages/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appSettings, setAppSettings] = useState({
    appName: "Loading...",
    logo: "🏦",
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    fetchAppSettings();

    const state = location.state;
    if (state?.email || state?.password) {
      setFormData({
        email: state.email || "",
        password: state.password || "",
      });
    }
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
      const validPrefixes = ["080", "081", "070", "090", "091"];
      if (validPrefixes.some((p) => cleanPhone.startsWith(p))) return true;
    }
    if (cleanPhone.length === 13 && cleanPhone.startsWith("234")) return true;
    if (phone.startsWith("+234") && cleanPhone.length === 13) return true;
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const inputValue = formData.email.trim();
    const isPhoneInput = /^[0-9+\-() ]+$/.test(inputValue);

    if (isPhoneInput && !validatePhoneNumber(inputValue)) {
      toast.error(
        "Please enter a valid 11-digit phone number starting with 0 (e.g., 08012345678) or with country code +234",
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.status === true) {
        const { user } = data;

        const cleanUser = {
          id: user.id,
          username: user.username || user.name,
          name: user.name || user.username,
          full_name: user.full_name || user.name || user.username,
          email: user.email,
          role: user.role || "member",
          // 🆕 Carry the branch through so member pages can send ?branch_id=
          branch_id: user.branch_id ?? user.branchId ?? null,
          phone: user.phone || "",
          address: user.address || "",
          is_active: user.is_active !== undefined ? user.is_active : true,
          balance: user.balance || 0,
          accountNumber: user.accountNumber || user.account_number || "N/A",
          account_number: user.account_number || user.accountNumber || "N/A",
          membership_number:
            user.membership_number || user.account_number || "N/A",
          membershipType:
            user.membershipType || user.membership_type || "Standard",
          membership_type:
            user.membership_type || user.membershipType || "Standard",
          joinDate:
            user.joinDate ||
            user.join_date ||
            new Date().toISOString().split("T")[0],
          join_date:
            user.join_date ||
            user.joinDate ||
            new Date().toISOString().split("T")[0],
          status: user.status || "Active",
          profile_completed: user.profile_completed || 0,
          passport_photo: user.passport_photo || null,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString(),
        };

        const token = data.token || `token_${Date.now()}`;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(cleanUser));

        login(cleanUser, token);
        toast.success(`Welcome ${cleanUser.full_name || "back"}! 🎉`);

        setTimeout(() => {
          const isAdmin =
            cleanUser.role === "admin" || cleanUser.role === "administrator";

          const completed =
            cleanUser.profile_completed === 1 ||
            cleanUser.profile_completed === "1" ||
            cleanUser.profile_completed === true;

          if (isAdmin) {
            navigate("/admin/dashboard");
          } else if (!completed) {
            navigate("/member/profile");
          } else {
            navigate("/member/dashboard");
          }
        }, 300);
      } else {
        toast.error(data.error || data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === "ERR_NETWORK") {
        toast.error(
          "Cannot connect to server. Please check if PHP server is running on port 8000.",
        );
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{css}</style>

      <div className="login-bg" aria-hidden="true" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">{appSettings.logo}</div>
          <h1 className="login-title">{appSettings.appName}</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Email or Phone</label>
            <div className="field-wrap">
              <span className="field-icon">📧</span>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="field-input"
                placeholder="Email or 11-digit phone"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <div className="field-wrap">
              <span className="field-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="field-input pw"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="row">
            <label className="remember">
              <input type="checkbox" id="remember" />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="divider">New here?</div>
        <div className="register-row">
          Don't have an account?{" "}
          <Link to="/register-member" className="register-link">
            Register here
          </Link>
        </div>

        <div className="footer-note">
          © {new Date().getFullYear()} {appSettings.appName}. All rights
          reserved.
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
    max-width: 340px;
    background: color-mix(in srgb, var(--bg-surface, #ffffff) 88%, transparent);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 14px;
    padding: 32px 26px 26px;
    box-shadow: 0 24px 60px -24px rgba(15, 23, 42, 0.4);
  }

  .login-header {
    text-align: center;
    margin-bottom: 24px;
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

  .field-group { margin-bottom: 20px; }

  .field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted, #64748b);
    margin-bottom: 4px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .field-wrap { position: relative; }

  .field-icon {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    color: var(--text-muted, #94a3b8);
    pointer-events: none;
  }

  .field-input {
    width: 100%;
    padding: 9px 0 9px 22px;
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
  .field-input.pw { padding-right: 30px; }

  .pw-toggle {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-muted, #64748b);
    padding: 4px 0 4px 8px;
    line-height: 1;
    outline: none;
  }
  .pw-toggle:hover { color: var(--text, #0f172a); }
  .pw-toggle:focus,
  .pw-toggle:focus-visible { outline: none; }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 22px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .remember {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    color: var(--text, #0f172a);
    cursor: pointer;
  }
  .remember input {
    accent-color: var(--accent, #10b981);
    width: 13px;
    height: 13px;
    cursor: pointer;
  }

  .forgot-link {
    font-size: 11.5px;
    color: var(--accent, #10b981);
    text-decoration: none;
    font-weight: 500;
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

  .register-row {
    text-align: center;
    font-size: 12.5px;
    color: var(--text-muted, #64748b);
  }
  .register-link {
    color: var(--accent, #10b981);
    font-weight: 600;
    text-decoration: none;
    margin-left: 4px;
  }
  .register-link:hover { text-decoration: underline; }

  .footer-note {
    text-align: center;
    font-size: 10px;
    color: var(--text-muted, #94a3b8);
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid var(--border, #e2e8f0);
  }
`;

export default Login;
