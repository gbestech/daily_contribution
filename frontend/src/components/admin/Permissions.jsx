// src/components/admin/Permissions.jsx
import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { usePermission } from "../../context/PermissionsContext";
import { useBranch } from "../../context/BranchContext";

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
      {
        key: "suspend_member",
        label: "Suspend / Reactivate Member",
        icon: "🚫",
      },
    ],
  },
  {
    group: "Branches",
    items: [
      { key: "view_branches", label: "View Branches", icon: "👁️" },
      { key: "create_branch", label: "Create Branch", icon: "➕" },
      { key: "edit_branch", label: "Edit Branch", icon: "✏️" },
      { key: "delete_branch", label: "Delete Branch", icon: "🗑️" },
      {
        key: "toggle_branch_status",
        label: "Activate / Deactivate Branch",
        icon: "🔀",
      },
      {
        key: "copy_registration_link",
        label: "Copy Registration Link",
        icon: "🔗",
      },
      {
        key: "assign_branch_manager",
        label: "Assign Branch Manager",
        icon: "🧑‍💼",
      },
      { key: "switch_branch", label: "Switch Active Branch", icon: "🔄" },
      {
        key: "view_all_branches",
        label: "View All Branches (cross-branch)",
        icon: "🌐",
      },
    ],
  },
  {
    group: "Loans",
    items: [
      { key: "view_loans", label: "View Loans", icon: "👁️" },
      { key: "create_loan", label: "Create Loan", icon: "➕" },
      { key: "approve_loan", label: "Approve Loan", icon: "✅" },
      { key: "reject_loan", label: "Reject Loan", icon: "❌" },
      { key: "disburse_loan", label: "Disburse Loan", icon: "💵" },
      { key: "record_repayment", label: "Record Repayment", icon: "📥" },
      {
        key: "manage_loan_settings",
        label: "Manage Loan Settings",
        icon: "⚙️",
      },
    ],
  },
  {
    group: "Contributions",
    items: [
      { key: "view_contributions", label: "View Contributions", icon: "👁️" },
      {
        key: "manage_contributions",
        label: "Manage Contributions",
        icon: "💰",
      },
      {
        key: "manage_contribution_settings",
        label: "Manage Contribution Settings",
        icon: "⚙️",
      },
    ],
  },
  {
    group: "Commission & Payments",
    items: [
      { key: "view_commissions", label: "View Commissions", icon: "👁️" },
      { key: "manage_commissions", label: "Manage Commissions", icon: "💸" },
      {
        key: "manage_commission_settings",
        label: "Manage Commission Settings",
        icon: "⚙️",
      },
      {
        key: "manage_payment_settings",
        label: "Manage Payment Settings",
        icon: "💳",
      },
      {
        key: "manage_discount_settings",
        label: "Manage Discount Settings",
        icon: "🏷️",
      },
      { key: "process_refunds", label: "Process Refunds", icon: "↩️" },
    ],
  },
  {
    group: "Staff & System",
    items: [
      { key: "manage_staff", label: "Manage Staff", icon: "🛡️" },
      { key: "manage_permissions", label: "Manage Permissions", icon: "🔒" },
      { key: "manage_settings", label: "Manage Settings", icon: "⚙️" },
      { key: "manage_security", label: "Manage Security Settings", icon: "🔐" },
      {
        key: "manage_suspension",
        label: "Manage Suspension Settings",
        icon: "🚫",
      },
      { key: "view_audit_log", label: "View Audit Log", icon: "📋" },
    ],
  },
];

const ROLES = [
  { value: "admin", label: "Admin", icon: "👑" },
  { value: "manager", label: "Manager", icon: "📊" },
  { value: "member", label: "Member", icon: "👤" },
];

const ALL_KEYS = OPERATIONS.flatMap((g) => g.items.map((i) => i.key));

// Branch-related permission keys
const BRANCH_KEYS = [
  "view_branches",
  "create_branch",
  "edit_branch",
  "delete_branch",
  "toggle_branch_status",
  "copy_registration_link",
  "assign_branch_manager",
  "switch_branch",
  "view_all_branches",
];

// The ONLY branch permissions a Manager may hold: view + edit their branch.
const MANAGER_BRANCH_KEYS = ["view_branches", "edit_branch"];

// Branch permissions a Manager can NEVER have (the server strips these too).
const MANAGER_BLOCKED_KEYS = BRANCH_KEYS.filter(
  (k) => !MANAGER_BRANCH_KEYS.includes(k),
);

// Manager = every non-branch operation + view/edit on branches.
const MANAGER_KEYS = ALL_KEYS.filter((k) => !MANAGER_BLOCKED_KEYS.includes(k));

// Is this key not allowed for this role?
const isBlockedFor = (role, key) =>
  role === "manager" && MANAGER_BLOCKED_KEYS.includes(key);

// Remove keys a role isn't allowed to hold.
const sanitizeForRole = (role, keys) =>
  role === "manager"
    ? (keys || []).filter((k) => !MANAGER_BLOCKED_KEYS.includes(k))
    : keys || [];

// Total number of permissions a role can actually hold.
const totalFor = (role) =>
  role === "manager"
    ? ALL_KEYS.length - MANAGER_BLOCKED_KEYS.length
    : ALL_KEYS.length;

const Permissions = () => {
  const permCtx = usePermission() || {};
  const refreshPermissions = permCtx.refreshPermissions;
  const { activeBranch, activeBranchId } = useBranch();

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
  }, [activeBranchId]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const url = activeBranchId
        ? `${API_BASE_URL}/api/permissions.php?branch_id=${activeBranchId}`
        : `${API_BASE_URL}/api/permissions.php`;

      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();

      if (data.status && data.permissions) {
        const normalized = {
          admin: data.permissions.admin || [],
          manager: sanitizeForRole("manager", data.permissions.manager || []),
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
    if (isBlockedFor(role, key)) return; // not allowed for this role
    setPermissions((prev) => {
      const current = new Set(prev[role] || []);
      if (current.has(key)) current.delete(key);
      else current.add(key);
      return { ...prev, [role]: Array.from(current) };
    });
  };

  const toggleGroup = (role, group, on) => {
    const keys = group.items
      .map((i) => i.key)
      .filter((k) => !isBlockedFor(role, k));
    setPermissions((prev) => {
      const current = new Set(prev[role] || []);
      keys.forEach((k) => (on ? current.add(k) : current.delete(k)));
      return { ...prev, [role]: Array.from(current) };
    });
  };

  const toggleAll = (role, on) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: on ? sanitizeForRole(role, [...ALL_KEYS]) : [],
    }));
  };

  const applyPreset = (role, keys, on) => {
    const allowed = sanitizeForRole(role, keys);
    setPermissions((prev) => {
      const current = new Set(prev[role] || []);
      allowed.forEach((k) => (on ? current.add(k) : current.delete(k)));
      // "Remove" presets must still be able to clear blocked keys
      if (!on) keys.forEach((k) => current.delete(k));
      return { ...prev, [role]: Array.from(current) };
    });
  };

  const saveRole = async (role) => {
    setSavingRole(role);
    try {
      const operations = sanitizeForRole(role, permissions[role] || []);

      const payload = {
        role,
        branch_id: activeBranchId,
        operations,
      };

      const url = activeBranchId
        ? `${API_BASE_URL}/api/permissions.php?branch_id=${activeBranchId}`
        : `${API_BASE_URL}/api/permissions.php`;

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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
        // Use what the server actually stored (it may have filtered keys)
        const saved = Array.isArray(data.operations)
          ? data.operations
          : operations;

        setPermissions((prev) => ({ ...prev, [role]: [...saved] }));
        setOriginal((prev) => ({
          ...prev,
          [role]: [...saved],
        }));

        if (typeof refreshPermissions === "function") {
          try {
            await refreshPermissions();
          } catch (e) {
            console.warn("refreshPermissions failed (non-fatal):", e);
          }
        }

        toast.success(
          `✅ ${role} permissions saved for ${activeBranch?.name || "this branch"}`,
        );
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

      {/* Branch banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "14px 18px",
          marginBottom: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          background: "rgba(16, 185, 129, 0.06)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "26px" }}>🏢</span>
          <div>
            <div
              style={{
                color: "var(--text)",
                fontSize: "15px",
                fontWeight: "700",
              }}
            >
              {activeBranch?.name || "Branch"}
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "12px",
                marginTop: "2px",
              }}
            >
              {activeBranch?.code || "—"} · Permissions are set per branch
            </div>
          </div>
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            background: "rgba(16, 185, 129, 0.2)",
            color: "var(--credit)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
          }}
        >
          ● active branch
        </span>
      </div>

      {/* Header */}
      <div className="perm-header">
        <div>
          <h2>🔒 Role Permissions</h2>
          <p>
            Decide what each role can do in{" "}
            <strong>{activeBranch?.name || "this branch"}</strong>
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
                {rolePerm.length}/{totalFor(r.value)}
              </span>
              {dirty && <span className="dirty-dot" title="Unsaved changes" />}
            </button>
          );
        })}
      </div>

      {/* Manager rule notice */}
      {activeRole === "manager" && (
        <div className="perm-note">
          🔒 Managers can only <strong>view</strong> and <strong>edit</strong>{" "}
          their branch. Creating, deleting, activating, copying links, assigning
          managers and switching branches are admin-only, so those boxes are
          locked.
        </div>
      )}

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

      {/* Quick presets */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          margin: "16px 0 8px",
          borderRadius: 10,
          border: "1px solid var(--border, #e2e8f0)",
          background: "var(--bg-surface-2, rgba(0,0,0,0.02))",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "var(--text-muted, #64748b)",
          }}
        >
          ⚡ Presets
        </span>

        <button
          className="perm-bulk perm-bulk-green"
          onClick={() => applyPreset(activeRole, MANAGER_KEYS, true)}
          title="Grant every permission except branch admin — can only view and edit their own branch"
        >
          🛡️ Manager (view + edit branch)
        </button>

        {activeRole !== "manager" && (
          <button
            className="perm-bulk perm-bulk-green"
            onClick={() => applyPreset(activeRole, BRANCH_KEYS, true)}
            title="Grant full branch admin capabilities"
          >
            🏢 Full branch admin
          </button>
        )}

        <button
          className="perm-bulk perm-bulk-red"
          onClick={() => applyPreset(activeRole, BRANCH_KEYS, false)}
          title="Remove all branch permissions from this role"
        >
          🚫 No branch access
        </button>
      </div>

      {/* Groups */}
      <div className="perm-body">
        {OPERATIONS.map((group) => {
          const groupKeys = group.items
            .map((i) => i.key)
            .filter((k) => !isBlockedFor(activeRole, k));
          const allChecked =
            groupKeys.length > 0 && groupKeys.every((k) => roleSet.has(k));
          const someChecked =
            !allChecked && groupKeys.some((k) => roleSet.has(k));

          return (
            <div key={group.group} className="perm-group">
              <div className="perm-group-head">
                <div className="perm-group-title">{group.group}</div>
                {groupKeys.length > 0 && (
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
                )}
              </div>

              <div className="perm-items">
                {group.items.map((op) => {
                  const checked = roleSet.has(op.key);
                  const blocked = isBlockedFor(activeRole, op.key);
                  return (
                    <label
                      key={op.key}
                      className={`perm-item ${checked ? "checked" : ""} ${
                        blocked ? "disabled" : ""
                      }`}
                      title={
                        blocked
                          ? "Managers cannot have this permission (admin-only)"
                          : undefined
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked && !blocked}
                        disabled={blocked}
                        onChange={() => toggleOperation(activeRole, op.key)}
                      />
                      <span className="perm-item-label">
                        <span className="perm-icon" aria-hidden="true">
                          {op.icon}
                        </span>
                        <span className="perm-text">{op.label}</span>
                        {blocked && (
                          <span className="perm-lock" aria-hidden="true">
                            🔒
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="save-bar">
        <div className="save-bar-text">
          {isDirty(activeRole) ? (
            <>
              <strong>Unsaved changes</strong> on{" "}
              {ROLES.find((r) => r.value === activeRole)?.label} for{" "}
              {activeBranch?.name || "this branch"}
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

const css = `
  .perm-page {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: var(--bg-app, transparent);
    color: var(--text, #0f172a);
    font-family: system-ui, -apple-system, sans-serif;
  }
  .perm-loading {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted, #64748b);
    font-size: 14px;
  }
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
  .perm-note {
    margin: 0 0 16px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(245, 158, 11, 0.35);
    background: rgba(245, 158, 11, 0.07);
    color: var(--text, #0f172a);
    font-size: 13px;
    line-height: 1.5;
  }
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
  .perm-item.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .perm-item.disabled:hover .perm-item-label {
    color: var(--text, #0f172a);
  }
  .perm-item.disabled input { cursor: not-allowed; }
  .perm-lock { font-size: 11px; margin-left: auto; }
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
  @media (max-width: 640px) {
    .perm-page { padding: 16px; }
    .perm-items { grid-template-columns: 1fr; }
    .role-tabs { gap: 16px; }
    .save-bar { padding: 12px 0; }
  }
`;

export default Permissions;
