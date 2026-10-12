// src/components/admin/PublicRegister.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useBranchBranding from "../../hooks/useBranchBranding";

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

  // Branch resolved from ?branch= (or ?branch_id=) in the link.
  // Registration REQUIRES the link, so the "remembered branch" fallback is off.
  // Same hook the sign-in page uses → both pages always show the same name.
  const {
    branch,
    name: brandName,
    loading: branchLoading,
    hasParam,
    notFound,
    failed,
  } = useBranchBranding({ allowSaved: false });

  const branchError = !hasParam
    ? "No branch specified in this link. Please use the link your branch admin gave you."
    : notFound
      ? "This registration link is invalid or expired."
      : failed
        ? "Could not load branch details. Please check your connection and try again."
        : "";

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

    // Block if branch hasn't resolved
    if (!branch?.id) {
      toast.error(
        branchError || "Cannot register: no valid branch in this link.",
      );
      return;
    }

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
        // Also send in body (harmless, future-proof)
        branch_id: branch.id,
      };

      // members.php reads $_GET['branch_id'] — it ignores the JSON body.
      // Without this, every registration falls back to the "first active
      // branch" regardless of which link was used.
      const res = await fetch(
        `${API_BASE_URL}/api/members.php?branch_id=${encodeURIComponent(branch.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (res.ok) {
        setCreatedCredentials({
          name: fullName,
          email: newMember.email,
          password: newMember.password,
          accountNumber,
          branchName: branch.name,
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
🏢 Branch: ${createdCredentials.branchName || "—"}

Please log in and complete your profile.`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("📋 Credentials copied!"))
      .catch(() => toast.error("Copy failed"));
  };

  const goToLoginWithCredentials = () => {
    const creds = {
      email: createdCredentials.email,
      password: createdCredentials.password,
      justRegistered: true,
    };
    setShowCredentialsModal(false);
    setCreatedCredentials(null);
    // Carry the branch to the sign-in page so it shows the SAME branch
    navigate(branch?.id ? `/login?branch=${branch.id}` : "/login", {
      state: creds,
    });
  };

  const loginPath = branch?.id ? `/login?branch=${branch.id}` : "/login";

  return (
    <div className="reg-page">
      <style>{css}</style>

      <div className="reg-bg" aria-hidden="true" />

      <div className="reg-card">
        <div className="reg-header">
          <div className="reg-logo">🏦</div>
          <h1 className="reg-title">Create Account</h1>
          <p className="reg-subtitle">
            {branchLoading
              ? "Loading…"
              : brandName
                ? `Join ${brandName}`
                : "Join us"}
          </p>
        </div>

        {/* Branch banner — shows which branch this link is for */}
        {branchLoading ? (
          <div className="reg-branch reg-branch-loading">
            <span className="reg-branch-icon">⏳</span>
            <div className="reg-branch-body">Loading branch details…</div>
          </div>
        ) : branch ? (
          <div className="reg-branch">
            <span className="reg-branch-icon">🏢</span>
            <div className="reg-branch-body">
              <div className="reg-branch-name">{branch.name}</div>
              <div className="reg-branch-code">
                Branch code: <strong>{branch.code}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="reg-branch reg-branch-error">
            <span className="reg-branch-icon">⚠️</span>
            <div className="reg-branch-body">
              {branchError || "Invalid registration link."}
            </div>
          </div>
        )}

        <div className="reg-info">
          💡 Enter your details below. You'll receive your account number after
          registration and can log in to complete your profile.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">First Name *</label>
            <input
              type="text"
              className="field-input"
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
              disabled={!branch}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Last Name *</label>
            <input
              type="text"
              className="field-input"
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
              disabled={!branch}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password *</label>
            <input
              type="password"
              className="field-input"
              value={newMember.password}
              onChange={(e) =>
                setNewMember({ ...newMember, password: e.target.value })
              }
              required
              minLength="6"
              placeholder="Min 6 characters"
              autoComplete="new-password"
              disabled={!branch}
            />
          </div>

          <div className="reg-email-note">
            📧 Your login email will be:{" "}
            <strong>{newMember.email || "—"}</strong>
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !branch}
          >
            {!branch
              ? "Branch Required"
              : loading
                ? "Creating account..."
                : "Create Account"}
          </button>
        </form>

        <div className="divider">Already a member?</div>

        <div className="footer-row">
          <Link to={loginPath} className="footer-link">
            Sign in here
          </Link>
        </div>

        <div className="footer-note">
          © {new Date().getFullYear()}
          {brandName ? ` ${brandName}.` : "."} All rights reserved.
        </div>
      </div>

      {showCredentialsModal && createdCredentials && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">🎉 Account Created!</h3>

            <div className="modal-warning">
              ⚠️ <strong>Save these credentials</strong>. You'll need them to
              log in.
            </div>

            {createdCredentials.branchName && (
              <div className="cred-row">
                <div className="cred-body">
                  <div className="cred-label">🏢 Branch</div>
                  <div className="cred-value">
                    {createdCredentials.branchName}
                  </div>
                </div>
              </div>
            )}

            <div className="cred-row">
              <div className="cred-body">
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
              <div className="cred-body">
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
              <div className="cred-body">
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

            <div className="modal-actions">
              <button onClick={copyAll} className="modal-btn modal-btn-blue">
                📋 Copy All
              </button>
              <button
                onClick={goToLoginWithCredentials}
                className="modal-btn modal-btn-green"
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

const css = `
  .reg-page {
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

  .reg-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background-image: url("/backgrounds/login-bg.jpg");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
  }
  .reg-bg::after {
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
    .reg-bg::after {
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.55),
        rgba(255, 255, 255, 0.35)
      );
    }
  }

  .reg-card {
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

  .reg-header {
    text-align: center;
    margin-bottom: 22px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }

  .reg-logo {
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

  .reg-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text, #0f172a);
    margin: 0 0 6px 0;
    letter-spacing: -0.3px;
  }

  .reg-subtitle {
    font-size: 12px;
    color: var(--text-muted, #64748b);
    margin: 0;
  }

  /* Branch banner */
  .reg-branch {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    margin-bottom: 14px;
    border: 1px solid color-mix(in srgb, var(--accent, #059669) 35%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent, #059669) 6%, transparent);
    font-size: 12.5px;
    color: var(--text, #0f172a);
  }
  .reg-branch-icon { font-size: 20px; flex-shrink: 0; }
  .reg-branch-body { flex: 1; min-width: 0; }
  .reg-branch-name {
    font-weight: 700;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .reg-branch-code {
    font-size: 11px;
    color: var(--text-muted, #64748b);
  }
  .reg-branch-code strong { color: var(--text, #0f172a); }
  .reg-branch-loading {
    border-color: var(--border, #e2e8f0);
    background: transparent;
    color: var(--text-muted, #64748b);
  }
  .reg-branch-error {
    border-color: rgba(239, 68, 68, 0.4);
    background: rgba(239, 68, 68, 0.06);
    color: var(--debit, #dc2626);
    line-height: 1.5;
  }

  .reg-info {
    font-size: 12px;
    color: var(--text-muted, #64748b);
    line-height: 1.5;
    padding: 0 0 14px 0;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }

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
  .field-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .reg-email-note {
    font-size: 12px;
    color: var(--text-muted, #64748b);
    margin-bottom: 18px;
    padding-bottom: 10px;
    border-bottom: 1px dashed var(--border, #e2e8f0);
    word-break: break-all;
  }
  .reg-email-note strong { color: var(--text, #0f172a); }

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

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
  }

  .modal-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 14px;
    padding: 26px;
    max-width: 420px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    color: var(--text, #0f172a);
  }

  .modal-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 14px 0;
    color: var(--text, #0f172a);
  }

  .modal-warning {
    font-size: 12.5px;
    color: var(--warning, #f59e0b);
    line-height: 1.5;
    padding-bottom: 12px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }
  .modal-warning strong { color: var(--text, #0f172a); }

  .cred-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }
  .cred-body { flex: 1; min-width: 0; }
  .cred-label {
    font-size: 10.5px;
    color: var(--text-muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .cred-value {
    font-size: 13.5px;
    color: var(--text, #0f172a);
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, monospace;
    word-break: break-all;
  }

  .cred-copy {
    background: transparent;
    color: var(--info, #3b82f6);
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
    transition: background 0.15s;
    outline: none;
  }
  .cred-copy:hover { background: rgba(59, 130, 246, 0.08); }
  .cred-copy:focus,
  .cred-copy:focus-visible { outline: none; }

  .modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid var(--border, #e2e8f0);
  }

  .modal-btn {
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    transition: background 0.15s;
    outline: none;
  }
  .modal-btn:focus,
  .modal-btn:focus-visible { outline: none; }
  .modal-btn-blue {
    color: var(--info, #3b82f6);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  .modal-btn-blue:hover { background: rgba(59, 130, 246, 0.08); }
  .modal-btn-green {
    color: var(--accent, #059669);
    border: 1px solid color-mix(in srgb, var(--accent, #059669) 40%, transparent);
  }
  .modal-btn-green:hover {
    background: color-mix(in srgb, var(--accent, #059669) 10%, transparent);
  }

  @media (max-width: 640px) {
    .reg-card { padding: 26px 20px 22px; }
    .reg-title { font-size: 18px; }
  }
`;

export default PublicRegister;
