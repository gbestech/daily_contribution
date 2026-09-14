// src/components/common/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemePicker from "../ThemePicker";

const API_BASE_URL = "http://localhost:8000";

const Navbar = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [shopName, setShopName] = useState("Osittech");

  const isAdmin = user?.role === "admin" || user?.role === "administrator";

  // Fetch shop name from settings
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
      }
    };

    fetchShopName();
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdown when route changes
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("/admin/members")) return "Members Management";
    if (path.includes("/admin/transactions")) return "Transactions";
    if (path.includes("/admin/pending")) return "Pending Approvals";
    if (path.includes("/admin/reports")) return "Reports & Analytics";
    if (path.includes("/admin/users")) return "User Management";
    if (path.includes("/admin/settings")) return "Settings";
    if (path.includes("/admin/profile")) return "Profile";
    if (path.includes("/admin")) return "Dashboard";
    if (path.includes("/member/deposit")) return "Deposit";
    if (path.includes("/member/withdraw")) return "Withdraw";
    if (path.includes("/member/transfer")) return "Transfer";
    if (path.includes("/member/history")) return "Transaction History";
    if (path.includes("/member/profile")) return "Profile";
    if (path.includes("/member")) return "Dashboard";
    return "Dashboard";
  };

  const navItems = isAdmin
    ? [
        { path: "/admin", label: "Dashboard", icon: "📊" },
        { path: "/admin/members", label: "Members", icon: "👥" },
        { path: "/admin/transactions", label: "Transactions", icon: "💳" },
        { path: "/admin/pending", label: "Pending", icon: "⏳" },
        { path: "/admin/reports", label: "Reports", icon: "📈" },
        { path: "/admin/users", label: "Users", icon: "👤" },
        { path: "/admin/settings", label: "Settings", icon: "⚙️" },
        { path: "/admin/profile", label: "Profile", icon: "👤" },
      ]
    : [
        { path: "/member", label: "Dashboard", icon: "📊" },
        { path: "/member/deposit", label: "Deposit", icon: "💰" },
        { path: "/member/withdraw", label: "Withdraw", icon: "💸" },
        { path: "/member/transfer", label: "Transfer", icon: "🔄" },
        { path: "/member/history", label: "History", icon: "📜" },
        { path: "/member/profile", label: "Profile", icon: "👤" },
      ];

  const isMobile = windowWidth < 768;

  return (
    <>
      {/* Navbar */}
      <nav
        style={{
          backgroundColor: scrolled ? "var(--bg-app)" : "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 16px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          transition: "all 0.3s ease",
          boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {/* Left Section - Collapse Toggle & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={toggleSidebar}
            style={{
              background: "none",
              border: "none",
              color: "var(--text)",
              fontSize: isMobile ? "22px" : "18px",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-surface-3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            title={
              isMobile
                ? isMobileOpen
                  ? "Close Menu"
                  : "Open Menu"
                : isCollapsed
                  ? "Expand Sidebar"
                  : "Collapse Sidebar"
            }
          >
            {isMobile ? (isMobileOpen ? "✕" : "☰") : isCollapsed ? "▶" : "◀"}
          </button>

          <Link
            to={isAdmin ? "/admin" : "/member"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "22px" }}>🏦</span>
            <span
              style={{
                color: "var(--text)",
                fontSize: "16px",
                fontWeight: "bold",
                display: windowWidth < 640 ? "none" : "block",
              }}
            >
              {shopName}
            </span>
          </Link>

          <span
            style={{
              color: "var(--text-muted)",
              fontSize: "13px",
              marginLeft: "4px",
              display: windowWidth < 768 ? "none" : "inline",
            }}
          >
            / {getPageTitle()}
          </span>
        </div>

        {/* Right Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* ✅ Theme Picker — placed here so it's on every page */}
          {!isMobile && <ThemePicker />}

          {/* Role Badge */}
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "10px",
              fontWeight: "600",
              backgroundColor: isAdmin
                ? "rgba(239, 68, 68, 0.2)"
                : "rgba(16, 185, 129, 0.2)",
              color: isAdmin ? "var(--debit)" : "var(--accent-text)",
              border: `1px solid ${
                isAdmin ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"
              }`,
              display: windowWidth < 640 ? "none" : "inline-block",
            }}
          >
            {isAdmin ? "👑 Admin" : "👤 Member"}
          </span>

          {/* User Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "8px",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-surface-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "var(--bg-surface-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-text)",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {user?.full_name?.charAt(0) || user?.name?.charAt(0) || "U"}
              </div>
              <div
                style={{
                  textAlign: "left",
                  display: windowWidth < 640 ? "none" : "block",
                }}
              >
                <div
                  style={{
                    color: "var(--text)",
                    fontSize: "13px",
                    fontWeight: "500",
                    lineHeight: "1.2",
                    maxWidth: "120px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.full_name || user?.name || user?.username || "User"}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "10px",
                    lineHeight: "1.2",
                    maxWidth: "120px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.email || ""}
                </div>
              </div>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "10px",
                  display: windowWidth < 640 ? "none" : "inline",
                }}
              >
                {isDropdownOpen ? "▲" : "▼"}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  minWidth: "200px",
                  padding: "8px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {user?.full_name || user?.name || "User"}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    {user?.email || ""}
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "10px",
                      fontWeight: "600",
                      display: "inline-block",
                      backgroundColor: isAdmin
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(16, 185, 129, 0.2)",
                      color: isAdmin ? "var(--debit)" : "var(--accent-text)",
                    }}
                  >
                    {isAdmin ? "Administrator" : "Member"}
                  </div>
                </div>

                <Link
                  to={isAdmin ? "/admin/profile" : "/member/profile"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 16px",
                    color: "var(--text)",
                    textDecoration: "none",
                    borderRadius: "8px",
                    transition: "background-color 0.2s",
                    fontSize: "13px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--bg-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span>👤</span> Profile
                </Link>

                <Link
                  to={isAdmin ? "/admin/settings" : "/member/settings"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 16px",
                    color: "var(--text)",
                    textDecoration: "none",
                    borderRadius: "8px",
                    transition: "background-color 0.2s",
                    fontSize: "13px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--bg-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span>⚙️</span> Settings
                </Link>

                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    marginTop: "4px",
                    paddingTop: "4px",
                  }}
                >
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      color: "var(--debit)",
                      background: "none",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      width: "100%",
                      fontSize: "13px",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(239, 68, 68, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMobileOpen && window.innerWidth < 768 && (
        <div
          style={{
            position: "fixed",
            top: "64px",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "var(--bg-app)",
            zIndex: 99,
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {/* Theme picker on mobile too */}
            <div style={{ marginBottom: "16px" }}>
              <ThemePicker />
            </div>

            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    color: isActive ? "var(--text)" : "var(--text-muted)",
                    backgroundColor: isActive
                      ? "var(--approved-bg)"
                      : "transparent",
                    textDecoration: "none",
                    fontSize: "15px",
                    fontWeight: isActive ? "600" : "400",
                    transition: "all 0.2s",
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
                  <span style={{ fontSize: "20px" }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}

            <div
              style={{
                borderTop: "1px solid var(--border)",
                marginTop: "16px",
                paddingTop: "16px",
              }}
            >
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  color: "var(--debit)",
                  background: "none",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  width: "100%",
                  fontSize: "15px",
                  fontWeight: "500",
                  transition: "background-color 0.2s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(239, 68, 68, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span>🚪</span> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
