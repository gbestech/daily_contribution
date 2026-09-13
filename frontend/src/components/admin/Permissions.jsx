// src/components/admin/Permissions.jsx
import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionsContext";

const API_BASE_URL = "http://localhost:8000";

const OPERATIONS = [
  {
    group: "Dashboard",
    items: [
      { key: "view_dashboard", label: "View Dashboard", icon: "📊" },
      { key: "view_broadsheet", label: "View Broadsheet", icon: "📑" },
      { key: "view_reports", label: "View Reports", icon: "📈" },
    ],
  },
  {
    group: "Transactions",
    items: [
      { key: "view_transactions", label: "View Transactions", icon: "💳" },
      {
        key: "approve_transactions",
        label: "Approve Transactions",
        icon: "✅",
      },
      { key: "reject_transactions", label: "Reject Transactions", icon: "❌" },
      { key: "create_deposit", label: "Create Deposit", icon: "💰" },
      { key: "create_withdrawal", label: "Create Withdrawal", icon: "💸" },
      { key: "create_transfer", label: "Create Transfer", icon: "🔄" },
      { key: "view_history", label: "View History", icon: "📜" },
    ],
  },
  {
    group: "Expenses",
    items: [
      { key: "view_expenses", label: "View Expenses", icon: "👁️" },
      { key: "manage_expenses", label: "Record / Edit Expenses", icon: "💸" },
      {
        key: "approve_expenses",
        label: "Approve / Reject Expenses",
        icon: "✅",
      },
      { key: "delete_expenses", label: "Delete Expenses", icon: "🗑️" },
    ],
  },
  {
    group: "Members",
    items: [
      { key: "create_member", label: "Create Member", icon: "➕" },
      { key: "edit_member", label: "Edit Member", icon: "✏️" },
      { key: "delete_member", label: "Delete Member", icon: "🗑️" },
      { key: "assign_role", label: "Assign Role", icon: "🔑" },
    ],
  },
  {
    group: "Staff & System",
    items: [
      { key: "manage_staff", label: "Manage Staff", icon: "🛡️" },
      { key: "manage_permissions", label: "Manage Permissions", icon: "🔒" },
      { key: "manage_settings", label: "Manage Settings", icon: "⚙️" },
    ],
  },
];

const ROLES = [
  { value: "admin", label: "Admin", icon: "👑", color: "#f87171" },
  { value: "manager", label: "Manager", icon: "📊", color: "#60a5fa" },
  { value: "member", label: "Member", icon: "👤", color: "#34d399" },
];

const ALL_KEYS = OPERATIONS.flatMap((g) => g.items.map((i) => i.key));

const Permissions = () => {
  // ✅ Safe destructure — won't crash if context is missing refreshPermissions
  const permCtx = usePermission() || {};
  const refreshPermissions = permCtx.refreshPermissions;

  const [permissions, setPermissions] = useState({
    admin: [],
    manager: [],
    member: [],
  });
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
  const [activeRole, setActiveRole] = useState("manager");

  useEffect(() => {
    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions.php`);
      const data = await res.json();

      if (data.status && data.permissions) {
        const normalized = {
          admin: data.permissions.admin || [],
          manager: data.permissions.manager || [],
          member: data.permissions.member || [],
        };
        setPermissions(normalized);
        setOriginal(JSON.parse(JSON.stringify(normalized)));
      } else {
        throw new Error(data.error || "Failed to load");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const isDirty = (role) => {
    if (!original) return false;
    const a = [...(permissions[role] || [])].sort().join("|");
    const b = [...(original[role] || [])].sort().join("|");
    return a !== b;
  };

  const toggleOperation = (role, key) => {
    setPermissions((prev) => {
      const current = new Set(prev[role] || []);
      if (current.has(key)) current.delete(key);
      else current.add(key);
      return { ...prev, [role]: Array.from(current) };
    });
  };

  const toggleGroup = (role, group, on) => {
    const keys = group.items.map((i) => i.key);
    setPermissions((prev) => {
      const current = new Set(prev[role] || []);
      keys.forEach((k) => (on ? current.add(k) : current.delete(k)));
      return { ...prev, [role]: Array.from(current) };
    });
  };

  const toggleAll = (role, on) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: on ? [...ALL_KEYS] : [],
    }));
  };

  const saveRole = async (role) => {
    setSavingRole(role);
    try {
      const payload = {
        role,
        operations: permissions[role] || [],
      };

      console.log("Saving role:", role, "payload:", payload);

      const res = await fetch(`${API_BASE_URL}/api/permissions.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      console.log("Response status:", res.status, "body:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned non-JSON: ${text.slice(0, 200)}`);
      }

      if (res.ok && data.status) {
        setOriginal((prev) => ({
          ...prev,
          [role]: [...(permissions[role] || [])],
        }));

        // ✅ Only call refresh if it actually exists
        if (typeof refreshPermissions === "function") {
          try {
            await refreshPermissions();
          } catch (e) {
            console.warn("refreshPermissions failed (non-fatal):", e);
          }
        } else {
          console.warn(
            "refreshPermissions not available — skipping refresh (save still succeeded)",
          );
        }

        toast.success(`✅ ${role} permissions saved`);
      } else {
        toast.error(data.error || `Save failed (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(`Save error: ${err.message || "Unknown"}`);
    } finally {
      setSavingRole(null);
    }
  };

  const resetRole = (role) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: [...(original[role] || [])],
    }));
    toast("↩️ Reverted (not saved)", { icon: "ℹ️" });
  };

  const rolePermissions = permissions[activeRole] || [];
  const roleSet = useMemo(() => new Set(rolePermissions), [rolePermissions]);

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
        ⏳ Loading permissions...
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
        .perm-header {
          display: flex; justify-content: space-between;
          align-items: flex-start; flex-wrap: wrap;
          gap: 16px; margin-bottom: 24px;
        }
        .perm-header h2 { font-size: 24px; font-weight: 700; margin: 0; }
        .perm-header p { color: #9ca3af; margin: 4px 0 0 0; font-size: 14px; }
        .role-tabs {
          display: flex; gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 6px;
          margin-bottom: 20px; flex-wrap: wrap;
        }
        .role-tab {
          flex: 1; min-width: 130px; padding: 12px;
          border: none; border-radius: 8px;
          background: transparent; color: #94a3b8;
          cursor: pointer; font-size: 14px; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s;
        }
        .role-tab:hover { background: rgba(255,255,255,0.05); }
        .role-tab.active {
          background: rgba(16, 185, 129, 0.2); color: white;
        }
        .role-tab .count {
          background: rgba(255,255,255,0.1);
          padding: 2px 8px; border-radius: 10px; font-size: 11px;
        }
        .role-tab.dirty::after {
          content: ""; width: 8px; height: 8px;
          background: #fbbf24; border-radius: 50%; margin-left: 6px;
        }
        .perm-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 20px; margin-bottom: 16px;
        }
        .perm-card-header {
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap;
          gap: 12px; margin-bottom: 14px;
        }
        .perm-group-title {
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.6px;
          color: #34d399;
        }
        .perm-bulk-btns { display: flex; gap: 6px; }
        .perm-bulk {
          padding: 4px 12px; border-radius: 6px;
          font-size: 11px; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.12);
          background: transparent; color: #94a3b8;
          cursor: pointer; transition: all 0.2s;
        }
        .perm-bulk:hover {
          background: rgba(255,255,255,0.08); color: white;
        }
        .perm-items {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 8px;
        }
        .perm-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer; transition: all 0.15s; user-select: none;
        }
        .perm-item:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
        }
        .perm-item.checked {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.35);
        }
        .perm-item input {
          accent-color: #10b981; width: 16px; height: 16px;
          cursor: pointer; flex-shrink: 0;
        }
        .perm-item-label {
          font-size: 13px; color: #cbd5e1;
          display: flex; align-items: center; gap: 8px;
          flex: 1; min-width: 0;
        }
        .perm-item.checked .perm-item-label { color: white; font-weight: 500; }
        .perm-icon { font-size: 15px; }
        .save-bar {
          position: sticky; bottom: 0;
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 16px 20px;
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 12px;
          margin-top: 20px;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.3);
        }
        .save-bar-text { font-size: 13px; color: #94a3b8; }
        .save-bar-text strong { color: white; }
        .save-btns { display: flex; gap: 10px; }
        .btn {
          padding: 10px 20px; border-radius: 8px; border: none;
          font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #059669, #0d9488);
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px -8px rgba(5, 150, 105, 0.6);
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary {
          background: transparent; color: #cbd5e1;
          border: 1px solid rgba(255,255,255,0.12);
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.06); }
        .empty { text-align: center; padding: 40px 20px; color: #94a3b8; }
      `}</style>

      <div className="perm-header">
        <div>
          <h2>🔒 Role Permissions</h2>
          <p>
            Decide what each role (Admin, Manager, Member) can do in the app
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchPermissions}
          disabled={savingRole !== null}
        >
          🔄 Reload
        </button>
      </div>

      <div className="role-tabs">
        {ROLES.map((r) => {
          const rolePerm = permissions[r.value] || [];
          const dirty = isDirty(r.value);
          return (
            <button
              key={r.value}
              className={`role-tab ${activeRole === r.value ? "active" : ""} ${
                dirty ? "dirty" : ""
              }`}
              onClick={() => setActiveRole(r.value)}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
              <span className="count">
                {rolePerm.length}/{ALL_KEYS.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="perm-card">
        <div className="perm-card-header">
          <div className="perm-group-title">
            Bulk actions — {ROLES.find((r) => r.value === activeRole)?.label}
          </div>
          <div className="perm-bulk-btns">
            <button
              className="perm-bulk"
              onClick={() => toggleAll(activeRole, true)}
            >
              ✅ Select All
            </button>
            <button
              className="perm-bulk"
              onClick={() => toggleAll(activeRole, false)}
            >
              ⛔ Deselect All
            </button>
            {isDirty(activeRole) && (
              <button
                className="perm-bulk"
                onClick={() => resetRole(activeRole)}
              >
                ↩️ Revert
              </button>
            )}
          </div>
        </div>

        {OPERATIONS.map((group) => {
          const groupKeys = group.items.map((i) => i.key);
          const allChecked = groupKeys.every((k) => roleSet.has(k));
          const someChecked =
            !allChecked && groupKeys.some((k) => roleSet.has(k));

          return (
            <div key={group.group} style={{ marginBottom: "18px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div className="perm-group-title">{group.group}</div>
                <button
                  className="perm-bulk"
                  onClick={() => toggleGroup(activeRole, group, !allChecked)}
                >
                  {allChecked
                    ? "⛔ Clear"
                    : someChecked
                      ? "➕ Add rest"
                      : "✅ Select all"}
                </button>
              </div>

              <div className="perm-items">
                {group.items.map((op) => {
                  const checked = roleSet.has(op.key);
                  return (
                    <label
                      key={op.key}
                      className={`perm-item ${checked ? "checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOperation(activeRole, op.key)}
                      />
                      <span className="perm-item-label">
                        <span className="perm-icon">{op.icon}</span>
                        {op.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="save-bar">
        <div className="save-bar-text">
          {isDirty(activeRole) ? (
            <>
              <strong>Unsaved changes</strong> on{" "}
              {ROLES.find((r) => r.value === activeRole)?.label}
            </>
          ) : (
            <>All changes saved for this role</>
          )}
        </div>
        <div className="save-btns">
          {isDirty(activeRole) && (
            <button
              className="btn btn-secondary"
              onClick={() => resetRole(activeRole)}
            >
              ↩️ Revert
            </button>
          )}
          <button
            className="btn btn-primary"
            disabled={!isDirty(activeRole) || savingRole !== null}
            onClick={() => saveRole(activeRole)}
          >
            {savingRole === activeRole ? "⏳ Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Permissions;
