// src/components/member/Dashboard.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";

const API_BASE_URL = "http://localhost:8000";
const CYCLE_DAYS = 30;

// ---------- Role helpers ----------
const ROLE_META = {
  admin: { icon: "👑", label: "Admin", color: "#dc2626" },
  administrator: { icon: "👑", label: "Admin", color: "#dc2626" },
  manager: { icon: "📊", label: "Manager", color: "#2563eb" },
  branch_manager: { icon: "📊", label: "Manager", color: "#2563eb" },
  member: { icon: "👤", label: "Member", color: "#059669" },
};

const getRoleMeta = (role) => {
  const r = String(role || "member")
    .trim()
    .toLowerCase();
  return ROLE_META[r] || { icon: "👤", label: r || "Member", color: "#059669" };
};

const BRANCH_PLAN_META = {
  both: { icon: "💵 + 📦", label: "Both Cash & Item", short: "Cash + Item" },
  cash: { icon: "💵", label: "Cash Only", short: "Cash Only" },
  item: { icon: "📦", label: "Item Only", short: "Item Only" },
};

const getBranchPlanMeta = (method) => {
  const m = String(method || "both").toLowerCase();
  return BRANCH_PLAN_META[m] || BRANCH_PLAN_META.both;
};

const PLAN_TYPE_META = {
  Daily: { icon: "🗓️", label: "Daily", color: "#10b981" },
  Weekly: { icon: "📅", label: "Weekly", color: "#2563eb" },
  Monthly: { icon: "🗓️", label: "Monthly", color: "#7c3aed" },
  Random: { icon: "🎲", label: "Random", color: "#d97706" },
};

const DURATION_META = {
  "6 months": { icon: "⏱️", label: "6 months", months: 6, color: "#0891b2" },
  "1 year": { icon: "📆", label: "1 year", months: 12, color: "#059669" },
  "2 years": { icon: "📆", label: "2 years", months: 24, color: "#7c3aed" },
  "3 years": { icon: "📆", label: "3 years", months: 36, color: "#be185d" },
  "4 years": { icon: "📆", label: "4 years", months: 48, color: "#b45309" },
};

const getPlanTypeMeta = (plan) => {
  const p = String(plan || "").trim();
  return PLAN_TYPE_META[p] || { icon: "📋", label: p || "—", color: "#64748b" };
};

const getDurationMeta = (duration) => {
  const d = String(duration || "").trim();
  return (
    DURATION_META[d] || {
      icon: "⏳",
      label: d || "—",
      months: 0,
      color: "#64748b",
    }
  );
};

const getRejectionReason = (t) => {
  if (!t || typeof t !== "object") return null;
  return (
    t.rejection_reason ||
    t.reject_reason ||
    t.rejectionReason ||
    t.rejectReason ||
    t.reason ||
    t.admin_note ||
    t.admin_remarks ||
    t.adminNote ||
    t.adminRemarks ||
    t.note ||
    t.remarks ||
    t.comment ||
    null
  );
};

const getRejectedBy = (t) => {
  if (!t || typeof t !== "object") return null;
  return (
    t.rejected_by ||
    t.rejectedBy ||
    t.approved_by ||
    t.approvedBy ||
    t.admin_name ||
    t.adminName ||
    null
  );
};

const getRejectedAt = (t) => {
  if (!t || typeof t !== "object") return null;
  return (
    t.rejected_at ||
    t.rejectedAt ||
    t.updated_at ||
    t.updatedAt ||
    t.action_date ||
    null
  );
};

const DURATION_MONTHS = {
  "6 months": 6,
  "1 year": 12,
  "2 years": 24,
  "3 years": 36,
  "4 years": 48,
};

const PERIODS_PER_MONTH = { Daily: 30, Weekly: 4, Monthly: 1, Random: 1 };

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

// ---------- Theme ----------
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

const getPassportUrl = (m) => {
  if (!m) return null;
  const photo =
    m.passport_photo || m.passportPhoto || m.photo || m.avatar || null;
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo)) return photo;
  return `${API_BASE_URL}/api/uploads/passports/${photo}`;
};

const pickSavingsMethodFromSettings = (data) => {
  if (!data || typeof data !== "object") return null;
  const candidates = [
    data?.data?.items?.savings_methods,
    data?.items?.savings_methods,
    data?.data?.items?.savings_method,
    data?.items?.savings_method,
    data?.data?.savings_methods,
    data?.savings_methods,
    data?.data?.savings_method,
    data?.savings_method,
  ];
  for (const c of candidates) {
    if (c === "cash" || c === "item" || c === "both") return c;
  }
  return null;
};

const pickBranchFromResponse = (data) => {
  if (!data || typeof data !== "object") return null;
  const candidates = [data?.branch, data?.data?.branch, data?.data, data];
  for (const c of candidates) {
    if (c && typeof c === "object" && (c.name || c.branch_name)) return c;
  }
  return null;
};

// ---------- Date helpers ----------
const toIsoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseDate = (s) => {
  if (!s) return null;
  const str = String(s).slice(0, 10);
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const buildCycleDays = (cycleStartDate, marksSet) => {
  const todayIso = toIsoDate(new Date());
  const days = [];
  for (let i = 0; i < CYCLE_DAYS; i++) {
    const d = addDays(cycleStartDate, i);
    const iso = toIsoDate(d);
    days.push({
      iso,
      date: d,
      dayNum: d.getDate(),
      monthShort: d.toLocaleString("en-NG", { month: "short" }),
      isToday: iso === todayIso,
      isPast: iso < todayIso,
      isFuture: iso > todayIso,
      checked: marksSet.has(iso),
    });
  }
  return days;
};

// 🆕 Compute all cycle windows from join date + duration
const computeCycles = (joinDateStr, durationStr) => {
  const start = parseDate(joinDateStr);
  if (!start) return [];
  const dur = getDurationMeta(durationStr);
  const totalMonths = dur.months || 0;
  if (totalMonths <= 0) {
    return [
      {
        index: 0,
        label: "Cycle 1",
        start,
        end: addDays(start, CYCLE_DAYS - 1),
        startIso: toIsoDate(start),
        endIso: toIsoDate(addDays(start, CYCLE_DAYS - 1)),
      },
    ];
  }
  const totalCycles = Math.max(1, totalMonths);
  const cycles = [];
  for (let i = 0; i < totalCycles; i++) {
    const s = addDays(start, i * CYCLE_DAYS);
    const e = addDays(s, CYCLE_DAYS - 1);
    cycles.push({
      index: i,
      label: `Cycle ${i + 1}`,
      start: s,
      end: e,
      startIso: toIsoDate(s),
      endIso: toIsoDate(e),
    });
  }
  return cycles;
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { activeBranch, activeBranchId } = useBranch();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [branchRefreshing, setBranchRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [branchInfo, setBranchInfo] = useState(null);
  const [branchSavingsMethod, setBranchSavingsMethod] = useState("both");
  const [branchPlanLoaded, setBranchPlanLoaded] = useState(false);

  const [recipientOpen, setRecipientOpen] = useState(false);
  const recipientRef = useRef(null);

  const [theme, setTheme] = useState(() => detectTheme());

  const [depositData, setDepositData] = useState({
    amount: "",
    description: "",
  });
  const [withdrawData, setWithdrawData] = useState({
    amount: "",
    description: "",
  });
  const [transferData, setTransferData] = useState({
    toMemberId: "",
    amount: "",
    description: "",
  });

  // 🆕 Daily marks (read-only)
  const [dailyMarks, setDailyMarks] = useState(new Set());
  const [marksLoading, setMarksLoading] = useState(false);

  // 🆕 Cycle navigation
  const [cycleIndex, setCycleIndex] = useState(0);

  // Role
  const roleRaw = userProfile?.role || user?.role || "member";
  const roleMeta = getRoleMeta(roleRaw);
  const isAdmin = ["admin", "administrator"].includes(
    String(roleRaw).toLowerCase(),
  );

  const myBranchId =
    userProfile?.branch_id ??
    userProfile?.branchId ??
    user?.branch_id ??
    user?.branchId ??
    activeBranchId ??
    null;

  // Theme watcher
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

  // Click-outside recipient
  useEffect(() => {
    const handler = (e) => {
      if (recipientRef.current && !recipientRef.current.contains(e.target)) {
        setRecipientOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
  const cardBorder = isLight
    ? "rgba(15, 23, 42, 0.10)"
    : "rgba(255, 255, 255, 0.10)";
  const cardSurface = isLight ? "#f8fafc" : "rgba(255, 255, 255, 0.05)";
  const cardSurface2 = isLight ? "#f1f5f9" : "rgba(255, 255, 255, 0.08)";
  const modalBg = isLight ? "#ffffff" : "#1e293b";
  const modalText = isLight ? "#0f172a" : "#f1f5f9";
  const modalBorder = isLight
    ? "rgba(15, 23, 42, 0.10)"
    : "rgba(255, 255, 255, 0.10)";
  const accentColor = "#10b981";
  const creditColor = isLight ? "#059669" : "#34d399";
  const warningColor = isLight ? "#d97706" : "#fbbf24";
  const debitColor = isLight ? "#dc2626" : "#f87171";
  const purpleColor = isLight ? "#7c3aed" : "#a78bfa";
  const infoColor = isLight ? "#2563eb" : "#60a5fa";

  // ============================================================
  // FETCH — branch savings method
  // ============================================================
  const fetchBranchSavingsMethod = useCallback(async (branchId) => {
    if (!branchId) {
      setBranchSavingsMethod("both");
      setBranchPlanLoaded(true);
      return;
    }
    try {
      const res = await apiFetch(`/api/settings.php?branch_id=${branchId}`);
      const data = await res.json();
      const method = pickSavingsMethodFromSettings(data);
      setBranchSavingsMethod(method || "both");
    } catch (err) {
      console.warn("[Dashboard] branch savings method fetch failed:", err);
      setBranchSavingsMethod("both");
    } finally {
      setBranchPlanLoaded(true);
    }
  }, []);

  const fetchBranchInfo = useCallback(async (branchId) => {
    if (!branchId) return null;
    try {
      const res = await apiFetch(`/api/get-branch.php?id=${branchId}`);
      const data = await res.json();
      const b = pickBranchFromResponse(data);
      if (b) {
        setBranchInfo(b);
        return b;
      }
      return null;
    } catch (err) {
      console.warn("[Dashboard] branch info fetch failed:", err);
      return null;
    }
  }, []);

  const fetchDailyMarks = useCallback(async (memberId) => {
    if (!memberId) {
      setDailyMarks(new Set());
      return;
    }
    setMarksLoading(true);
    try {
      const res = await apiFetch(`/api/daily-marks.php?member_id=${memberId}`);
      const data = await res.json();
      const marks = Array.isArray(data?.marks) ? data.marks : [];
      setDailyMarks(new Set(marks));
    } catch (err) {
      console.warn("[Dashboard] daily marks fetch failed:", err);
      setDailyMarks(new Set());
    } finally {
      setMarksLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiFetch("/api/members.php");
      const data = await response.json();
      if (data.members) {
        const currentUser = data.members.find(
          (m) => String(m.id) === String(user?.id),
        );
        if (currentUser) {
          setUserProfile(currentUser);
          setBalance(currentUser.balance || 0);

          const bid =
            currentUser.branch_id ??
            currentUser.branchId ??
            user?.branch_id ??
            null;
          if (bid) {
            await fetchBranchInfo(bid);
            await fetchBranchSavingsMethod(bid);
          }
          await fetchDailyMarks(currentUser.id);
          return currentUser;
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  const fetchMembers = async () => {
    try {
      const bid =
        myBranchId ||
        userProfile?.branch_id ||
        user?.branch_id ||
        user?.branchId ||
        activeBranchId ||
        null;
      const url = bid
        ? `/api/members.php?branch_id=${bid}`
        : "/api/members.php";
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.members) {
        const filtered = data.members.filter(
          (m) => String(m.id) !== String(user?.id),
        );
        setMembers(filtered);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await apiFetch("/api/transactions.php");
      const data = await response.json();
      if (data.transactions) {
        const userTransactions = data.transactions.filter(
          (t) => t.memberId === user?.id,
        );
        setTransactions(userTransactions.slice(0, 10));
        const pending = userTransactions.filter((t) => t.status === "pending");
        setPendingCount(pending.length);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const refreshData = async (silent = false) => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchMembers(),
        fetchTransactions(),
      ]);
      const bid = myBranchId || user?.branch_id || activeBranchId || null;
      if (bid) {
        await fetchBranchInfo(bid);
        await fetchBranchSavingsMethod(bid);
      }
      if (!silent) toast.success("✅ Data refreshed");
    } catch (error) {
      console.error("Error refreshing data:", error);
      if (!silent) toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) refreshData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeBranchId]);

  useEffect(() => {
    if (myBranchId) {
      fetchMembers();
      fetchBranchInfo(myBranchId);
      fetchBranchSavingsMethod(myBranchId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [myBranchId]);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const validateDepositAgainstPlan = (amount) => {
    const plan = computePlanSummary(
      userProfile?.savings_plan,
      userProfile?.duration,
      userProfile?.amount,
    );
    if (!plan) return { ok: true };
    if (plan.isRandom) return { ok: true };
    const expected = parseFloat(plan.perPeriod);
    if (isNaN(expected) || expected <= 0) return { ok: true };
    const amt = parseFloat(amount);
    const diff = amt - expected;
    const EPS = 0.01;
    if (diff > EPS) {
      return {
        ok: false,
        reason: "greater",
        expected,
        message: `❌ Deposit amount is GREATER than your savings plan.\n\nYour plan expects ${formatCurrency(expected)} ${plan.periodLabel}.\nYou entered ${formatCurrency(amt)}.`,
      };
    }
    if (diff < -EPS) {
      return {
        ok: false,
        reason: "less",
        expected,
        message: `❌ Deposit amount is LESS than your savings plan.\n\nYour plan expects ${formatCurrency(expected)} ${plan.periodLabel}.\nYou entered ${formatCurrency(amt)}.`,
      };
    }
    return { ok: true, expected };
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const planCheck = validateDepositAgainstPlan(amount);
    if (!planCheck.ok) {
      toast.error(planCheck.message, { duration: 6000 });
      window.alert(planCheck.message);
      return;
    }
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const profileResponse = await apiFetch("/api/members.php");
      const profileData = await profileResponse.json();
      const currentUser = profileData.members?.find((m) => m.id === user?.id);
      if (!currentUser) {
        toast.error("User profile not found. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const transactionData = {
        memberId: currentUser.id,
        memberName: currentUser.name || user.name || "User",
        accountNumber: currentUser.accountNumber || "N/A",
        type: "deposit",
        amount,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        description: depositData.description || "Deposit request",
        ...(myBranchId ? { branch_id: myBranchId } : {}),
      };

      const response = await apiFetch("/api/transactions.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transactionData),
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        toast.error("Server returned invalid response.");
        setLoading(false);
        return;
      }

      if (response.ok) {
        toast.success("✅ Deposit submitted for approval");
        setShowDepositModal(false);
        setDepositData({ amount: "", description: "" });
        await refreshData(true);
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast.error(`❌ ${error.message || "Failed to submit deposit"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amount > balance) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(balance)}`,
      );
      return;
    }
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const profileResponse = await apiFetch("/api/members.php");
      const profileData = await profileResponse.json();
      const currentUser = profileData.members?.find((m) => m.id === user?.id);

      const transactionData = {
        memberId: currentUser?.id || user.id,
        memberName: currentUser?.name || user.name || "User",
        accountNumber:
          currentUser?.accountNumber || user.accountNumber || "N/A",
        type: "withdrawal",
        amount,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        description: withdrawData.description || "Withdrawal request",
        ...(myBranchId ? { branch_id: myBranchId } : {}),
      };

      const response = await apiFetch("/api/transactions.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transactionData),
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        toast.error("Server returned invalid response");
        setLoading(false);
        return;
      }

      if (response.ok) {
        toast.success("✅ Withdrawal submitted for approval");
        setShowWithdrawModal(false);
        setWithdrawData({ amount: "", description: "" });
        await refreshData(true);
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error submitting withdrawal:", error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const amount = parseFloat(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amount > balance) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(balance)}`,
      );
      return;
    }
    if (!transferData.toMemberId) {
      toast.error("Please select a recipient");
      return;
    }
    const toMember = members.find(
      (m) => String(m.id) === String(transferData.toMemberId),
    );
    if (!toMember) {
      toast.error("Recipient not found");
      return;
    }
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const profileResponse = await apiFetch("/api/members.php");
      const profileData = await profileResponse.json();
      const currentUser = profileData.members?.find((m) => m.id === user?.id);

      const transferPayload = {
        fromMemberId: currentUser?.id || user.id,
        toMemberId: toMember.id,
        fromMemberName: currentUser?.name || user.name || "User",
        toMemberName: toMember.name || toMember.full_name || "Recipient",
        fromAccountNumber:
          currentUser?.accountNumber || user.accountNumber || "N/A",
        toAccountNumber:
          toMember.accountNumber || toMember.membership_number || "N/A",
        amount,
        date: new Date().toISOString().split("T")[0],
        description:
          transferData.description ||
          `Transfer to ${toMember.name || toMember.full_name}`,
        ...(myBranchId ? { branch_id: myBranchId } : {}),
      };

      const response = await apiFetch("/api/transfers.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transferPayload),
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        toast.error("Server returned invalid response");
        setLoading(false);
        return;
      }

      if (response.ok) {
        toast.success("✅ Transfer submitted for approval");
        setShowTransferModal(false);
        setTransferData({ toMemberId: "", amount: "", description: "" });
        await refreshData(true);
      } else {
        const errorMsg =
          data.error || data.message || `Server error: ${response.status}`;
        toast.error(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error submitting transfer:", error);
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out");
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "approved":
      case "completed":
        return {
          backgroundColor: isLight
            ? "rgba(5, 150, 105, 0.15)"
            : "rgba(16, 185, 129, 0.2)",
          color: creditColor,
        };
      case "pending":
        return {
          backgroundColor: isLight
            ? "rgba(217, 119, 6, 0.15)"
            : "rgba(234, 179, 8, 0.2)",
          color: warningColor,
        };
      case "rejected":
      case "failed":
        return {
          backgroundColor: isLight
            ? "rgba(220, 38, 38, 0.15)"
            : "rgba(239, 68, 68, 0.2)",
          color: debitColor,
        };
      default:
        return {
          backgroundColor: isLight
            ? "rgba(100, 116, 139, 0.15)"
            : "rgba(156, 163, 175, 0.2)",
          color: textMuted,
        };
    }
  };

  const displayName =
    userProfile?.name || user?.full_name || user?.name || "User";
  const displayAccount =
    userProfile?.accountNumber ||
    user?.accountNumber ||
    user?.membership_number ||
    "N/A";
  const displayJoinDate =
    userProfile?.joinDate || user?.join_date || user?.joinDate || new Date();

  const planSummary = computePlanSummary(
    userProfile?.savings_plan,
    userProfile?.duration,
    userProfile?.amount,
  );
  const savingsMethod =
    userProfile?.savings_method || user?.savings_method || "";
  const itemName = userProfile?.item_name || "";

  const planTypeMeta = getPlanTypeMeta(userProfile?.savings_plan);
  const durationMeta = getDurationMeta(userProfile?.duration);
  const hasPlanMark = !!(userProfile?.savings_plan && userProfile?.duration);

  const branchPlanMeta = getBranchPlanMeta(branchSavingsMethod);

  const effectiveMethod =
    branchSavingsMethod === "cash"
      ? "Cash"
      : branchSavingsMethod === "item"
        ? "Item"
        : savingsMethod || "";

  const memberMethodLower = String(savingsMethod || "").toLowerCase();
  const hasConflict =
    branchPlanLoaded &&
    ((branchSavingsMethod === "cash" && memberMethodLower === "item") ||
      (branchSavingsMethod === "item" && memberMethodLower === "cash"));

  const allowCash =
    branchSavingsMethod === "both" || branchSavingsMethod === "cash";
  const cashDisabled = !allowCash;

  const branchNameResolved =
    (branchInfo?.name && String(branchInfo.name).trim()) ||
    (branchInfo?.branch_name && String(branchInfo.branch_name).trim()) ||
    (activeBranch?.name && String(activeBranch.name).trim()) ||
    userProfile?.branch_name ||
    user?.branch_name ||
    "";

  const branchCodeResolved =
    (branchInfo?.code && String(branchInfo.code).trim()) ||
    (activeBranch?.code && String(activeBranch.code).trim()) ||
    userProfile?.branch_code ||
    user?.branch_code ||
    "";

  const branchName =
    branchNameResolved || (myBranchId ? `Branch #${myBranchId}` : "—");
  const branchCode = branchCodeResolved || "—";

  const selectedRecipient =
    members.find((m) => String(m.id) === String(transferData.toMemberId)) ||
    null;
  const selectedRecipientPhoto = getPassportUrl(selectedRecipient);

  // ============================================================
  // 🆕 Cycle calculation
  // ============================================================
  const cycles = useMemo(() => {
    const joinIso = toIsoDate(
      parseDate(
        userProfile?.joinDate || userProfile?.join_date || user?.join_date,
      ) || new Date(),
    );
    return computeCycles(joinIso, userProfile?.duration);
  }, [
    userProfile?.joinDate,
    userProfile?.join_date,
    userProfile?.duration,
    user?.join_date,
  ]);

  // Auto-select the cycle that contains "today"
  useEffect(() => {
    if (!cycles.length) return;
    const todayIso = toIsoDate(new Date());
    const idx = cycles.findIndex(
      (c) => todayIso >= c.startIso && todayIso <= c.endIso,
    );
    if (idx >= 0) setCycleIndex(idx);
  }, [cycles]);

  const currentCycle = cycles[cycleIndex] || null;

  const cycleDays = useMemo(() => {
    if (!currentCycle) return [];
    return buildCycleDays(currentCycle.start, dailyMarks);
  }, [currentCycle, dailyMarks]);

  const cycleStart = currentCycle?.startIso || null;
  const cycleEnd = currentCycle?.endIso || null;
  const checkedCount = cycleDays.filter((d) => d.checked).length;
  const totalDays = cycleDays.length;
  const canGoPrev = cycleIndex > 0;
  const canGoNext = cycleIndex < cycles.length - 1;

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: isLight ? "#f8fafc" : "#0f172a",
        minHeight: "100vh",
        color: textColor,
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .dash-wrap { color: ${textColor}; color-scheme: ${isLight ? "light" : "dark"}; }
        .dash-wrap * { box-sizing: border-box; }

        .modal-overlay {
          position: fixed; inset: 0;
          background-color: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 999; padding: 16px;
        }
        .modal-content {
          background-color: ${modalBg};
          border-radius: 16px; padding: 32px;
          max-width: 500px; width: 100%;
          max-height: 90vh; overflow-y: auto;
          border: 1px solid ${modalBorder};
          color: ${modalText};
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .modal-title { font-size: 18px; font-weight: bold; color: ${modalText}; }
        .modal-close { background: none; border: none; color: ${textMuted}; cursor: pointer; padding: 4px; font-size: 24px; line-height: 1; transition: color 0.2s; }
        .modal-close:hover { color: ${modalText}; }

        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 14px; font-weight: 500; color: ${modalText}; margin-bottom: 6px; }
        .form-input, .form-select {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background-color: ${fieldBg} !important;
          color: ${fieldText} !important;
          -webkit-text-fill-color: ${fieldText} !important;
          caret-color: ${accentColor}; font-size: 14px; outline: none;
          transition: border-color 0.2s, background-color 0.2s;
          font-family: inherit; appearance: none; -webkit-appearance: none;
        }
        .form-input:focus, .form-select:focus {
          border-color: ${fieldFocusBorder};
          background-color: ${fieldBg} !important;
          color: ${fieldText} !important;
          -webkit-text-fill-color: ${fieldText} !important;
        }
        .form-input::placeholder {
          color: ${fieldPlaceholder} !important;
          -webkit-text-fill-color: ${fieldPlaceholder} !important;
          opacity: 1;
        }
        .form-select option { background-color: ${modalBg}; color: ${fieldText}; }
        .form-input[type="number"]::-webkit-outer-spin-button,
        .form-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .form-input[type="number"] { -moz-appearance: textfield; }

        .btn-submit {
          width: 100%; padding: 12px; border-radius: 8px; border: none;
          background: linear-gradient(to right, #059669, #0d9488);
          color: #ffffff; font-size: 16px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-submit:hover:not(:disabled) { opacity: 0.9; transform: scale(1.01); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-cancel {
          width: 100%; padding: 12px; border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background: transparent; color: ${modalText};
          font-size: 16px; cursor: pointer; transition: all 0.2s;
        }
        .btn-cancel:hover { background-color: ${cardSurface2}; }
        .modal-buttons { display: flex; gap: 12px; margin-top: 16px; }
        .modal-buttons button { flex: 1; }

        .refresh-spinner { display: inline-block; animation: spin 1s linear infinite; }

        .branch-mini-refresh {
          background: transparent; border: 1px solid ${fieldBorder};
          color: ${textMuted}; width: 26px; height: 26px;
          border-radius: 6px;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 12px; padding: 0;
          transition: all 0.15s; flex-shrink: 0;
        }
        .branch-mini-refresh:hover:not(:disabled) { color: ${creditColor}; border-color: ${creditColor}; }
        .branch-mini-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
        .branch-mini-refresh .spin { display: inline-block; animation: spin 1s linear infinite; }

        .recipient-wrap { position: relative; }
        .recipient-trigger {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background-color: ${fieldBg}; color: ${fieldText};
          font-size: 14px; cursor: pointer; text-align: left;
          transition: border-color 0.2s; font-family: inherit;
        }
        .recipient-trigger:hover { border-color: ${fieldFocusBorder}; }
        .recipient-trigger .caret { margin-left: auto; color: ${textMuted}; font-size: 12px; }
        .recipient-menu {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          max-height: 280px; overflow-y: auto;
          background-color: ${modalBg};
          border: 1px solid ${modalBorder};
          border-radius: 10px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.35);
          z-index: 10; padding: 6px;
        }
        .recipient-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 6px;
          cursor: pointer; color: ${modalText};
          transition: background-color 0.15s;
        }
        .recipient-item:hover { background-color: ${cardSurface2}; }
        .recipient-item.active { background-color: ${cardSurface2}; }
        .recipient-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: ${isLight ? "rgba(5,150,105,0.15)" : "rgba(16,185,129,0.2)"};
          color: ${creditColor};
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13px;
          flex-shrink: 0; overflow: hidden;
          border: 1px solid ${fieldBorder};
        }
        .recipient-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .recipient-body { flex: 1; min-width: 0; }
        .recipient-name {
          font-size: 13.5px; font-weight: 600;
          color: ${modalText};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .recipient-meta {
          font-size: 11px; color: ${textMuted};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .recipient-empty { padding: 14px; text-align: center; color: ${textMuted}; font-size: 13px; }

        .plan-summary {
          background-color: ${cardSurface};
          border: 1px solid ${cardBorder};
          border-radius: 12px; padding: 24px; margin-bottom: 24px;
        }
        .plan-summary-header {
          display: flex; justify-content: space-between;
          align-items: center; gap: 12px;
          margin-bottom: 16px; flex-wrap: wrap;
        }
        .plan-summary-title { color: ${textColor}; margin: 0; font-size: 16px; }
        .plan-summary-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .plan-badge {
          padding: 4px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .plan-badge-green {
          background: ${isLight ? "rgba(5,150,105,0.15)" : "rgba(16,185,129,0.2)"};
          color: ${creditColor};
        }
        .plan-badge-blue {
          background: ${isLight ? "rgba(37,99,235,0.15)" : "rgba(59,130,246,0.2)"};
          color: ${infoColor};
        }
        .plan-badge-purple {
          background: ${isLight ? "rgba(124,58,237,0.15)" : "rgba(139,92,246,0.2)"};
          color: ${purpleColor};
        }
        .plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
        }
        .plan-cell { min-width: 0; }
        .plan-cell-label {
          font-size: 11px; font-weight: 600; color: ${textMuted};
          text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px;
        }
        .plan-cell-value {
          font-size: 16px; font-weight: 600; color: ${textColor};
          word-break: break-word;
        }
        .plan-cell-value.accent { color: ${creditColor}; font-size: 20px; }
        .plan-empty { text-align: center; padding: 24px; color: ${textMuted}; font-size: 14px; }
        .plan-empty-icon { font-size: 40px; margin-bottom: 8px; }

        .branch-plan-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.4px; text-transform: uppercase;
          white-space: nowrap; border: 1px solid ${fieldBorder};
        }
        .branch-plan-pill.both {
          background: ${isLight ? "rgba(37,99,235,0.12)" : "rgba(59,130,246,0.18)"};
          color: ${infoColor};
          border-color: ${isLight ? "rgba(37,99,235,0.35)" : "rgba(59,130,246,0.45)"};
        }
        .branch-plan-pill.cash {
          background: ${isLight ? "rgba(5,150,105,0.12)" : "rgba(16,185,129,0.18)"};
          color: ${creditColor};
          border-color: ${isLight ? "rgba(5,150,105,0.35)" : "rgba(16,185,129,0.45)"};
        }
        .branch-plan-pill.item {
          background: ${isLight ? "rgba(124,58,237,0.12)" : "rgba(139,92,246,0.18)"};
          color: ${purpleColor};
          border-color: ${isLight ? "rgba(124,58,237,0.35)" : "rgba(139,92,246,0.45)"};
        }

        .plan-mark-box {
          display: inline-flex; align-items: stretch; gap: 8px;
          flex-wrap: wrap; padding: 8px 10px; margin-top: 10px;
          border-radius: 10px; border: 1.5px dashed; background-color: ${cardSurface2};
        }
        .plan-mark-box.daily {
          border-color: ${isLight ? "rgba(5,150,105,0.55)" : "rgba(16,185,129,0.55)"};
          background-color: ${isLight ? "rgba(5,150,105,0.06)" : "rgba(16,185,129,0.10)"};
        }
        .plan-mark-box.weekly {
          border-color: ${isLight ? "rgba(37,99,235,0.55)" : "rgba(59,130,246,0.55)"};
          background-color: ${isLight ? "rgba(37,99,235,0.06)" : "rgba(59,130,246,0.10)"};
        }
        .plan-mark-box.monthly {
          border-color: ${isLight ? "rgba(124,58,237,0.55)" : "rgba(139,92,246,0.55)"};
          background-color: ${isLight ? "rgba(124,58,237,0.06)" : "rgba(139,92,246,0.10)"};
        }
        .plan-mark-box.random {
          border-color: ${isLight ? "rgba(217,119,6,0.55)" : "rgba(234,179,8,0.55)"};
          background-color: ${isLight ? "rgba(217,119,6,0.06)" : "rgba(234,179,8,0.10)"};
        }
        .plan-mark-box.empty {
          border-color: ${fieldBorder}; background-color: ${cardSurface};
        }
        .plan-mark-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px;
          background: ${isLight ? "#ffffff" : "rgba(0,0,0,0.20)"};
          border: 1px solid ${fieldBorder};
          font-size: 12.5px; font-weight: 700;
          letter-spacing: 0.2px; white-space: nowrap;
        }
        .plan-mark-chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .plan-mark-label {
          font-size: 10.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.5px;
          color: ${textMuted}; align-self: center; padding-right: 4px;
        }

        .day-grid-card {
          background-color: ${cardSurface};
          border: 1px solid ${cardBorder};
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .day-grid-header {
          display: flex; justify-content: space-between;
          align-items: center; gap: 12px;
          flex-wrap: wrap; margin-bottom: 14px;
        }
        .day-grid-title { color: ${textColor}; font-size: 15px; font-weight: 700; margin: 0; }
        .day-grid-sub { color: ${textMuted}; font-size: 12px; margin-top: 2px; }
        .day-grid-stats {
          display: inline-flex; gap: 10px; align-items: center;
          padding: 6px 14px; border-radius: 9999px;
          background: ${isLight ? "rgba(5,150,105,0.10)" : "rgba(16,185,129,0.14)"};
          border: 1px solid ${isLight ? "rgba(5,150,105,0.35)" : "rgba(16,185,129,0.40)"};
          color: ${creditColor}; font-size: 12px; font-weight: 700;
          letter-spacing: 0.4px;
        }
        .day-grid-stats .sep { opacity: 0.6; }

        /* 🆕 Cycle navigator */
        .dm-cycle-nav {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
          padding: 12px 16px;
          border-radius: 10px;
          background: ${isLight ? "rgba(37,99,235,0.05)" : "rgba(59,130,246,0.10)"};
          border: 1px solid ${isLight ? "rgba(37,99,235,0.20)" : "rgba(59,130,246,0.25)"};
        }
        .dm-cycle-nav-left {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .dm-cycle-btn {
          padding: 8px 14px; border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background: ${fieldBg}; color: ${fieldText};
          cursor: pointer; font-size: 13px; font-weight: 600;
          transition: all 0.15s;
        }
        .dm-cycle-btn:hover:not(:disabled) { border-color: ${accentColor}; color: ${creditColor}; }
        .dm-cycle-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .dm-cycle-dropdown {
          padding: 8px 12px; border-radius: 8px;
          border: 1px solid ${fieldBorder};
          background: ${fieldBg}; color: ${fieldText};
          font-size: 13px; cursor: pointer;
        }
        .dm-cycle-badge {
          padding: 5px 12px; border-radius: 9999px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.4px; text-transform: uppercase;
          background: ${isLight ? "rgba(37,99,235,0.12)" : "rgba(59,130,246,0.20)"};
          color: ${isLight ? "#1d4ed8" : "#93c5fd"};
          border: 1px solid ${isLight ? "rgba(37,99,235,0.35)" : "rgba(59,130,246,0.45)"};
        }

        .day-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .day-cell {
          position: relative;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 8px 4px 6px;
          border-radius: 10px;
          border: 1.5px solid ${fieldBorder};
          background: ${isLight ? "#ffffff" : "rgba(0,0,0,0.20)"};
          cursor: default;
          user-select: none;
          min-height: 62px;
        }
        .day-cell .day-num {
          font-size: 15px; font-weight: 800;
          color: ${textColor}; line-height: 1;
        }
        .day-cell .day-month {
          font-size: 9.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.5px;
          color: ${textMuted}; margin-top: 2px;
        }
        .day-cell .day-box {
          position: absolute; top: 5px; right: 5px;
          width: 14px; height: 14px; border-radius: 4px;
          border: 1.5px solid ${fieldBorder};
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; color: #ffffff; font-weight: 900;
        }
        .day-cell.checked {
          background: ${isLight ? "rgba(5,150,105,0.12)" : "rgba(16,185,129,0.18)"};
          border-color: ${creditColor};
        }
        .day-cell.checked .day-box {
          background: ${creditColor};
          border-color: ${creditColor};
        }
        .day-cell.checked .day-box::after { content: "✓"; }
        .day-cell.today {
          border-color: ${accentColor};
          box-shadow: 0 0 0 3px ${isLight ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.25)"};
        }
        .day-cell.today::before {
          content: "TODAY";
          position: absolute; top: -8px; left: 50%;
          transform: translateX(-50%);
          font-size: 8.5px; font-weight: 900;
          letter-spacing: 0.6px; color: #ffffff;
          background: ${accentColor};
          padding: 1px 6px; border-radius: 6px;
        }
        .day-cell.future .day-num { color: ${textMuted}; }
        .day-cell.past:not(.checked) .day-num { color: ${textMuted}; }

        .day-legend {
          display: flex; flex-wrap: wrap; gap: 14px;
          margin-top: 14px; padding-top: 12px;
          border-top: 1px solid ${cardBorder};
          font-size: 11.5px; color: ${textMuted};
        }
        .day-legend-item { display: inline-flex; align-items: center; gap: 6px; }
        .day-legend-dot {
          width: 12px; height: 12px; border-radius: 4px;
          border: 1.5px solid ${fieldBorder};
        }
        .day-legend-dot.checked { background: ${creditColor}; border-color: ${creditColor}; }
        .day-legend-dot.today { border-color: ${accentColor}; box-shadow: 0 0 0 2px ${isLight ? "rgba(16,185,129,0.20)" : "rgba(16,185,129,0.28)"}; }

        .read-only-badge {
          margin-left: 8px;
          font-size: 11px;
          font-weight: 700;
          color: ${textMuted};
          background: ${cardSurface2};
          border: 1px solid ${fieldBorder};
          padding: 2px 8px;
          border-radius: 9999px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .plan-conflict {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; margin-bottom: 16px;
          border-radius: 10px;
          background: ${isLight ? "rgba(234,88,12,0.08)" : "rgba(249,115,22,0.10)"};
          border: 1px solid ${isLight ? "rgba(234,88,12,0.30)" : "rgba(249,115,22,0.35)"};
          color: ${isLight ? "#7c2d12" : "#fdba74"};
          font-size: 13px; line-height: 1.5;
        }
        .plan-info {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; margin-bottom: 16px;
          border-radius: 10px;
          background: ${isLight ? "rgba(37,99,235,0.06)" : "rgba(59,130,246,0.10)"};
          border: 1px solid ${isLight ? "rgba(37,99,235,0.25)" : "rgba(59,130,246,0.30)"};
          color: ${isLight ? "#1e3a8a" : "#93c5fd"};
          font-size: 13px; line-height: 1.5;
        }

        @media (max-width: 640px) {
          .plan-summary { padding: 16px; }
          .plan-cell-value { font-size: 15px; }
          .plan-cell-value.accent { font-size: 18px; }
          .plan-mark-chip { font-size: 11.5px; padding: 5px 10px; }
          .day-grid { gap: 4px; }
          .day-cell { padding: 6px 2px 4px; min-height: 54px; }
          .day-cell .day-num { font-size: 13px; }
        }
      `}</style>

      <div className="dash-wrap">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h1 style={{ color: textColor, fontSize: "24px", margin: 0 }}>
              Welcome back, {displayName}! 👋
            </h1>

            <p
              style={{
                color: textMuted,
                margin: "6px 0 0 0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  backgroundColor: isLight
                    ? `${roleMeta.color}22`
                    : `${roleMeta.color}33`,
                  color: roleMeta.color,
                  border: `1px solid ${roleMeta.color}55`,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                {roleMeta.icon} {roleMeta.label}
              </span>
              <span>{isAdmin ? "Admin Dashboard" : "Member Dashboard"}</span>
            </p>

            {!isAdmin && (
              <div
                className={`plan-mark-box ${
                  hasPlanMark
                    ? String(userProfile?.savings_plan || "")
                        .toLowerCase()
                        .replace(/\s+/g, "")
                    : "empty"
                }`}
                title={
                  hasPlanMark
                    ? `${planTypeMeta.label} · ${durationMeta.label}`
                    : "No savings plan set yet"
                }
              >
                <span className="plan-mark-label">Plan</span>
                {hasPlanMark ? (
                  <>
                    <span
                      className="plan-mark-chip"
                      style={{ color: planTypeMeta.color }}
                    >
                      <span
                        className="plan-mark-chip-dot"
                        style={{ background: planTypeMeta.color }}
                      />
                      {planTypeMeta.icon} {planTypeMeta.label}
                    </span>
                    <span
                      className="plan-mark-chip"
                      style={{ color: durationMeta.color }}
                    >
                      <span
                        className="plan-mark-chip-dot"
                        style={{ background: durationMeta.color }}
                      />
                      {durationMeta.icon} {durationMeta.label}
                    </span>
                  </>
                ) : (
                  <span className="plan-mark-chip" style={{ color: textMuted }}>
                    📭 No plan set
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => refreshData(false)}
              disabled={refreshing}
              style={{
                backgroundColor: isLight
                  ? "rgba(37,99,235,0.1)"
                  : "rgba(59, 130, 246, 0.15)",
                color: infoColor,
                padding: "10px 20px",
                border: `1px solid ${isLight ? "rgba(37,99,235,0.25)" : "rgba(59, 130, 246, 0.2)"}`,
                borderRadius: "8px",
                cursor: refreshing ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.3s",
                opacity: refreshing ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {refreshing ? (
                <>
                  <span className="refresh-spinner">⟳</span> Refreshing...
                </>
              ) : (
                "🔄 Refresh"
              )}
            </button>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: isLight
                  ? "rgba(220,38,38,0.1)"
                  : "rgba(239, 68, 68, 0.15)",
                color: debitColor,
                padding: "10px 20px",
                border: `1px solid ${isLight ? "rgba(220,38,38,0.25)" : "rgba(239, 68, 68, 0.2)"}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s",
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          {/* Branch card */}
          <div
            style={{
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(16, 185, 129, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>🏢</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                    marginBottom: "4px",
                  }}
                >
                  <p style={{ color: textMuted, fontSize: "12px", margin: 0 }}>
                    Branch
                  </p>
                  <button
                    type="button"
                    className="branch-mini-refresh"
                    onClick={async () => {
                      setBranchRefreshing(true);
                      try {
                        const prof = await fetchUserProfile();
                        const bid =
                          prof?.branch_id ??
                          prof?.branchId ??
                          user?.branch_id ??
                          user?.branchId ??
                          activeBranchId ??
                          null;
                        if (bid) {
                          await fetchBranchInfo(bid);
                          await fetchBranchSavingsMethod(bid);
                          await fetchMembers();
                        }
                        toast.success("🔄 Branch refreshed");
                      } catch (err) {
                        console.error(
                          "[Dashboard] branch refresh failed:",
                          err,
                        );
                        toast.error("Failed to refresh branch");
                      } finally {
                        setBranchRefreshing(false);
                      }
                    }}
                    disabled={branchRefreshing}
                    title="Refresh branch info"
                  >
                    <span className={branchRefreshing ? "spin" : ""}>⟳</span>
                  </button>
                </div>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: branchNameResolved ? creditColor : textMuted,
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={branchName}
                >
                  {branchName}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: textMuted,
                    margin: "2px 0 6px 0",
                  }}
                >
                  {branchCode !== "—" ? `Code: ${branchCode}` : "—"}
                </p>
                {branchPlanLoaded && (
                  <span
                    className={`branch-plan-pill ${branchSavingsMethod}`}
                    title="What members of this branch can save with"
                  >
                    {branchPlanMeta.icon} {branchPlanMeta.short}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Balance */}
          <div
            style={{
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(5,150,105,0.15)"
                    : "rgba(16, 185, 129, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>💰</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
                    fontSize: "12px",
                    margin: "0 0 4px 0",
                  }}
                >
                  Balance
                </p>
                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: creditColor,
                    margin: 0,
                  }}
                >
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Account */}
          <div
            style={{
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(37,99,235,0.15)"
                    : "rgba(59, 130, 246, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>🏦</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
                    fontSize: "12px",
                    margin: "0 0 4px 0",
                  }}
                >
                  Account
                </p>
                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: textColor,
                    margin: 0,
                  }}
                >
                  {displayAccount}
                </p>
              </div>
            </div>
          </div>

          {/* Role */}
          <div
            style={{
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: `${roleMeta.color}33`,
                }}
              >
                <span style={{ fontSize: "24px" }}>{roleMeta.icon}</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
                    fontSize: "12px",
                    margin: "0 0 4px 0",
                  }}
                >
                  Role
                </p>
                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: roleMeta.color,
                    margin: 0,
                  }}
                >
                  {roleMeta.label}
                </p>
              </div>
            </div>
          </div>

          {/* Pending */}
          <div
            style={{
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(217,119,6,0.15)"
                    : "rgba(234, 179, 8, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>⏳</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
                    fontSize: "12px",
                    margin: "0 0 4px 0",
                  }}
                >
                  Pending
                </p>
                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: warningColor,
                    margin: 0,
                  }}
                >
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>

          {/* Joined */}
          <div
            style={{
              backgroundColor: cardSurface,
              borderRadius: "12px",
              padding: "20px",
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: isLight
                    ? "rgba(124,58,237,0.15)"
                    : "rgba(139, 92, 246, 0.2)",
                }}
              >
                <span style={{ fontSize: "24px" }}>📅</span>
              </div>
              <div>
                <p
                  style={{
                    color: textMuted,
                    fontSize: "12px",
                    margin: "0 0 4px 0",
                  }}
                >
                  Joined
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: textColor,
                    margin: 0,
                  }}
                >
                  {formatDate(displayJoinDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 30-DAY CHECK-IN GRID — READ ONLY + CYCLE NAVIGATOR */}
        {/* ============================================================ */}
        {!isAdmin && cycles.length > 0 && (
          <div className="day-grid-card">
            <div className="day-grid-header">
              <div>
                <h3 className="day-grid-title">
                  ✅ My Daily Check-In
                  <span
                    className="read-only-badge"
                    title="Only your manager can tick these boxes"
                  >
                    👁 View only
                  </span>
                </h3>
                <p className="day-grid-sub">
                  Your manager ticks each day you save. You can only view this.
                  {cycleStart && cycleEnd && (
                    <>
                      {" "}
                      <strong>{cycleStart}</strong> →{" "}
                      <strong>{cycleEnd}</strong>
                    </>
                  )}
                </p>
              </div>
              <div className="day-grid-stats">
                <span>
                  {checkedCount} / {totalDays} days
                </span>
                <span className="sep">•</span>
                <span>
                  {totalDays > 0
                    ? Math.round((checkedCount / totalDays) * 100)
                    : 0}
                  %
                </span>
                {marksLoading && (
                  <>
                    <span className="sep">•</span>
                    <span>⟳</span>
                  </>
                )}
              </div>
            </div>

            {/* 🆕 Cycle navigator */}
            {cycles.length > 1 && (
              <div className="dm-cycle-nav">
                <div className="dm-cycle-nav-left">
                  <button
                    type="button"
                    className="dm-cycle-btn"
                    disabled={!canGoPrev}
                    onClick={() => setCycleIndex((i) => Math.max(0, i - 1))}
                    title="Previous cycle"
                  >
                    ◀ Prev
                  </button>

                  <select
                    className="dm-cycle-dropdown"
                    value={cycleIndex}
                    onChange={(e) =>
                      setCycleIndex(parseInt(e.target.value, 10) || 0)
                    }
                  >
                    {cycles.map((c) => (
                      <option key={c.index} value={c.index}>
                        {c.label} — {c.startIso} → {c.endIso}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="dm-cycle-btn"
                    disabled={!canGoNext}
                    onClick={() =>
                      setCycleIndex((i) => Math.min(cycles.length - 1, i + 1))
                    }
                    title="Next cycle"
                  >
                    Next ▶
                  </button>
                </div>

                <div className="dm-cycle-nav-left">
                  <span className="dm-cycle-badge">
                    CYCLE {cycleIndex + 1} of {cycles.length}
                  </span>
                  {currentCycle && (
                    <span style={{ fontSize: 12, color: textMuted }}>
                      {currentCycle.startIso} → {currentCycle.endIso}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="day-grid">
              {cycleDays.map((d) => {
                const cellClass = [
                  "day-cell",
                  d.checked ? "checked" : "",
                  d.isToday ? "today" : "",
                  d.isFuture ? "future" : "",
                  d.isPast ? "past" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div key={d.iso} className={cellClass} title={d.iso}>
                    <div className="day-box" />
                    <div className="day-num">{d.dayNum}</div>
                    <div className="day-month">{d.monthShort}</div>
                  </div>
                );
              })}
            </div>

            <div className="day-legend">
              <div className="day-legend-item">
                <div className="day-legend-dot checked" /> Saved
              </div>
              <div className="day-legend-item">
                <div className="day-legend-dot today" /> Today
              </div>
              <div className="day-legend-item">
                <div className="day-legend-dot" /> Not yet
              </div>
            </div>
          </div>
        )}

        {/* Savings Plan Summary */}
        {!isAdmin && (
          <div className="plan-summary">
            <div className="plan-summary-header">
              <h3 className="plan-summary-title">💼 My Savings Plan</h3>
              <div className="plan-summary-badges">
                {branchPlanLoaded ? (
                  <span
                    className={`branch-plan-pill ${branchSavingsMethod}`}
                    title="What this branch allows members to save with"
                  >
                    {branchPlanMeta.icon} {branchPlanMeta.label}
                  </span>
                ) : (
                  effectiveMethod && (
                    <span className="plan-badge plan-badge-purple">
                      {effectiveMethod === "Item"
                        ? `📦 ${itemName || "Item"}`
                        : "💵 Cash"}
                    </span>
                  )
                )}
                {planSummary && (
                  <>
                    <span className="plan-badge plan-badge-green">
                      {planSummary.plan}
                    </span>
                    <span className="plan-badge plan-badge-blue">
                      {planSummary.duration}
                    </span>
                  </>
                )}
              </div>
            </div>

            {branchPlanLoaded && (
              <div className="plan-info">
                <span style={{ fontSize: 18, lineHeight: 1 }}>
                  {branchPlanMeta.icon}
                </span>
                <div>
                  <strong>This branch allows: {branchPlanMeta.label}.</strong>{" "}
                  {branchSavingsMethod === "cash" &&
                    "Only cash savings are available for members in this branch."}
                  {branchSavingsMethod === "item" &&
                    "Only item savings are available for members in this branch."}
                  {branchSavingsMethod === "both" &&
                    "You may save with cash, with items, or choose either."}
                </div>
              </div>
            )}

            {hasConflict && (
              <div className="plan-conflict">
                <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
                <div>
                  <strong>Your plan doesn't match the branch plan.</strong> Your
                  profile says{" "}
                  <em>{memberMethodLower === "item" ? "Item" : "Cash"}</em> but
                  this branch only allows{" "}
                  <strong>
                    {branchSavingsMethod === "cash" ? "Cash" : "Item"}
                  </strong>
                  . Please update your savings plan from your profile so it
                  matches what the branch allows.
                </div>
              </div>
            )}

            {!planSummary ? (
              <div className="plan-empty">
                <div className="plan-empty-icon">📭</div>
                <p style={{ margin: 0 }}>
                  No savings plan set yet. Visit your profile to create one.
                </p>
              </div>
            ) : (
              <div className="plan-grid">
                <div className="plan-cell">
                  <div className="plan-cell-label">Savings Plan</div>
                  <div className="plan-cell-value">
                    {planSummary.plan === "Random"
                      ? "Random"
                      : `${planSummary.plan}`}
                  </div>
                </div>
                <div className="plan-cell">
                  <div className="plan-cell-label">Savings Method</div>
                  <div className="plan-cell-value">
                    {effectiveMethod === "Item"
                      ? `📦 ${itemName || "Item"}`
                      : effectiveMethod === "Cash"
                        ? "💵 Cash"
                        : "—"}
                  </div>
                </div>
                <div className="plan-cell">
                  <div className="plan-cell-label">Duration</div>
                  <div className="plan-cell-value">{planSummary.duration}</div>
                </div>
                <div className="plan-cell">
                  <div className="plan-cell-label">
                    {planSummary.isRandom
                      ? "Amount"
                      : `Amount ${planSummary.periodLabel}`}
                  </div>
                  <div className="plan-cell-value accent">
                    {formatCurrency(planSummary.perPeriod)}
                  </div>
                </div>
                {!planSummary.isRandom && (
                  <>
                    <div className="plan-cell">
                      <div className="plan-cell-label">Number of Payments</div>
                      <div className="plan-cell-value">
                        {planSummary.totalPeriods}
                      </div>
                    </div>
                    <div className="plan-cell">
                      <div className="plan-cell-label">Total to Save</div>
                      <div className="plan-cell-value accent">
                        {formatCurrency(planSummary.total)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isAdmin && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <button
              onClick={() => {
                if (cashDisabled) {
                  toast.error(
                    "This branch is item-only — cash deposits are disabled.",
                  );
                  return;
                }
                setShowDepositModal(true);
              }}
              disabled={cashDisabled}
              title={cashDisabled ? "Branch is item-only" : "Deposit funds"}
              style={{
                backgroundColor: isLight
                  ? "rgba(5,150,105,0.1)"
                  : "rgba(16, 185, 129, 0.15)",
                color: cashDisabled ? textMuted : creditColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(5,150,105,0.25)" : "rgba(16, 185, 129, 0.2)"}`,
                borderRadius: "10px",
                cursor: cashDisabled ? "not-allowed" : "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
                opacity: cashDisabled ? 0.5 : 1,
              }}
            >
              💰 Deposit
            </button>

            <button
              onClick={() => {
                if (cashDisabled) {
                  toast.error(
                    "This branch is item-only — cash withdrawals are disabled.",
                  );
                  return;
                }
                setShowWithdrawModal(true);
              }}
              disabled={cashDisabled}
              title={cashDisabled ? "Branch is item-only" : "Withdraw funds"}
              style={{
                backgroundColor: isLight
                  ? "rgba(220,38,38,0.1)"
                  : "rgba(239, 68, 68, 0.15)",
                color: cashDisabled ? textMuted : debitColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(220,38,38,0.25)" : "rgba(239, 68, 68, 0.2)"}`,
                borderRadius: "10px",
                cursor: cashDisabled ? "not-allowed" : "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
                opacity: cashDisabled ? 0.5 : 1,
              }}
            >
              💸 Withdraw
            </button>

            <button
              onClick={() => {
                if (cashDisabled) {
                  toast.error(
                    "This branch is item-only — cash transfers are disabled.",
                  );
                  return;
                }
                if (members.length === 0) {
                  toast.error("No other members available for transfer");
                  return;
                }
                setShowTransferModal(true);
              }}
              disabled={cashDisabled}
              title={cashDisabled ? "Branch is item-only" : "Transfer funds"}
              style={{
                backgroundColor: isLight
                  ? "rgba(124,58,237,0.1)"
                  : "rgba(139, 92, 246, 0.15)",
                color: cashDisabled ? textMuted : purpleColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(124,58,237,0.25)" : "rgba(139, 92, 246, 0.2)"}`,
                borderRadius: "10px",
                cursor: cashDisabled ? "not-allowed" : "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
                opacity: cashDisabled ? 0.5 : 1,
              }}
            >
              🔄 Transfer
            </button>

            <button
              onClick={() => navigate("/member/borrowing")}
              style={{
                backgroundColor: isLight
                  ? "rgba(217,119,6,0.1)"
                  : "rgba(251, 191, 36, 0.15)",
                color: warningColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(217,119,6,0.25)" : "rgba(251, 191, 36, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
              }}
            >
              💳 Borrow
            </button>
          </div>
        )}

        {/* Admin Quick Actions */}
        {isAdmin && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <button
              onClick={() => navigate("/admin/members")}
              style={{
                backgroundColor: isLight
                  ? "rgba(5,150,105,0.1)"
                  : "rgba(16, 185, 129, 0.15)",
                color: creditColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(5,150,105,0.25)" : "rgba(16, 185, 129, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
              }}
            >
              👥 Manage Members
            </button>

            <button
              onClick={() => navigate("/admin/pending")}
              style={{
                backgroundColor: isLight
                  ? "rgba(37,99,235,0.1)"
                  : "rgba(59, 130, 246, 0.15)",
                color: infoColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(37,99,235,0.25)" : "rgba(59, 130, 246, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
              }}
            >
              ⏳ Pending Approvals
              {pendingCount > 0 && (
                <span
                  style={{
                    marginLeft: "8px",
                    backgroundColor: debitColor,
                    color: "#ffffff",
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "50%",
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate("/admin/reports")}
              style={{
                backgroundColor: isLight
                  ? "rgba(124,58,237,0.1)"
                  : "rgba(139, 92, 246, 0.15)",
                color: purpleColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(124,58,237,0.25)" : "rgba(139, 92, 246, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
              }}
            >
              📊 View Reports
            </button>

            <button
              onClick={() => navigate("/admin/loans")}
              style={{
                backgroundColor: isLight
                  ? "rgba(217,119,6,0.1)"
                  : "rgba(251, 191, 36, 0.15)",
                color: warningColor,
                padding: "16px",
                border: `1px solid ${isLight ? "rgba(217,119,6,0.25)" : "rgba(251, 191, 36, 0.2)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.3s",
              }}
            >
              💳 Loan Management
            </button>
          </div>
        )}

        {/* Recent Activity */}
        <div
          style={{
            backgroundColor: cardSurface,
            borderRadius: "12px",
            border: `1px solid ${cardBorder}`,
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ color: textColor, margin: 0 }}>
              📊 Recent Transactions
            </h3>
            <button
              onClick={() => refreshData(false)}
              disabled={refreshing}
              style={{
                background: "none",
                border: "none",
                color: infoColor,
                cursor: refreshing ? "not-allowed" : "pointer",
                fontSize: "14px",
                opacity: refreshing ? 0.5 : 1,
              }}
            >
              {refreshing ? "⟳ Refreshing..." : "🔄 Refresh"}
            </button>
          </div>
          {transactions.length > 0 ? (
            <div>
              {transactions.map((t) => {
                const rejectionReason = getRejectionReason(t);
                const rejectedBy = getRejectedBy(t);
                const rejectedAt = getRejectedAt(t);
                const isRejected =
                  t.status === "rejected" || t.status === "failed";

                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "12px 0",
                      borderBottom: `1px solid ${cardBorder}`,
                      gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: textColor, fontSize: "14px" }}>
                        {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                        {t.type === "transfer" &&
                          ` to ${t.toMemberName || "Recipient"}`}
                      </div>
                      <div style={{ color: textMuted, fontSize: "12px" }}>
                        {t.description || "No description"}
                      </div>

                      {isRejected && rejectionReason && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "8px 10px",
                            backgroundColor: isLight
                              ? "rgba(220,38,38,0.06)"
                              : "rgba(239, 68, 68, 0.08)",
                            border: `1px solid ${isLight ? "rgba(220,38,38,0.2)" : "rgba(239, 68, 68, 0.25)"}`,
                            borderRadius: "6px",
                            color: isLight ? "#991b1b" : "#fca5a5",
                            fontSize: "12px",
                            lineHeight: 1.4,
                          }}
                        >
                          <div style={{ fontWeight: "600", color: debitColor }}>
                            ❌ Rejection reason
                          </div>
                          <div style={{ marginTop: "2px" }}>
                            {rejectionReason}
                          </div>
                          {(rejectedBy || rejectedAt) && (
                            <div
                              style={{
                                color: textMuted,
                                fontSize: "11px",
                                marginTop: "4px",
                              }}
                            >
                              {rejectedBy && <>By: {rejectedBy}</>}
                              {rejectedBy && rejectedAt && " • "}
                              {rejectedAt && formatDate(rejectedAt)}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ color: textDim, fontSize: "11px" }}>
                        {formatDate(t.date)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          color:
                            t.type === "deposit" || t.type === "transfer_in"
                              ? creditColor
                              : debitColor,
                          fontWeight: "600",
                        }}
                      >
                        {t.type === "deposit" || t.type === "transfer_in"
                          ? "+"
                          : "-"}
                        {formatCurrency(t.amount)}
                      </div>
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: "12px",
                          fontSize: "10px",
                          ...getStatusBadgeStyle(t.status),
                        }}
                      >
                        {t.status}
                        {t.status === "pending" && " ⏳"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{ textAlign: "center", color: textMuted, padding: "20px" }}
            >
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>📭</div>
              <p>No recent transactions</p>
              <p style={{ fontSize: "14px" }}>
                Start using the app to see activity here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== DEPOSIT MODAL ===== */}
      {showDepositModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">💰 Deposit Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowDepositModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <label className="form-label">Amount (₦) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={depositData.amount}
                  onChange={(e) =>
                    setDepositData({ ...depositData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                />
                {planSummary && !planSummary.isRandom && (
                  <div
                    style={{
                      color: textMuted,
                      fontSize: "12px",
                      marginTop: "6px",
                    }}
                  >
                    💡 Your savings plan expects{" "}
                    <strong style={{ color: creditColor }}>
                      {formatCurrency(planSummary.perPeriod)}
                    </strong>{" "}
                    {planSummary.periodLabel}.
                  </div>
                )}
                {planSummary && planSummary.isRandom && (
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
                <div
                  style={{
                    color: textMuted,
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  ⏳ This will be reviewed by an admin before approval
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={depositData.description}
                  onChange={(e) =>
                    setDepositData({
                      ...depositData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowDepositModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Processing..." : "Submit Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== WITHDRAW MODAL ===== */}
      {showWithdrawModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">💸 Withdraw Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowWithdrawModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label className="form-label">Amount (₦) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={withdrawData.amount}
                  onChange={(e) =>
                    setWithdrawData({ ...withdrawData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                />
                <div
                  style={{
                    color: textMuted,
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  Available balance: {formatCurrency(balance)}
                </div>
                <div
                  style={{
                    color: warningColor,
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  ⏳ This will be reviewed by an admin before approval
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={withdrawData.description}
                  onChange={(e) =>
                    setWithdrawData({
                      ...withdrawData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Processing..." : "Submit Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== TRANSFER MODAL ===== */}
      {showTransferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🔄 Transfer Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowTransferModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label className="form-label">Recipient *</label>
                <div className="recipient-wrap" ref={recipientRef}>
                  <button
                    type="button"
                    className="recipient-trigger"
                    onClick={() => setRecipientOpen((o) => !o)}
                  >
                    {selectedRecipient ? (
                      <>
                        <div className="recipient-avatar">
                          {selectedRecipientPhoto ? (
                            <img
                              src={selectedRecipientPhoto}
                              alt={selectedRecipient.name || ""}
                            />
                          ) : (
                            (selectedRecipient.name || "U")
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>
                        <div className="recipient-body">
                          <div className="recipient-name">
                            {selectedRecipient.name ||
                              selectedRecipient.full_name}
                          </div>
                          <div className="recipient-meta">
                            {selectedRecipient.accountNumber ||
                              selectedRecipient.membership_number ||
                              "—"}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span style={{ color: fieldPlaceholder }}>
                        Select a member
                      </span>
                    )}
                    <span className="caret">▼</span>
                  </button>

                  {recipientOpen && (
                    <div className="recipient-menu">
                      {members.length === 0 ? (
                        <div className="recipient-empty">
                          No other members in your branch
                        </div>
                      ) : (
                        members.map((m) => {
                          const photo = getPassportUrl(m);
                          const isActive =
                            String(m.id) === String(transferData.toMemberId);
                          return (
                            <div
                              key={m.id}
                              className={`recipient-item ${isActive ? "active" : ""}`}
                              onClick={() => {
                                setTransferData({
                                  ...transferData,
                                  toMemberId: m.id,
                                });
                                setRecipientOpen(false);
                              }}
                            >
                              <div className="recipient-avatar">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={m.name || ""}
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  (m.name || "U").charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="recipient-body">
                                <div className="recipient-name">
                                  {m.name || m.full_name}
                                </div>
                                <div className="recipient-meta">
                                  {m.accountNumber ||
                                    m.membership_number ||
                                    "—"}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₦) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={transferData.amount}
                  onChange={(e) =>
                    setTransferData({ ...transferData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                />
                <div
                  style={{
                    color: textMuted,
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  Available balance: {formatCurrency(balance)}
                </div>
                <div
                  style={{
                    color: warningColor,
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  ⏳ This will be reviewed by an admin before approval
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={transferData.description}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowTransferModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Processing..." : "Submit Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
