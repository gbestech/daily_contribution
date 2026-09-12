// src/components/common/Layout.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../context/PermissionsContext";
import Navbar from "./Navbar";

const API_BASE_URL = "http://localhost:8000";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { can } = usePermission();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shopName, setShopName] = useState("Osittech");
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Normalize the role so "Admin" / " admin " / "ADMIN" all match
  const role = String(user?.role || "")
    .trim()
    .toLowerCase();
  const isAdmin = role === "admin" || role === "administrator";
  const isManager = role === "manager";

  // ----------------------------------------------------------
  // Fetch shop name from settings
  // ----------------------------------------------------------
  useEffect(() => {
    const fetchShopName = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings.php`);
        const data = await response.json();

        if (data.status && data.data && data.data.general) {
          const general = data.data.general;
          if (general.shop_name) {
            setShopName(general.shop_name);
          }
        }
      } catch (error) {
        console.error("Error fetching shop name:", error);
        setShopName("Osittech");
      } finally {
        setLoading(false);
      }
    };

    fetchShopName();
  }, []);

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

  // ----------------------------------------------------------
  // Nav items — every item declares the permission it needs
  // ----------------------------------------------------------
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
      path: "/admin/users",
      label: "Users",
      icon: "👤",
      permission: "create_member",
    },
    {
      path: "/admin/expenses",
      label: "Expenses",
      icon: "💸",
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
      path: "/admin/settings",
      label: "Settings",
      icon: "⚙️",
      permission: "manage_settings",
    },
    {
      path: "/admin/profile",
      label: "Profile",
      icon: "👤",
      permission: "view_dashboard",
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
      path: "/member/profile",
      label: "Profile",
      icon: "👤",
      permission: "view_dashboard",
    },
  ];

  // Admin + Manager → admin sidebar; Member → member sidebar
  const rawItems = isAdmin || isManager ? adminNavItems : memberNavItems;

  // Filter by permission (now includes role-level grants)
  const navItems = rawItems.filter((item) => can(item.permission));

  // Debug (remove in production)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      "[Layout] role:",
      role,
      "| navItems:",
      navItems.map((i) => i.label),
    );
  }, [role, navItems]);

  const sidebarWidth = isCollapsed ? "70px" : "250px";

  return (
    <>
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 998,
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: "#0f172a",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: isMobile ? (isMobileOpen ? "280px" : "0px") : sidebarWidth,
            backgroundColor: "#1e293b",
            padding: isCollapsed ? "12px" : "20px",
            borderRight: "1px solid rgba(255,255,255,0.05)",
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
          {/* Header Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              marginBottom: "32px",
              padding: isCollapsed ? "0" : "0 4px",
              flexShrink: 0,
            }}
          >
            {!isCollapsed && (
              <div style={{ textAlign: "left" }}>
                <h2
                  style={{
                    color: "white",
                    fontSize: "18px",
                    fontWeight: "bold",
                    margin: 0,
                  }}
                >
                  🏦 {shopName}
                </h2>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "10px",
                    margin: "2px 0 0 0",
                  }}
                >
                  {isAdmin
                    ? "Admin Panel"
                    : isManager
                      ? "Manager Panel"
                      : "Member Panel"}
                </p>
              </div>
            )}
            {isCollapsed && (
              <div style={{ textAlign: "center", width: "100%" }}>
                <span style={{ fontSize: "24px" }}>🏦</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav
            style={{
              flex: 1,
              overflowY: "auto",
              marginBottom: "16px",
            }}
          >
            {navItems.length === 0 ? (
              <div
                style={{
                  padding: "20px 12px",
                  color: "#64748b",
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
                    style={{
                      position: "relative",
                      marginBottom: "4px",
                    }}
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
                        color: isActive ? "white" : "#94a3b8",
                        backgroundColor: isActive
                          ? "rgba(16, 185, 129, 0.15)"
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
                            "rgba(255,255,255,0.05)";
                          e.currentTarget.style.color = "white";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#94a3b8";
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
                          backgroundColor: "#1e293b",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          border: "1px solid rgba(255,255,255,0.1)",
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

          {/* User Info Section */}
          <div
            style={{
              padding: isCollapsed ? "12px 8px" : "16px 4px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
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
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#34d399",
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
                        color: "white",
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
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
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
                    color: "#f87171",
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
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#34d399",
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
                    color: "#f87171",
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

        {/* Main Content */}
        <div
          style={{
            marginLeft: isMobile ? "0" : sidebarWidth,
            flex: 1,
            minHeight: "100vh",
            backgroundColor: "#0f172a",
            transition: "margin-left 0.3s ease",
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
