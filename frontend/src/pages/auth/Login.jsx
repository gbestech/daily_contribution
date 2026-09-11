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

    // ✅ Prefill credentials if user came from register page
    const state = location.state;
    if (state?.email || state?.password) {
      setFormData({
        email: state.email || "",
        password: state.password || "",
      });

      if (state.justRegistered) {
        toast.success(
          "🎉 Account created! Your details are pre-filled — just click Sign In.",
          { duration: 5000 },
        );
      }
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

        const isAdmin =
          cleanUser.role === "admin" || cleanUser.role === "administrator";

        setTimeout(() => {
          if (isAdmin) {
            navigate("/admin");
          } else if (!cleanUser.profile_completed) {
            navigate("/complete-profile");
          } else {
            navigate("/member");
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #1e293b 0%, #0f172a 60%)",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        .login-card {
          width: 100%;
          max-width: 400px;
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 36px 30px 28px;
          box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
        }
        .login-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #059669, #0d9488, #10b981);
        }
        .login-logo {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669, #0d9488);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; color: white;
          margin: 0 auto 14px;
          box-shadow: 0 8px 24px rgba(5, 150, 105, 0.4);
        }
        .login-title {
          font-size: 22px;
          font-weight: 700;
          color: white;
          text-align: center;
          margin: 0 0 4px 0;
          letter-spacing: -0.3px;
        }
        .login-subtitle {
          font-size: 13px;
          color: #94a3b8;
          text-align: center;
          margin: 0 0 26px 0;
        }
        .field-group { margin-bottom: 16px; }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 6px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .field-wrap { position: relative; }
        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          color: #64748b;
          pointer-events: none;
        }
        .field-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          font-size: 14px;
          color: white;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .field-input::placeholder { color: #64748b; }
        .field-input:focus {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.06);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }
        .field-input.pw { padding-right: 44px; }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          color: #94a3b8;
          padding: 4px;
          line-height: 1;
        }
        .pw-toggle:hover { color: white; }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .remember {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #cbd5e1;
          cursor: pointer;
        }
        .remember input {
          accent-color: #10b981;
          width: 14px;
          height: 14px;
          cursor: pointer;
        }
        .forgot-link {
          font-size: 12px;
          color: #34d399;
          text-decoration: none;
          font-weight: 500;
        }
        .forgot-link:hover { text-decoration: underline; }
        .submit-btn {
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
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px -8px rgba(5, 150, 105, 0.7);
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 22px 0 18px;
          color: #475569;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }
        .register-row {
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
        }
        .register-link {
          color: #34d399;
          font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
        }
        .register-link:hover { text-decoration: underline; }
        .footer-note {
          text-align: center;
          font-size: 10px;
          color: #475569;
          margin-top: 20px;
        }
      `}</style>

      <div className="login-card">
        <div className="login-logo">{appSettings.logo}</div>
        <h1 className="login-title">{appSettings.appName}</h1>
        <p className="login-subtitle">Sign in to your account</p>

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

export default Login;
