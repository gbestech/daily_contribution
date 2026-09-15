// src/components/VoiceAssistant.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Global voice assistant.
 * Speak a page name → it navigates there.
 * Say "help" to hear available commands.
 * Say "stop" / "close" to cancel.
 *
 * Speed notes:
 *  - Fires on the first partial result that matches (no waiting for "final").
 *  - Navigates first, then speaks — voice feedback runs in the background.
 *  - Auto-restarts when Chrome drops the session, so the mic never goes dead.
 *  - Dedupe lock stops the same command from firing twice in quick succession.
 */
const VoiceAssistant = () => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const routeMapRef = useRef([]);

  // Whether the user wants the mic on (independent of browser state)
  const wantListeningRef = useRef(false);
  const restartingRef = useRef(false);

  // Dedupe: don't fire the same command twice within 2.5s
  const lastFiredLabelRef = useRef("");
  const lastFiredAtRef = useRef(0);

  // ---------- ROUTE MAP ----------
  const ADMIN_ROUTES = [
    {
      keywords: ["dashboard", "home", "main"],
      path: "/admin",
      label: "Dashboard",
    },
    {
      keywords: ["member", "members", "member management"],
      path: "/admin/members",
      label: "Members",
    },
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
      keywords: ["user", "users", "user management"],
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
      keywords: ["profile", "my profile", "account"],
      path: "/admin/profile",
      label: "Profile",
    },
    {
      keywords: ["broad", "broadsheet", "ledger"],
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

  const MEMBER_ROUTES = [
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
      keywords: ["withdraw", "withdrawal", "cash out"],
      path: "/member/withdraw",
      label: "Withdraw",
    },
    {
      keywords: ["transfer", "send money"],
      path: "/member/transfer",
      label: "Transfer",
    },
    {
      keywords: ["history", "transaction history", "transactions"],
      path: "/member/history",
      label: "Transaction History",
    },
    { keywords: ["loan", "loans"], path: "/member/loans", label: "Loans" },
    {
      keywords: ["profile", "my profile", "account"],
      path: "/member/profile",
      label: "Profile",
    },
    {
      keywords: ["broadsheet", "ledger"],
      path: "/member/broadsheet",
      label: "Broadsheet",
    },
  ];

  // ---------- HELPERS ----------
  const speak = useCallback((text) => {
    if (!("speechSynthesis" in window)) return;
    try {
      // Fire-and-forget — never block the UI on this
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.15;
      u.pitch = 1;
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* silent */
    }
  }, []);

  const showFeedback = useCallback((msg, ms = 2500) => {
    setFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(""), ms);
  }, []);

  // ---------- ROUTE MATCHING ----------
  const matchRoute = useCallback((rawText) => {
    if (!rawText) return null;
    const text = rawText.toLowerCase().trim();

    // Strip leading command words
    const cleaned = text
      .replace(
        /^(please\s+)?(open|go to|goto|show me|show|take me to|navigate to|switch to|bring up|launch)\s+/i,
        "",
      )
      .replace(/^(the|a|an|my)\s+/i, "")
      .trim();

    const routes = routeMapRef.current;
    let best = null;
    let bestScore = 0;

    for (const r of routes) {
      let score = 0;
      for (const kw of r.keywords) {
        if (cleaned === kw) {
          score += 200;
        } else if (cleaned.includes(kw)) {
          score += 100 + kw.length;
        } else {
          const words = cleaned.split(/\s+/).filter(Boolean);
          for (const w of words) {
            if (w.length < 3) continue;
            if (kw === w) score += 40;
            else if (kw.startsWith(w) || w.startsWith(kw)) score += 15;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    if (bestScore < 30) return null;
    return { route: best, score: bestScore };
  }, []);

  // ---------- COMMAND HANDLER ----------
  const handleCommand = useCallback(
    (raw) => {
      const text = raw.toLowerCase().trim();
      if (!text) return;
      setTranscript(raw);

      // Stop / cancel — turns mic off cleanly
      if (
        text === "stop" ||
        text === "cancel" ||
        text.includes("stop listening")
      ) {
        wantListeningRef.current = false;
        try {
          recognitionRef.current?.stop();
        } catch (e) {}
        setIsListening(false);
        showFeedback("🛑 Stopped");
        return;
      }

      // Help
      if (
        text.includes("help") ||
        text.includes("what can i say") ||
        text.includes("commands")
      ) {
        const pages = routeMapRef.current
          .map((r) => r.label)
          .slice(0, 5)
          .join(", ");
        showFeedback(`ℹ️ Say: open ${pages}`, 5000);
        speak("Say open, then a page name");
        return;
      }

      // Route match
      const match = matchRoute(raw);
      if (match) {
        const now = Date.now();
        const sameLabel =
          lastFiredLabelRef.current === match.route.label &&
          now - lastFiredAtRef.current < 2500;
        if (sameLabel) return; // de-dupe

        lastFiredLabelRef.current = match.route.label;
        lastFiredAtRef.current = now;

        // ⚡ Navigate FIRST — instant UI feedback.
        navigate(match.route.path);
        showFeedback(`📂 ${match.route.label}`, 1800);
        // Voice confirmation runs in the background.
        speak(`Opening ${match.route.label}`);
        return;
      }

      // No match → gentle fallback (only on longer phrases to avoid noise)
      if (text.split(/\s+/).length >= 2) {
        showFeedback(`🤔 Didn't catch "${raw}"`, 2000);
      }
    },
    [matchRoute, navigate, showFeedback, speak],
  );

  const handleRef = useRef(handleCommand);
  useEffect(() => {
    handleRef.current = handleCommand;
  }, [handleCommand]);

  // ---------- INIT ----------
  useEffect(() => {
    // Load role and pick route map
    const stored = localStorage.getItem("user");
    let role = "member";
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role === "admin" || u.role === "administrator") role = "admin";
      } catch (e) {
        /* ignore */
      }
    }
    routeMapRef.current = role === "admin" ? ADMIN_ROUTES : MEMBER_ROUTES;

    // Setup SpeechRecognition once
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const rec = new SpeechRecognition();

    // ⚡ FAST SETTINGS
    rec.continuous = true; // keep listening until we stop it
    rec.interimResults = true; // fire on partials — feels instant
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      setFeedback("🎤 Listening...");
      // Reset de-dupe on fresh session
      lastFiredLabelRef.current = "";
      lastFiredAtRef.current = 0;
    };

    rec.onresult = (event) => {
      // Only inspect the newest result
      const last = event.results[event.results.length - 1];
      const text = last[0]?.transcript || "";
      if (!text) return;

      // Update transcript for display (cheap)
      setTranscript(text);

      // Fire on every partial — dedupe lock inside handleCommand
      // prevents the same action from firing twice in a row.
      handleRef.current(text);
    };

    rec.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // Normal — Chrome drops sessions on silence. Ignore.
        return;
      }
      if (event.error === "not-allowed") {
        wantListeningRef.current = false;
        setIsListening(false);
        setFeedback("🚫 Mic permission denied");
        return;
      }
      setFeedback(`⚠️ ${event.error}`);
    };

    rec.onend = () => {
      // Chrome ALWAYS drops the session after ~5s of silence.
      // If the user still wants it on → restart immediately so
      // it never goes dead while "Listening" is shown.
      if (wantListeningRef.current && !restartingRef.current) {
        restartingRef.current = true;
        setTimeout(() => {
          restartingRef.current = false;
          if (wantListeningRef.current) {
            try {
              rec.start();
            } catch (e) {
              /* already started */
            }
          }
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;

    return () => {
      wantListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          /* ignore */
        }
      }
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    wantListeningRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {
      /* already started */
    }
  }, [supported]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setFeedback("");
    setTranscript("");
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  // Ctrl+M shortcut
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  if (!supported) return null;

  // ---------- RENDER ----------
  return (
    <>
      <style>{`
        @keyframes va-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { box-shadow: 0 0 0 14px rgba(239, 68, 68, 0); }
        }
        @keyframes va-fade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes va-wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .va-btn {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          z-index: 1150;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          transition: all 0.3s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
        }
        .va-btn:hover { transform: scale(1.08); }
        .va-btn.listening {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          animation: va-pulse 1.5s infinite;
        }
        .va-toast {
          position: fixed;
          bottom: 108px;
          right: 28px;
          max-width: 340px;
          background: var(--bg-surface, #1e293b);
          color: var(--text, #fff);
          border: 1px solid var(--border, rgba(255,255,255,0.15));
          border-radius: 12px;
          padding: 14px 18px;
          font-size: 14px;
          z-index: 1150;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: va-fade 0.25s ease;
          backdrop-filter: blur(8px);
        }
        .va-transcript {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          margin-top: 6px;
          font-style: italic;
          border-top: 1px solid var(--border, rgba(255,255,255,0.08));
          padding-top: 6px;
        }
        .va-wave {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          height: 16px;
          margin-left: 6px;
        }
        .va-wave span {
          display: inline-block;
          width: 3px;
          height: 100%;
          background-color: #ef4444;
          border-radius: 2px;
          animation: va-wave 0.8s ease-in-out infinite;
        }
        .va-wave span:nth-child(1) { animation-delay: 0s; }
        .va-wave span:nth-child(2) { animation-delay: 0.15s; }
        .va-wave span:nth-child(3) { animation-delay: 0.3s; }
        .va-wave span:nth-child(4) { animation-delay: 0.45s; }
        .va-wave span:nth-child(5) { animation-delay: 0.6s; }
      `}</style>

      {feedback && (
        <div className="va-toast">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 600 }}>{feedback}</span>
            {isListening && (
              <span className="va-wave">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </span>
            )}
          </div>
          {isListening && transcript && (
            <div className="va-transcript">"{transcript}"</div>
          )}
        </div>
      )}

      <button
        className={`va-btn ${isListening ? "listening" : ""}`}
        onClick={toggle}
        title={
          isListening
            ? "Stop listening (Ctrl+M)"
            : "Voice assistant — say a page name (Ctrl+M)"
        }
        aria-label="Voice assistant"
      >
        {isListening ? "🎙️" : "🎤"}
      </button>
    </>
  );
};

export default VoiceAssistant;
