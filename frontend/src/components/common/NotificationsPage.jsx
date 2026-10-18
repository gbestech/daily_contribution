// src/components/common/NotificationsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:8000";
const PAGE_SIZE = 20;

const iconForType = (type) => {
  switch ((type || "").toLowerCase()) {
    case "deposit":
      return "💰";
    case "withdrawal":
      return "💸";
    case "transfer":
      return "🔄";
    case "loan":
      return "🏦";
    case "approval":
      return "✅";
    case "rejection":
      return "❌";
    case "pending":
      return "⏳";
    case "member":
      return "👥";
    case "system":
      return "⚙️";
    case "warning":
      return "⚠️";
    default:
      return "🔔";
  }
};

const colorForType = (type) => {
  switch ((type || "").toLowerCase()) {
    case "deposit":
    case "approval":
      return "var(--credit, #22c55e)";
    case "withdrawal":
    case "rejection":
      return "var(--debit, #ef4444)";
    case "pending":
      return "var(--warning, #f59e0b)";
    case "loan":
      return "var(--info, #3b82f6)";
    default:
      return "var(--accent, #6366f1)";
  }
};

const relativeTime = (iso) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleString();
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const userId = user?.id || user?.user_id || null;

  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/notifications.php?user_id=${encodeURIComponent(userId)}&limit=200`,
        );
        const data = await res.json();
        if (data.status && Array.isArray(data.data)) {
          setNotifications(data.data);
          setUnreadCount(
            data.unread_count ?? data.data.filter((n) => !n.is_read).length,
          );
          setError("");
        } else {
          setError(data.message || "Failed to load notifications");
        }
      } catch (err) {
        console.error("Notifications fetch error:", err);
        setError("Network error loading notifications");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchNotifications();
    const onRefresh = () => fetchNotifications(true);
    window.addEventListener("notifications:refresh", onRefresh);
    return () => window.removeEventListener("notifications:refresh", onRefresh);
  }, [fetchNotifications]);

  useEffect(() => {
    setPage(1);
  }, [filter, typeFilter, search]);

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`${API_BASE_URL}/api/notifications.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", id, user_id: userId }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch(`${API_BASE_URL}/api/notifications.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read", user_id: userId }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    const removed = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed && !removed.is_read) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`${API_BASE_URL}/api/notifications.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id, user_id: userId }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRowClick = (n) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const availableTypes = useMemo(() => {
    const set = new Set();
    notifications.forEach((n) => {
      if (n.type) set.add(String(n.type).toLowerCase());
    });
    return ["all", ...Array.from(set).sort()];
  }, [notifications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter === "unread" && n.is_read) return false;
      if (
        typeFilter !== "all" &&
        String(n.type || "").toLowerCase() !== typeFilter
      )
        return false;
      if (q) {
        const hay = `${n.title || ""} ${n.message || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, filter, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const isAdminRole = [
    "admin",
    "administrator",
    "manager",
    "branch_manager",
  ].includes(String(user?.role || "").toLowerCase());

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "700",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            🔔 Notifications
            {unreadCount > 0 && (
              <span
                style={{
                  padding: "2px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "700",
                  backgroundColor: "var(--debit-bg)",
                  color: "var(--debit, #ef4444)",
                }}
              >
                {unreadCount} new
              </span>
            )}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "var(--text-muted)",
            }}
          >
            All activities and alerts for your account
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                color: "var(--text)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ✓ Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "16px",
          padding: "12px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search notifications…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 220px",
            minWidth: "180px",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-app)",
            color: "var(--text)",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-app)",
            color: "var(--text)",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <option value="all">All</option>
          <option value="unread">Unread only</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-app)",
            color: "var(--text)",
            fontSize: "13px",
            cursor: "pointer",
            textTransform: "capitalize",
          }}
        >
          {availableTypes.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : t}
            </option>
          ))}
        </select>
        <button
          onClick={() => fetchNotifications()}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-surface-2)",
            color: "var(--text)",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* List */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {loading && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            Loading notifications…
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--debit, #ef4444)",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: "42px", marginBottom: "12px" }}>🔕</div>
            <div style={{ fontSize: "15px", fontWeight: "600" }}>
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>
              When something happens on your account, you'll see it here.
            </div>
          </div>
        )}

        {!loading &&
          !error &&
          paginated.map((n) => (
            <div
              key={n.id}
              onClick={() => handleRowClick(n)}
              style={{
                display: "flex",
                gap: "14px",
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                backgroundColor: n.is_read
                  ? "transparent"
                  : "var(--bg-surface-2)",
                cursor: n.link ? "pointer" : "default",
                transition: "background-color 0.15s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-surface-3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = n.is_read
                  ? "transparent"
                  : "var(--bg-surface-2)";
              }}
            >
              {!n.is_read && (
                <span
                  style={{
                    position: "absolute",
                    left: "6px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent)",
                  }}
                />
              )}
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  backgroundColor: "var(--bg-surface-3)",
                  color: colorForType(n.type),
                }}
              >
                {iconForType(n.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: n.is_read ? "500" : "700",
                      color: "var(--text)",
                    }}
                  >
                    {n.title || "Notification"}
                  </div>
                  {n.type && (
                    <span
                      style={{
                        padding: "1px 8px",
                        borderRadius: "10px",
                        fontSize: "10px",
                        fontWeight: "600",
                        textTransform: "capitalize",
                        backgroundColor: "var(--bg-surface-3)",
                        color: colorForType(n.type),
                      }}
                    >
                      {n.type}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    marginTop: "3px",
                    lineHeight: "1.5",
                  }}
                >
                  {n.message || ""}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-dim)",
                    marginTop: "6px",
                  }}
                >
                  {relativeTime(n.created_at)}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "4px",
                }}
              >
                {!n.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(n.id);
                    }}
                    title="Mark as read"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-text)",
                      cursor: "pointer",
                      fontSize: "13px",
                      padding: "4px 6px",
                    }}
                  >
                    ✓
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  title="Delete"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px 6px",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: currentPage === 1 ? "var(--text-dim)" : "var(--text)",
              fontSize: "13px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Page {currentPage} of {totalPages} · {filtered.length} total
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color:
                currentPage === totalPages ? "var(--text-dim)" : "var(--text)",
              fontSize: "13px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Back link */}
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <button
          onClick={() => navigate(isAdminRole ? "/admin" : "/member")}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent-text)",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotificationsPage;
