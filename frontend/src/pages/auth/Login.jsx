// src/pages/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const Login = () => {
  const navigate = useNavigate();
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
  }, []);

  const fetchAppSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings.php`);
      if (response.ok) {
        const result = await response.json();
        if (result.status === true && result.data) {
          if (result.data.general) {
            const general = result.data.general;
            const shopName =
              general.shop_name || general.app_name || "Osittech Contribution";
            const logo = general.logo || "🏦";
            setAppSettings({ appName: shopName, logo });
          } else {
            setAppSettings({
              appName: "Osittech Contribution",
              logo: "🏦",
            });
          }
        } else {
          setAppSettings({
            appName: "Osittech Contribution",
            logo: "🏦",
          });
        }
      } else {
        setAppSettings({
          appName: "Osittech Contribution",
          logo: "🏦",
        });
      }
    } catch (error) {
      setAppSettings({
        appName: "Osittech Contribution",
        logo: "🏦",
      });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
      const validPrefixes = ["080", "081", "070", "090", "091"];
      if (validPrefixes.some((p) => cleanPhone.startsWith(p))) {
        return true;
      }
    }

    if (cleanPhone.length === 13 && cleanPhone.startsWith("234")) {
      return true;
    }

    if (phone.startsWith("+234") && phone.replace(/\D/g, "").length === 13) {
      return true;
    }

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
        background: "#0f172a",
        padding: "16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "340px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "10px",
            padding: "22px 20px",
            boxShadow: "0 20px 40px -12px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(to right, #059669, #0d9488)",
                borderRadius: "9999px",
                padding: "8px",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "20px" }}>{appSettings.logo}</span>
            </div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#1f2937",
                margin: "0 0 2px 0",
                lineHeight: 1.2,
              }}
            >
              {appSettings.appName}
            </h2>
            <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email / Phone */}
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "3px",
                }}
              >
                Email or Phone Number
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "9px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: "12px",
                  }}
                >
                  📧
                </span>
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px 10px 8px 30px",
                    fontSize: "13px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  placeholder="Email or 11-digit phone"
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#059669")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "3px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "9px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: "12px",
                  }}
                >
                  🔒
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "8px 34px 8px 30px",
                    fontSize: "13px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  placeholder="Enter your password"
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#059669")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    padding: 0,
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <input
                  type="checkbox"
                  id="remember"
                  style={{
                    accentColor: "#059669",
                    width: "13px",
                    height: "13px",
                  }}
                />
                <label
                  htmlFor="remember"
                  style={{
                    fontSize: "11px",
                    color: "#4b5563",
                    cursor: "pointer",
                  }}
                >
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: "11px",
                  color: "#059669",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "9px",
                background: "linear-gradient(to right, #059669, #0d9488)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(5, 150, 105, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Register link */}
            <p
              style={{
                textAlign: "center",
                fontSize: "11px",
                color: "#6b7280",
                marginTop: "12px",
                marginBottom: 0,
              }}
            >
              Don't have an account?{" "}
              <Link
                to="/admin/users"
                style={{
                  color: "#059669",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                Register here
              </Link>
            </p>
          </form>

          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <p style={{ fontSize: "9px", color: "#9ca3af", margin: 0 }}>
              © {new Date().getFullYear()} {appSettings.appName}. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
