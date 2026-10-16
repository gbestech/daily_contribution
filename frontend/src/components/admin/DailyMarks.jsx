// src/components/admin/DailyMarks.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";

const CYCLE_DAYS = 30;

// ---------- Plan meta ----------
const PLAN_TYPE_META = {
  Daily: { icon: "🗓️", label: "Daily", color: "#10b981", perMonth: 30 },
  Weekly: { icon: "📅", label: "Weekly", color: "#2563eb", perMonth: 4 },
  Monthly: { icon: "🗓️", label: "Monthly", color: "#7c3aed", perMonth: 1 },
  Random: { icon: "🎲", label: "Random", color: "#d97706", perMonth: 1 },
};

const DURATION_META = {
  "6 months": { icon: "⏱️", label: "6 months", months: 6, color: "#0891b2" },
  "1 year": { icon: "📆", label: "1 year", months: 12, color: "#059669" },
  "2 years": { icon: "📆", label: "2 years", months: 24, color: "#7c3aed" },
  "3 years": { icon: "📆", label: "3 years", months: 36, color: "#be185d" },
  "4 years": { icon: "📆", label: "4 years", months: 48, color: "#b45309" },
};

const METHOD_META = {
  cash: { icon: "💵", label: "Cash", color: "#10b981" },
  item: { icon: "📦", label: "Item", color: "#7c3aed" },
  both: { icon: "💵 + 📦", label: "Cash + Item", color: "#2563eb" },
};

const getPlanTypeMeta = (plan) =>
  PLAN_TYPE_META[String(plan || "").trim()] || {
    icon: "📋",
    label: plan || "—",
    color: "#64748b",
    perMonth: 1,
  };

const getDurationMeta = (duration) =>
  DURATION_META[String(duration || "").trim()] || {
    icon: "⏳",
    label: duration || "—",
    months: 0,
    color: "#64748b",
  };

const getMethodMeta = (m) => METHOD_META[m] || METHOD_META.both;

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

// 🆕 Money formatter (no decimals for clean ₦50,000)
const fmtNaira = (n) => {
  const val = Number(n || 0);
  return "₦" + val.toLocaleString("en-NG", { maximumFractionDigits: 0 });
};

const AdminDailyMarks = () => {
  const { activeBranch, activeBranchId } = useBranch();
  const { user } = useAuth();

  const viewerRole = String(user?.role || "")
    .trim()
    .toLowerCase();
  const isManager = viewerRole === "manager" || viewerRole === "branch_manager";
  const canMark = isManager;

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  const [dailyMarks, setDailyMarks] = useState(new Set());
  const [marksLoading, setMarksLoading] = useState(false);
  const [markSaving, setMarkSaving] = useState(null);

  const [cycleIndex, setCycleIndex] = useState(0);
  const [theme, setTheme] = useState(() => detectTheme());

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
  const fieldBorder = isLight
    ? "rgba(15,23,42,0.20)"
    : "rgba(255,255,255,0.15)";
  const fieldBg = isLight ? "#ffffff" : "#0f172a";
  const fieldText = isLight ? "#0f172a" : "#f1f5f9";
  const cardBorder = isLight ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.10)";
  const cardSurface = isLight ? "#f8fafc" : "rgba(255,255,255,0.05)";
  const creditColor = isLight ? "#059669" : "#34d399";
  const warningColor = isLight ? "#d97706" : "#fbbf24";
  const accentColor = "#10b981";

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const url = activeBranchId
        ? `/api/members.php?branch_id=${activeBranchId}`
        : "/api/members.php";
      const res = await apiFetch(url);
      const data = await res.json();
      const list = Array.isArray(data?.members) ? data.members : [];
      const sorted = list.slice().sort((a, b) =>
        String(a.name || a.full_name || "")
          .toLowerCase()
          .localeCompare(String(b.name || b.full_name || "").toLowerCase()),
      );
      setMembers(sorted);
    } catch (err) {
      console.error("[AdminDailyMarks] members fetch failed:", err);
      toast.error("Failed to load members");
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [activeBranchId]);

  const fetchMarks = useCallback(async (memberId) => {
    if (!memberId) {
      setDailyMarks(new Set());
      return;
    }
    setMarksLoading(true);
    try {
      const res = await apiFetch(`/api/daily-marks.php?member_id=${memberId}`);
      const data = await res.json();
      const arr = Array.isArray(data?.marks) ? data.marks : [];
      setDailyMarks(new Set(arr));
    } catch (err) {
      console.warn("[AdminDailyMarks] marks fetch failed:", err);
      setDailyMarks(new Set());
    } finally {
      setMarksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [activeBranchId, fetchMembers]);

  useEffect(() => {
    if (!selectedMemberId) {
      setSelectedMember(null);
      setDailyMarks(new Set());
      setCycleIndex(0);
      return;
    }
    const m = members.find((x) => String(x.id) === String(selectedMemberId));
    setSelectedMember(m || null);
    fetchMarks(selectedMemberId);
    setCycleIndex(0);
  }, [selectedMemberId, members, fetchMarks]);

  const toggleMark = async (iso) => {
    if (!canMark) {
      toast.error("Only managers can mark days");
      return;
    }
    if (!selectedMemberId) return;

    const todayIso = toIsoDate(new Date());
    if (iso > todayIso) {
      toast.error("You can't mark a future day.");
      return;
    }

    const already = dailyMarks.has(iso);
    const next = new Set(dailyMarks);
    if (already) next.delete(iso);
    else next.add(iso);
    setDailyMarks(next);
    setMarkSaving(iso);

    try {
      const res = await apiFetch("/api/daily-marks.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-User-Role": user?.role || "",
          "X-User-Branch-Id": String(activeBranchId || ""),
        },
        body: JSON.stringify({
          member_id: selectedMemberId,
          date: iso,
          marked: !already,
          ...(activeBranchId ? { branch_id: activeBranchId } : {}),
        }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned non-JSON (HTTP ${res.status})`);
      }
      if (!res.ok) {
        setDailyMarks(new Set(dailyMarks));
        toast.error(data.error || `Save failed (HTTP ${res.status})`);
      }
    } catch (err) {
      setDailyMarks(new Set(dailyMarks));
      toast.error(err.message || "Failed to save mark");
    } finally {
      setMarkSaving(null);
    }
  };

  // Plan info
  const planType = getPlanTypeMeta(selectedMember?.savings_plan);
  const durationMeta = getDurationMeta(selectedMember?.duration);
  const savingsMethod = String(selectedMember?.savings_method || "")
    .trim()
    .toLowerCase();
  const methodMeta = getMethodMeta(savingsMethod || "both");
  const amountPerPeriod = parseFloat(selectedMember?.amount || 0) || 0;

  const cycles = useMemo(() => {
    if (!selectedMember) return [];
    const join =
      selectedMember.joinDate ||
      selectedMember.join_date ||
      selectedMember.created_at ||
      new Date().toISOString();
    return computeCycles(join, selectedMember.duration);
  }, [selectedMember]);

  const currentCycle = cycles[cycleIndex] || null;

  const cycleDays = useMemo(() => {
    if (!currentCycle) return [];
    return buildCycleDays(currentCycle.start, dailyMarks);
  }, [currentCycle, dailyMarks]);

  const checkedCount = cycleDays.filter((d) => d.checked).length;
  const totalDays = cycleDays.length;

  // 🆕 Money math for this cycle
  const paidThisCycle = checkedCount * amountPerPeriod;
  // Expected total for one cycle: cycles are 30 days, but plan periods are per-month (30/4/1)
  // Use plan's periods-per-month × amount = expected per cycle
  const expectedPerCycle = amountPerPeriod * (planType.perMonth || 0);
  const cycleProgressPct =
    expectedPerCycle > 0
      ? Math.min(100, Math.round((paidThisCycle / expectedPerCycle) * 100))
      : 0;

  // Totals across ALL cycles
  const totalCheckedAllCycles = dailyMarks.size;
  const totalPaidAllCycles = totalCheckedAllCycles * amountPerPeriod;

  const expectedTotalAllCycles = useMemo(() => {
    if (!planType?.perMonth || !durationMeta?.months) return null;
    if (planType.label === "Random") return null;
    return planType.perMonth * durationMeta.months * amountPerPeriod;
  }, [planType, durationMeta, amountPerPeriod]);

  const totalProgressPct =
    expectedTotalAllCycles && expectedTotalAllCycles > 0
      ? Math.min(
          100,
          Math.round((totalPaidAllCycles / expectedTotalAllCycles) * 100),
        )
      : 0;

  const canGoPrev = cycleIndex > 0;
  const canGoNext = cycleIndex < cycles.length - 1;

  return (
    <div
      style={{
        padding: "24px",
        minHeight: "100vh",
        background: isLight ? "#f8fafc" : "#0f172a",
        color: textColor,
      }}
    >
      <style>{`
        .dm-wrap { color: ${textColor}; }
        .dm-wrap * { box-sizing: border-box; }

        .dm-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
        .dm-title { font-size: 24px; font-weight: bold; margin: 0; color: ${textColor}; }
        .dm-sub { color: ${textMuted}; margin-top: 4px; font-size: 14px; }

        .dm-card { background: ${cardSurface}; border: 1px solid ${cardBorder}; border-radius: 12px; padding: 20px; margin-bottom: 20px; }

        .dm-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.4px; }
        .dm-select { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid ${fieldBorder}; background: ${fieldBg}; color: ${fieldText}; font-size: 14px; outline: none; cursor: pointer; }
        .dm-select:focus { border-color: ${accentColor}; }

        .dm-plan-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 16px; padding: 16px; border-radius: 12px; background: ${isLight ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.10)"}; border: 1px solid rgba(16, 185, 129, 0.25); }
        .dm-plan-cell { min-width: 0; }
        .dm-plan-cell-label { font-size: 11px; font-weight: 600; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .dm-plan-cell-value { font-size: 15px; font-weight: 700; color: ${textColor}; word-break: break-word; }
        .dm-plan-cell-value.accent { color: ${creditColor}; font-size: 18px; }

        .dm-progress-wrap { margin-top: 12px; }
        .dm-progress-label { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: ${textMuted}; margin-bottom: 6px; }
        .dm-progress-bar { height: 10px; border-radius: 9999px; background: ${isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.10)"}; overflow: hidden; border: 1px solid ${fieldBorder}; }
        .dm-progress-fill { height: 100%; background: linear-gradient(90deg, #059669, #10b981); transition: width 0.3s ease; }

        .dm-member-banner { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.06); margin-bottom: 16px; flex-wrap: wrap; }
        .dm-member-avatar { width: 44px; height: 44px; border-radius: 50%; background: ${isLight ? "rgba(5,150,105,0.15)" : "rgba(16,185,129,0.2)"}; color: ${creditColor}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; overflow: hidden; }
        .dm-member-name { font-size: 15px; font-weight: 700; color: ${textColor}; }
        .dm-member-meta { font-size: 12px; color: ${textMuted}; margin-top: 2px; }

        .dm-grid-stats { display: inline-flex; gap: 10px; align-items: center; padding: 6px 14px; border-radius: 9999px; background: ${isLight ? "rgba(5,150,105,0.10)" : "rgba(16,185,129,0.14)"}; border: 1px solid ${isLight ? "rgba(5,150,105,0.35)" : "rgba(16,185,129,0.40)"}; color: ${creditColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.4px; }
        .dm-grid-stats .sep { opacity: 0.6; }

        .dm-cycle-nav { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; padding: 12px 16px; border-radius: 10px; background: ${isLight ? "rgba(37,99,235,0.05)" : "rgba(59,130,246,0.10)"}; border: 1px solid ${isLight ? "rgba(37,99,235,0.20)" : "rgba(59,130,246,0.25)"}; }
        .dm-cycle-nav-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .dm-cycle-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid ${fieldBorder}; background: ${fieldBg}; color: ${fieldText}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s; }
        .dm-cycle-btn:hover:not(:disabled) { border-color: ${accentColor}; color: ${creditColor}; }
        .dm-cycle-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .dm-cycle-dropdown { padding: 8px 12px; border-radius: 8px; border: 1px solid ${fieldBorder}; background: ${fieldBg}; color: ${fieldText}; font-size: 13px; cursor: pointer; }
        .dm-cycle-badge { padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; background: ${isLight ? "rgba(37,99,235,0.12)" : "rgba(59,130,246,0.20)"}; color: ${isLight ? "#1d4ed8" : "#93c5fd"}; border: 1px solid ${isLight ? "rgba(37,99,235,0.35)" : "rgba(59,130,246,0.45)"}; }

        /* 🆕 Paid amount panel */
        .dm-paid-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 16px;
          padding: 16px;
          border-radius: 12px;
          background: ${isLight ? "rgba(5,150,105,0.08)" : "rgba(16,185,129,0.12)"};
          border: 1.5px solid ${isLight ? "rgba(5,150,105,0.35)" : "rgba(16,185,129,0.40)"};
        }
        .dm-paid-cell { min-width: 0; }
        .dm-paid-label { font-size: 11px; font-weight: 700; color: ${textMuted}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .dm-paid-value { font-size: 26px; font-weight: 800; color: ${creditColor}; line-height: 1.1; word-break: break-word; }
        .dm-paid-sub { font-size: 11.5px; color: ${textMuted}; margin-top: 4px; }

        .dm-day-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-top: 14px; }
        .dm-day-cell { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px 6px; border-radius: 10px; border: 1.5px solid ${fieldBorder}; background: ${isLight ? "#ffffff" : "rgba(0,0,0,0.20)"}; min-height: 62px; user-select: none; transition: transform 0.12s, border-color 0.15s, background 0.15s; }
        .dm-day-cell.can-mark { cursor: pointer; }
        .dm-day-cell.can-mark:hover:not(.disabled) { border-color: ${accentColor}; transform: translateY(-1px); }
        .dm-day-cell .dm-num { font-size: 15px; font-weight: 800; color: ${textColor}; line-height: 1; }
        .dm-day-cell .dm-month { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${textMuted}; margin-top: 2px; }
        .dm-day-cell .dm-box { position: absolute; top: 5px; right: 5px; width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid ${fieldBorder}; background: transparent; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #ffffff; font-weight: 900; }
        .dm-day-cell.checked { background: ${isLight ? "rgba(5,150,105,0.12)" : "rgba(16,185,129,0.18)"}; border-color: ${creditColor}; }
        .dm-day-cell.checked .dm-box { background: ${creditColor}; border-color: ${creditColor}; }
        .dm-day-cell.checked .dm-box::after { content: "✓"; }
        .dm-day-cell.today { border-color: ${accentColor}; box-shadow: 0 0 0 3px ${isLight ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.25)"}; }
        .dm-day-cell.today::before { content: "TODAY"; position: absolute; top: -8px; left: 50%; transform: translateX(-50%); font-size: 8.5px; font-weight: 900; letter-spacing: 0.6px; color: #ffffff; background: ${accentColor}; padding: 1px 6px; border-radius: 6px; }
        .dm-day-cell.disabled { opacity: 0.45; cursor: not-allowed; }
        .dm-day-cell.saving { pointer-events: none; opacity: 0.7; }
        .dm-day-cell.future .dm-num { color: ${textMuted}; }
        .dm-day-cell.past:not(.checked) .dm-num { color: ${textMuted}; }

        /* 🆕 Per-day paid amount chip */
        .dm-day-cell .dm-paid {
          position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
          font-size: 8.5px; font-weight: 800; letter-spacing: 0.2px;
          color: ${creditColor};
          background: ${isLight ? "rgba(5,150,105,0.12)" : "rgba(16,185,129,0.20)"};
          border: 1px solid ${isLight ? "rgba(5,150,105,0.30)" : "rgba(16,185,129,0.45)"};
          padding: 1px 5px; border-radius: 9999px;
          white-space: nowrap;
          max-width: 90%; overflow: hidden; text-overflow: ellipsis;
        }

        .dm-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 14px; padding-top: 12px; border-top: 1px solid ${cardBorder}; font-size: 11.5px; color: ${textMuted}; }
        .dm-legend-item { display: inline-flex; align-items: center; gap: 6px; }
        .dm-legend-dot { width: 12px; height: 12px; border-radius: 4px; border: 1.5px solid ${fieldBorder}; }
        .dm-legend-dot.checked { background: ${creditColor}; border-color: ${creditColor}; }
        .dm-legend-dot.today { border-color: ${accentColor}; box-shadow: 0 0 0 2px ${isLight ? "rgba(16,185,129,0.20)" : "rgba(16,185,129,0.28)"}; }

        .dm-empty { text-align: center; padding: 60px 20px; color: ${textMuted}; font-size: 14px; }
        .dm-empty-icon { font-size: 48px; margin-bottom: 10px; }

        @media (max-width: 640px) {
          .dm-day-grid { gap: 4px; }
          .dm-day-cell { padding: 6px 2px 4px; min-height: 54px; }
          .dm-day-cell .dm-num { font-size: 13px; }
          .dm-day-cell .dm-paid { font-size: 7.5px; }
          .dm-paid-panel { grid-template-columns: 1fr; }
          .dm-paid-value { font-size: 22px; }
        }
      `}</style>

      <div className="dm-wrap">
        <div className="dm-header">
          <div>
            <h1 className="dm-title">✅ Daily Check-In Marks</h1>
            <p className="dm-sub">
              As a manager, tick each day a member saved. Each tick adds the
              plan's per-period amount.
            </p>
          </div>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              background: isLight
                ? "rgba(16,185,129,0.15)"
                : "rgba(16,185,129,0.20)",
              color: creditColor,
              border: "1px solid rgba(16, 185, 129, 0.4)",
            }}
          >
            🏢 {activeBranch?.name || "Branch"}
          </span>
        </div>

        <div className="dm-card">
          <label className="dm-label">Select a member</label>
          <select
            className="dm-select"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            disabled={membersLoading}
          >
            <option value="">
              {membersLoading
                ? "Loading members…"
                : members.length === 0
                  ? "No members in this branch"
                  : `— Select a member (${members.length}) —`}
            </option>
            {members.map((m) => {
              const name = m.name || m.full_name || `Member #${m.id}`;
              const acc =
                m.accountNumber || m.account_number || m.membership_number;
              return (
                <option key={m.id} value={m.id}>
                  {name}
                  {acc ? ` — ${acc}` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {!selectedMemberId ? (
          <div className="dm-card dm-empty">
            <div className="dm-empty-icon">👥</div>
            <p style={{ margin: 0 }}>
              Pick a member above to view and edit their daily marks.
            </p>
          </div>
        ) : (
          <div className="dm-card">
            <div className="dm-member-banner">
              <div className="dm-member-avatar">
                {(selectedMember?.name || selectedMember?.full_name || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dm-member-name">
                  {selectedMember?.name ||
                    selectedMember?.full_name ||
                    "Member"}
                </div>
                <div className="dm-member-meta">
                  {selectedMember?.accountNumber ||
                    selectedMember?.account_number ||
                    selectedMember?.membership_number ||
                    "—"}
                  {" · "}
                  Joined:{" "}
                  {selectedMember?.joinDate || selectedMember?.join_date || "—"}
                </div>
              </div>
              <div className="dm-grid-stats">
                <span>
                  {checkedCount} / {totalDays} days
                </span>
                <span className="sep">•</span>
                <span>{cycleProgressPct}%</span>
                {marksLoading && (
                  <>
                    <span className="sep">•</span>
                    <span>⟳</span>
                  </>
                )}
              </div>
            </div>

            {/* Plan panel */}
            {selectedMember?.savings_plan || selectedMember?.duration ? (
              <div className="dm-plan-panel">
                <div className="dm-plan-cell">
                  <div className="dm-plan-cell-label">Savings Plan</div>
                  <div
                    className="dm-plan-cell-value"
                    style={{ color: planType.color }}
                  >
                    {planType.icon} {planType.label}
                  </div>
                </div>
                <div className="dm-plan-cell">
                  <div className="dm-plan-cell-label">Method</div>
                  <div
                    className="dm-plan-cell-value"
                    style={{ color: methodMeta.color }}
                  >
                    {methodMeta.icon} {methodMeta.label}
                  </div>
                </div>
                <div className="dm-plan-cell">
                  <div className="dm-plan-cell-label">Duration</div>
                  <div
                    className="dm-plan-cell-value"
                    style={{ color: durationMeta.color }}
                  >
                    {durationMeta.icon} {durationMeta.label}
                  </div>
                </div>
                <div className="dm-plan-cell">
                  <div className="dm-plan-cell-label">Amount / period</div>
                  <div className="dm-plan-cell-value accent">
                    {fmtNaira(amountPerPeriod)}
                  </div>
                </div>
                {expectedTotalAllCycles != null && (
                  <div className="dm-plan-cell">
                    <div className="dm-plan-cell-label">
                      Total expected (whole plan)
                    </div>
                    <div className="dm-plan-cell-value accent">
                      {fmtNaira(expectedTotalAllCycles)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: 14,
                  marginBottom: 16,
                  borderRadius: 10,
                  background: isLight
                    ? "rgba(217,119,6,0.08)"
                    : "rgba(234,179,8,0.10)",
                  border: `1px solid ${isLight ? "rgba(217,119,6,0.30)" : "rgba(234,179,8,0.35)"}`,
                  color: warningColor,
                  fontSize: 13,
                }}
              >
                ⚠️ This member hasn't set a savings plan yet. Marks will still
                save, but no amounts will show.
              </div>
            )}

            {/* Overall progress bar */}
            {expectedTotalAllCycles != null && (
              <div className="dm-progress-wrap" style={{ marginBottom: 16 }}>
                <div className="dm-progress-label">
                  <span>Overall savings progress</span>
                  <span style={{ color: creditColor, fontWeight: 700 }}>
                    {totalProgressPct}%
                  </span>
                </div>
                <div className="dm-progress-bar">
                  <div
                    className="dm-progress-fill"
                    style={{ width: `${totalProgressPct}%` }}
                  />
                </div>
                <div className="dm-paid-sub" style={{ marginTop: 6 }}>
                  {fmtNaira(totalPaidAllCycles)} paid of{" "}
                  {fmtNaira(expectedTotalAllCycles)} across {cycles.length}{" "}
                  cycles
                </div>
              </div>
            )}

            {/* Cycle navigator */}
            {cycles.length > 0 && (
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

            {/* 🆕 PAID AMOUNT PANEL — shows money for this cycle */}
            <div className="dm-paid-panel">
              <div className="dm-paid-cell">
                <div className="dm-paid-label">💰 Paid this cycle</div>
                <div className="dm-paid-value">{fmtNaira(paidThisCycle)}</div>
                <div className="dm-paid-sub">
                  {checkedCount} tick{checkedCount === 1 ? "" : "s"} ×{" "}
                  {fmtNaira(amountPerPeriod)} per period
                </div>
              </div>
              <div className="dm-paid-cell">
                <div className="dm-paid-label">🎯 Expected this cycle</div>
                <div className="dm-paid-value" style={{ color: textColor }}>
                  {fmtNaira(expectedPerCycle)}
                </div>
                <div className="dm-paid-sub">
                  {planType.perMonth} period{planType.perMonth === 1 ? "" : "s"}{" "}
                  × {fmtNaira(amountPerPeriod)}
                </div>
              </div>
              <div
                className="dm-paid-cell"
                style={{ gridColumn: "1 / -1", marginTop: 4 }}
              >
                <div className="dm-paid-label">📈 Cycle progress</div>
                <div className="dm-progress-bar" style={{ marginTop: 4 }}>
                  <div
                    className="dm-progress-fill"
                    style={{ width: `${cycleProgressPct}%` }}
                  />
                </div>
                <div className="dm-paid-sub" style={{ marginTop: 4 }}>
                  {cycleProgressPct}% of this cycle's expected amount
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="dm-day-grid">
              {cycleDays.map((d) => {
                const cellClass = [
                  "dm-day-cell",
                  d.checked ? "checked" : "",
                  d.isToday ? "today" : "",
                  d.isFuture ? "future" : "",
                  d.isPast ? "past" : "",
                  d.isFuture ? "disabled" : "",
                  markSaving === d.iso ? "saving" : "",
                  canMark && !d.isFuture ? "can-mark" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={d.iso}
                    className={cellClass}
                    title={
                      d.isFuture
                        ? `${d.iso} (future — locked)`
                        : canMark
                          ? `${d.iso} — click to toggle`
                          : `${d.iso} (view only)`
                    }
                    onClick={() => {
                      if (d.isFuture || !canMark) return;
                      toggleMark(d.iso);
                    }}
                  >
                    <div className="dm-box" />
                    <div className="dm-num">{d.dayNum}</div>
                    <div className="dm-month">{d.monthShort}</div>
                    {/* 🆕 Show amount chip on ticked cells */}
                    {d.checked && amountPerPeriod > 0 && (
                      <div className="dm-paid">{fmtNaira(amountPerPeriod)}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="dm-legend">
              <div className="dm-legend-item">
                <div className="dm-legend-dot checked" /> Saved
              </div>
              <div className="dm-legend-item">
                <div className="dm-legend-dot today" /> Today
              </div>
              <div className="dm-legend-item">
                <div className="dm-legend-dot" /> Not yet
              </div>
              {!canMark && (
                <div
                  className="dm-legend-item"
                  style={{ color: warningColor, fontWeight: 600 }}
                >
                  👁 View-only (only managers can mark)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDailyMarks;
