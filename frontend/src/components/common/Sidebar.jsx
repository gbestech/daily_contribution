// // src/components/common/Sidebar.jsx
// import React from "react";
// import { Link, useLocation, useNavigate } from "react-router-dom";
// import { useAuth } from "../../context/AuthContext";

// const Sidebar = ({ isOpen, setIsOpen }) => {
//   const { user, logout } = useAuth();
//   const location = useLocation();
//   const navigate = useNavigate();
//   const isAdmin = user?.role === "admin";

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   const getNavItems = () => {
//     if (isAdmin) {
//       return [
//         { path: "/admin", icon: "📊", label: "Dashboard" },
//         { path: "/admin/members", icon: "👥", label: "Members" },
//         { path: "/admin/transactions", icon: "💰", label: "Transactions" },
//         { path: "/admin/pending", icon: "⏳", label: "Pending Approvals" },
//         { path: "/admin/reports", icon: "📈", label: "Reports" },
//         { path: "/admin/settings", icon: "⚙️", label: "Settings" },
//       ];
//     } else {
//       return [
//         { path: "/member", icon: "🏠", label: "Dashboard" },
//         { path: "/member/deposit", icon: "💰", label: "Deposit" },
//         { path: "/member/withdraw", icon: "💸", label: "Withdraw" },
//         { path: "/member/transfer", icon: "🔄", label: "Transfer" },
//         { path: "/member/transactions", icon: "📊", label: "History" },
//         { path: "/member/profile", icon: "👤", label: "Profile" },
//       ];
//     }
//   };

//   const navItems = getNavItems();

//   // Check if sidebar should be visible
//   const isMobile = window.innerWidth < 768;

//   return (
//     <>
//       {/* Overlay for mobile */}
//       {isOpen && isMobile && (
//         <div
//           onClick={() => setIsOpen(false)}
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "rgba(0,0,0,0.5)",
//             zIndex: 999,
//           }}
//         />
//       )}

//       {/* Sidebar */}
//       <div
//         style={{
//           position: "fixed",
//           top: 0,
//           left: 0,
//           height: "100vh",
//           width: "280px",
//           backgroundColor: "#1e293b",
//           borderRight: "1px solid rgba(255,255,255,0.1)",
//           display: "flex",
//           flexDirection: "column",
//           transition: "transform 0.3s ease-in-out",
//           transform: isOpen ? "translateX(0)" : "translateX(-100%)",
//           zIndex: 1000,
//           overflowY: "auto",
//         }}
//       >
//         {/* Close button for mobile */}
//         {isMobile && (
//           <button
//             onClick={() => setIsOpen(false)}
//             style={{
//               position: "absolute",
//               top: "12px",
//               right: "12px",
//               background: "none",
//               border: "none",
//               color: "#9ca3af",
//               fontSize: "24px",
//               cursor: "pointer",
//             }}
//           >
//             ✕
//           </button>
//         )}

//         {/* Logo/Header */}
//         <div
//           style={{
//             padding: "24px 20px",
//             borderBottom: "1px solid rgba(255,255,255,0.1)",
//             display: "flex",
//             alignItems: "center",
//             gap: "12px",
//           }}
//         >
//           <span style={{ fontSize: "32px" }}>🏦</span>
//           <div>
//             <h2
//               style={{
//                 color: "white",
//                 margin: 0,
//                 fontSize: "20px",
//                 fontWeight: "bold",
//               }}
//             >
//               Vault App
//             </h2>
//             <p style={{ color: "#9ca3af", margin: 0, fontSize: "12px" }}>
//               {isAdmin ? "Admin Panel" : "Member Panel"}
//             </p>
//           </div>
//         </div>

//         {/* User Info */}
//         <div
//           style={{
//             padding: "16px 20px",
//             borderBottom: "1px solid rgba(255,255,255,0.1)",
//             display: "flex",
//             alignItems: "center",
//             gap: "12px",
//           }}
//         >
//           <div
//             style={{
//               width: "40px",
//               height: "40px",
//               borderRadius: "50%",
//               backgroundColor: "rgba(16, 185, 129, 0.2)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               color: "#34d399",
//               fontWeight: "bold",
//               fontSize: "18px",
//             }}
//           >
//             {user?.name?.charAt(0) || "U"}
//           </div>
//           <div style={{ flex: 1 }}>
//             <p
//               style={{
//                 color: "white",
//                 margin: 0,
//                 fontSize: "14px",
//                 fontWeight: "500",
//               }}
//             >
//               {user?.name || "User"}
//             </p>
//             <p style={{ color: "#9ca3af", margin: 0, fontSize: "12px" }}>
//               {user?.accountNumber || "No account"}
//             </p>
//           </div>
//           <span
//             style={{
//               padding: "2px 10px",
//               borderRadius: "12px",
//               fontSize: "10px",
//               fontWeight: "600",
//               backgroundColor: isAdmin
//                 ? "rgba(234, 179, 8, 0.2)"
//                 : "rgba(16, 185, 129, 0.2)",
//               color: isAdmin ? "#fbbf24" : "#34d399",
//             }}
//           >
//             {isAdmin ? "Admin" : "Member"}
//           </span>
//         </div>

//         {/* Navigation */}
//         <nav
//           style={{
//             flex: 1,
//             padding: "16px 12px",
//             overflowY: "auto",
//           }}
//         >
//           {navItems.map((item) => {
//             const isActive =
//               location.pathname === item.path ||
//               (item.path !== "/admin" &&
//                 item.path !== "/member" &&
//                 location.pathname.startsWith(item.path));

//             return (
//               <Link
//                 key={item.path}
//                 to={item.path}
//                 onClick={() => {
//                   if (isMobile) {
//                     setIsOpen(false);
//                   }
//                 }}
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "12px",
//                   padding: "12px 16px",
//                   marginBottom: "4px",
//                   borderRadius: "8px",
//                   backgroundColor: isActive
//                     ? "rgba(16, 185, 129, 0.15)"
//                     : "transparent",
//                   color: isActive ? "#34d399" : "#d1d5db",
//                   textDecoration: "none",
//                   transition: "all 0.2s",
//                   cursor: "pointer",
//                 }}
//                 onMouseEnter={(e) => {
//                   if (!isActive) {
//                     e.target.style.backgroundColor = "rgba(255,255,255,0.05)";
//                   }
//                 }}
//                 onMouseLeave={(e) => {
//                   if (!isActive) {
//                     e.target.style.backgroundColor = "transparent";
//                   }
//                 }}
//               >
//                 <span style={{ fontSize: "20px", width: "28px" }}>
//                   {item.icon}
//                 </span>
//                 <span style={{ fontSize: "14px", fontWeight: "500" }}>
//                   {item.label}
//                 </span>
//                 {isActive && (
//                   <span
//                     style={{
//                       marginLeft: "auto",
//                       width: "4px",
//                       height: "24px",
//                       backgroundColor: "#10b981",
//                       borderRadius: "2px",
//                     }}
//                   />
//                 )}
//               </Link>
//             );
//           })}
//         </nav>

//         {/* Logout Button */}
//         <div
//           style={{
//             padding: "16px 12px",
//             borderTop: "1px solid rgba(255,255,255,0.1)",
//           }}
//         >
//           <button
//             onClick={handleLogout}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "12px",
//               width: "100%",
//               padding: "12px 16px",
//               borderRadius: "8px",
//               backgroundColor: "rgba(239, 68, 68, 0.1)",
//               color: "#f87171",
//               border: "none",
//               cursor: "pointer",
//               fontSize: "14px",
//               fontWeight: "500",
//               transition: "all 0.2s",
//             }}
//             onMouseEnter={(e) =>
//               (e.target.style.backgroundColor = "rgba(239, 68, 68, 0.2)")
//             }
//             onMouseLeave={(e) =>
//               (e.target.style.backgroundColor = "rgba(239, 68, 68, 0.1)")
//             }
//           >
//             <span style={{ fontSize: "20px" }}>🚪</span>
//             Logout
//           </button>
//         </div>
//       </div>
//     </>
//   );
// };

// export default Sidebar;

// src/components/common/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Admin Navigation Items
  const adminNav = [
    { path: "/admin", icon: "📊", label: "Dashboard" },
    { path: "/admin/members", icon: "👥", label: "Members" },
    { path: "/admin/transactions", icon: "💰", label: "Transactions" },
    { path: "/admin/pending", icon: "⏳", label: "Pending Approvals" },
    { path: "/admin/reports", icon: "📈", label: "Reports" },
    { path: "/admin/settings", icon: "⚙️", label: "Settings" },
  ];

  // Member Navigation Items
  const memberNav = [
    { path: "/member", icon: "🏠", label: "Dashboard" },
    { path: "/member/deposit", icon: "💰", label: "Deposit" },
    { path: "/member/withdraw", icon: "💸", label: "Withdraw" },
    { path: "/member/transfer", icon: "🔄", label: "Transfer" },
    { path: "/member/history", icon: "📊", label: "History" },
    { path: "/member/profile", icon: "👤", label: "Profile" },
  ];

  const navItems = isAdmin ? adminNav : memberNav;

  const isActivePath = (path) => {
    if (path === "/admin" || path === "/member") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "280px",
          backgroundColor: "#1e293b",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          transition: "transform 0.3s ease-in-out",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          zIndex: 1000,
          overflowY: "auto",
        }}
      >
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "none",
              border: "none",
              color: "#9ca3af",
              fontSize: "24px",
              cursor: "pointer",
              zIndex: 1001,
            }}
          >
            ✕
          </button>
        )}

        {/* Logo */}
        <div
          style={{
            padding: "24px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "32px" }}>🏦</span>
          <div>
            <h2
              style={{
                color: "white",
                margin: 0,
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              Vault App
            </h2>
            <p style={{ color: "#9ca3af", margin: 0, fontSize: "12px" }}>
              {isAdmin ? "Admin Panel" : "Member Panel"}
            </p>
          </div>
        </div>

        {/* User Info */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
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
              fontSize: "18px",
            }}
          >
            {user?.name?.charAt(0) || "U"}
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                color: "white",
                margin: 0,
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              {user?.name || "User"}
            </p>
            <p style={{ color: "#9ca3af", margin: 0, fontSize: "12px" }}>
              {user?.email || "No email"}
            </p>
          </div>
          <span
            style={{
              padding: "2px 10px",
              borderRadius: "12px",
              fontSize: "10px",
              fontWeight: "600",
              backgroundColor: isAdmin
                ? "rgba(234, 179, 8, 0.2)"
                : "rgba(16, 185, 129, 0.2)",
              color: isAdmin ? "#fbbf24" : "#34d399",
            }}
          >
            {isAdmin ? "Admin" : "Member"}
          </span>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "16px 12px",
            overflowY: "auto",
          }}
        >
          {navItems.map((item) => {
            const isActive = isActivePath(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (isMobile) {
                    setIsOpen(false);
                  }
                  console.log("Navigating to:", item.path);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  marginBottom: "4px",
                  borderRadius: "8px",
                  backgroundColor: isActive
                    ? "rgba(16, 185, 129, 0.15)"
                    : "transparent",
                  color: isActive ? "#34d399" : "#d1d5db",
                  textDecoration: "none",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: "20px", width: "28px" }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: "14px", fontWeight: "500" }}>
                  {item.label}
                </span>
                {isActive && (
                  <span
                    style={{
                      marginLeft: "auto",
                      width: "4px",
                      height: "24px",
                      backgroundColor: "#10b981",
                      borderRadius: "2px",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div
          style={{
            padding: "16px 12px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#f87171",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)")
            }
          >
            <span style={{ fontSize: "20px" }}>🚪</span>
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
