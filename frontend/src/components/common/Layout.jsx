// src/components/common/Layout.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../context/PermissionsContext";
import { useBranch } from "../../context/BranchContext";
import Navbar from "./Navbar";

const API_BASE_URL = "https://baleeg.onrender.com";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { can } = usePermission();

  // ============================================================
  // Branch context — trusted when mounted
  // ============================================================
  let activeBranchId = null;
  let branchContextAvailable = false;
  try {
    const branchCtx = useBranch();
    activeBranchId = branchCtx?.activeBranchId ?? null;
    branchContextAvailable = true;
  } catch {
    /* BranchProvider not mounted on this route */
  }

  // If BranchContext is available, trust activeBranchId (including null).
  // If not, fall back to user.branch_id.
  let branchId = null;
  if (branchContextAvailable) {
    branchId = activeBranchId;
  } else {
    const raw = user?.branch_id ?? user?.branchId ?? null;
    if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
      const n = Number(raw);
      branchId = Number.isFinite(n) && n > 0 ? n : null;
    }
  }

  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // ============================================================
  // Shop name — always from the DB, never cached
  // ============================================================
  const [shopName, setShopName] = useState("");
  const [shopNameLoading, setShopNameLoading] = useState(true);

  const role = String(user?.role || "")
    .trim()
    .toLowerCase();
  const isAdmin = role === "admin" || role === "administrator";
  const isManager = role === "manager";

  const isProfileRoute = location.pathname === "/member/profile";
  const profileIncomplete =
    !!user &&
    !(
      user.profile_completed === 1 ||
      user.profile_completed === "1" ||
      user.profile_completed === true
    );
  const hideChrome = isProfileRoute && profileIncomplete;

  // ============================================================
  // Fetch shop name from /api/settings.php?branch_id=N
  // Guarantees:
  //   - No cached value ever displayed
  //   - Resets on branch change
  //   - Resets on error
  //   - Only displays a non-empty string from the DB
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const fetchShopName = async () => {
      setShopNameLoading(true);

      // 🔑 Reset BEFORE fetch — no stale name during the in-flight request
      setShopName("");

      // No branch id → no shop name. Keep blank.
      if (branchId === null || branchId === undefined) {
        setShopNameLoading(false);
        return;
      }

      try {
        const url = `${API_BASE_URL}/api/settings.php?branch_id=${encodeURIComponent(
          branchId,
        )}`;

        const response = await fetch(url, {
          cache: "no-store", // 🔑 never serve a cached response
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          // 400 = no branch, 404 = branch doesn't exist, 500 = server error.
          // Leave shopName empty.
          if (!cancelled) setShopName("");
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        const rawName = data?.data?.general?.shop_name;
        const name = typeof rawName === "string" ? rawName.trim() : "";

        // 🔑 Only accept a non-empty string. Empty → stay blank.
        setShopName(name);
      } catch (err) {
        if (!cancelled) {
          console.warn("[Layout] shop name fetch failed:", err);
          setShopName("");
        }
      } finally {
        if (!cancelled) setShopNameLoading(false);
      }
    };

    fetchShopName();

    const onSettingsUpdated = () => fetchShopName();
    window.addEventListener("settings:updated", onSettingsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("settings:updated", onSettingsUpdated);
    };
  }, [branchId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const adminNavItems = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: "📊",
      permission: "view_dashboard",
    },
    {
      path: "/admin/broadsheet",
      label: "Broad Sheet",
      icon: "👥",
      permission: "view_broadsheet",
    },
    {
      path: "/admin/users",
      label: "Members",
      icon: "👤",
      permission: "create_member",
    },
    {
      path: "/admin/managers",
      label: "Managers",
      icon: "👔",
      permission: "manage_staff",
    },
    {
      path: "/admin/reshuffle",
      label: "Reshuffle",
      icon: "🔀",
      permission: "manage_staff",
    },
    {
      path: "/admin/daily-marks",
      label: "Daily Marks",
      icon: "✅",
      permission: "view_dashboard",
    },
    {
      path: "/admin/transactions",
      label: "Transactions",
      icon: "💳",
      permission: "view_transactions",
    },
    {
      path: "/admin/pending",
      label: "Pending",
      icon: "⏳",
      permission: "approve_transactions",
    },
    {
      path: "/admin/reports",
      label: "Reports",
      icon: "📈",
      permission: "view_reports",
    },

    {
      path: "/admin/expenses",
      label: "Expenses",
      icon: "💸",
      permission: "manage_expenses",
    },
    {
      path: "/admin/items",
      label: "Items",
      icon: "🧾",
      permission: "manage_expenses",
    },
    {
      path: "/admin/staff",
      label: "Staff & Roles",
      icon: "🛡️",
      permission: "manage_staff",
    },
    {
      path: "/admin/permissions",
      label: "Permissions",
      icon: "🔒",
      permission: "manage_permissions",
    },
    {
      path: "/admin/password-resets",
      label: "Password Resets",
      icon: "🔐",
      permission: "manage_settings",
    },
    {
      path: "/admin/settings",
      label: "Settings",
      icon: "⚙️",
      permission: "manage_settings",
    },
  ];

  const memberNavItems = [
    {
      path: "/member/dashboard",
      label: "Dashboard",
      icon: "📊",
      permission: "view_dashboard",
    },
    {
      path: "/member/deposit",
      label: "Deposit",
      icon: "💰",
      permission: "create_deposit",
    },
    {
      path: "/member/withdraw",
      label: "Withdraw",
      icon: "💸",
      permission: "create_withdrawal",
    },
    {
      path: "/member/transfer",
      label: "Transfer",
      icon: "🔄",
      permission: "create_transfer",
    },
    {
      path: "/member/history",
      label: "History",
      icon: "📜",
      permission: "view_history",
    },
    {
      path: "/member/items",
      label: "My Items",
      icon: "✅",
      permission: "view_dashboard",
    },
    {
      path: "/member/profile",
      label: "Profile",
      icon: "👤",
      permission: "view_dashboard",
    },
  ];

  const rawItems = isAdmin || isManager ? adminNavItems : memberNavItems;
  const navItems = rawItems.filter((item) => can(item.permission));

  const sidebarWidth = isCollapsed ? "70px" : "250px";
  const panelLabel = isAdmin
    ? "Admin Panel"
    : isManager
      ? "Manager Panel"
      : "Member Panel";

  if (hideChrome) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--bg-app)",
          color: "var(--text)",
          padding: "0",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "var(--bg-overlay)",
            zIndex: 998,
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: "var(--bg-app)",
          color: "var(--text)",
          transition: "background-color 0.25s ease, color 0.25s ease",
        }}
      >
        <div
          style={{
            width: isMobile ? (isMobileOpen ? "280px" : "0px") : sidebarWidth,
            backgroundColor: "var(--bg-surface)",
            padding: isCollapsed ? "12px" : "20px",
            borderRight: "1px solid var(--border)",
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            overflowY: "auto",
            transition: "all 0.3s ease",
            zIndex: 999,
            display: isMobile && !isMobileOpen ? "none" : "flex",
            flexDirection: "column",
          }}
        >
          {/* Header — shop name from the DB, panel label as subtitle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: "10px",
              marginBottom: "32px",
              padding: isCollapsed ? "0" : "0 4px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: isCollapsed ? "24px" : "28px",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              🏦
            </span>
            {!isCollapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                {shopNameLoading ? (
                  // Skeleton while loading — no text shown until real data arrives
                  <div
                    style={{
                      height: "14px",
                      width: "120px",
                      borderRadius: "4px",
                      background:
                        "linear-gradient(90deg, var(--bg-surface-2), var(--bg-surface-3), var(--bg-surface-2))",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.4s infinite",
                    }}
                  />
                ) : shopName ? (
                  <>
                    <p
                      style={{
                        color: "var(--text)",
                        fontSize: "14px",
                        fontWeight: "700",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.2px",
                      }}
                      title={shopName}
                    >
                      {shopName}
                    </p>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "10px",
                        margin: "2px 0 0 0",
                        letterSpacing: "0.3px",
                        textTransform: "uppercase",
                      }}
                    >
                      {panelLabel}
                    </p>
                  </>
                ) : (
                  // No name in DB → show ONLY the panel label, no placeholder
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      fontWeight: "700",
                      margin: 0,
                      letterSpacing: "0.3px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {panelLabel}
                  </p>
                )}
              </div>
            )}
          </div>

          <nav style={{ flex: 1, overflowY: "auto", marginBottom: "16px" }}>
            {navItems.length === 0 ? (
              <div
                style={{
                  padding: "20px 12px",
                  color: "var(--text-dim)",
                  fontSize: "13px",
                  textAlign: "center",
                }}
              >
                {!isCollapsed && (
                  <>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                      🔒
                    </div>
                    <p style={{ margin: 0 }}>
                      No permissions assigned.
                      <br />
                      Contact your admin.
                    </p>
                  </>
                )}
              </div>
            ) : (
              navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/admin" &&
                    location.pathname === "/admin/dashboard") ||
                  (item.path === "/member/dashboard" &&
                    location.pathname === "/member");
                return (
                  <div
                    key={item.path}
                    style={{ position: "relative", marginBottom: "4px" }}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link
                      to={item.path}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        gap: isCollapsed ? "0" : "12px",
                        padding: isCollapsed ? "12px" : "10px 16px",
                        borderRadius: "8px",
                        color: isActive ? "var(--text)" : "var(--text-muted)",
                        backgroundColor: isActive
                          ? "var(--approved-bg)"
                          : "transparent",
                        textDecoration: "none",
                        transition: "all 0.2s",
                        cursor: "pointer",
                        minHeight: "44px",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor =
                            "var(--bg-surface-2)";
                          e.currentTarget.style.color = "var(--text)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }
                      }}
                    >
                      <span style={{ fontSize: isCollapsed ? "22px" : "18px" }}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: isActive ? "600" : "400",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>

                    {isCollapsed && hoveredItem === item.path && (
                      <div
                        style={{
                          position: "fixed",
                          left: "75px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          backgroundColor: "var(--bg-surface)",
                          color: "var(--text)",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          border: "1px solid var(--border)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                          zIndex: 1000,
                          whiteSpace: "nowrap",
                          pointerEvents: "none",
                        }}
                      >
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </nav>

          <div
            style={{
              padding: isCollapsed ? "12px 8px" : "16px 4px",
              borderTop: "1px solid var(--border)",
              textAlign: isCollapsed ? "center" : "left",
              flexShrink: 0,
              marginTop: "auto",
            }}
          >
            {!isCollapsed ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-surface-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-text)",
                      fontWeight: "bold",
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {user?.full_name?.charAt(0) || user?.name?.charAt(0) || "U"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--text)",
                        fontSize: "14px",
                        fontWeight: "500",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user?.full_name ||
                        user?.name ||
                        user?.username ||
                        "User"}
                    </div>
                    <div
                      style={{ color: "var(--text-muted)", fontSize: "12px" }}
                    >
                      {isAdmin
                        ? "Admin"
                        : isManager
                          ? "Manager"
                          : user?.role || "Member"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    color: "var(--debit)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(239, 68, 68, 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(239, 68, 68, 0.15)";
                  }}
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-surface-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-text)",
                    fontWeight: "bold",
                    fontSize: "16px",
                    margin: "0 auto 12px",
                  }}
                >
                  {user?.full_name?.charAt(0) || user?.name?.charAt(0) || "U"}
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    color: "var(--debit)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(239, 68, 68, 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(239, 68, 68, 0.15)";
                  }}
                >
                  🚪
                </button>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            marginLeft: isMobile ? "0" : sidebarWidth,
            flex: 1,
            minHeight: "100vh",
            backgroundColor: "var(--bg-app)",
            transition: "margin-left 0.3s ease, background-color 0.25s ease",
            width: isMobile ? "100%" : `calc(100% - ${sidebarWidth})`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Navbar
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          />

          <div
            style={{
              padding: "32px",
              flex: 1,
              maxWidth: "1400px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default Layout;
