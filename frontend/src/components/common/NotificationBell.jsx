// src/components/common/NotificationBell.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:8000";
const POLL_INTERVAL = 30000;

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const dropdownRef = useRef(null);
  const pollRef = useRef(null);

  const userId = user?.id || user?.user_id || null;

  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!userId) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/notifications.php?user_id=${encodeURIComponent(
            userId,
          )}&limit=30`,
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
    if (!userId) return;
    fetchNotifications();
    pollRef.current = setInterval(
      () => fetchNotifications(true),
      POLL_INTERVAL,
    );
    const onRefresh = () => fetchNotifications(true);
    window.addEventListener("notifications:refresh", onRefresh);
    return () => {
      clearInterval(pollRef.current);
      window.removeEventListener("notifications:refresh", onRefresh);
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      console.error("mark read failed:", err);
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
      console.error("mark all read failed:", err);
    }
  };

  const deleteNotification = async (id) => {
    const removed = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed && !removed.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    try {
      await fetch(`${API_BASE_URL}/api/notifications.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id, user_id: userId }),
      });
    } catch (err) {
      console.error("delete failed:", err);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.link) {
      setIsOpen(false);
      navigate(n.link);
    }
  };

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
    return new Date(iso).toLocaleDateString();
  };

  const visible =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) fetchNotifications(true);
        }}
        title="Notifications"
        aria-label={`Notifications${
          unreadCount > 0 ? `, ${unreadCount} unread` : ""
        }`}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          fontSize: "18px",
          color: "var(--text)",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-surface-2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              borderRadius: "8px",
              backgroundColor: "var(--debit, #ef4444)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid var(--bg-surface)",
              boxSizing: "content-box",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "480px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 60,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "var(--text)",
                }}
              >
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    padding: "1px 8px",
                    borderRadius: "10px",
                    fontSize: "10px",
                    fontWeight: "700",
                    backgroundColor: "var(--debit-bg)",
                    color: "var(--debit, #ef4444)",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-text)",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "4px",
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {["all", "unread"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "14px",
                  border: "1px solid",
                  borderColor: filter === f ? "var(--accent)" : "var(--border)",
                  backgroundColor:
                    filter === f ? "var(--accent-bg)" : "transparent",
                  color:
                    filter === f ? "var(--accent-text)" : "var(--text-muted)",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && visible.length === 0 && (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                Loading…
              </div>
            )}

            {error && visible.length === 0 && (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "var(--debit, #ef4444)",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            {!loading && !error && visible.length === 0 && (
              <div
                style={{
                  padding: "40px 16px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔕</div>
                <div style={{ fontSize: "13px" }}>
                  {filter === "unread"
                    ? "No unread notifications"
                    : "You're all caught up"}
                </div>
              </div>
            )}

            {visible.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "12px 16px",
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
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    backgroundColor: "var(--bg-surface-3)",
                    color: colorForType(n.type),
                  }}
                >
                  {iconForType(n.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: n.is_read ? "500" : "700",
                      color: "var(--text)",
                      marginBottom: "2px",
                    }}
                  >
                    {n.title || "Notification"}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      lineHeight: "1.4",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.message || ""}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-dim)",
                      marginTop: "4px",
                    }}
                  >
                    {relativeTime(n.created_at)}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  title="Dismiss"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "2px 4px",
                    alignSelf: "flex-start",
                  }}
                >
                  ✕
                </button>

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
              </div>
            ))}
          </div>

          {/* ✅ FIXED: footer just closes, no navigation */}
          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-text)",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
