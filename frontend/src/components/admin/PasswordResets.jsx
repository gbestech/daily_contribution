// src/components/admin/PasswordResets.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

const TABS = [
  { value: "pending", label: "⏳ Pending" },
  { value: "completed", label: "✅ Completed" },
  { value: "rejected", label: "❌ Rejected" },
  { value: "all", label: "📋 All" },
];

const PasswordResets = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    completed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [generatedFor, setGeneratedFor] = useState(null);

  const fetchRequests = useCallback(
    async (status = activeTab) => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/get-password-reset-requests.php?status=${status}`,
        );
        const data = await res.json();
        if (res.ok && data.status) {
          setRequests(Array.isArray(data.requests) ? data.requests : []);
          setCounts(data.counts || { pending: 0, completed: 0, rejected: 0 });
        } else {
          toast.error(data.error || "Failed to load requests");
          setRequests([]);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load requests");
        setRequests([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    fetchRequests(activeTab);
  }, [activeTab, fetchRequests]);

  const handleApprove = async (request) => {
    if (
      !window.confirm(
        `Reset password for ${request.email}?\n\nA temporary password will be generated. You'll need to share it with the user.`,
      )
    )
      return;

    setBusyId(request.id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/approve-password-reset.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: request.id,
            handled_by:
              user?.full_name || user?.name || user?.username || "Admin",
          }),
        },
      );
      const data = await res.json();

      if (res.ok && data.status) {
        setGeneratedPassword(data.temp_password);
        setGeneratedFor({ email: data.email, user_type: data.user_type });
        setShowModal(true);
        // Refresh list
        fetchRequests(activeTab);
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset password");
    } finally {
      setBusyId(null);
    }
  };

  const copyToClipboard = (text, label = "Password") => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`📋 ${label} copied!`))
      .catch(() => toast.error("Copy failed"));
  };

  const copyFullMessage = () => {
    if (!generatedFor) return;
    const text = `Hello,

Your password has been reset by an administrator.

🔑 Temporary Password: ${generatedPassword}

Please log in with this password and change it immediately from your profile.

For security reasons, do not share this password with anyone.`;

    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("📋 Full message copied!"))
      .catch(() => toast.error("Copy failed"));
  };

  const closeModal = () => {
    setShowModal(false);
    setGeneratedPassword("");
    setGeneratedFor(null);
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      const dt = new Date(d.replace(" ", "T"));
      if (isNaN(dt)) return d;
      return dt.toLocaleString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  };

  const timeAgo = (d) => {
    if (!d) return "—";
    try {
      const dt = new Date(d.replace(" ", "T"));
      const diff = Math.floor((Date.now() - dt.getTime()) / 1000);
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
      return `${Math.floor(diff / 86400)} day(s) ago`;
    } catch {
      return d;
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending: { bg: "var(--pending-bg)", label: "⏳ Pending" },
      completed: { bg: "var(--approved-bg)", label: "✅ Completed" },
      rejected: { bg: "var(--rejected-bg)", label: "❌ Rejected" },
    };
    const s = map[status] || map.pending;
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: 600,
          background: s.bg,
          color: "var(--badge-text)",
          whiteSpace: "nowrap",
        }}
      >
        {s.label}
      </span>
    );
  };

  const userTypeBadge = (type) => {
    const isAdmin = type === "admin";
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: 600,
          background: isAdmin ? "var(--rejected-bg)" : "var(--approved-bg)",
          color: "var(--badge-text)",
          whiteSpace: "nowrap",
        }}
      >
        {isAdmin ? "👑 Admin" : "👤 Member"}
      </span>
    );
  };

  return (
    <div
      style={{
        padding: "24px",
        color: "var(--text)",
        backgroundColor: "var(--bg-app)",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        .pr-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .pr-tab {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pr-tab:hover { background: var(--bg-surface-2); color: var(--text); }
        .pr-tab.active {
          background: var(--accent);
          color: white;
        }
        .pr-tab .pr-count {
          margin-left: 6px;
          background: rgba(0,0,0,0.18);
          padding: 1px 7px;
          border-radius: 10px;
          font-size: 10px;
        }
        .pr-table-wrap {
          overflow-x: auto;
        }
        .pr-table {
          width: 100%;
          border-collapse: collapse;
          background: transparent;
        }
        .pr-table thead { background: transparent; }
        .pr-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none;
          white-space: nowrap;
          background: transparent;
        }
        .pr-table td {
          padding: 14px 16px;
          border: none;
          color: var(--text);
          font-size: 13px;
          background: transparent;
          vertical-align: middle;
        }
        .pr-table tbody tr {
          border: none;
          background: transparent;
          transition: background-color 0.15s ease;
        }
        .pr-table tbody tr:hover td {
          background: var(--bg-surface-2);
        }
        .pr-btn-reset {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: var(--accent);
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .pr-btn-reset:hover:not(:disabled) { background: var(--accent-hover); }
        .pr-btn-reset:disabled { opacity: 0.5; cursor: not-allowed; }
        .pr-btn-refresh {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: var(--bg-surface-2);
          color: var(--text);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .pr-btn-refresh:hover { background: var(--bg-surface-3); }
        .pr-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }
        .pr-empty-icon { font-size: 48px; margin-bottom: 10px; }
        .pr-modal-overlay {
          position: fixed;
          inset: 0;
          background: var(--bg-overlay);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .pr-modal {
          background: var(--bg-surface);
          border-radius: 16px;
          padding: 28px;
          max-width: 520px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
          color: var(--text);
        }
        .pr-modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .pr-modal-icon { font-size: 32px; }
        .pr-modal-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: var(--text);
        }
        .pr-modal-sub {
          font-size: 13px;
          color: var(--text-muted);
          margin: 4px 0 0 0;
        }
        .pr-pw-box {
          background: var(--bg-surface-2);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          text-align: center;
        }
        .pr-pw-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .pr-pw-value {
          font-family: monospace;
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          word-break: break-all;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .pr-copy-btn {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          background: var(--accent);
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .pr-copy-btn:hover { background: var(--accent-hover); }
        .pr-copy-btn.secondary {
          background: var(--bg-surface-3);
          color: var(--text);
          margin-left: 8px;
        }
        .pr-copy-btn.secondary:hover { background: var(--bg-surface-2); }
        .pr-warn {
          background: var(--pending-bg);
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 13px;
          color: var(--text);
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .pr-modal-btns {
          display: flex;
          gap: 10px;
        }
        .pr-modal-btns button {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pr-modal-btn-done {
          background: var(--accent);
          color: white;
        }
        .pr-modal-btn-done:hover { background: var(--accent-hover); }
        .pr-modal-btn-cancel {
          background: var(--bg-surface-2);
          color: var(--text);
        }
        .pr-modal-btn-cancel:hover { background: var(--bg-surface-3); }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              margin: 0,
              color: "var(--text)",
            }}
          >
            🔐 Password Reset Requests
          </h2>
          <p
            style={{
              color: "var(--text-muted)",
              margin: "4px 0 0 0",
              fontSize: "14px",
            }}
          >
            Reset forgotten passwords and share the temp password with users
          </p>
        </div>
        <button
          className="pr-btn-refresh"
          onClick={() => fetchRequests(activeTab)}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="pr-tabs">
        {TABS.map((t) => {
          const count =
            t.value === "all"
              ? counts.pending + counts.completed + counts.rejected
              : counts[t.value] || 0;
          return (
            <button
              key={t.value}
              className={`pr-tab ${activeTab === t.value ? "active" : ""}`}
              onClick={() => setActiveTab(t.value)}
            >
              {t.label}
              <span className="pr-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="pr-table-wrap">
        <table className="pr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Email</th>
              <th>User Type</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Handled</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">
                  <div className="pr-empty">
                    <div className="pr-empty-icon">⏳</div>
                    <p>Loading requests...</p>
                  </div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="pr-empty">
                    <div className="pr-empty-icon">📭</div>
                    <p>No {activeTab === "all" ? "" : activeTab} requests</p>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-dim)",
                        marginTop: "4px",
                      }}
                    >
                      {activeTab === "pending"
                        ? "No one has requested a password reset yet."
                        : "Nothing to show here."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td
                    style={{
                      fontFamily: "monospace",
                      color: "var(--text-muted)",
                      fontSize: 12,
                    }}
                  >
                    #{r.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.email}</div>
                  </td>
                  <td>{userTypeBadge(r.user_type)}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td>
                    <div style={{ fontSize: 13 }}>
                      {timeAgo(r.requested_at)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {formatDate(r.requested_at)}
                    </div>
                  </td>
                  <td>
                    {r.handled_at ? (
                      <>
                        <div style={{ fontSize: 13 }}>
                          {timeAgo(r.handled_at)}
                        </div>
                        {r.handled_by && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginTop: 2,
                            }}
                          >
                            by {r.handled_by}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {r.status === "pending" ? (
                      <button
                        className="pr-btn-reset"
                        onClick={() => handleApprove(r)}
                        disabled={busyId === r.id}
                      >
                        {busyId === r.id
                          ? "⏳ Resetting..."
                          : "🔄 Reset Password"}
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-dim)",
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Temp Password Modal */}
      {showModal && generatedPassword && (
        <div className="pr-modal-overlay" onClick={closeModal}>
          <div className="pr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <span className="pr-modal-icon">✅</span>
              <div>
                <h3 className="pr-modal-title">Password Reset!</h3>
                <p className="pr-modal-sub">
                  For <strong>{generatedFor?.email}</strong>
                </p>
              </div>
            </div>

            <div className="pr-pw-box">
              <div className="pr-pw-label">Temporary Password</div>
              <div className="pr-pw-value">{generatedPassword}</div>
              <button
                className="pr-copy-btn"
                onClick={() => copyToClipboard(generatedPassword, "Password")}
              >
                📋 Copy Password
              </button>
              <button
                className="pr-copy-btn secondary"
                onClick={copyFullMessage}
              >
                📨 Copy Full Message
              </button>
            </div>

            <div className="pr-warn">
              ⚠️{" "}
              <strong>
                Share this password with the user via WhatsApp, SMS, or phone
                call.
              </strong>{" "}
              For security, this password will <em>not</em> be shown again. The
              user should change it after logging in.
            </div>

            <div className="pr-modal-btns">
              <button className="pr-modal-btn-cancel" onClick={closeModal}>
                Close
              </button>
              <button
                className="pr-modal-btn-done"
                onClick={() => {
                  toast.success("✅ Marked as sent");
                  closeModal();
                }}
              >
                ✅ Done — Mark as Sent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordResets;
