// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Phone number validation function
  const validatePhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, "");

    // Check for Nigerian phone number patterns:
    // 11 digits starting with 0: 08012345678, 08123456789, 07012345678, 09012345678
    // Or with country code: 2348012345678 (13 digits starting with 234)
    // Or with +234: +2348012345678 (14 characters)

    // Check if it's 11 digits starting with 0
    if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
      // Check if it starts with 080, 081, 070, 090, 091, 070, 080, 081, 090
      const validPrefixes = [
        "080",
        "081",
        "070",
        "090",
        "091",
        "0701",
        "0801",
        "0811",
        "0901",
      ];
      const prefix = cleanPhone.substring(0, 3);
      if (validPrefixes.some((p) => cleanPhone.startsWith(p))) {
        return true;
      }
    }

    // Check if it's 13 digits starting with 234 (country code)
    if (cleanPhone.length === 13 && cleanPhone.startsWith("234")) {
      return true;
    }

    // Check if it's +234 format (14 characters including +)
    if (phone.startsWith("+234") && phone.replace(/\D/g, "").length === 13) {
      return true;
    }

    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Check if input is a phone number (contains digits or +)
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
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (data.status) {
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

        console.log("✅ Clean user with balance:", cleanUser);
        console.log("✅ Balance:", cleanUser.balance);
        console.log("✅ Account Number:", cleanUser.accountNumber);

        const token = data.token || `token_${Date.now()}`;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(cleanUser));

        login(cleanUser, token);

        toast.success(`Welcome ${cleanUser.full_name || "back"}! 🎉`);

        const isAdmin =
          cleanUser.role === "admin" || cleanUser.role === "administrator";
        console.log("✅ Is admin?", isAdmin);

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

  // Styles
  const styles = {
    container: {
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      padding: "20px 0",
      backgroundColor: "#0f172a",
    },
    background: {
      position: "absolute",
      inset: 0,
      zIndex: 0,
      backgroundImage:
        "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
    overlay: {
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(to bottom right, rgba(6, 78, 59, 0.8), rgba(19, 78, 74, 0.7), rgba(8, 145, 178, 0.8))",
    },
    card: {
      position: "relative",
      zIndex: 10,
      width: "100%",
      maxWidth: "380px",
      padding: "0 16px",
    },
    cardInner: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      borderRadius: "12px",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      padding: "24px 20px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    logoContainer: {
      display: "flex",
      justifyContent: "center",
      marginBottom: "12px",
    },
    logo: {
      background: "linear-gradient(to right, #059669, #0d9488)",
      borderRadius: "9999px",
      padding: "10px",
      boxShadow: "0 10px 30px rgba(5, 150, 105, 0.25)",
    },
    logoText: {
      fontSize: "24px",
    },
    title: {
      fontSize: "18px",
      fontWeight: "bold",
      textAlign: "center",
      color: "#1f2937",
      marginBottom: "4px",
    },
    subtitle: {
      textAlign: "center",
      color: "#6b7280",
      fontSize: "13px",
      marginBottom: "16px",
    },
    formGroup: {
      marginBottom: "12px",
    },
    label: {
      display: "block",
      fontSize: "13px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "4px",
    },
    inputWrapper: {
      position: "relative",
    },
    inputIcon: {
      position: "absolute",
      left: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#9ca3af",
      fontSize: "14px",
    },
    input: {
      width: "100%",
      padding: "8px 10px 8px 32px",
      fontSize: "13px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      backdropFilter: "blur(4px)",
      transition: "all 0.2s",
      outline: "none",
      boxSizing: "border-box",
    },
    inputPassword: {
      width: "100%",
      padding: "8px 32px 8px 32px",
      fontSize: "13px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      backdropFilter: "blur(4px)",
      transition: "all 0.2s",
      outline: "none",
      boxSizing: "border-box",
    },
    passwordToggle: {
      position: "absolute",
      right: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      fontSize: "14px",
    },
    flexRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "12px",
    },
    checkboxWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    checkbox: {
      width: "14px",
      height: "14px",
      accentColor: "#059669",
    },
    checkboxLabel: {
      fontSize: "12px",
      color: "#4b5563",
      cursor: "pointer",
    },
    forgotLink: {
      fontSize: "12px",
      color: "#059669",
      textDecoration: "none",
    },
    submitButton: {
      width: "100%",
      padding: "8px",
      background: "linear-gradient(to right, #059669, #0d9488)",
      color: "white",
      border: "none",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
      boxShadow: "0 10px 30px rgba(5, 150, 105, 0.25)",
    },
    submitDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    registerText: {
      textAlign: "center",
      fontSize: "12px",
      color: "#6b7280",
      marginTop: "12px",
    },
    registerLink: {
      color: "#059669",
      fontWeight: "500",
      textDecoration: "none",
    },
    footer: {
      marginTop: "12px",
      textAlign: "center",
    },
    footerText: {
      fontSize: "10px",
      color: "#9ca3af",
    },
    bottomText: {
      position: "absolute",
      bottom: "12px",
      left: 0,
      right: 0,
      textAlign: "center",
      zIndex: 10,
    },
    bottomTextInner: {
      color: "rgba(255, 255, 255, 0.5)",
      fontSize: "10px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.background}>
        <div style={styles.overlay}></div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardInner}>
          {/* Logo */}
          <div style={styles.logoContainer}>
            <div style={styles.logo}>
              <span style={styles.logoText}>🏦</span>
            </div>
          </div>

          <h2 style={styles.title}>Osittech Contribution</h2>
          <p style={styles.subtitle}>Sign in to your account</p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email or Phone Number</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>📧</span>
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Enter email or 11-digit phone"
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#059669")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
              </div>
              <div
                style={{ fontSize: "10px", color: "#6b7280", marginTop: "3px" }}
              >
                Phone: 08012345678 or +2348012345678
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  style={styles.inputPassword}
                  placeholder="Enter your password"
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#059669")}
                  onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={styles.flexRow}>
              <div style={styles.checkboxWrapper}>
                <input type="checkbox" id="remember" style={styles.checkbox} />
                <label htmlFor="remember" style={styles.checkboxLabel}>
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" style={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitDisabled : {}),
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p style={styles.registerText}>
              Don't have an account?{" "}
              <Link to="/register" style={styles.registerLink}>
                Register here
              </Link>
            </p>
          </form>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              © 2024 Osittech Contribution. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.bottomText}>
        <p style={styles.bottomTextInner}>Secure Login • Powered by Osittech</p>
      </div>
    </div>
  );
};

export default Login;
