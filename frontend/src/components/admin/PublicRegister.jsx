// src/components/admin/PublicRegister.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const capitalizeWords = (str) =>
  str
    .split(" ")
    .map((w) =>
      w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "",
    )
    .join(" ");

const PublicRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const generateAccountNumber = () => {
    const prefix = "10";
    const randomDigits = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
    return prefix + randomDigits;
  };

  const generateRandomNumber = () => Math.floor(Math.random() * 90000) + 10000;

  useEffect(() => {
    const firstName = newMember.firstName.trim().toLowerCase();
    if (firstName) {
      const randomNum = generateRandomNumber();
      setNewMember((prev) => ({
        ...prev,
        email: `${firstName}${randomNum}@gmail.com`,
      }));
    } else {
      setNewMember((prev) => ({ ...prev, email: "" }));
    }
  }, [newMember.firstName]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newMember.firstName.trim() || !newMember.lastName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!newMember.password || newMember.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const fullName = capitalizeWords(
        `${newMember.firstName.trim()} ${newMember.lastName.trim()}`.trim(),
      );
      const accountNumber = generateAccountNumber();

      const payload = {
        accountNumber,
        account_number: accountNumber,
        name: fullName,
        full_name: fullName,
        email: newMember.email,
        phone: "",
        password: newMember.password,
        role: "member",
        status: "Active",
        membership_type: "Standard",
        join_date: new Date().toISOString().split("T")[0],
        balance: 0,
        profile_completed: 0,
      };

      const res = await fetch(`${API_BASE_URL}/api/members.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setCreatedCredentials({
          name: fullName,
          email: newMember.email,
          password: newMember.password,
          accountNumber,
        });
        setShowCredentialsModal(true);
      } else {
        toast.error(data.message || data.error || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`📋 ${label} copied!`))
      .catch(() => toast.error("Copy failed"));
  };

  const copyAll = () => {
    if (!createdCredentials) return;
    const text = `Welcome ${createdCredentials.name}!
Your account details:
📧 Email: ${createdCredentials.email}
🔑 Password: ${createdCredentials.password}
💳 Account Number: ${createdCredentials.accountNumber}

Please log in and complete your profile.`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("📋 Credentials copied!"))
      .catch(() => toast.error("Copy failed"));
  };

  // ✅ Send credentials to login page so they auto-fill
  const goToLoginWithCredentials = () => {
    const creds = {
      email: createdCredentials.email,
      password: createdCredentials.password,
      justRegistered: true,
    };
    setShowCredentialsModal(false);
    setCreatedCredentials(null);
    navigate("/login", { state: creds });
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
        .pub-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 36px 30px 28px;
          box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
          color: white;
        }
        .pub-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #059669, #0d9488, #10b981);
        }
        .pub-logo {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #059669, #0d9488);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; color: white;
          margin: 0 auto 14px;
          box-shadow: 0 8px 24px rgba(5, 150, 105, 0.4);
        }
        .pub-title {
          font-size: 22px; font-weight: 700;
          color: white; text-align: center;
          margin: 0 0 4px 0; letter-spacing: -0.3px;
        }
        .pub-subtitle {
          font-size: 13px; color: #94a3b8;
          text-align: center; margin: 0 0 22px 0;
        }
        .pub-info {
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 20px;
          font-size: 12px;
          color: #93c5fd;
          line-height: 1.5;
        }
        .pub-group { margin-bottom: 14px; }
        .pub-label {
          display: block; font-size: 12px;
          font-weight: 600; color: #cbd5e1;
          margin-bottom: 6px;
          letter-spacing: 0.3px; text-transform: uppercase;
        }
        .pub-input {
          width: 100%;
          padding: 12px 14px;
          font-size: 14px; color: white;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .pub-input::placeholder { color: #64748b; }
        .pub-input:focus {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.06);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }
        .pub-email-note {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 14px;
          font-size: 12px;
          color: #34d399;
          word-break: break-all;
        }
        .pub-submit {
          width: 100%; padding: 13px;
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 600;
          color: white; cursor: pointer;
          background: linear-gradient(135deg, #059669, #0d9488);
          box-shadow: 0 8px 24px -8px rgba(5, 150, 105, 0.5);
          transition: all 0.2s;
          margin-top: 6px;
        }
        .pub-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px -8px rgba(5, 150, 105, 0.7);
        }
        .pub-submit:disabled {
          opacity: 0.6; cursor: not-allowed;
        }
        .pub-footer {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: #94a3b8;
        }
        .pub-footer a {
          color: #34d399;
          text-decoration: none;
          font-weight: 600;
        }
        .pub-footer a:hover { text-decoration: underline; }
        .pub-note {
          text-align: center;
          font-size: 10px;
          color: #475569;
          margin-top: 18px;
        }
        .cred-row {
          display: flex; justify-content: space-between;
          align-items: center; gap: 8px;
          padding: 10px 12px; border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 8px;
        }
        .cred-label {
          font-size: 11px; color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px; margin-bottom: 2px;
        }
        .cred-value {
          font-size: 14px; color: white;
          font-weight: 600;
          font-family: monospace;
          word-break: break-all;
        }
        .cred-copy {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.25);
          padding: 6px 12px; border-radius: 6px;
          cursor: pointer; font-size: 12px;
          font-weight: 500; white-space: nowrap;
        }
        .cred-copy:hover { background: rgba(59, 130, 246, 0.25); }
      `}</style>

      <div className="pub-card">
        <div className="pub-logo">🏦</div>
        <h1 className="pub-title">Create Account</h1>
        <p className="pub-subtitle">Join AR-RIYAADAH SAVINGS HUB</p>

        <div className="pub-info">
          💡 Enter your details below. You'll receive your account number after
          registration and can log in to complete your profile.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pub-group">
            <label className="pub-label">First Name *</label>
            <input
              type="text"
              className="pub-input"
              value={newMember.firstName}
              onChange={(e) =>
                setNewMember({
                  ...newMember,
                  firstName: capitalizeWords(e.target.value),
                })
              }
              required
              placeholder="Enter your first name"
              autoComplete="given-name"
            />
          </div>

          <div className="pub-group">
            <label className="pub-label">Last Name *</label>
            <input
              type="text"
              className="pub-input"
              value={newMember.lastName}
              onChange={(e) =>
                setNewMember({
                  ...newMember,
                  lastName: capitalizeWords(e.target.value),
                })
              }
              required
              placeholder="Enter your last name"
              autoComplete="family-name"
            />
          </div>

          <div className="pub-group">
            <label className="pub-label">Password *</label>
            <input
              type="password"
              className="pub-input"
              value={newMember.password}
              onChange={(e) =>
                setNewMember({ ...newMember, password: e.target.value })
              }
              required
              minLength="6"
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="pub-email-note">
            📧 Your login email will be:{" "}
            <strong style={{ color: "white" }}>{newMember.email || "—"}</strong>
          </div>

          <button type="submit" className="pub-submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="pub-footer">
          Already have an account? <Link to="/login">Sign in here</Link>
        </div>

        <div className="pub-note">
          © {new Date().getFullYear()} AR-RIYAADAH SAVINGS HUB. All rights
          reserved.
        </div>
      </div>

      {showCredentialsModal && createdCredentials && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "14px",
              padding: "28px",
              maxWidth: "460px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px 0",
              }}
            >
              🎉 Account Created!
            </h3>

            <div
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#6ee7b7",
                lineHeight: 1.5,
              }}
            >
              ⚠️ <strong>Save these credentials</strong>. You'll need them to
              log in.
            </div>

            <div className="cred-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cred-label">📧 Email</div>
                <div className="cred-value">{createdCredentials.email}</div>
              </div>
              <button
                className="cred-copy"
                onClick={() =>
                  copyToClipboard(createdCredentials.email, "Email")
                }
              >
                Copy
              </button>
            </div>

            <div className="cred-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cred-label">🔑 Password</div>
                <div className="cred-value">{createdCredentials.password}</div>
              </div>
              <button
                className="cred-copy"
                onClick={() =>
                  copyToClipboard(createdCredentials.password, "Password")
                }
              >
                Copy
              </button>
            </div>

            <div className="cred-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cred-label">💳 Account Number</div>
                <div className="cred-value">
                  {createdCredentials.accountNumber}
                </div>
              </div>
              <button
                className="cred-copy"
                onClick={() =>
                  copyToClipboard(
                    createdCredentials.accountNumber,
                    "Account number",
                  )
                }
              >
                Copy
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                onClick={copyAll}
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(to right, #7c3aed, #6d28d9)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                📋 Copy All
              </button>
              <button
                onClick={goToLoginWithCredentials}
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                ✅ Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicRegister;
