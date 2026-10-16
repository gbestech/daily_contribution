// src/components/member/Deposit.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8000";
const MAX_SLIP_SIZE_MB = 2;

// ------------------------------------------------------------
// Safe numeric parsing — rejects 0, "", null, NaN
// ------------------------------------------------------------
const toPositiveNumber = (val, fallback) => {
  if (val === null || val === undefined || val === "") return fallback;
  const cleaned = String(val).replace(/[₦,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const toNonNegativeNumber = (val, fallback = 0) => {
  if (val === null || val === undefined || val === "") return fallback;
  const cleaned = String(val).replace(/[₦,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

// ------------------------------------------------------------
// Pull a balance out of any plausible API response shape
// ------------------------------------------------------------
const extractBalance = (obj) => {
  if (!obj || typeof obj !== "object") return undefined;

  const BALANCE_KEYS = [
    "balance",
    "current_balance",
    "currentBalance",
    "account_balance",
    "accountBalance",
    "total_balance",
    "totalBalance",
    "savings_balance",
    "savingsBalance",
    "wallet_balance",
    "walletBalance",
    "available_balance",
    "availableBalance",
    "funds",
    "wallet",
    "amount",
  ];

  for (const k of BALANCE_KEYS) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
      const n = toNonNegativeNumber(obj[k], NaN);
      if (Number.isFinite(n)) return n;
    }
  }

  const WRAPPERS = ["member", "data", "user", "result", "payload", "record"];
  for (const w of WRAPPERS) {
    if (obj[w] && typeof obj[w] === "object") {
      const found = extractBalance(obj[w]);
      if (found !== undefined) return found;
    }
  }

  return undefined;
};

// ============================================================
// Savings plan helpers
// ============================================================
const DURATION_MONTHS = {
  "6 months": 6,
  "1 year": 12,
  "2 years": 24,
  "3 years": 36,
  "4 years": 48,
};

const PERIODS_PER_MONTH = {
  Daily: 30,
  Weekly: 4,
  Monthly: 1,
  Random: 1,
};

const computePlanSummary = (plan, duration, amountPerPeriod) => {
  if (!plan || !duration) return null;
  const amt = parseFloat(amountPerPeriod);
  if (isNaN(amt) || amt <= 0) return null;
  if (plan === "Random") {
    return {
      plan,
      duration,
      totalPeriods: null,
      perPeriod: amt,
      total: null,
      periodLabel: "per period",
      isRandom: true,
    };
  }
  const months = DURATION_MONTHS[duration];
  const perMonth = PERIODS_PER_MONTH[plan];
  if (!months || !perMonth) return null;

  const totalPeriods = months * perMonth;
  const total = amt * totalPeriods;

  return {
    plan,
    duration,
    totalPeriods,
    perPeriod: amt,
    total,
    periodLabel:
      plan === "Daily"
        ? "per day"
        : plan === "Weekly"
          ? "per week"
          : "per month",
    isRandom: false,
  };
};

// ============================================================
// Detect the current theme
// ============================================================
const detectTheme = () => {
  if (typeof document === "undefined") return "dark";

  const html = document.documentElement;
  const body = document.body;

  const attr =
    html.getAttribute("data-theme") || body?.getAttribute("data-theme") || "";
  if (attr.toLowerCase().includes("light")) return "light";
  if (attr.toLowerCase().includes("dark")) return "dark";

  const cls = `${html.className} ${body?.className || ""}`.toLowerCase();
  if (cls.includes("light")) return "light";
  if (cls.includes("dark")) return "dark";

  try {
    const keys = [
      "theme",
      "app-theme",
      "color-theme",
      "colorMode",
      "color-mode",
      "mui-mode",
      "chakra-ui-color-mode",
    ];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && /light/i.test(v)) return "light";
      if (v && /dark/i.test(v)) return "dark";
    }
  } catch {}

  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }

  return "dark";
};

const MemberDeposit = ({ onClose }) => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberBalance, setMemberBalance] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [user, setUser] = useState(null);
  const [memberPlan, setMemberPlan] = useState(null);
  const [theme, setTheme] = useState(() => detectTheme());

  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [slipBase64, setSlipBase64] = useState("");
  const fileInputRef = useRef(null);

  const [settings, setSettings] = useState({
    min_deposit: 500,
    max_deposit: 50000,
    daily_limit: 100000,
    max_daily_deposits: 3,
    allow_multiple_deposits: true,
    default_contribution_amount: 5000,
    contribution_frequency: "daily",
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // ============================================================
  // Watch for theme changes
  // ============================================================
  useEffect(() => {
    const update = () => setTheme(detectTheme());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
      });
    }

    window.addEventListener("storage", update);
    const interval = setInterval(update, 800);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", update);
      clearInterval(interval);
    };
  }, []);

  const isLight = theme === "light";

  const textColor = isLight ? "#0f172a" : "#f1f5f9";
  const textMuted = isLight ? "#475569" : "#94a3b8";
  const textDim = isLight ? "#64748b" : "#64748b";

  const fieldBg = isLight ? "#ffffff" : "#0f172a";
  const fieldText = isLight ? "#0f172a" : "#f1f5f9";
  const fieldPlaceholder = isLight ? "#94a3b8" : "#64748b";
  const fieldBorder = isLight
    ? "rgba(15,23,42,0.20)"
    : "rgba(255,255,255,0.15)";
  const fieldFocusBorder = "#10b981";

  const surfaceColor = isLight ? "#ffffff" : "#1e293b";
  const surface2Color = isLight ? "#f1f5f9" : "#334155";
  const borderColor = isLight
    ? "rgba(15,23,42,0.15)"
    : "rgba(255,255,255,0.12)";

  const accentColor = "#10b981";
  const creditColor = isLight ? "#059669" : "#34d399";
  const warningColor = isLight ? "#d97706" : "#fbbf24";
  const debitColor = isLight ? "#dc2626" : "#f87171";
  const purpleColor = isLight ? "#7c3aed" : "#a78bfa";

  // ============================================================
  // Handle close
  // ============================================================
  const handleClose = () => {
    if (loading) return;
    if (typeof onClose === "function") {
      onClose();
    } else {
      navigate(-1);
    }
  };

  // ============================================================
  // Apply settings safely
  // ============================================================
  const applySettings = (raw) => {
    if (!raw || typeof raw !== "object") return;

    const rawMin = toPositiveNumber(raw.min_deposit, NaN);
    const rawMax = toPositiveNumber(raw.max_deposit, NaN);
    const looksLikeKobo =
      Number.isFinite(rawMin) &&
      Number.isFinite(rawMax) &&
      rawMin >= 100000 &&
      rawMax >= 100000;
    const scale = looksLikeKobo ? 100 : 1;

    setSettings((prev) => {
      const min = toPositiveNumber(raw.min_deposit, prev.min_deposit) / scale;
      const max = toPositiveNumber(raw.max_deposit, prev.max_deposit) / scale;

      const safeMin = Math.max(1, min);
      const safeMax = Math.max(safeMin + 1, max);

      return {
        min_deposit: safeMin,
        max_deposit: safeMax,
        daily_limit:
          toPositiveNumber(raw.daily_limit, prev.daily_limit) / scale,
        max_daily_deposits: toNonNegativeNumber(
          raw.max_daily_deposits,
          prev.max_daily_deposits,
        ),
        allow_multiple_deposits:
          raw.allow_multiple_deposits !== undefined
            ? Boolean(raw.allow_multiple_deposits)
            : prev.allow_multiple_deposits,
        default_contribution_amount:
          toPositiveNumber(
            raw.default_contribution_amount,
            prev.default_contribution_amount,
          ) / scale,
        contribution_frequency:
          raw.contribution_frequency || prev.contribution_frequency,
      };
    });
  };

  // ============================================================
  // Load user + initial data
  // ============================================================
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        if (userData.role === "member" || userData.role === "user") {
          setSelectedMember(userData.id);
          fetchMemberBalance(userData.id);
          fetchDailyTotal(userData.id);
          fetchMemberPlan(userData.id);
        }
      } catch (e) {
        console.error("Bad user JSON in localStorage", e);
      }
    }
    fetchMembers();
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // Fetch contribution settings
  // ============================================================
  const fetchSettings = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/settings.php?key=contribution`,
      );
      const data = await res.json();
      const candidate =
        data?.data?.contribution ||
        data?.data?.settings?.contribution ||
        data?.contribution ||
        data?.settings?.contribution ||
        (data?.data && typeof data.data === "object" && data.data.min_deposit
          ? data.data
          : null);

      if (candidate) {
        applySettings(candidate);
      } else {
        const allRes = await fetch(`${API_BASE_URL}/api/settings.php`);
        const allData = await allRes.json();
        const c =
          allData?.data?.contribution ||
          allData?.data?.settings?.contribution ||
          allData?.contribution ||
          allData?.settings?.contribution;
        if (c) applySettings(c);
      }
    } catch (err) {
      console.error("[Deposit] Failed to load settings:", err);
    } finally {
      setSettingsLoaded(true);
    }
  };

  // ============================================================
  // Fetch members
  // ============================================================
  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      const data = await response.json();
      const list =
        data.members || data.data?.members || data.data || data.users || [];
      if (Array.isArray(list)) {
        setMembers(list);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  // ============================================================
  // Fetch the savings plan for a specific member
  // ============================================================
  const fetchMemberPlan = async (memberId) => {
    if (!memberId) {
      setMemberPlan(null);
      return;
    }
    const idNum = parseInt(memberId, 10);

    const fromList = members.find((m) => parseInt(m.id, 10) === idNum);
    if (fromList) {
      const plan = computePlanSummary(
        fromList.savings_plan || fromList.savingsPlan,
        fromList.duration,
        fromList.amount,
      );
      if (plan) {
        setMemberPlan(plan);
        return;
      }
    }

    try {
      let res = await fetch(`${API_BASE_URL}/api/members.php?id=${memberId}`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/members.php/${memberId}`);
      }
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setMemberPlan(null);
        return;
      }
      const member =
        data.member ||
        data.data?.member ||
        data.data ||
        (Array.isArray(data.members)
          ? data.members.find((m) => parseInt(m.id, 10) === idNum)
          : null);
      if (member) {
        const plan = computePlanSummary(
          member.savings_plan || member.savingsPlan,
          member.duration,
          member.amount,
        );
        setMemberPlan(plan || null);
      } else {
        setMemberPlan(null);
      }
    } catch (error) {
      console.error("Error fetching member plan:", error);
      setMemberPlan(null);
    }
  };

  // ============================================================
  // Member balance
  // ============================================================
  const fetchMemberBalance = async (memberId) => {
    const idNum = parseInt(memberId, 10);

    const fromList = members.find((m) => parseInt(m.id, 10) === idNum);
    if (fromList) {
      const b = extractBalance(fromList);
      if (b !== undefined) {
        setMemberBalance(b);
        return;
      }
    }

    try {
      let res = await fetch(`${API_BASE_URL}/api/members.php?id=${memberId}`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/members.php/${memberId}`);
      }

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return;
      }

      const balance = extractBalance(data);
      if (balance !== undefined) {
        setMemberBalance(balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  // ============================================================
  // Daily total + count
  // ============================================================
  const fetchDailyTotal = async (memberId) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API_BASE_URL}/api/transactions.php`);
      const data = await res.json();

      if (Array.isArray(data.transactions)) {
        const todayTxns = data.transactions.filter((t) => {
          const tMember = t.memberId ?? t.member_id;
          const tType = t.type;
          const tDate = (t.date || t.created_at || "").slice(0, 10);
          return (
            parseInt(tMember, 10) === parseInt(memberId, 10) &&
            tType === "deposit" &&
            tDate === today
          );
        });
        const total = todayTxns.reduce(
          (sum, t) => sum + toNonNegativeNumber(t.amount, 0),
          0,
        );
        setDailyTotal(total);
        setDailyCount(todayTxns.length);
      }
    } catch (error) {
      console.error("Error fetching daily total:", error);
    }
  };

  const handleMemberChange = (e) => {
    const memberId = e.target.value;
    setSelectedMember(memberId);
    if (memberId) {
      fetchMemberBalance(memberId);
      fetchDailyTotal(memberId);
      fetchMemberPlan(memberId);
    } else {
      setMemberPlan(null);
    }
  };

  const formatCurrency = (a) => {
    const n = toNonNegativeNumber(a, 0);
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  // ============================================================
  // STRICT plan validation — must equal exactly.
  // Random plans skip this check (any amount allowed).
  // ============================================================
  const validateAgainstPlan = (depositAmount) => {
    if (!memberPlan) return { ok: true };
    if (memberPlan.isRandom) return { ok: true };

    const expected = parseFloat(memberPlan.perPeriod);
    if (!Number.isFinite(expected) || expected <= 0) return { ok: true };

    const amt = parseFloat(depositAmount);
    const EPS = 0.01; // allow 1 kobo rounding tolerance
    const diff = amt - expected;

    if (diff > EPS) {
      return {
        ok: false,
        reason: "greater",
        expected,
        message:
          `❌ Deposit amount is GREATER than your savings plan.\n\n` +
          `Your plan expects exactly ${formatCurrency(expected)} ${memberPlan.periodLabel}.\n` +
          `You entered ${formatCurrency(amt)}.\n\n` +
          `Please enter the exact amount.`,
      };
    }
    if (diff < -EPS) {
      return {
        ok: false,
        reason: "less",
        expected,
        message:
          `❌ Deposit amount is LESS than your savings plan.\n\n` +
          `Your plan expects exactly ${formatCurrency(expected)} ${memberPlan.periodLabel}.\n` +
          `You entered ${formatCurrency(amt)}.\n\n` +
          `Please enter the exact amount.`,
      };
    }
    return { ok: true, expected };
  };

  // ============================================================
  // Payment slip handlers
  // ============================================================
  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, or PDF files are allowed");
      return;
    }

    if (file.size > MAX_SLIP_SIZE_MB * 1024 * 1024) {
      toast.error(`File is too large (max ${MAX_SLIP_SIZE_MB} MB)`);
      return;
    }

    setSlipFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setSlipBase64(result);
      setSlipPreview(file.type.startsWith("image/") ? result : "");
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsDataURL(file);
  };

  const removeSlip = () => {
    setSlipFile(null);
    setSlipPreview("");
    setSlipBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancel = () => {
    if (loading) return;
    setAmount("");
    setDescription("");
    removeSlip();
    toast.success("Deposit cancelled");
  };

  // ============================================================
  // Submit deposit
  // ============================================================
  const handleDeposit = async (e) => {
    e.preventDefault();

    if (!selectedMember) {
      toast.error("Please select a member");
      return;
    }

    const depositAmount = toPositiveNumber(amount, NaN);
    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // 🆕 STRICT plan check — must equal plan amount exactly
    const planCheck = validateAgainstPlan(depositAmount);
    if (!planCheck.ok) {
      toast.error(planCheck.message, { duration: 8000 });
      window.alert(planCheck.message);
      return;
    }

    const {
      min_deposit,
      max_deposit,
      daily_limit,
      max_daily_deposits,
      allow_multiple_deposits,
    } = settings;

    if (depositAmount < min_deposit) {
      toast.error(`Minimum deposit is ${formatCurrency(min_deposit)}`);
      return;
    }
    if (depositAmount > max_deposit) {
      toast.error(
        `Maximum deposit per transaction is ${formatCurrency(max_deposit)}`,
      );
      return;
    }
    if (!allow_multiple_deposits && dailyCount >= 1) {
      toast.error("Multiple deposits per day are not allowed");
      return;
    }
    if (
      allow_multiple_deposits &&
      max_daily_deposits > 0 &&
      dailyCount >= max_daily_deposits
    ) {
      toast.error(
        `Daily deposit count reached (${max_daily_deposits} per day). Try again tomorrow.`,
      );
      return;
    }
    if (dailyTotal + depositAmount > daily_limit) {
      toast.error(
        `Daily limit of ${formatCurrency(daily_limit)} exceeded. ` +
          `Remaining: ${formatCurrency(Math.max(0, daily_limit - dailyTotal))}`,
      );
      return;
    }

    setLoading(true);

    const member = members.find((m) => m.id === parseInt(selectedMember, 10));
    const transaction = {
      memberId: parseInt(selectedMember, 10),
      memberName: member?.name || user?.name || "Unknown",
      accountNumber:
        member?.accountNumber ||
        member?.account_number ||
        member?.account_no ||
        user?.accountNumber ||
        user?.account_number ||
        "",
      type: "deposit",
      amount: depositAmount,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      description: description || "Deposit",
      payment_slip: slipBase64 || null,
      payment_slip_name: slipFile?.name || null,
      payment_slip_type: slipFile?.type || null,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(transaction),
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (response.ok) {
        toast.success(
          `✅ Deposit of ${formatCurrency(depositAmount)} submitted successfully!`,
        );
        setAmount("");
        setDescription("");
        removeSlip();
        await fetchMembers();
        fetchMemberBalance(selectedMember);
        fetchDailyTotal(selectedMember);

        // 🆕 Take the user to the dashboard after a successful deposit
        setTimeout(() => {
          if (typeof onClose === "function") {
            onClose(); // if opened as modal, close it first
          }
          navigate("/member/dashboard", { replace: true });
        }, 800);
      } else {
        toast.error(
          data.error ||
            data.message ||
            `Failed to submit deposit (HTTP ${response.status})`,
        );
      }
    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast.error(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick amount buttons — for plan members, only ONE button: the exact amount
  const quickAmounts = (() => {
    if (memberPlan && !memberPlan.isRandom) {
      const expected = parseFloat(memberPlan.perPeriod);
      if (Number.isFinite(expected) && expected > 0) {
        return [expected];
      }
    }
    const { default_contribution_amount, min_deposit, max_deposit } = settings;
    const base = Math.min(
      Math.max(default_contribution_amount || min_deposit, min_deposit),
      max_deposit,
    );
    const options = [base, base * 2, base * 5]
      .filter((v) => v >= min_deposit && v <= max_deposit)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    return options.length ? options : [min_deposit];
  })();

  // Helper: is the current amount valid?
  const amountIsValid = (() => {
    if (!amount) return true;
    const n = toPositiveNumber(amount, NaN);
    if (!Number.isFinite(n) || n <= 0) return false;
    if (memberPlan && !memberPlan.isRandom) {
      const expected = parseFloat(memberPlan.perPeriod);
      return Math.abs(n - expected) < 0.01;
    }
    return true;
  })();

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      style={{
        padding: "24px",
        color: textColor,
        maxWidth: "600px",
        margin: "0 auto",
        background: "transparent",
      }}
    >
      <style>{`
        .mdp-wrap { color: ${textColor}; color-scheme: ${isLight ? "light" : "dark"}; }
        .mdp-wrap * { box-sizing: border-box; }

        .mdp-close-btn {
          position: absolute; top: -4px; right: -4px;
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid ${borderColor}; background: transparent;
          color: ${textMuted}; font-size: 20px; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          line-height: 1; transition: all 0.2s; z-index: 10;
        }
        .mdp-close-btn:hover:not(:disabled) {
          color: ${textColor}; border-color: ${accentColor}; background: ${surface2Color};
        }
        .mdp-close-btn:disabled { cursor: not-allowed; opacity: 0.5; }

        .mdp-label {
          display: block; font-size: 14px; font-weight: 500;
          color: ${textColor}; margin-bottom: 6px;
        }

        .mdp-input,
        .mdp-select {
          width: 100%;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background-color: ${fieldBg} !important;
          color: ${fieldText} !important;
          -webkit-text-fill-color: ${fieldText} !important;
          caret-color: ${accentColor};
          font-size: 15px;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s, background-color 0.2s;
          appearance: none;
          -webkit-appearance: none;
        }
        .mdp-input:focus,
        .mdp-select:focus {
          border-color: ${fieldFocusBorder};
          background-color: ${fieldBg} !important;
          color: ${fieldText} !important;
          -webkit-text-fill-color: ${fieldText} !important;
        }
        .mdp-input::placeholder {
          color: ${fieldPlaceholder} !important;
          -webkit-text-fill-color: ${fieldPlaceholder} !important;
          opacity: 1;
        }
        .mdp-select option {
          background-color: ${surfaceColor};
          color: ${fieldText};
        }

        .mdp-input:-webkit-autofill,
        .mdp-input:-webkit-autofill:hover,
        .mdp-input:-webkit-autofill:focus,
        .mdp-select:-webkit-autofill {
          -webkit-text-fill-color: ${fieldText} !important;
          -webkit-box-shadow: 0 0 0 1000px ${fieldBg} inset !important;
          box-shadow: 0 0 0 1000px ${fieldBg} inset !important;
          transition: background-color 9999s ease-in-out 0s;
        }

        .mdp-input::selection,
        .mdp-select::selection {
          background: ${accentColor};
          color: #ffffff;
        }

        .mdp-input[type="number"]::-webkit-outer-spin-button,
        .mdp-input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        .mdp-input[type="number"] { -moz-appearance: textfield; }

        .mdp-quick-btn {
          padding: 4px 12px; border-radius: 6px;
          border: 1px solid ${fieldBorder}; background: transparent;
          color: ${textMuted}; font-size: 12px; cursor: pointer;
          transition: all 0.15s;
        }
        .mdp-quick-btn:hover {
          color: ${textColor}; border-color: ${accentColor}; background: ${surface2Color};
        }

        .mdp-slip-drop {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 24px 16px; border-radius: 8px;
          border: 2px dashed ${fieldBorder}; background: transparent;
          cursor: pointer; transition: border-color 0.2s;
        }
        .mdp-slip-drop:hover { border-color: ${accentColor}; }

        .mdp-btn-submit {
          flex: 2; padding: 14px; border-radius: 8px; border: none;
          color: #ffffff; font-size: 16px; font-weight: 600;
          transition: opacity 0.2s;
        }
        .mdp-btn-submit:not(:disabled) {
          background: linear-gradient(to right, #059669, #0d9488);
          cursor: pointer;
        }
        .mdp-btn-submit:disabled {
          background: ${textDim}; cursor: not-allowed; opacity: 0.7;
        }

        .mdp-btn-cancel {
          flex: 1; padding: 14px; border-radius: 8px;
          border: 1px solid ${fieldBorder}; background: transparent;
          color: ${textColor}; font-size: 16px; font-weight: 600;
          cursor: pointer; transition: background 0.2s;
        }
        .mdp-btn-cancel:hover:not(:disabled) { background: ${surface2Color}; }
        .mdp-btn-cancel:disabled { cursor: not-allowed; opacity: 0.5; }

        .mdp-remove-btn {
          padding: 6px 12px; border-radius: 6px;
          border: 1px solid rgba(239,68,68,0.35); background: transparent;
          color: ${debitColor}; font-size: 12px; cursor: pointer;
          font-weight: 500; flex-shrink: 0;
        }
        .mdp-remove-btn:hover { background: rgba(239,68,68,0.1); }
      `}</style>

      <div
        className="mdp-wrap"
        style={{
          backgroundColor: "transparent",
          borderRadius: "0",
          padding: "0",
          border: "none",
          position: "relative",
        }}
      >
        <button
          type="button"
          className="mdp-close-btn"
          onClick={handleClose}
          disabled={loading}
          title="Close"
          aria-label="Close deposit form"
        >
          ✕
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
            paddingRight: "40px",
          }}
        >
          <span style={{ fontSize: "32px" }}>💰</span>
          <div>
            <h2 style={{ margin: 0, color: textColor }}>Make a Deposit</h2>
            <p
              style={{
                color: textMuted,
                margin: "4px 0 0 0",
                fontSize: "14px",
              }}
            >
              Add funds to your savings account
            </p>
          </div>
        </div>

        {/* Savings plan badge */}
        {memberPlan && !memberPlan.isRandom && (
          <div
            style={{
              backgroundColor: "transparent",
              border: `1px solid ${isLight ? "rgba(5,150,105,0.4)" : "rgba(16,185,129,0.3)"}`,
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: textMuted,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                💼 Savings Plan
              </div>
              <div
                style={{
                  color: textColor,
                  fontSize: "14px",
                  fontWeight: "600",
                  marginTop: "2px",
                }}
              >
                {memberPlan.plan} • {memberPlan.duration}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  color: textMuted,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Exact amount {memberPlan.periodLabel}
              </div>
              <div
                style={{
                  color: creditColor,
                  fontSize: "18px",
                  fontWeight: "700",
                  marginTop: "2px",
                }}
              >
                {formatCurrency(memberPlan.perPeriod)}
              </div>
            </div>
          </div>
        )}

        {/* Random plan info badge */}
        {memberPlan && memberPlan.isRandom && (
          <div
            style={{
              backgroundColor: "transparent",
              border: `1px solid ${isLight ? "rgba(124,58,237,0.4)" : "rgba(139,92,246,0.35)"}`,
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: textMuted,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                💼 Savings Plan
              </div>
              <div
                style={{
                  color: textColor,
                  fontSize: "14px",
                  fontWeight: "600",
                  marginTop: "2px",
                }}
              >
                Random • {memberPlan.duration}
              </div>
            </div>
            <div
              style={{
                color: purpleColor,
                fontSize: "13px",
                fontWeight: "600",
                textAlign: "right",
              }}
            >
              Flexible amount — any value allowed
            </div>
          </div>
        )}

        {/* Settings summary */}
        {settingsLoaded && (
          <div
            style={{
              backgroundColor: "transparent",
              border: "none",
              borderBottom: `1px solid ${borderColor}`,
              borderRadius: "0",
              padding: "0 0 12px 0",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: textMuted }}>Min per deposit: </span>
                <span style={{ color: textColor, fontWeight: "600" }}>
                  {formatCurrency(settings.min_deposit)}
                </span>
              </div>
              <div>
                <span style={{ color: textMuted }}>Max per deposit: </span>
                <span style={{ color: textColor, fontWeight: "600" }}>
                  {formatCurrency(settings.max_deposit)}
                </span>
              </div>
              <div>
                <span style={{ color: textMuted }}>Daily limit: </span>
                <span style={{ color: textColor, fontWeight: "600" }}>
                  {formatCurrency(settings.daily_limit)}
                </span>
              </div>
              <div>
                <span style={{ color: textMuted }}>Max per day: </span>
                <span style={{ color: textColor, fontWeight: "600" }}>
                  {settings.allow_multiple_deposits
                    ? settings.max_daily_deposits
                    : 1}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Balance Display */}
        {selectedMember && (
          <div
            style={{
              backgroundColor: "transparent",
              borderRadius: "0",
              padding: "0 0 16px 0",
              marginBottom: "24px",
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ color: textMuted, fontSize: "13px", margin: 0 }}>
                  Current Balance
                </p>
                <p
                  style={{
                    color: creditColor,
                    fontSize: "28px",
                    fontWeight: "bold",
                    margin: "4px 0 0 0",
                  }}
                >
                  {formatCurrency(memberBalance)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: textMuted, fontSize: "12px", margin: 0 }}>
                  Today's Deposits
                </p>
                <p
                  style={{
                    color: warningColor,
                    fontSize: "16px",
                    fontWeight: "600",
                    margin: "4px 0 0 0",
                  }}
                >
                  {formatCurrency(dailyTotal)}
                </p>
                <p
                  style={{
                    color: textMuted,
                    fontSize: "11px",
                    margin: "2px 0 0 0",
                  }}
                >
                  {dailyCount} of{" "}
                  {settings.allow_multiple_deposits
                    ? settings.max_daily_deposits
                    : 1}{" "}
                  today
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleDeposit}>
          {/* Member selection (admin) */}
          {user?.role === "admin" && (
            <div style={{ marginBottom: "16px" }}>
              <label className="mdp-label">Select Member</label>
              <select
                className="mdp-select"
                value={selectedMember}
                onChange={handleMemberChange}
                required
              >
                <option value="">Choose a member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - Balance: {formatCurrency(member.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div style={{ marginBottom: "16px" }}>
            <label className="mdp-label">
              Amount (₦)
              {memberPlan && !memberPlan.isRandom && (
                <span
                  style={{
                    color: creditColor,
                    fontWeight: "600",
                    marginLeft: "6px",
                  }}
                >
                  — must be exactly {formatCurrency(memberPlan.perPeriod)}
                </span>
              )}
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: textDim,
                  fontSize: "18px",
                  fontWeight: "bold",
                  pointerEvents: "none",
                }}
              >
                ₦
              </span>
              <input
                type="number"
                className="mdp-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={
                  memberPlan && !memberPlan.isRandom
                    ? formatCurrency(memberPlan.perPeriod)
                    : `Enter amount (min ${settings.min_deposit}, max ${settings.max_deposit})`
                }
                style={{
                  paddingLeft: "32px",
                  fontSize: "16px",
                  borderColor: amountIsValid ? undefined : debitColor,
                }}
                step="0.01"
                required
              />
            </div>

            {/* Inline warning if amount doesn't match plan */}
            {memberPlan && !memberPlan.isRandom && amount && !amountIsValid && (
              <div
                style={{
                  color: debitColor,
                  fontSize: "12px",
                  marginTop: "6px",
                  fontWeight: "600",
                }}
              >
                ⚠️ Amount doesn't match your plan of{" "}
                {formatCurrency(memberPlan.perPeriod)} {memberPlan.periodLabel}
              </div>
            )}

            {memberPlan && !memberPlan.isRandom && (
              <div
                style={{
                  color: textMuted,
                  fontSize: "12px",
                  marginTop: "6px",
                }}
              >
                💡 Your plan requires exactly{" "}
                <strong style={{ color: creditColor }}>
                  {formatCurrency(memberPlan.perPeriod)}
                </strong>{" "}
                {memberPlan.periodLabel}. No more, no less.
              </div>
            )}
            {memberPlan && memberPlan.isRandom && (
              <div
                style={{
                  color: textMuted,
                  fontSize: "12px",
                  marginTop: "6px",
                }}
              >
                💡 Random plan — enter any amount you wish to save.
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="mdp-quick-btn"
                  onClick={() => setAmount(String(amt))}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "16px" }}>
            <label className="mdp-label">Description (Optional)</label>
            <input
              type="text"
              className="mdp-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly savings contribution"
            />
          </div>

          {/* Payment Slip Upload */}
          <div style={{ marginBottom: "24px" }}>
            <label className="mdp-label">Payment Slip (Optional)</label>

            {!slipFile ? (
              <label className="mdp-slip-drop">
                <span style={{ fontSize: "28px", marginBottom: "8px" }}>
                  📎
                </span>
                <span
                  style={{
                    color: textColor,
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Click to upload receipt
                </span>
                <span
                  style={{
                    color: textDim,
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  JPG, PNG, WEBP or PDF (max {MAX_SLIP_SIZE_MB} MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleSlipChange}
                  style={{ display: "none" }}
                />
              </label>
            ) : (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: `1px solid ${isLight ? "rgba(5,150,105,0.4)" : "rgba(16,185,129,0.3)"}`,
                  backgroundColor: "transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {slipPreview ? (
                      <img
                        src={slipPreview}
                        alt="Slip preview"
                        style={{
                          width: "48px",
                          height: "48px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: `1px solid ${borderColor}`,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "6px",
                          backgroundColor: "transparent",
                          border: "1px solid rgba(239,68,68,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "22px",
                          flexShrink: 0,
                        }}
                      >
                        📄
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          color: textColor,
                          fontSize: "13px",
                          fontWeight: "500",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {slipFile.name}
                      </div>
                      <div style={{ color: textMuted, fontSize: "11px" }}>
                        {(slipFile.size / 1024).toFixed(1)} KB •{" "}
                        {slipFile.type
                          .replace("image/", "")
                          .replace("application/", "")
                          .toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mdp-remove-btn"
                    onClick={removeSlip}
                  >
                    ✖ Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              className="mdp-btn-submit"
              disabled={loading || !selectedMember || !amountIsValid}
            >
              {loading ? "⏳ Processing..." : `💰 Submit Deposit`}
            </button>

            <button
              type="button"
              className="mdp-btn-cancel"
              onClick={handleCancel}
              disabled={loading}
            >
              ✖ Cancel
            </button>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px 0",
              backgroundColor: "transparent",
              borderRadius: "0",
              border: "none",
            }}
          >
            <p
              style={{
                color: textMuted,
                fontSize: "12px",
                margin: 0,
                textAlign: "center",
              }}
            >
              ⚡ Deposits require admin approval before they reflect in your
              balance
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberDeposit;
