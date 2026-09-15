// src/components/common/Navbar.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const API_BASE_URL = "http://localhost:8000";

// ============================================================
// VOICE ROUTES — edit these to match your real paths
// ============================================================
const ADMIN_VOICE_ROUTES = [
  {
    keywords: ["dashboard", "home", "main", "admin"],
    path: "/admin",
    label: "Dashboard",
  },
  { keywords: ["member", "members"], path: "/admin/members", label: "Members" },
  {
    keywords: ["transaction", "transactions"],
    path: "/admin/transactions",
    label: "Transactions",
  },
  {
    keywords: ["pending", "approvals", "pending approvals"],
    path: "/admin/pending",
    label: "Pending Approvals",
  },
  {
    keywords: ["report", "reports", "analytics"],
    path: "/admin/reports",
    label: "Reports & Analytics",
  },
  {
    keywords: ["user", "users"],
    path: "/admin/users",
    label: "User Management",
  },
  {
    keywords: ["staff", "staff role", "staff roles", "role", "roles"],
    path: "/admin/staff-roles",
    label: "Staff Roles",
  },
  {
    keywords: ["settings", "setting", "config"],
    path: "/admin/settings",
    label: "Settings",
  },
  {
    keywords: ["profile", "account", "my profile"],
    path: "/admin/profile",
    label: "Profile",
  },
  {
    keywords: ["broadsheet", "ledger", "broad"],
    path: "/admin/broadsheet",
    label: "Broadsheet",
  },
  { keywords: ["loan", "loans"], path: "/admin/loans", label: "Loans" },
  {
    keywords: ["expense", "expenses"],
    path: "/admin/expenses",
    label: "Expenses",
  },
];

const MEMBER_VOICE_ROUTES = [
  {
    keywords: ["dashboard", "home", "main"],
    path: "/member",
    label: "Dashboard",
  },
  {
    keywords: ["deposit", "add money", "top up"],
    path: "/member/deposit",
    label: "Deposit",
  },
  {
    keywords: ["withdraw", "withdrawal"],
    path: "/member/withdraw",
    label: "Withdraw",
  },
  {
    keywords: ["transfer", "send money"],
    path: "/member/transfer",
    label: "Transfer",
  },
  {
    keywords: ["history", "transactions"],
    path: "/member/history",
    label: "Transaction History",
  },
  { keywords: ["loan", "loans"], path: "/member/loans", label: "Loans" },
  {
    keywords: ["profile", "account"],
    path: "/member/profile",
    label: "Profile",
  },
  {
    keywords: ["broadsheet", "ledger"],
    path: "/member/broadsheet",
    label: "Broadsheet",
  },
];

const Navbar = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { user, logout } = useAuth();
  const { themeKey, setTheme, availableThemes } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [shopName, setShopName] = useState("Osittech");

  const themeDropdownRef = useRef(null);
  const mobileThemeDropdownRef = useRef(null);

  // ===== VOICE STATE =====
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const voiceRecognitionRef = useRef(null);
  const voiceFeedbackTimerRef = useRef(null);
  const voiceRoutesRef = useRef([]);
  const manualStopRef = useRef(false);
  const lastActionRef = useRef(0);

  const currentTheme = availableThemes.find((t) => t.key === themeKey) ||
    availableThemes[0] || { name: "Theme", icon: "🎨" };

  const isAdmin = user?.role === "admin" || user?.role === "administrator";

  // Fetch shop name
  useEffect(() => {
    const fetchShopName = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings.php`);
        const data = await response.json();
        if (data.status && data.data && data.data.general) {
          const general = data.data.general;
          if (general.shop_name) setShopName(general.shop_name);
        }
      } catch (error) {
        console.error("Error fetching shop name:", error);
        setShopName("Osittech");
      }
    };
    fetchShopName();
  }, []);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsThemeDropdownOpen(false);
  }, [location]);

  // Close theme dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(e.target) &&
        mobileThemeDropdownRef.current &&
        !mobileThemeDropdownRef.current.contains(e.target)
      ) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================================================
  // ===== VOICE ASSISTANT =====
  // ============================================================

  const speak = useCallback((text) => {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1;
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* silent */
    }
  }, []);

  const showVoiceFeedback = useCallback((msg, ms = 3500) => {
    setVoiceFeedback(msg);
    if (voiceFeedbackTimerRef.current) {
      clearTimeout(voiceFeedbackTimerRef.current);
    }
    voiceFeedbackTimerRef.current = setTimeout(() => setVoiceFeedback(""), ms);
  }, []);

  // Fire a route — throttled so we don't double-fire
  const fireRoute = useCallback(
    (route) => {
      const now = Date.now();
      if (now - lastActionRef.current < 2500) return;
      lastActionRef.current = now;

      navigate(route.path);
      showVoiceFeedback(`📂 Opening ${route.label}`);
      speak(`Opening ${route.label}`);
    },
    [navigate, showVoiceFeedback, speak],
  );

  // Match a phrase against route map. Returns { route, score } or null.
  const matchRoute = useCallback((rawText) => {
    const text = rawText.toLowerCase().trim();
    if (!text) return null;

    const cleaned = text
      .replace(
        /^(please\s+)?(open|go to|goto|show|show me|take me to|navigate to|switch to|bring up|launch)\s+/i,
        "",
      )
      .replace(/^(the|a|an|my)\s+/i, "")
      .trim();

    const routes = voiceRoutesRef.current;
    let best = null;
    let bestScore = 0;

    for (const r of routes) {
      let score = 0;
      for (const kw of r.keywords) {
        if (cleaned === kw) {
          score += 100;
        } else if (cleaned.includes(kw)) {
          score += 50 + kw.length;
        } else {
          const words = cleaned.split(/\s+/).filter(Boolean);
          for (const w of words) {
            if (w.length < 3) continue;
            if (kw === w) score += 20;
            else if (kw.startsWith(w) || w.startsWith(kw)) score += 10;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }

    if (bestScore < 15) return null;
    return { route: best, score: bestScore };
  }, []);

  const handleVoicePhrase = useCallback(
    (raw) => {
      setVoiceTranscript(raw);

      const text = raw.toLowerCase().trim();

      // Help
      if (text.includes("help") || text.includes("what can i say")) {
        const pages = voiceRoutesRef.current
          .map((r) => r.label)
          .slice(0, 6)
          .join(", ");
        const helpMsg = `You can say: open ${pages.split(", ").join(", open ")}.`;
        showVoiceFeedback("ℹ️ " + helpMsg, 6000);
        speak(helpMsg);
        return;
      }

      // Stop / cancel
      if (
        text === "stop" ||
        text === "cancel" ||
        text === "close" ||
        text === "stop listening" ||
        text === "shut up" ||
        text === "be quiet"
      ) {
        manualStopRef.current = true;
        try {
          voiceRecognitionRef.current?.stop();
        } catch (e) {}
        setIsVoiceListening(false);
        showVoiceFeedback("🛑 Stopped");
        return;
      }

      // Match and fire — ONE time only
      const match = matchRoute(raw);
      if (match) {
        fireRoute(match.route);
      } else {
        showVoiceFeedback(
          `🤔 Didn't catch "${raw}". Try "open reports".`,
          3000,
        );
      }
    },
    [matchRoute, fireRoute, showVoiceFeedback, speak],
  );

  const voiceHandlerRef = useRef(handleVoicePhrase);
  useEffect(() => {
    voiceHandlerRef.current = handleVoicePhrase;
  }, [handleVoicePhrase]);

  // Init speech recognition once
  useEffect(() => {
    const role = isAdmin ? "admin" : "member";
    voiceRoutesRef.current =
      role === "admin" ? ADMIN_VOICE_ROUTES : MEMBER_VOICE_ROUTES;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      setVoiceError("Browser does not support SpeechRecognition");
      return;
    }

    const rec = new SpeechRecognition();

    // Fast but NOT repeating — final results only, single shot
    rec.continuous = false; // stop after one phrase
    rec.interimResults = true; // show live text but don't act on it
    rec.lang = "en-US";
    rec.maxAlternatives = 5;

    let restartTimeout = null;

    rec.onstart = () => {
      setIsVoiceListening(true);
      setVoiceError("");
      setVoiceFeedback("🎤 Listening — say a page name");
    };

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        // Show live transcript while speaking, but do NOT execute
        const liveText = result[0].transcript;
        if (!result.isFinal) {
          setVoiceTranscript(liveText);
          continue;
        }

        // Only fire on FINAL result — one time only
        let bestText = result[0].transcript;
        let bestScore = -1;
        for (let j = 0; j < result.length; j++) {
          const alt = result[j].transcript;
          const m = matchRoute(alt);
          const s = m ? m.score : 0;
          if (s > bestScore) {
            bestScore = s;
            bestText = alt;
          }
        }

        // Prevent auto-restart after this command
        manualStopRef.current = true;
        try {
          rec.stop();
        } catch (e) {}

        voiceHandlerRef.current(bestText);
      }
    };

    rec.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        manualStopRef.current = true;
        setIsVoiceListening(false);
        setVoiceError("Microphone permission denied");
        showVoiceFeedback("🚫 Mic permission denied");
        return;
      }
      setVoiceError(event.error);
      showVoiceFeedback(`⚠️ Voice error: ${event.error}`, 3000);
    };

    rec.onend = () => {
      // NEVER auto-restart — one click = one command
      setIsVoiceListening(false);
    };

    voiceRecognitionRef.current = rec;

    return () => {
      manualStopRef.current = true;
      clearTimeout(restartTimeout);
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.abort();
        } catch (e) {}
      }
      if (voiceFeedbackTimerRef.current) {
        clearTimeout(voiceFeedbackTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const startListening = useCallback(() => {
    if (!voiceSupported || !voiceRecognitionRef.current) return;
    manualStopRef.current = false;
    setVoiceError("");
    try {
      voiceRecognitionRef.current.start();
    } catch (e) {
      /* already started */
    }
  }, [voiceSupported]);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.stop();
      } catch (e) {}
    }
    setIsVoiceListening(false);
    setVoiceFeedback("");
    setVoiceTranscript("");
  }, []);

  const toggleVoice = useCallback(() => {
    if (isVoiceListening) stopListening();
    else startListening();
  }, [isVoiceListening, startListening, stopListening]);

  // Ctrl+M shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleVoice();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleVoice]);

  // ============================================================
  // ===== END VOICE ASSISTANT =====
  // ============================================================

  const handleLogout = () => {
    stopListening();
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

  const getSwatchBackground = (key) => {
    switch (key) {
      case "light":
        return "linear-gradient(135deg, #ffffff 50%, #e2e8f0 50%)";
      case "dark":
        return "linear-gradient(135deg, #1e293b 50%, #0f172a 50%)";
      case "forest":
        return "linear-gradient(135deg, #22c55e 50%, #0d1a12 50%)";
      case "midnight":
        return "linear-gradient(135deg, #6366f1 50%, #0a0e27 50%)";
      case "grey":
        return "linear-gradient(135deg, #8e8e93 50%, #1c1c1e 50%)";
      default:
        return "#475569";
    }
  };

  const renderThemeOptions = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <div
        style={{
          padding: "6px 10px",
          fontSize: "10px",
          fontWeight: "600",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Choose Theme
      </div>

      {availableThemes.map((t) => {
        const isActive = t.key === themeKey;
        return (
          <button
            key={t.key}
            onClick={() => {
              setTheme(t.key);
              setIsThemeDropdownOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "8px 10px",
              background: isActive ? "var(--approved-bg)" : "transparent",
              border: "none",
              borderRadius: "6px",
              color: isActive ? "var(--accent-text)" : "var(--text)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: isActive ? "600" : "400",
              textAlign: "left",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.backgroundColor = "var(--bg-surface-2)";
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span
              style={{
                display: "inline-flex",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: "1px solid var(--border)",
                overflow: "hidden",
                flexShrink: 0,
                background: getSwatchBackground(t.key),
              }}
            />
            <span style={{ fontSize: "15px" }}>{t.icon}</span>
            <span style={{ flex: 1 }}>{t.name}</span>
            {isActive && (
              <span style={{ fontSize: "12px", color: "var(--accent-text)" }}>
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
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
          boxShadow: scrolled ? "var(--shadow-md)" : "none",
        }}
      >
        {/* ===== Left Section ===== */}
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

        {/* ===== Right Section ===== */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Voice Assistant (desktop only) */}
          {!isMobile && voiceSupported && (
            <button
              onClick={toggleVoice}
              title={
                isVoiceListening
                  ? "Stop listening (Ctrl+M)"
                  : "Voice — say 'open reports', 'open users', 'help' (Ctrl+M)"
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "20px",
                border: isVoiceListening
                  ? "1px solid var(--debit)"
                  : "1px solid var(--border)",
                background: isVoiceListening
                  ? "var(--debit-bg)"
                  : "var(--bg-surface-2)",
                color: isVoiceListening ? "var(--debit)" : "var(--text)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                transition: "all 0.2s",
                animation: isVoiceListening ? "navPulse 1.4s infinite" : "none",
              }}
            >
              <span style={{ fontSize: "15px" }}>
                {isVoiceListening ? "🎙️" : "🎤"}
              </span>
              <span>{isVoiceListening ? "Listening" : "Voice"}</span>
            </button>
          )}

          {/* Theme Dropdown (desktop only) */}
          {!isMobile && (
            <div ref={themeDropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                title="Change theme"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "none",
                  color: "var(--text)",
                  cursor: "pointer",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "500",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-surface-2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span style={{ fontSize: "16px" }}>{currentTheme.icon}</span>
                <span
                  style={{
                    display: windowWidth < 900 ? "none" : "inline",
                  }}
                >
                  {currentTheme.name}
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                  }}
                >
                  {isThemeDropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {isThemeDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    padding: "6px",
                    minWidth: "200px",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 60,
                  }}
                >
                  {renderThemeOptions()}
                </div>
              )}
            </div>
          )}

          {/* Role Badge */}
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "10px",
              fontWeight: "600",
              backgroundColor: isAdmin ? "var(--debit-bg)" : "var(--accent-bg)",
              color: isAdmin ? "var(--debit)" : "var(--accent-text)",
              border: `1px solid ${isAdmin ? "var(--debit)" : "var(--accent)"}`,
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
                  boxShadow: "var(--shadow-lg)",
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
                        ? "var(--debit-bg)"
                        : "var(--accent-bg)",
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
                      e.currentTarget.style.backgroundColor = "var(--debit-bg)";
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

      {/* ===== VOICE FEEDBACK BUBBLE ===== */}
      {(voiceFeedback || voiceError) && (
        <div
          style={{
            position: "fixed",
            top: "76px",
            right: "16px",
            maxWidth: "380px",
            backgroundColor: "var(--bg-surface)",
            color: "var(--text)",
            border: `1px solid ${
              voiceError ? "var(--debit)" : "var(--border)"
            }`,
            borderRadius: "12px",
            padding: "12px 16px",
            fontSize: "13px",
            zIndex: 200,
            boxShadow: "var(--shadow-lg)",
            animation: "navFadeIn 0.25s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "600", flex: 1 }}>
              {voiceError ? `⚠️ ${voiceError}` : voiceFeedback}
            </span>
            {isVoiceListening && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                  height: "16px",
                }}
              >
                <span style={waveBar(0)} />
                <span style={waveBar(0.15)} />
                <span style={waveBar(0.3)} />
                <span style={waveBar(0.45)} />
                <span style={waveBar(0.6)} />
              </span>
            )}
          </div>
          {isVoiceListening && voiceTranscript && (
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginTop: "6px",
                fontStyle: "italic",
                borderTop: "1px solid var(--border)",
                paddingTop: "6px",
              }}
            >
              "{voiceTranscript}"
            </div>
          )}
        </div>
      )}

      {/* ===== Mobile Navigation Menu ===== */}
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
            {voiceSupported && (
              <button
                onClick={toggleVoice}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  padding: "12px 16px",
                  marginBottom: "8px",
                  borderRadius: "10px",
                  border: isVoiceListening
                    ? "1px solid var(--debit)"
                    : "1px solid var(--border)",
                  background: isVoiceListening
                    ? "var(--debit-bg)"
                    : "var(--bg-surface)",
                  color: isVoiceListening ? "var(--debit)" : "var(--text)",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "600",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "18px" }}>
                  {isVoiceListening ? "🎙️" : "🎤"}
                </span>
                <span style={{ flex: 1 }}>
                  {isVoiceListening ? "Listening..." : "Voice Assistant"}
                </span>
              </button>
            )}

            <div
              ref={mobileThemeDropdownRef}
              style={{
                marginBottom: "16px",
                position: "relative",
              }}
            >
              <button
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px 16px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "500",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "18px" }}>{currentTheme.icon}</span>
                <span style={{ flex: 1 }}>{currentTheme.name} Theme</span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  {isThemeDropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {isThemeDropdownOpen && (
                <div
                  style={{
                    marginTop: "6px",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "6px",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  {renderThemeOptions()}
                </div>
              )}
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
                  e.currentTarget.style.backgroundColor = "var(--debit-bg)";
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

      <style>{`
        @keyframes navFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes navPulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--debit); }
          50% { box-shadow: 0 0 0 8px transparent; }
        }
        @keyframes navWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
};

const waveBar = (delay) => ({
  display: "inline-block",
  width: "3px",
  height: "100%",
  backgroundColor: "var(--debit)",
  borderRadius: "2px",
  animation: `navWave 0.8s ease-in-out ${delay}s infinite`,
});

export default Navbar;
