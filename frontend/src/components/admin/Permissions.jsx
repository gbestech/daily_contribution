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
  { value: "admin", label: "Admin", icon: "👑" },
  { value: "manager", label: "Manager", icon: "📊" },
  { value: "member", label: "Member", icon: "👤" },
];

const ALL_KEYS = OPERATIONS.flatMap((g) => g.items.map((i) => i.key));

const Permissions = () => {
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

      const res = await fetch(`${API_BASE_URL}/api/permissions.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
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

        if (typeof refreshPermissions === "function") {
          try {
            await refreshPermissions();
          } catch (e) {
            console.warn("refreshPermissions failed (non-fatal):", e);
          }
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
      <div className="perm-page">
        <div className="perm-loading">⏳ Loading permissions…</div>
      </div>
    );
  }

  return (
    <div className="perm-page">
      <style>{css}</style>

      {/* Header */}
      <div className="perm-header">
        <div>
          <h2>🔒 Role Permissions</h2>
          <p>
            Decide what each role (Admin, Manager, Member) can do in the app
          </p>
        </div>
        <button
          className="perm-btn perm-btn-blue"
          onClick={fetchPermissions}
          disabled={savingRole !== null}
        >
          🔄 Reload
        </button>
      </div>

      {/* Role tabs */}
      <div className="role-tabs" role="tablist" aria-label="Roles">
        {ROLES.map((r) => {
          const rolePerm = permissions[r.value] || [];
          const dirty = isDirty(r.value);
          const active = activeRole === r.value;
          return (
            <button
              key={r.value}
              role="tab"
              aria-selected={active}
              className={`role-tab ${active ? "active" : ""}`}
              onClick={() => setActiveRole(r.value)}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
              <span className="count">
                {rolePerm.length}/{ALL_KEYS.length}
              </span>
              {dirty && <span className="dirty-dot" title="Unsaved changes" />}
            </button>
          );
        })}
      </div>

      {/* Bulk actions */}
      <div className="perm-toolbar">
        <div className="perm-toolbar-label">
          Bulk actions —{" "}
          <strong>{ROLES.find((r) => r.value === activeRole)?.label}</strong>
        </div>
        <div className="perm-bulk-btns">
          <button
            className="perm-bulk perm-bulk-green"
            onClick={() => toggleAll(activeRole, true)}
          >
            ✅ Select all
          </button>
          <button
            className="perm-bulk perm-bulk-red"
            onClick={() => toggleAll(activeRole, false)}
          >
            ⛔ Deselect all
          </button>
          {isDirty(activeRole) && (
            <button
              className="perm-bulk perm-bulk-ghost"
              onClick={() => resetRole(activeRole)}
            >
              ↩️ Revert
            </button>
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="perm-body">
        {OPERATIONS.map((group) => {
          const groupKeys = group.items.map((i) => i.key);
          const allChecked = groupKeys.every((k) => roleSet.has(k));
          const someChecked =
            !allChecked && groupKeys.some((k) => roleSet.has(k));

          return (
            <div key={group.group} className="perm-group">
              <div className="perm-group-head">
                <div className="perm-group-title">{group.group}</div>
                <button
                  className="perm-bulk perm-bulk-ghost"
                  onClick={() => toggleGroup(activeRole, group, !allChecked)}
                >
                  {allChecked
                    ? "⛔ Clear all"
                    : someChecked
                      ? "➕ Add remaining"
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
                        <span className="perm-icon" aria-hidden="true">
                          {op.icon}
                        </span>
                        <span className="perm-text">{op.label}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save bar — no background */}
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
              className="perm-btn perm-btn-ghost"
              onClick={() => resetRole(activeRole)}
            >
              ↩️ Revert
            </button>
          )}
          <button
            className="perm-btn perm-btn-primary"
            disabled={!isDirty(activeRole) || savingRole !== null}
            onClick={() => saveRole(activeRole)}
          >
            {savingRole === activeRole ? "⏳ Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   CSS — flat style. No cards, no backgrounds, no gradients.
----------------------------------------------------------------- */
const css = `
  .perm-page {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    color: var(--text, #0f172a);
    font-family: system-ui, -apple-system, sans-serif;
  }

  .perm-loading {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted, #64748b);
    font-size: 14px;
  }

  /* ---------- Header ---------- */
  .perm-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }
  .perm-header h2 {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    color: var(--text, #0f172a);
  }
  .perm-header p {
    color: var(--text-muted, #64748b);
    margin: 4px 0 0 0;
    font-size: 14px;
  }

  /* ---------- Role tabs ---------- */
  .role-tabs {
    display: flex;
    gap: 24px;
    margin-bottom: 24px;
    padding-bottom: 0;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }
  .role-tab {
    padding: 10px 2px 12px;
    border: none;
    background: transparent;
    color: var(--text-muted, #64748b);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
    outline: none;
  }
  .role-tab:hover { color: var(--text, #0f172a); }
  .role-tab.active {
    color: var(--text, #0f172a);
    border-bottom-color: var(--accent, #10b981);
  }
  .role-tab:focus,
  .role-tab:focus-visible { outline: none; }
  .role-tab .count {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted, #64748b);
  }
  .role-tab.active .count { color: var(--accent, #10b981); }
  .dirty-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--warning, #f59e0b);
  }

  /* ---------- Toolbar ---------- */
  .perm-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding-bottom: 14px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }
  .perm-toolbar-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted, #64748b);
  }
  .perm-toolbar-label strong { color: var(--text, #0f172a); }
  .perm-bulk-btns { display: flex; gap: 6px; flex-wrap: wrap; }

  .perm-bulk {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    border: 1px solid var(--border, #e2e8f0);
    background: transparent;
    color: var(--text-muted, #64748b);
    cursor: pointer;
    transition: all 0.15s;
    outline: none;
  }
  .perm-bulk:focus,
  .perm-bulk:focus-visible { outline: none; }
  .perm-bulk-ghost:hover {
    color: var(--text, #0f172a);
    border-color: var(--text-muted, #64748b);
  }
  .perm-bulk-green { color: var(--credit, #10b981); border-color: rgba(16,185,129,0.3); }
  .perm-bulk-green:hover { background: rgba(16,185,129,0.08); }
  .perm-bulk-red { color: var(--debit, #ef4444); border-color: rgba(239,68,68,0.3); }
  .perm-bulk-red:hover { background: rgba(239,68,68,0.08); }

  /* ---------- Groups ---------- */
  .perm-body { padding-top: 8px; }

  .perm-group {
    padding: 20px 0 8px;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }
  .perm-group:last-child { border-bottom: none; }

  .perm-group-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    gap: 12px;
    flex-wrap: wrap;
  }

  .perm-group-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-muted, #64748b);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .perm-group-title::before {
    content: "";
    width: 3px; height: 14px;
    border-radius: 2px;
    background: var(--accent, #10b981);
  }

  /* ---------- Permission items ---------- */
  .perm-items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 4px 20px;
  }

  .perm-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 4px;
    background: transparent;
    border: none;
    cursor: pointer;
    user-select: none;
    transition: color 0.15s;
  }
  .perm-item:hover .perm-item-label {
    color: var(--accent, #10b981);
  }
  .perm-item input {
    accent-color: var(--accent, #10b981);
    width: 15px; height: 15px;
    cursor: pointer;
    flex-shrink: 0;
    outline: none;
  }
  .perm-item input:focus,
  .perm-item input:focus-visible { outline: none; box-shadow: none; }

  .perm-item-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text, #0f172a);
    flex: 1;
    min-width: 0;
    transition: color 0.15s;
  }
  .perm-item.checked .perm-item-label {
    color: var(--text, #0f172a);
    font-weight: 500;
  }
  .perm-icon { font-size: 14px; }
  .perm-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ---------- Save bar — NO background ---------- */
  .save-bar {
    position: sticky;
    bottom: 0;
    background: transparent;
    border-top: 1px solid var(--border, #e2e8f0);
    padding: 14px 0;
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    z-index: 10;
  }
  .save-bar-text {
    font-size: 13px;
    color: var(--text-muted, #64748b);
  }
  .save-bar-text strong { color: var(--text, #0f172a); }
  .save-btns { display: flex; gap: 8px; }

  /* ---------- Buttons ---------- */
  .perm-btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    background: transparent;
    transition: all 0.15s;
    outline: none;
  }
  .perm-btn:focus,
  .perm-btn:focus-visible { outline: none; }
  .perm-btn-primary {
    color: var(--accent, #059669);
    border-color: color-mix(in srgb, var(--accent, #059669) 40%, transparent);
  }
  .perm-btn-primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent, #059669) 10%, transparent);
  }
  .perm-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .perm-btn-blue { color: var(--info, #3b82f6); border-color: rgba(59,130,246,0.25); }
  .perm-btn-blue:hover:not(:disabled) { background: rgba(59,130,246,0.08); }
  .perm-btn-blue:disabled { opacity: 0.45; cursor: not-allowed; }
  .perm-btn-ghost {
    color: var(--text-muted, #64748b);
    border-color: var(--border, #e2e8f0);
  }
  .perm-btn-ghost:hover { background: var(--bg-surface-2, rgba(0,0,0,0.03)); }

  /* ---------- Responsive ---------- */
  @media (max-width: 640px) {
    .perm-page { padding: 16px; }
    .perm-items { grid-template-columns: 1fr; }
    .role-tabs { gap: 16px; }
    .save-bar { padding: 12px 0; }
  }
`;

export default Permissions;
