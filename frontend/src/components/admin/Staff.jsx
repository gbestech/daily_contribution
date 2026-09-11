// src/components/admin/Staff.jsx
import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const ROLES = [
  {
    value: "admin",
    label: "Admin",
    icon: "👑",
    bg: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    description: "Full access — manage members, roles, and settings",
  },
  {
    value: "manager",
    label: "Manager",
    icon: "📊",
    bg: "rgba(59, 130, 246, 0.15)",
    color: "#60a5fa",
    description: "Manage members and transactions",
  },
  {
    value: "member",
    label: "Member",
    icon: "👤",
    bg: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    description: "Regular member access",
  },
];

const getRoleMeta = (role) =>
  ROLES.find((r) => r.value === (role || "").toLowerCase()) || ROLES[2];

const Staff = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setCurrentUser(JSON.parse(stored));
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/members.php`);
      const data = await res.json();
      if (data.members) {
        const mapped = data.members.map((m) => ({
          id: m.id,
          name: m.name || m.full_name,
          email: m.email,
          phone: m.phone || "",
          accountNumber: m.accountNumber || m.account_number || `MEM-${m.id}`,
          balance: m.balance || 0,
          status: m.status?.toLowerCase() || "active",
          role: (m.role || "member").toLowerCase(),
          passport_photo: m.passport_photo || null,
        }));
        // Sort: admins first, then managers, then members
        mapped.sort((a, b) => {
          const order = { admin: 0, manager: 1, member: 2 };
          return (order[a.role] ?? 3) - (order[b.role] ?? 3);
        });
        setMembers(mapped);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (member, newRole) => {
    if (member.role === newRole) return;

    // Prevent demoting yourself by accident
    if (currentUser && Number(member.id) === Number(currentUser.id)) {
      if (
        member.role === "admin" &&
        newRole !== "admin" &&
        !window.confirm(
          "⚠️ You are about to remove your own admin access. Continue?",
        )
      ) {
        return;
      }
    }

    const meta = getRoleMeta(newRole);
    if (!window.confirm(`Change ${member.name}'s role to ${meta.label}?`)) {
      return;
    }

    setUpdatingId(member.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/members.php/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: member.name,
          email: member.email,
          phone: member.phone || "",
          status: member.status,
          balance: member.balance || 0,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
        );
        toast.success(`✅ ${member.name} is now a ${meta.label}`);

        // If the admin changed their own role, refresh localStorage
        if (currentUser && Number(member.id) === Number(currentUser.id)) {
          const updated = { ...currentUser, role: newRole };
          localStorage.setItem("user", JSON.stringify(updated));
          setCurrentUser(updated);
        }
      } else {
        toast.error(data.message || data.error || "Failed to update role");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    let list = [...members];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name?.toLowerCase().includes(term) ||
          m.email?.toLowerCase().includes(term) ||
          m.accountNumber?.includes(term),
      );
    }
    if (filterRole !== "all") {
      list = list.filter((m) => m.role === filterRole);
    }
    return list;
  }, [members, searchTerm, filterRole]);

  const counts = useMemo(() => {
    return {
      admin: members.filter((m) => m.role === "admin").length,
      manager: members.filter((m) => m.role === "manager").length,
      member: members.filter((m) => m.role === "member").length,
      total: members.length,
    };
  }, [members]);

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "white",
          backgroundColor: "#0f172a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ⏳ Loading staff...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#0f172a",
        minHeight: "100vh",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        .staff-header {
          display: flex; justify-content: space-between;
          align-items: flex-start; flex-wrap: wrap;
          gap: 16px; margin-bottom: 24px;
        }
        .staff-header h2 {
          font-size: 24px; font-weight: 700; margin: 0;
        }
        .staff-header p {
          color: #9ca3af; margin: 4px 0 0 0; font-size: 14px;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 14px; margin-bottom: 20px;
        }
        .stat-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 16px;
          display: flex; flex-direction: column; gap: 6px;
          transition: all 0.2s;
        }
        .stat-card:hover {
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .stat-label {
          font-size: 12px; color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px; font-weight: 600;
        }
        .stat-value {
          font-size: 22px; font-weight: 700;
        }
        .filter-bar {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .filter-input, .filter-select {
          background: rgba(255,255,255,0.08);
          color: white;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          outline: none;
          font-size: 14px;
        }
        .filter-input {
          flex: 1; min-width: 220px;
        }
        .filter-input:focus,
        .filter-select:focus {
          border-color: #10b981;
        }
        .filter-select option {
          background: #1e293b; color: white;
        }
        .table-wrap {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          overflow: auto;
        }
        table {
          width: 100%; border-collapse: collapse;
        }
        th {
          position: sticky; top: 0; z-index: 2;
          background: #1e293b;
          color: #cbd5e1;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          text-align: left;
          white-space: nowrap;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        td {
          padding: 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          color: #e5e7eb; font-size: 13px;
          vertical-align: middle;
        }
        tr:hover td {
          background: rgba(255,255,255,0.03);
        }
        .member-cell {
          display: flex; align-items: center; gap: 10px;
        }
        .avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          display: flex; align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
          overflow: hidden;
        }
        .avatar img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .role-select {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          min-width: 130px;
        }
        .role-select:focus {
          border-color: #10b981;
        }
        .role-select option {
          background: #1e293b; color: white;
        }
        .role-select:disabled {
          opacity: 0.5; cursor: not-allowed;
        }
        .badge {
          display: inline-flex;
          align-items: center; gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .empty {
          text-align: center;
          padding: 50px 20px !important;
          color: #94a3b8;
        }
        .empty-icon { font-size: 48px; margin-bottom: 8px; }
      `}</style>

      {/* Header */}
      <div className="staff-header">
        <div>
          <h2>🛡️ Staff & Roles</h2>
          <p>Promote or demote members — Admin, Manager, or Member</p>
        </div>
        <button
          onClick={fetchMembers}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            background: "rgba(59, 130, 246, 0.15)",
            color: "#60a5fa",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">👑 Admins</span>
          <span className="stat-value" style={{ color: "#f87171" }}>
            {counts.admin}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">📊 Managers</span>
          <span className="stat-value" style={{ color: "#60a5fa" }}>
            {counts.manager}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">👤 Members</span>
          <span className="stat-value" style={{ color: "#34d399" }}>
            {counts.member}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">📄 Total</span>
          <span className="stat-value" style={{ color: "white" }}>
            {counts.total}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="🔍 Search by name, email, or account number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">🎭 All Roles</option>
          <option value="admin">👑 Admins</option>
          <option value="manager">📊 Managers</option>
          <option value="member">👤 Members</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Contact</th>
              <th>Account</th>
              <th>Status</th>
              <th>Current Role</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty">
                  <div className="empty-icon">📭</div>
                  <p>No staff found</p>
                </td>
              </tr>
            ) : (
              filtered.map((member) => {
                const meta = getRoleMeta(member.role);
                const isSelf =
                  currentUser && Number(member.id) === Number(currentUser.id);
                return (
                  <tr key={member.id}>
                    <td>
                      <div className="member-cell">
                        <div className="avatar">
                          {member.passport_photo ? (
                            <img
                              src={`${API_BASE_URL}/api/uploads/passports/${member.passport_photo}`}
                              alt=""
                            />
                          ) : (
                            (member.name || "U").charAt(0)
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              color: "white",
                              fontWeight: 500,
                              fontSize: "14px",
                            }}
                          >
                            {member.name}
                            {isSelf && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  fontSize: "10px",
                                  color: "#34d399",
                                  background: "rgba(16,185,129,0.15)",
                                  padding: "2px 6px",
                                  borderRadius: "10px",
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: "#d1d5db", fontSize: "13px" }}>
                        {member.email}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                        {member.phone || "—"}
                      </div>
                    </td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        color: "#60a5fa",
                        fontSize: "13px",
                      }}
                    >
                      {member.accountNumber}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "4px 12px",
                          fontSize: "12px",
                          borderRadius: "20px",
                          backgroundColor:
                            member.status === "active"
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(239, 68, 68, 0.2)",
                          color:
                            member.status === "active" ? "#34d399" : "#f87171",
                        }}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: meta.bg,
                          color: meta.color,
                        }}
                      >
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td>
                      <select
                        className="role-select"
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member, e.target.value)
                        }
                        disabled={updatingId === member.id}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.icon} {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
        }}
      >
        <p
          style={{
            margin: "0 0 10px 0",
            fontSize: "12px",
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: 600,
          }}
        >
          Role Permissions
        </p>
        {ROLES.map((r) => (
          <div
            key={r.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 0",
              fontSize: "13px",
            }}
          >
            <span
              className="badge"
              style={{ background: r.bg, color: r.color }}
            >
              {r.icon} {r.label}
            </span>
            <span style={{ color: "#94a3b8" }}>{r.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Staff;
