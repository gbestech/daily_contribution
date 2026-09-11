// src/components/admin/Members.jsx
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

const AdminMembers = ({ publicMode = false }) => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleAssignment, setRoleAssignment] = useState({
    memberId: "",
    role: "member",
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
      const email = `${firstName}${randomNum}@gmail.com`;
      setNewMember((prev) => ({ ...prev, email }));
    } else {
      setNewMember((prev) => ({ ...prev, email: "" }));
    }
  }, [newMember.firstName]);

  useEffect(() => {
    fetchMembers();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      if (data.members) {
        setMembers(
          data.members.map((m) => ({
            id: m.id,
            membership_number:
              m.accountNumber || `MEM-${String(m.id).padStart(4, "0")}`,
            full_name: m.name,
            email: m.email,
            phone: m.phone,
            balance: m.balance || 0,
            status: m.status?.toLowerCase() || "active",
            join_date: m.joinDate || new Date().toISOString().split("T")[0],
            role: m.role || "member",
            profile_completed: m.profile_completed || 0,
            passport_photo: m.passport_photo || null,
          })),
        );
      } else {
        setMembers([]);
      }
    } catch (e) {
      if (!publicMode) toast.error("Failed to fetch members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
      const data = await response.json();
      if (data.transactions) {
        setTransactions(
          data.transactions.map((t) => ({
            id: t.id,
            member_id: t.memberId,
            transaction_type: t.type,
            amount: t.amount,
            charge: t.charge || 0,
            status: t.status,
            description: t.description || "",
            created_at: t.date,
          })),
        );
      }
    } catch (e) {
      setTransactions([]);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.password || newMember.password.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
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

        // If we're in publicMode, we still show the credentials modal
        setShowAddModal(false);
        setShowCredentialsModal(true);
        setNewMember({ firstName: "", lastName: "", email: "", password: "" });
        if (!publicMode) fetchMembers();
      } else {
        toast.error(data.message || data.error || "Failed to create member");
      }
    } catch (e) {
      toast.error("Failed to create member");
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`📋 ${label} copied!`))
      .catch(() => toast.error("Copy failed"));
  };

  const copyAllCredentials = () => {
    if (!createdCredentials) return;
    const text = `Welcome ${createdCredentials.name}!
Your account details:
📧 Email: ${createdCredentials.email}
🔑 Password: ${createdCredentials.password}
💳 Account Number: ${createdCredentials.accountNumber}

Please log in and complete your profile.`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("📋 All credentials copied!"))
      .catch(() => toast.error("Copy failed"));
  };

  const handleEditMember = (m) => {
    setSelectedMember({ ...m });
    setEditPassword("");
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    const payload = {
      name: capitalizeWords(selectedMember.full_name || ""),
      email: selectedMember.email,
      phone: selectedMember.phone || "",
      balance: parseFloat(selectedMember.balance) || 0,
      status: selectedMember.status,
      role: selectedMember.role,
    };
    if (editPassword.trim()) payload.password = editPassword.trim();

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members.php/${selectedMember.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (res.ok) {
        toast.success("✅ Member updated!");
        setShowEditModal(false);
        setSelectedMember(null);
        setEditPassword("");
        fetchMembers();
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("Delete this member?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("✅ Deleted!");
        fetchMembers();
      } else {
        const data = await res.json();
        toast.error(data.message || "Delete failed");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleAssignRole = async () => {
    if (!roleAssignment.memberId) {
      toast.error("Please select a member");
      return;
    }
    const m = members.find((x) => x.id === parseInt(roleAssignment.memberId));
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members.php/${roleAssignment.memberId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: roleAssignment.role,
            name: m?.full_name,
            email: m?.email,
            phone: m?.phone || "",
            status: m?.status,
            balance: m?.balance || 0,
          }),
        },
      );
      if (res.ok) {
        toast.success(`✅ Role assigned: ${roleAssignment.role}`);
        setShowRoleModal(false);
        setRoleAssignment({ memberId: "", role: "member" });
        fetchMembers();
      } else {
        toast.error("Failed to assign role");
      }
    } catch {
      toast.error("Failed to assign role");
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      (m.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.membership_number || "").includes(searchTerm) ||
      (m.phone || "").includes(searchTerm),
  );

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
      case "administrator":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" };
      case "manager":
        return { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" };
      default:
        return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
      case "inactive":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" };
      case "suspended":
        return { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" };
      default:
        return { bg: "rgba(255, 255, 255, 0.1)", color: "#9ca3af" };
    }
  };

  // ============================================================
  // PUBLIC MODE — show only the registration form, no table
  // ============================================================
  if (publicMode) {
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
        `}</style>

        <div className="pub-card">
          <div className="pub-logo">🏦</div>
          <h1 className="pub-title">Create Account</h1>
          <p className="pub-subtitle">Join AR-RIYAADAH SAVINGS HUB</p>

          <div className="pub-info">
            💡 Enter your details below. You'll receive your account number
            after registration and can log in to complete your profile.
          </div>

          <form onSubmit={handleAddMember}>
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
              <strong style={{ color: "white" }}>
                {newMember.email || "—"}
              </strong>
            </div>

            <button type="submit" className="pub-submit">
              Create Account
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

        {/* Credentials modal — shows after successful registration */}
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

              {[
                { label: "📧 Email", value: createdCredentials.email },
                { label: "🔑 Password", value: createdCredentials.password },
                {
                  label: "💳 Account Number",
                  value: createdCredentials.accountNumber,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "2px",
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "white",
                        fontWeight: "600",
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(row.value, row.label)}
                    style={{
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "500",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              ))}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "16px",
                }}
              >
                <button
                  onClick={copyAllCredentials}
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
                  onClick={() => {
                    setShowCredentialsModal(false);
                    setCreatedCredentials(null);
                    navigate("/login");
                  }}
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
  }

  // ============================================================
  // ADMIN MODE — original full page with members table
  // ============================================================
  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          color: "white",
          backgroundColor: "#0f172a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "white" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        color: "white",
        backgroundColor: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
        }
        .modal-content {
          background: #1e293b; border-radius: 12px;
          padding: 28px; max-width: 480px; width: 100%;
          max-height: 90vh; overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .modal-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 20px;
        }
        .modal-title { font-size: 18px; font-weight: bold; margin: 0; }
        .modal-close {
          background: none; border: none; color: #9ca3af;
          font-size: 26px; cursor: pointer; padding: 0 6px;
        }
        .form-group { margin-bottom: 14px; }
        .form-label {
          display: block; font-size: 13px; font-weight: 500;
          color: #d1d5db; margin-bottom: 4px;
        }
        .form-input {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.08);
          color: white; font-size: 14px; outline: none;
          box-sizing: border-box;
        }
        .form-input:focus { border-color: #10b981; }
        .form-input:disabled { opacity: 0.6; }
        .form-input::placeholder { color: #6b7280; }
        .form-select {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.08);
          color: white; font-size: 14px; outline: none;
        }
        .form-select option { background: #1e293b; }
        .btn-primary {
          padding: 10px 24px; border-radius: 8px; border: none;
          background: #10b981; color: white; cursor: pointer;
          font-size: 14px; font-weight: 500;
        }
        .btn-primary:hover { background: #059669; }
        .btn-secondary {
          padding: 10px 24px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: white;
          cursor: pointer; font-size: 14px;
        }
        .btn-add {
          padding: 10px 20px; border-radius: 8px; border: none;
          background: rgba(16, 185, 129, 0.15); color: #34d399;
          cursor: pointer; font-size: 14px; font-weight: 500;
        }
        .btn-add:hover { background: rgba(16, 185, 129, 0.25); }
        .btn-role {
          padding: 10px 20px; border-radius: 8px; border: none;
          background: rgba(139, 92, 246, 0.15); color: #a78bfa;
          cursor: pointer; font-size: 14px;
        }
        .credential-row {
          display: flex; justify-content: space-between; align-items: center;
          gap: 8px; padding: 10px 12px; border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 8px;
        }
        .credential-label {
          font-size: 11px; color: #94a3b8; text-transform: uppercase;
          letter-spacing: 0.5px; margin-bottom: 2px;
        }
        .credential-value {
          font-size: 14px; color: white; font-weight: 600;
          font-family: monospace; word-break: break-all;
        }
        .cred-copy-btn {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.25);
          padding: 6px 12px; border-radius: 6px; cursor: pointer;
          font-size: 12px; font-weight: 500; white-space: nowrap;
        }
        .cred-copy-btn:hover { background: rgba(59, 130, 246, 0.25); }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
            👥 Members Management
          </h2>
          <p
            style={{ color: "#9ca3af", margin: "4px 0 0 0", fontSize: "14px" }}
          >
            Manage members, assign roles, view balances
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => setShowRoleModal(true)} className="btn-role">
            🔑 Assign Role
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-add">
            + Add New Member
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search by name, email, phone, or account number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            outline: "none",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              <tr>
                {[
                  "Membership",
                  "Member",
                  "Contact",
                  "Role",
                  "Status",
                  "Profile",
                  "Balance",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      color: "#9ca3af",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#60a5fa",
                        fontFamily: "monospace",
                      }}
                    >
                      {member.membership_number}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(16, 185, 129, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#34d399",
                          fontWeight: "bold",
                          overflow: "hidden",
                        }}
                      >
                        {member.passport_photo ? (
                          <img
                            src={`${API_BASE_URL}/api/uploads/passports/${member.passport_photo}`}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          (member.full_name || "U").charAt(0)
                        )}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {member.full_name}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "13px", color: "#d1d5db" }}>
                      {member.email}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {member.phone || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        fontSize: "11px",
                        borderRadius: "12px",
                        backgroundColor: getRoleColor(member.role).bg,
                        color: getRoleColor(member.role).color,
                      }}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        borderRadius: "20px",
                        backgroundColor: getStatusColor(member.status).bg,
                        color: getStatusColor(member.status).color,
                      }}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {member.profile_completed ? (
                      <span style={{ color: "#34d399", fontSize: "12px" }}>
                        ✅ Complete
                      </span>
                    ) : (
                      <span style={{ color: "#fbbf24", fontSize: "12px" }}>
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#34d399",
                    }}
                  >
                    ₦{parseFloat(member.balance || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleEditMember(member)}
                        style={{
                          color: "#34d399",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        style={{
                          color: "#f87171",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}
          >
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📭</div>
            <p>No members found</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">➕ Add New Member</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setNewMember({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                  });
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p style={{ margin: 0, fontSize: "13px", color: "#93c5fd" }}>
                💡 Only basic info here. The member will complete their profile
                (phone, address, next of kin, passport, savings plan) after
                logging in.
              </p>
            </div>

            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMember.firstName}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      firstName: capitalizeWords(e.target.value),
                    })
                  }
                  required
                  placeholder="First name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMember.lastName}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      lastName: capitalizeWords(e.target.value),
                    })
                  }
                  required
                  placeholder="Last name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  value={newMember.password}
                  onChange={(e) =>
                    setNewMember({ ...newMember, password: e.target.value })
                  }
                  required
                  minLength="6"
                  placeholder="Min 6 characters"
                />
              </div>

              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "12px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", color: "#34d399" }}>
                  📧 Auto email:{" "}
                  <strong style={{ color: "white" }}>
                    {newMember.email || "—"}
                  </strong>
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Create Member
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewMember({
                      firstName: "",
                      lastName: "",
                      email: "",
                      password: "",
                    });
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && createdCredentials && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🎉 Member Created!</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCreatedCredentials(null);
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "#6ee7b7",
                  lineHeight: 1.5,
                }}
              >
                ⚠️ <strong>Share these credentials</strong> with{" "}
                <strong>{createdCredentials.name}</strong>. They'll need them to
                log in and complete their profile.
              </p>
            </div>

            <div className="credential-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="credential-label">📧 Email</div>
                <div className="credential-value">
                  {createdCredentials.email}
                </div>
              </div>
              <button
                className="cred-copy-btn"
                onClick={() =>
                  copyToClipboard(createdCredentials.email, "Email")
                }
              >
                Copy
              </button>
            </div>

            <div className="credential-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="credential-label">🔑 Password</div>
                <div className="credential-value">
                  {createdCredentials.password}
                </div>
              </div>
              <button
                className="cred-copy-btn"
                onClick={() =>
                  copyToClipboard(createdCredentials.password, "Password")
                }
              >
                Copy
              </button>
            </div>

            <div className="credential-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="credential-label">💳 Account Number</div>
                <div className="credential-value">
                  {createdCredentials.accountNumber}
                </div>
              </div>
              <button
                className="cred-copy-btn"
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

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-primary"
                style={{
                  flex: 1,
                  background: "linear-gradient(to right, #7c3aed, #6d28d9)",
                }}
                onClick={copyAllCredentials}
              >
                📋 Copy All
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCreatedCredentials(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Member</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMember(null);
                  setEditPassword("");
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateMember}>
              <div className="form-group">
                <label className="form-label">Membership Number</label>
                <input
                  className="form-input"
                  value={selectedMember.membership_number || "N/A"}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={selectedMember.full_name || ""}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={selectedMember.email || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={selectedMember.phone || ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setSelectedMember({ ...selectedMember, phone: v });
                  }}
                  maxLength="11"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={selectedMember.role}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="member">👤 Member</option>
                  <option value="manager">📊 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">New Password (optional)</label>
                <input
                  type="password"
                  className="form-input"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength="6"
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Balance (₦)</label>
                <input
                  type="number"
                  className="form-input"
                  value={selectedMember.balance || 0}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={selectedMember.status}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                    setEditPassword("");
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🔑 Assign Role</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRoleModal(false);
                  setRoleAssignment({ memberId: "", role: "member" });
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAssignRole();
              }}
            >
              <div className="form-group">
                <label className="form-label">Select Member *</label>
                <select
                  className="form-select"
                  required
                  value={roleAssignment.memberId}
                  onChange={(e) =>
                    setRoleAssignment({
                      ...roleAssignment,
                      memberId: e.target.value,
                    })
                  }
                >
                  <option value="">Choose a member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.membership_number}) — {m.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Role *</label>
                <select
                  className="form-select"
                  required
                  value={roleAssignment.role}
                  onChange={(e) =>
                    setRoleAssignment({
                      ...roleAssignment,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="member">👤 Member</option>
                  <option value="manager">📊 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, background: "#8b5cf6" }}
                >
                  Assign Role
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowRoleModal(false);
                    setRoleAssignment({ memberId: "", role: "member" });
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMembers;
