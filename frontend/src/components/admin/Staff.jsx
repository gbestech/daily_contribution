// src/components/admin/Staff.jsx
import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const ROLES = [
  {
    value: "admin",
    label: "Admin",
    icon: "👑",
    bg: "var(--rejected-bg)",
    description: "Full access — manage members, roles, and settings",
  },
  {
    value: "manager",
    label: "Manager",
    icon: "📊",
    bg: "var(--accent-bg)",
    description: "Manage members and transactions",
  },
  {
    value: "member",
    label: "Member",
    icon: "👤",
    bg: "var(--approved-bg)",
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
          color: "var(--text)",
          backgroundColor: "var(--bg-app)",
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
        backgroundColor: "var(--bg-app)",
        minHeight: "100vh",
        color: "var(--text)",
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
          color: var(--text);
        }
        .staff-header p {
          color: var(--text-muted); margin: 4px 0 0 0; font-size: 14px;
        }

        /* ===== STAT CARDS — no background, no border ===== */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px; margin-bottom: 20px;
        }
        .stat-card {
          background: transparent;
          border: none;
          padding: 4px 0;
          display: flex; flex-direction: column; gap: 6px;
        }
        .stat-label {
          font-size: 12px; color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px; font-weight: 600;
        }
        .stat-value {
          font-size: 22px; font-weight: 700;
        }

        /* ===== FILTERS — no border, keep subtle fill ===== */
        .filter-bar {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .filter-input, .filter-select {
          background: var(--bg-surface-2);
          color: var(--text);
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          outline: none;
          font-size: 14px;
          transition: box-shadow 0.2s;
        }
        .filter-input { flex: 1; min-width: 220px; }
        .filter-input::placeholder { color: var(--text-dim); }
        .filter-input:focus, .filter-select:focus {
          box-shadow: 0 0 0 2px var(--accent-bg);
        }
        .filter-select option {
          background: var(--bg-surface); color: var(--text);
        }

        /* ===== TABLE — no borders, no background ===== */
        .table-wrap {
          background: transparent;
          border: none;
          border-radius: 0;
          overflow: auto;
        }
        table { width: 100%; border-collapse: collapse; background: transparent; }
        thead { background: transparent; }
        th {
          background: transparent;
          color: var(--text-muted);
          font-size: 11px; font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          text-align: left;
          white-space: nowrap;
          border: none;
        }
        td {
          padding: 12px 16px;
          border: none;
          color: var(--text); font-size: 13px;
          vertical-align: middle;
          background: transparent;
        }
        tbody tr {
          border: none;
          background: transparent;
          transition: background-color 0.15s ease;
        }
        tbody tr:hover td {
          background: var(--bg-surface-2);
        }

        .member-cell {
          display: flex; align-items: center; gap: 10px;
        }
        .avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: var(--approved-bg);
          color: var(--badge-text);
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
          border: none;
          background: var(--bg-surface-2);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          min-width: 130px;
          transition: box-shadow 0.2s;
        }
        .role-select:focus {
          box-shadow: 0 0 0 2px var(--accent-bg);
        }
        .role-select option {
          background: var(--bg-surface); color: var(--text);
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
          color: var(--badge-text);
        }

        .empty {
          text-align: center;
          padding: 50px 20px !important;
          color: var(--text-muted);
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
            border: "none",
            background: "var(--accent-bg)",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats — no cards */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">👑 Admins</span>
          <span className="stat-value" style={{ color: "var(--debit)" }}>
            {counts.admin}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">📊 Managers</span>
          <span className="stat-value" style={{ color: "var(--info)" }}>
            {counts.manager}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">👤 Members</span>
          <span className="stat-value" style={{ color: "var(--credit)" }}>
            {counts.member}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">📄 Total</span>
          <span className="stat-value" style={{ color: "var(--text)" }}>
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

      {/* Table — no background, no borders */}
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
                              color: "var(--text)",
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
                                  color: "var(--badge-text)",
                                  background: "var(--accent-bg)",
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
                      <div style={{ color: "var(--text)", fontSize: "13px" }}>
                        {member.email}
                      </div>
                      <div
                        style={{ color: "var(--text-muted)", fontSize: "12px" }}
                      >
                        {member.phone || "—"}
                      </div>
                    </td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        color: "var(--info)",
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
                              ? "var(--approved-bg)"
                              : "var(--rejected-bg)",
                          color: "var(--badge-text)",
                          fontWeight: "600",
                        }}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: meta.bg }}>
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

      {/* Legend — no background, no border */}
      <div style={{ marginTop: "24px" }}>
        <p
          style={{
            margin: "0 0 10px 0",
            fontSize: "12px",
            color: "var(--text-muted)",
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
            <span className="badge" style={{ background: r.bg }}>
              {r.icon} {r.label}
            </span>
            <span style={{ color: "var(--text-muted)" }}>{r.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Staff;
