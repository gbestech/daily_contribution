// src/components/admin/Manager.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useBranch } from "../../context/BranchContext";

const API_BASE_URL = "http://localhost:8000";

const Manager = () => {
  const { activeBranch, activeBranchId } = useBranch();

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("current"); // "current" | "all"
  const [updatingId, setUpdatingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 🆕 Branch id -> name map, so we can label rows from other branches
  const [branchMap, setBranchMap] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        console.warn("[Manager] failed to parse stored user:", e);
      }
    }
  }, []);

  // ============================================================
  // 🆕 Load branches once so we can display branch names
  // ============================================================
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/branches.php`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json();
        if (cancelled) return;

        const list = Array.isArray(data?.branches) ? data.branches : [];
        const map = {};
        list.forEach((b) => {
          if (b && b.id != null) {
            map[String(b.id)] = {
              name: b.name || `Branch ${b.id}`,
              code: b.code || "",
            };
          }
        });
        setBranchMap(map);
      } catch (err) {
        console.warn("[Manager] failed to load branches:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve a branch display from a member row
  const resolveBranch = (m) => {
    const id = m.branch_id ?? m.branchId ?? null;
    const fromMap = id != null ? branchMap[String(id)] : null;
    const name =
      m.branch_name ||
      m.branchName ||
      fromMap?.name ||
      (id != null ? `Branch #${id}` : "—");
    const code = m.branch_code || m.branchCode || fromMap?.code || "";
    return { id, name, code };
  };

  // ============================================================
  // Determine which branch(es) to fetch
  // ============================================================
  const fetchManagers = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        let url;
        if (filterBranch === "all") {
          url = `${API_BASE_URL}/api/members.php?all=1`;
        } else if (activeBranchId) {
          url = `${API_BASE_URL}/api/members.php?branch_id=${activeBranchId}`;
        } else {
          url = `${API_BASE_URL}/api/members.php`;
        }

        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "X-User-Role": currentUser?.role || "",
            "X-User-Branch-Id": String(activeBranchId || ""),
          },
        });

        const text = await res.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          throw new Error(`Server returned non-JSON (HTTP ${res.status})`);
        }

        if (!res.ok) {
          throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
        }

        const list = Array.isArray(data?.members) ? data.members : [];

        // Keep only managers
        const mgrs = list.filter((m) => {
          const r = String(m.role || "")
            .trim()
            .toLowerCase();
          return (
            r === "manager" ||
            r === "branch_manager" ||
            r === "branch-manager" ||
            r === "branchmanager"
          );
        });

        const mapped = mgrs.map((m) => ({
          id: m.id,
          name: m.name || m.full_name || "Unknown",
          email: m.email || "",
          phone: m.phone || "",
          accountNumber: m.accountNumber || m.account_number || `MEM-${m.id}`,
          balance: parseFloat(m.balance) || 0,
          status: (m.status || "active").toLowerCase(),
          role: "manager",
          passport_photo: m.passport_photo || null,
          branch_id: m.branch_id ?? m.branchId ?? null,
          branch_name: m.branch_name || m.branchName || null,
          branch_code: m.branch_code || m.branchCode || null,
        }));

        setManagers(mapped);
      } catch (e) {
        console.error("[Manager] fetch error:", e);
        toast.error(e.message || "Failed to load managers");
        setManagers([]);
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [activeBranchId, filterBranch, currentUser?.role],
  );

  useEffect(() => {
    fetchManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, filterBranch]);

  const handleRefresh = async () => {
    await fetchManagers({ silent: true });
    toast.success("🔄 Managers refreshed");
  };

  // ============================================================
  // Actions
  // ============================================================
  const handleDemote = async (manager) => {
    const isSelf = currentUser && Number(manager.id) === Number(currentUser.id);

    const msg = isSelf
      ? "⚠️ You are about to remove your own manager access. Continue?"
      : `Demote ${manager.name} from Manager to Member?`;
    if (!window.confirm(msg)) return;

    setUpdatingId(manager.id);
    try {
      const targetBranchId = manager.branch_id ?? activeBranchId;
      const putUrl = targetBranchId
        ? `${API_BASE_URL}/api/members.php/${manager.id}?branch_id=${targetBranchId}`
        : `${API_BASE_URL}/api/members.php/${manager.id}`;

      const res = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manager.name,
          email: manager.email,
          phone: manager.phone || "",
          status: manager.status,
          balance: manager.balance || 0,
          role: "member",
          branch_id: targetBranchId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setManagers((prev) => prev.filter((m) => m.id !== manager.id));
        toast.success(`✅ ${manager.name} is now a Member`);

        if (isSelf) {
          const updated = { ...currentUser, role: "member" };
          localStorage.setItem("user", JSON.stringify(updated));
          setCurrentUser(updated);
        }
      } else {
        toast.error(data.message || data.error || "Failed to demote");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to demote");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSuspend = async (manager) => {
    if (!window.confirm(`Suspend ${manager.name}'s account?`)) return;

    setUpdatingId(manager.id);
    try {
      const targetBranchId = manager.branch_id ?? activeBranchId;
      const putUrl = targetBranchId
        ? `${API_BASE_URL}/api/members.php/${manager.id}?branch_id=${targetBranchId}`
        : `${API_BASE_URL}/api/members.php/${manager.id}`;

      const res = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manager.name,
          email: manager.email,
          phone: manager.phone || "",
          status: "Suspended",
          balance: manager.balance || 0,
          role: "manager",
          branch_id: targetBranchId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setManagers((prev) =>
          prev.map((m) =>
            m.id === manager.id ? { ...m, status: "suspended" } : m,
          ),
        );
        toast.success(`🚫 ${manager.name} suspended`);
      } else {
        toast.error(data.message || data.error || "Failed to suspend");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to suspend");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReactivate = async (manager) => {
    setUpdatingId(manager.id);
    try {
      const targetBranchId = manager.branch_id ?? activeBranchId;
      const putUrl = targetBranchId
        ? `${API_BASE_URL}/api/members.php/${manager.id}?branch_id=${targetBranchId}`
        : `${API_BASE_URL}/api/members.php/${manager.id}`;

      const res = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manager.name,
          email: manager.email,
          phone: manager.phone || "",
          status: "Active",
          balance: manager.balance || 0,
          role: "manager",
          branch_id: targetBranchId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setManagers((prev) =>
          prev.map((m) =>
            m.id === manager.id ? { ...m, status: "active" } : m,
          ),
        );
        toast.success(`✅ ${manager.name} reactivated`);
      } else {
        toast.error(data.message || data.error || "Failed to reactivate");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to reactivate");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (manager) => {
    if (
      !window.confirm(
        `⚠️ Permanently delete ${manager.name}?\n\nThis cannot be undone.`,
      )
    )
      return;

    setUpdatingId(manager.id);
    try {
      const targetBranchId = manager.branch_id ?? activeBranchId;
      const delUrl = targetBranchId
        ? `${API_BASE_URL}/api/members.php/${manager.id}?branch_id=${targetBranchId}`
        : `${API_BASE_URL}/api/members.php/${manager.id}`;

      const res = await fetch(delUrl, { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        setManagers((prev) => prev.filter((m) => m.id !== manager.id));
        toast.success(`🗑️ ${manager.name} deleted`);
      } else {
        toast.error(data.message || data.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    } finally {
      setUpdatingId(null);
    }
  };

  // ============================================================
  // Derived
  // ============================================================
  const filtered = useMemo(() => {
    let list = [...managers];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((m) => {
        const branch = resolveBranch(m);
        return (
          m.name?.toLowerCase().includes(term) ||
          m.email?.toLowerCase().includes(term) ||
          m.accountNumber?.includes(term) ||
          m.phone?.includes(term) ||
          branch.name?.toLowerCase().includes(term) ||
          branch.code?.toLowerCase().includes(term)
        );
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managers, searchTerm, branchMap]);

  const counts = useMemo(() => {
    return {
      total: managers.length,
      active: managers.filter((m) => m.status === "active").length,
      suspended: managers.filter((m) => m.status === "suspended").length,
      totalBalance: managers.reduce((s, m) => s + (m.balance || 0), 0),
    };
  }, [managers]);

  // ============================================================
  // Loading
  // ============================================================
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
        ⏳ Loading managers...
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================
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
        @keyframes mgrSpin { to { transform: rotate(360deg); } }
        .mgr-header {
          display: flex; justify-content: space-between;
          align-items: flex-start; flex-wrap: wrap;
          gap: 16px; margin-bottom: 24px;
        }
        .mgr-header h2 {
          font-size: 24px; font-weight: 700; margin: 0;
          color: var(--text);
        }
        .mgr-header p {
          color: var(--text-muted); margin: 4px 0 0 0; font-size: 14px;
        }
        .mgr-btn-outline {
          padding: 10px 18px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-surface-2);
          color: var(--text);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s, opacity 0.15s;
        }
        .mgr-btn-outline:hover:not(:disabled) { background: var(--bg-surface-3); }
        .mgr-btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }
        .mgr-btn-outline .mgr-spin {
          display: inline-block; animation: mgrSpin 1s linear infinite;
        }

        .mgr-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px; margin-bottom: 20px;
        }
        .mgr-stat {
          display: flex; flex-direction: column; gap: 6px;
        }
        .mgr-stat-label {
          font-size: 12px; color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px; font-weight: 600;
        }
        .mgr-stat-value { font-size: 22px; font-weight: 700; }

        .mgr-filter-bar {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .mgr-filter-input, .mgr-filter-select {
          background: var(--bg-surface-2);
          color: var(--text);
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          outline: none;
          font-size: 14px;
          transition: box-shadow 0.2s;
        }
        .mgr-filter-input { flex: 1; min-width: 220px; }
        .mgr-filter-input::placeholder { color: var(--text-dim); }
        .mgr-filter-input:focus, .mgr-filter-select:focus {
          box-shadow: 0 0 0 2px var(--accent-bg);
        }
        .mgr-filter-select option {
          background: var(--bg-surface); color: var(--text);
        }

        .mgr-table-wrap { overflow: auto; }
        .mgr-table-wrap table {
          width: 100%; border-collapse: collapse; background: transparent;
        }
        .mgr-table-wrap th {
          color: var(--text-muted);
          font-size: 11px; font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 16px;
          text-align: left;
          white-space: nowrap;
          border: none;
        }
        .mgr-table-wrap td {
          padding: 12px 16px;
          color: var(--text); font-size: 13px;
          vertical-align: middle;
          border: none;
        }
        .mgr-table-wrap tbody tr {
          transition: background-color 0.15s ease;
        }
        .mgr-table-wrap tbody tr:hover td {
          background: var(--bg-surface-2);
        }

        .mgr-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: var(--accent-bg);
          color: var(--badge-text);
          display: flex; align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
          overflow: hidden;
        }
        .mgr-avatar img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .mgr-member-cell {
          display: flex; align-items: center; gap: 10px;
        }

        .mgr-branch {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          background: var(--bg-surface-2);
          color: var(--text);
          border: 1px solid var(--border);
        }
        .mgr-branch-code {
          color: var(--text-muted);
          font-size: 11px;
          font-family: monospace;
        }
        .mgr-branch-muted {
          color: var(--text-muted);
          font-size: 12px;
          font-style: italic;
        }

        .mgr-badge {
          display: inline-flex;
          align-items: center; gap: 5px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: var(--badge-text);
          text-transform: capitalize;
        }

        .mgr-action-btn {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.15s;
        }
        .mgr-action-btn:hover:not(:disabled) {
          background: var(--bg-surface-2);
        }
        .mgr-action-btn:disabled {
          opacity: 0.5; cursor: not-allowed;
        }
        .mgr-action-btn.warning {
          color: var(--warning); border-color: var(--warning);
        }
        .mgr-action-btn.warning:hover:not(:disabled) {
          background: var(--pending-bg);
        }
        .mgr-action-btn.success {
          color: var(--credit); border-color: var(--credit);
        }
        .mgr-action-btn.success:hover:not(:disabled) {
          background: var(--approved-bg);
        }
        .mgr-action-btn.danger {
          color: var(--debit); border-color: var(--debit);
        }
        .mgr-action-btn.danger:hover:not(:disabled) {
          background: var(--rejected-bg);
        }

        .mgr-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          border: 1px dashed var(--border);
          border-radius: 12px;
        }
        .mgr-empty-icon { font-size: 48px; margin-bottom: 8px; }
      `}</style>

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
              {activeBranch?.code || "—"} ·{" "}
              {filterBranch === "all"
                ? "Showing managers from all branches"
                : "Managers in this branch only"}{" "}
              ·{" "}
              <strong style={{ color: "var(--credit)" }}>{counts.total}</strong>{" "}
              managers
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
      <div className="mgr-header">
        <div>
          <h2>👔 Branch Managers</h2>
          <p>
            All managers in{" "}
            <strong>
              {filterBranch === "all"
                ? "every branch"
                : activeBranch?.name || "this branch"}
            </strong>{" "}
            — manage their access here.
          </p>
        </div>
        <button
          className="mgr-btn-outline"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Reload manager list"
        >
          <span className={refreshing ? "mgr-spin" : ""}>🔄</span>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="mgr-stats">
        <div className="mgr-stat">
          <span className="mgr-stat-label">👔 Total Managers</span>
          <span className="mgr-stat-value" style={{ color: "var(--info)" }}>
            {counts.total}
          </span>
        </div>
        <div className="mgr-stat">
          <span className="mgr-stat-label">✅ Active</span>
          <span className="mgr-stat-value" style={{ color: "var(--credit)" }}>
            {counts.active}
          </span>
        </div>
        <div className="mgr-stat">
          <span className="mgr-stat-label">🚫 Suspended</span>
          <span
            className="mgr-stat-value"
            style={{ color: "var(--text-muted)" }}
          >
            {counts.suspended}
          </span>
        </div>
        <div className="mgr-stat">
          <span className="mgr-stat-label">💰 Total Balance</span>
          <span className="mgr-stat-value" style={{ color: "var(--credit)" }}>
            {new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
              maximumFractionDigits: 0,
            }).format(counts.totalBalance)}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mgr-filter-bar">
        <input
          type="text"
          className="mgr-filter-input"
          placeholder="🔍 Search by name, email, phone, branch, or account number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="mgr-filter-select"
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
        >
          <option value="current">📁 Current branch only</option>
          <option value="all">🌍 All branches</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="mgr-empty">
          <div className="mgr-empty-icon">👔</div>
          <p>
            {managers.length === 0
              ? `No managers found in ${
                  filterBranch === "all"
                    ? "any branch"
                    : activeBranch?.name || "this branch"
                }. Promote a member to Manager to see them here.`
              : "No managers match your search."}
          </p>
        </div>
      ) : (
        <div className="mgr-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Manager</th>
                <th>Branch</th>
                <th>Contact</th>
                <th>Account</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Balance</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const isSelf =
                  currentUser && Number(m.id) === Number(currentUser.id);
                const branch = resolveBranch(m);
                const isActiveBranch =
                  branch.id != null &&
                  activeBranchId != null &&
                  String(branch.id) === String(activeBranchId);

                return (
                  <tr key={m.id}>
                    <td>
                      <div className="mgr-member-cell">
                        <div className="mgr-avatar">
                          {m.passport_photo ? (
                            <img
                              src={`${API_BASE_URL}/api/uploads/passports/${m.passport_photo}`}
                              alt=""
                            />
                          ) : (
                            (m.name || "U").charAt(0)
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
                            {m.name}
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

                    {/* 🆕 Branch column */}
                    <td>
                      {branch.id != null ? (
                        <span
                          className="mgr-branch"
                          title={
                            branch.code
                              ? `${branch.name} (${branch.code})`
                              : branch.name
                          }
                        >
                          🏢 {branch.name}
                          {branch.code && (
                            <span className="mgr-branch-code">
                              · {branch.code}
                            </span>
                          )}
                          {isActiveBranch && (
                            <span
                              style={{
                                marginLeft: 4,
                                fontSize: 10,
                                color: "var(--credit)",
                                fontWeight: 700,
                              }}
                            >
                              ●
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="mgr-branch-muted">—</span>
                      )}
                    </td>

                    <td>
                      <div style={{ color: "var(--text)", fontSize: "13px" }}>
                        {m.email}
                      </div>
                      <div
                        style={{ color: "var(--text-muted)", fontSize: "12px" }}
                      >
                        {m.phone || "—"}
                      </div>
                    </td>
                    <td
                      style={{
                        fontFamily: "monospace",
                        color: "var(--info)",
                        fontSize: "13px",
                      }}
                    >
                      {m.accountNumber}
                    </td>
                    <td>
                      <span
                        className="mgr-badge"
                        style={{
                          background:
                            m.status === "active"
                              ? "var(--approved-bg)"
                              : m.status === "suspended"
                                ? "var(--pending-bg)"
                                : "var(--rejected-bg)",
                          color: "var(--badge-text)",
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color: "var(--credit)",
                        fontWeight: 600,
                      }}
                    >
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                        maximumFractionDigits: 0,
                      }).format(m.balance)}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="mgr-action-btn warning"
                          onClick={() => handleDemote(m)}
                          disabled={updatingId === m.id}
                          title="Demote to Member"
                        >
                          ⬇ Demote
                        </button>

                        {m.status === "active" ? (
                          <button
                            className="mgr-action-btn danger"
                            onClick={() => handleSuspend(m)}
                            disabled={updatingId === m.id}
                            title="Suspend account"
                          >
                            🚫 Suspend
                          </button>
                        ) : (
                          <button
                            className="mgr-action-btn success"
                            onClick={() => handleReactivate(m)}
                            disabled={updatingId === m.id}
                            title="Reactivate account"
                          >
                            ✅ Reactivate
                          </button>
                        )}

                        <button
                          className="mgr-action-btn danger"
                          onClick={() => handleDelete(m)}
                          disabled={updatingId === m.id}
                          title="Delete permanently"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Manager;
