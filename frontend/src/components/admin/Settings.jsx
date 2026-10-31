import React, { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { useBranch } from "../../context/BranchContext";
import { usePermission } from "../../context/PermissionsContext";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "https://baleeg.onrender.com";

const validatePhone = (phone, { required = false, label = "Phone number" } = {}) => {
  const value = String(phone || "").trim();
  if (!value) return required ? `${label} is required` : "";
  const digitsOnly = value.replace(/[\s\-()]/g, "");
  if (!/^\d+$/.test(digitsOnly)) return `${label} must contain only digits (0-9)`;
  if (digitsOnly.length !== 11) return `${label} must be exactly 11 digits (you entered ${digitsOnly.length})`;
  return "";
};

const SAVINGS_METHODS = ["cash", "item", "both"];
const DURATION_OPTIONS = ["6 months", "1 year"];
const PLAN_OPTIONS = ["Daily", "Weekly", "Monthly", "Random"];

const DEFAULT_ITEMS = {
  durations: ["6 months", "1 year"],
  savings_plans: ["Daily", "Weekly", "Monthly", "Random"],
  allow_multi_item: true,
  money_check_mode: "strict",
  require_duration_match: true,
  savings_methods: "both",
};

const DEFAULTS = {
  general: { shop_name: "", shop_email: "", shop_phone: "", shop_address: "", currency: "NGN", timezone: "Africa/Lagos", date_format: "DD/MM/YYYY" },
  contribution: { daily_limit: 100000, min_deposit: 500, max_deposit: 50000, allow_multiple_deposits: true, max_daily_deposits: 3, contribution_frequency: "daily", default_contribution_amount: 5000, enable_auto_contribution: false, auto_contribution_time: "09:00" },
  commission: { enable_commission: true, commission_type: "percentage", commission_rate: 5, commission_fixed_amount: 500, min_commission_amount: 100, max_commission_amount: 10000, commission_period: "daily", apply_commission_on: "deposit", commission_account: "admin", enable_tiered_commission: false, tiers: [], enable_referral_commission: false, referral_commission_rate: 2, enable_loyalty_commission: false, loyalty_commission_rate: 1 },
  payment: { payment_percentage: 80, allow_partial_payment: true, max_payment_count: 2, enable_refunds: true, require_admin_approval: true },
  discount: { enable_discounts: true, discount_type: "percentage", default_discount_percentage: 10, default_discount_fixed: 1000, max_discount_percentage: 50, max_discount_amount: 10000, require_admin_approval: false, loyalty_discount_enabled: true, loyalty_discount_percentage: 5, bulk_discount_enabled: true, bulk_discount_min_qty: 10, bulk_discount_percentage: 15, seasonal_discount_enabled: false, seasonal_discount_percentage: 20, seasonal_start_date: "", seasonal_end_date: "" },
  security: { two_factor_auth: false, session_timeout: 30, max_login_attempts: 5, password_expiry_days: 90, require_strong_password: true },
  suspension: { auto_suspend_inactive: false, inactive_days: 30, suspend_on_negative_balance: true, negative_balance_threshold: 5000, require_admin_approval_for_reactivation: true, send_notification_on_suspension: true, notify_admin_on_suspension: true },
  loan: { min_membership_days: 180, max_borrow_percentage: 50, interest_rate: 5, max_duration_months: 6, min_loan_amount: 100, max_loan_amount: 1000000, enable_loan_requests: true, require_admin_approval: true, auto_approve_small_loans: false, small_loan_threshold: 5000, late_payment_penalty: 10, grace_period_days: 7, max_loans_per_member: 3, loan_cooldown_days: 30 },
  items: DEFAULT_ITEMS,
};

const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

const normalizeItems = (raw) => {
  const r = isPlainObject(raw) ? raw : {};
  return {
    ...DEFAULT_ITEMS,
    ...r,
    durations: Array.isArray(r.durations) ? r.durations : DEFAULT_ITEMS.durations,
    savings_plans: Array.isArray(r.savings_plans) ? r.savings_plans : DEFAULT_ITEMS.savings_plans,
    savings_methods: SAVINGS_METHODS.includes(r.savings_methods) ? r.savings_methods : "both",
  };
};

const sameItems = (a, b) => {
  const x = normalizeItems(a);
  const y = normalizeItems(b);
  const arr = (v) => [...v].sort().join("|");
  return (
    arr(x.durations) === arr(y.durations) &&
    arr(x.savings_plans) === arr(y.savings_plans) &&
    x.savings_methods === y.savings_methods &&
    x.money_check_mode === y.money_check_mode &&
    !!x.allow_multi_item === !!y.allow_multi_item &&
    !!x.require_duration_match === !!y.require_duration_match
  );
};

const buildSettings = (s = {}) => {
  const out = {};
  Object.keys(DEFAULTS).forEach((k) => {
    out[k] = k === "items" ? normalizeItems(s.items) : { ...DEFAULTS[k], ...(isPlainObject(s[k]) ? s[k] : {}) };
  });
  return out;
};

const readSavedBranchId = () => {
  try { return localStorage.getItem("selectedBranchId"); } catch { return null; }
};

const request = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    console.error("[Settings] Non-JSON response:", text.slice(0, 300));
    throw new Error(`Server returned non-JSON (HTTP ${res.status}). Check the PHP error log.`);
  }
  return { res, data };
};

const Check = ({ label, checked, onChange }) => (
  <div className="form-checkbox">
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="form-checkbox-label">{label}</span>
    </label>
  </div>
);

const NumField = ({ label, value, onChange, parse = parseInt, fallback = 0, ...rest }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input type="number" className="form-input" value={value}
      onChange={(e) => { const n = parse(e.target.value); onChange(Number.isFinite(n) ? n : fallback); }}
      {...rest} />
  </div>
);

const PhoneField = ({ label, errLabel, value, error, onValue, onError }) => {
  const check = (v) => validatePhone(v, { required: false, label: errLabel });
  return (
    <div className="form-group">
      <label className="form-label">{label} <span style={{ color: "var(--text-dim)" }}>(exactly 11 digits)</span></label>
      <input type="tel" className={`form-input ${error ? "input-error" : ""}`} value={value}
        onChange={(e) => { onValue(e.target.value); if (error) onError(check(e.target.value)); }}
        onBlur={(e) => onError(check(e.target.value))} placeholder="e.g. 08012345678" maxLength={15} inputMode="numeric" />
      {error && <div className="field-error"><span>⚠️</span> {error}</div>}
    </div>
  );
};

const METHOD_OPTIONS = (long) => [
  { value: "both", title: "💵 + 📦 Both Cash & Item", desc: long ? "Members can choose between paying cash or saving for items." : "Members can choose between cash or item." },
  { value: "cash", title: "💵 Cash Only", desc: long ? "Members of this branch can only pay cash. Item selection is hidden." : "Only cash savings. Item selection is hidden." },
  { value: "item", title: "📦 Item Only", desc: long ? "Members of this branch can only save for items. Cash option is hidden." : "Only item savings. Cash option is hidden." },
];

const MethodRadios = ({ name, value, onChange, long }) =>
  METHOD_OPTIONS(long).map((opt) => {
    const selected = (value || "both") === opt.value;
    return (
      <label key={opt.value} className={`radio-row ${selected ? "selected" : ""}`}>
        <input type="radio" name={name} value={opt.value} checked={selected} onChange={() => onChange(opt.value)} />
        <div className="radio-row-body">
          <div className="radio-row-title">{opt.title}</div>
          <div className="radio-row-desc">{opt.desc}</div>
        </div>
      </label>
    );
  });

const TABS = [
  ["general", "⚙️ General"],
  ["loan", "💰 Loan"],
  ["contribution", "💰 Contribution"],
  ["commission", "💸 Commission"],
  ["payment", "💳 Payment"],
  ["discount", "🏷️ Discount"],
  ["security", "🔒 Security"],
  ["suspension", "🚫 Suspension"],
  ["items", "🧾 Items"],
];

const EMPTY_BRANCH_FORM = { id: null, code: "", name: "", address: "", phone: "", email: "", manager_id: "", manager: "", status: "active", savings_methods: "both" };

const isManagerRole = (m) => {
  const r = String(m.role || "").trim().toLowerCase();
  return r === "manager" || r === "branch_manager" || r === "branch-manager" || r === "branchmanager";
};

const AdminSettings = () => {
  const branchCtx = useBranch() || {};
  const { can } = usePermission() || {};
  const { user } = useAuth();

  const activeBranch =
    branchCtx.activeBranch || branchCtx.selectedBranch || null;
  const activeBranchId =
    branchCtx.activeBranchId ??
    activeBranch?.id ??
    user?.branch_id ??
    readSavedBranchId() ??
    null;
  const hasBranch = activeBranchId !== null && activeBranchId !== "";

  const roleStr = String(user?.role || "")
    .trim()
    .toLowerCase();
  const isAdmin = roleStr === "admin" || roleStr === "administrator";
  const isManager = roleStr === "manager" || roleStr === "branch_manager";

  const perm = (k) => (typeof can === "function" ? can(k) : false);
  const canViewBranches = perm("view_branches");
  const canCreateBranch = perm("create_branch");
  const canEditBranch = perm("edit_branch");
  const canDeleteBranch = perm("delete_branch");
  const canToggleBranch = perm("toggle_branch_status");
  const canCopyLink = perm("copy_registration_link");

  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const settingsReq = useRef(0);
  const [settings, setSettings] = useState(() => buildSettings());
  const itemsSettings = settings.items;

  const [members, setMembers] = useState([]);
  const [suspendedAccounts, setSuspendedAccounts] = useState([]);
  const [allManagers, setAllManagers] = useState([]);

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesSaving, setBranchesSaving] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(false);
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH_FORM);
  const [branchFormItems, setBranchFormItems] = useState(null);

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionDuration, setSuspensionDuration] = useState("permanent");
  const [searchTerm, setSearchTerm] = useState("");

  const [generalPhoneError, setGeneralPhoneError] = useState("");
  const [branchPhoneError, setBranchPhoneError] = useState("");

  const myBranchId =
    user?.branch_id ?? user?.branchId ?? activeBranchId ?? null;

  const canEditThisBranch = (branch) => {
    if (!branch) return false;
    if (isAdmin) return canEditBranch === true;
    if (!isManager) return false;
    if (!myBranchId) return false;
    return String(branch.id) === String(myBranchId);
  };

  const visibleBranches = useMemo(() => {
    if (isAdmin) return branches;
    if (isManager && myBranchId)
      return branches.filter((b) => String(b.id) === String(myBranchId));
    return [];
  }, [branches, isAdmin, isManager, myBranchId]);

  const managers = useMemo(() => {
    const source = isAdmin ? allManagers : members;
    return source.filter(isManagerRole);
  }, [allManagers, members, isAdmin]);

  const roleHeaders = () => ({
    "X-User-Role": user?.role || "",
    "X-User-Branch-Id": String(myBranchId || ""),
  });

  const upd = (section, key, value) =>
    setSettings((p) => ({ ...p, [section]: { ...p[section], [key]: value } }));
  const setGen = (k, v) => upd("general", k, v);
  const setItem = (k, v) => upd("items", k, v);
  const toggleInList = (key, value, on) =>
    setSettings((p) => {
      const cur = p.items[key] || [];
      const next = on
        ? [...new Set([...cur, value])]
        : cur.filter((x) => x !== value);
      return { ...p, items: { ...p.items, [key]: next } };
    });

  const chk = (sec, key, label) => (
    <Check
      key={key}
      label={label}
      checked={settings[sec][key]}
      onChange={(v) => upd(sec, key, v)}
    />
  );
  const num = (sec, key, label, opts = {}) => (
    <NumField
      key={key}
      label={label}
      value={settings[sec][key]}
      onChange={(v) => upd(sec, key, v)}
      {...opts}
    />
  );
  const sel = (sec, key, label, options) => (
    <div className="form-group" key={key}>
      <label className="form-label">{label}</label>
      <select
        className="form-select"
        value={settings[sec][key]}
        onChange={(e) => upd(sec, key, e.target.value)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  const settingsUrl = (bid) =>
    bid !== null && bid !== undefined && bid !== ""
      ? `${API_BASE_URL}/api/settings.php?branch_id=${bid}`
      : `${API_BASE_URL}/api/settings.php`;

  const branchQuery = () => (hasBranch ? `?branch_id=${activeBranchId}` : "");

  const fetchSettings = async (bid = activeBranchId) => {
    if (bid === null || bid === undefined || bid === "") {
      setSettingsLoaded(false);
      return null;
    }
    const reqId = ++settingsReq.current;
    setSettingsLoaded(false);
    try {
      const { data } = await request(settingsUrl(bid), {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (reqId !== settingsReq.current) return null;
      if (data.status && data.data) {
        setSettings(buildSettings(data.data));
        setSettingsLoaded(true);
        return data.data;
      }
      toast.error(data.error || "Failed to load settings");
    } catch (error) {
      if (reqId === settingsReq.current) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load settings");
      }
    }
    return null;
  };

  const fetchMembers = async () => {
    if (!hasBranch) {
      setMembers([]);
      setSuspendedAccounts([]);
      return;
    }
    try {
      const { data } = await request(
        `${API_BASE_URL}/api/members.php${branchQuery()}`,
      );
      if (!Array.isArray(data.members)) {
        if (data?.error) console.warn("[Settings] members.php:", data.error);
        return;
      }
      setMembers(data.members.filter((m) => m.status !== "Suspended"));
      setSuspendedAccounts(
        data.members
          .filter((m) => m.status === "Suspended")
          .map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            phone: m.phone || "N/A",
            reason: m.suspension_reason || "Suspended by admin",
            suspended_date:
              m.suspended_date || new Date().toISOString().split("T")[0],
            suspended_by: m.suspended_by || "Admin",
            balance: m.balance || 0,
            duration: m.suspension_duration || "permanent",
            role: m.role,
          })),
      );
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch members");
    }
  };

  const fetchBranches = async () => {
    setBranchesLoading(true);
    try {
      const { res, data } = await request(`${API_BASE_URL}/api/branches.php`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok)
        throw new Error(
          data.error || `Failed to load branches (HTTP ${res.status})`,
        );
      setBranches(Array.isArray(data.branches) ? data.branches : []);
    } catch (err) {
      console.error("Error fetching branches:", err);
      toast.error(err.message || "Failed to load branches");
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  };

  const fetchAllManagers = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/members.php?all=1`, {
        headers: {
          Accept: "application/json",
          "X-User-Role": user?.role || "",
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.members))
        setAllManagers(data.members.filter(isManagerRole));
    } catch (err) {
      console.error("[Settings] fetchAllManagers error:", err);
    }
  };

  const getBranchItems = async (branchId) => {
    if (branchId === null || branchId === undefined || branchId === "")
      return null;
    try {
      const { data } = await request(settingsUrl(branchId), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (data?.status && data?.data?.items)
        return normalizeItems(data.data.items);
    } catch (err) {
      console.warn("[branches] getBranchItems failed:", err);
    }
    return null;
  };

  useEffect(() => {
    fetchBranches();
    fetchAllManagers();
  }, []);

  useEffect(() => {
    let alive = true;
    setSettings(buildSettings());
    setGeneralPhoneError("");
    setSearchTerm("");
    setMembers([]);
    setSuspendedAccounts([]);
    setSettingsLoaded(false);

    if (!hasBranch) {
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      await Promise.all([fetchSettings(), fetchMembers()]);
      if (alive) setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [activeBranchId, hasBranch]);

  useEffect(() => {
    if (activeTab === "branches" && !canViewBranches) setActiveTab("general");
    if (activeTab === "branches" && isManager && !myBranchId)
      setActiveTab("general");
  }, [activeTab, canViewBranches, isManager, myBranchId]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSettings(),
        fetchMembers(),
        fetchBranches(),
        fetchAllManagers(),
      ]);
      toast.success("✅ Data refreshed");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const resetBranchModal = () => {
    setShowBranchModal(false);
    setBranchForm(EMPTY_BRANCH_FORM);
    setBranchFormItems(null);
    setBranchPhoneError("");
    setEditingBranch(false);
  };

  const openCreateBranch = () => {
    if (!isAdmin) {
      toast.error("Only admins can create branches");
      return;
    }
    setBranchForm(EMPTY_BRANCH_FORM);
    setBranchFormItems(null);
    setBranchPhoneError("");
    setEditingBranch(false);
    setShowBranchModal(true);
  };

  const openEditBranch = async (b) => {
    if (!canEditThisBranch(b)) {
      toast.error("You can only edit your own branch");
      return;
    }
    let matchedManager = null;
    if (b.manager_id)
      matchedManager = managers.find(
        (m) => String(m.id) === String(b.manager_id),
      );
    if (!matchedManager && b.manager) {
      const target = b.manager.trim().toLowerCase();
      matchedManager = managers.find(
        (m) => (m.name || "").trim().toLowerCase() === target,
      );
    }
    const items = await getBranchItems(b.id);
    const branchSavingsMethods =
      items?.savings_methods ||
      (SAVINGS_METHODS.includes(b.savings_methods)
        ? b.savings_methods
        : "both");
    setBranchFormItems(items);
    setBranchForm({
      id: b.id,
      code: b.code || "",
      name: b.name || "",
      address: b.address || "",
      phone: b.phone || "",
      email: b.email || "",
      manager_id: matchedManager ? matchedManager.id : "",
      manager: b.manager || "",
      status: b.status || "active",
      savings_methods: branchSavingsMethods,
    });
    setBranchPhoneError("");
    setEditingBranch(true);
    setShowBranchModal(true);
  };

  const closeBranchModal = () => {
    if (branchesSaving) return;
    resetBranchModal();
  };

  const fallbackCopy = (link, branch) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok)
        toast.success(`📋 Link copied for ${branch.name}`, { duration: 4000 });
      else window.prompt("Copy this registration link:", link);
    } catch {
      window.prompt("Copy this registration link:", link);
    }
  };

  const copyRegistrationLink = (branch) => {
    if (!isAdmin) {
      toast.error("Only admins can share registration links");
      return;
    }
    if (!branch || !branch.id) {
      toast.error("Branch ID is missing");
      return;
    }
    const link = `${window.location.origin}/register-member?branch=${branch.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() =>
          toast.success(`📋 Link copied for ${branch.name}`, {
            duration: 4000,
          }),
        )
        .catch(() => fallbackCopy(link, branch));
    } else fallbackCopy(link, branch);
  };

  const saveBranchSavingsMethod = async (targetBranchId) => {
    const formValue = SAVINGS_METHODS.includes(branchForm.savings_methods)
      ? branchForm.savings_methods
      : "both";
    const isActiveTarget = String(targetBranchId) === String(activeBranchId);
    let baseItems;
    if (isActiveTarget) baseItems = itemsSettings;
    else if (editingBranch)
      baseItems =
        branchFormItems ||
        (await getBranchItems(targetBranchId)) ||
        DEFAULT_ITEMS;
    else baseItems = DEFAULT_ITEMS;
    const itemsToSave = {
      ...normalizeItems(baseItems),
      savings_methods: formValue,
    };
    try {
      const { res, data } = await request(settingsUrl(targetBranchId), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...roleHeaders() },
        body: JSON.stringify({ items: itemsToSave }),
      });
      if (!res.ok || !data?.status) {
        console.error(
          "[branches] savings_methods save failed:",
          res.status,
          data,
        );
        toast.error(
          data?.error ||
            "Branch saved, but the savings method could not be stored.",
          { duration: 7000 },
        );
      } else if (isActiveTarget) setItem("savings_methods", formValue);
    } catch (err) {
      console.error("[branches] savings_methods network error:", err);
      toast.error("Branch saved but the savings method request failed.");
    }
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      toast.error("Branch name is required");
      return;
    }
    if (isAdmin && !branchForm.code.trim()) {
      toast.error("Branch code is required");
      return;
    }
    const phoneErr = validatePhone(branchForm.phone, {
      required: false,
      label: "Branch phone number",
    });
    if (phoneErr) {
      setBranchPhoneError(phoneErr);
      toast.error(phoneErr);
      return;
    }
    setBranchPhoneError("");

    setBranchesSaving(true);
    try {
      const selectedManager =
        isAdmin && branchForm.manager_id
          ? managers.find((m) => String(m.id) === String(branchForm.manager_id))
          : null;
      const basePayload = {
        name: branchForm.name.trim(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim(),
        email: branchForm.email.trim(),
      };
      const payload = isAdmin
        ? {
            ...basePayload,
            code: branchForm.code.trim(),
            manager_id: selectedManager ? selectedManager.id : null,
            manager: selectedManager ? selectedManager.name : "",
          }
        : basePayload;
      let url = `${API_BASE_URL}/api/branches.php`;
      let method = "POST";
      if (editingBranch) {
        method = "PUT";
        payload.id = branchForm.id;
        if (isAdmin) payload.status = branchForm.status;
        url = `${API_BASE_URL}/api/branches.php/${branchForm.id}`;
      }
      const { res, data } = await request(url, {
        method,
        headers: { "Content-Type": "application/json", ...roleHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(data.error || "Failed to save branch");

      const targetBranchId = data?.branch?.id ?? branchForm.id ?? null;
      if (targetBranchId) await saveBranchSavingsMethod(targetBranchId);

      toast.success(editingBranch ? "✅ Branch updated" : "✅ Branch created");
      const wasEditing = editingBranch;
      resetBranchModal();
      await fetchBranches();

      if (!wasEditing && data.branch?.id) {
        const newLink = `${window.location.origin}/register-member?branch=${data.branch.id}`;
        setTimeout(() => {
          if (
            window.confirm(
              `Branch "${data.branch.name}" created.\n\nCopy the registration link now?\n\n${newLink}`,
            )
          ) {
            copyRegistrationLink(data.branch);
          }
        }, 300);
      }
    } catch (err) {
      toast.error(err.message || "Failed to save branch");
    } finally {
      setBranchesSaving(false);
    }
  };

  const handleToggleBranchStatus = async (b) => {
    if (!isAdmin) {
      toast.error("Only admins can activate/deactivate branches");
      return;
    }
    const next = b.status === "active" ? "inactive" : "active";
    if (!window.confirm(`Change "${b.name}" to ${next.toUpperCase()}?`)) return;
    try {
      const { res, data } = await request(
        `${API_BASE_URL}/api/branches.php/${b.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...roleHeaders() },
          body: JSON.stringify({ id: b.id, status: next }),
        },
      );
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      toast.success(`Branch is now ${next}`);
      await fetchBranches();
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleDeleteBranch = async (b) => {
    if (!isAdmin) {
      toast.error("Only admins can delete branches");
      return;
    }
    if (
      !window.confirm(
        `⚠️ Delete branch "${b.name}" (${b.code})?\n\nThis cannot be undone.`,
      )
    )
      return;
    try {
      const { res, data } = await request(
        `${API_BASE_URL}/api/branches.php/${b.id}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json", ...roleHeaders() },
        },
      );
      if (!res.ok) throw new Error(data.error || "Failed to delete branch");
      toast.success("🗑️ Branch deleted");
      await fetchBranches();
    } catch (err) {
      toast.error(err.message || "Failed to delete branch");
    }
  };

  const formatNaira = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("NGN", "₦");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getDaysToMonthsDisplay = (days) => {
    if (days < 30) return `${days} day${days !== 1 ? "s" : ""}`;
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) return `${months} month${months !== 1 ? "s" : ""}`;
    return `${months} month${months !== 1 ? "s" : ""}, ${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
  };

  const handleSaveSettings = async () => {
    const phoneErr = validatePhone(settings.general.shop_phone, {
      required: false,
      label: "Shop phone number",
    });
    if (phoneErr) {
      setGeneralPhoneError(phoneErr);
      toast.error(phoneErr);
      setActiveTab("general");
      return;
    }
    setGeneralPhoneError("");

    if ((itemsSettings.durations || []).length === 0) {
      toast.error("Enable at least one duration (Items tab)");
      setActiveTab("items");
      return;
    }
    if ((itemsSettings.savings_plans || []).length === 0) {
      toast.error("Enable at least one savings plan (Items tab)");
      setActiveTab("items");
      return;
    }

    const { min_deposit, max_deposit } = settings.contribution;
    if (min_deposit > max_deposit) {
      toast.error("Minimum deposit cannot be greater than maximum deposit");
      setActiveTab("contribution");
      return;
    }

    if (!hasBranch) {
      toast.error(
        "No active branch detected — pick a branch first so settings are saved to the right one.",
      );
      return;
    }
    if (!settingsLoaded) {
      toast.error("Settings haven't finished loading — please refresh first.");
      return;
    }

    setSaving(true);
    try {
      const itemsToSave = normalizeItems(itemsSettings);
      const body = {
        branch_id: activeBranchId,
        ...settings,
        items: itemsToSave,
      };
      const { res, data } = await request(settingsUrl(activeBranchId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!(res.ok && data.status)) {
        toast.error(data.error || data.message || "Failed to save settings", {
          duration: 8000,
        });
        return;
      }
      let verified = true;
      try {
        const { data: verifyData } = await request(
          settingsUrl(activeBranchId),
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
          },
        );
        const stored = verifyData?.data?.items;
        if (!sameItems(stored, itemsToSave)) {
          verified = false;
          console.error("[Settings] items mismatch", {
            sent: itemsToSave,
            stored,
          });
          toast.error(
            "⚠️ The server did not keep your plan/duration selection. Check the settings table's unique index (see api/error.log).",
            { duration: 9000 },
          );
        }
      } catch (err) {
        console.warn("[Settings] Verify failed:", err);
      }
      if (verified)
        toast.success(
          `Settings saved for ${activeBranch?.name || "this branch"}`,
        );
      await fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(`❌ ${error.message || "Failed to save settings"}`);
    } finally {
      setSaving(false);
    }
  };

  const memberPutUrl = (id) =>
    `${API_BASE_URL}/api/members.php/${id}${hasBranch ? `?branch_id=${activeBranchId}` : ""}`;

  const basePayload = (m) => ({
    name: m.name || m.full_name,
    email: m.email,
    phone: m.phone === "N/A" ? "" : m.phone || "",
    balance: m.balance || 0,
    role: m.role || "member",
    ...(hasBranch ? { branch_id: activeBranchId } : {}),
  });

  const handleSuspendAccount = (member) => {
    setSelectedMember(member);
    setSuspensionReason("");
    setSuspensionDuration("permanent");
    setShowSuspendModal(true);
  };

  const confirmSuspend = async () => {
    if (!suspensionReason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }
    try {
      const { res, data } = await request(memberPutUrl(selectedMember.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basePayload(selectedMember),
          status: "Suspended",
          suspension_reason: suspensionReason,
          suspension_duration: suspensionDuration,
          suspended_date: new Date().toISOString().split("T")[0],
          suspended_by: user?.name || "Admin",
        }),
      });

      if (res.ok) {
        toast.success(`Account for ${selectedMember.name} has been suspended!`);
        setShowSuspendModal(false);
        setSelectedMember(null);
        setSuspensionReason("");
        await fetchMembers();
      } else {
        toast.error(data.message || data.error || "Failed to suspend account");
      }
    } catch (error) {
      console.error("Error suspending account:", error);
      toast.error("Failed to suspend account");
    }
  };

  const handleReactivateAccount = (account) => {
    setSelectedMember(account);
    setShowReactivateModal(true);
  };

  const confirmReactivate = async () => {
    try {
      const { res, data } = await request(memberPutUrl(selectedMember.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basePayload(selectedMember),
          status: "Active",
          suspension_reason: null,
          suspension_duration: null,
          suspended_date: null,
          suspended_by: null,
        }),
      });

      if (res.ok) {
        toast.success(
          `Account for ${selectedMember.name} has been reactivated!`,
        );
        setShowReactivateModal(false);
        setSelectedMember(null);
        await fetchMembers();
      } else {
        toast.error(
          data.message || data.error || "Failed to reactivate account",
        );
      }
    } catch (error) {
      console.error("Error reactivating account:", error);
      toast.error("Failed to reactivate account");
    }
  };

  const matchesSearch = (a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (a.name || "").toLowerCase().includes(term) ||
      (a.email || "").toLowerCase().includes(term) ||
      (a.phone || "").includes(term)
    );
  };
  const filteredMembers = members.filter(matchesSearch);
  const filteredSuspended = suspendedAccounts.filter(matchesSearch);

  const getBranchManagerName = (b) => {
    if (b.manager) return b.manager;
    if (b.manager_id) {
      const m =
        managers.find((mm) => String(mm.id) === String(b.manager_id)) ||
        members.find((mm) => String(mm.id) === String(b.manager_id));
      if (m) return m.name;
    }
    return "—";
  };

  const branchLabel = activeBranch?.name || "this branch";

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          color: "var(--text)",
          backgroundColor: "var(--bg-app)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const loan = settings.loan;
  const commission = settings.commission;
  const contribution = settings.contribution;
  const suspension = settings.suspension;

  return (
    <div
      style={{
        padding: "24px",
        color: "var(--text)",
        backgroundColor: "var(--bg-app)",
        minHeight: "100vh",
      }}
    >
      <style>{css}</style>
      <div className="settings-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "14px 18px",
            marginBottom: "20px",
            borderRadius: "12px",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            background: "rgba(16, 185, 129, 0.06)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "26px" }}>🏢</span>
            <div>
              <div
                style={{
                  color: "var(--text)",
                  fontSize: "15px",
                  fontWeight: "700",
                }}
              >
                {activeBranch?.name ||
                  (hasBranch ? `Branch #${activeBranchId}` : "Branch")}
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  marginTop: "2px",
                }}
              >
                {activeBranch?.code || "—"} · Settings apply to this branch ·{" "}
                <strong style={{ color: "var(--credit)" }}>
                  {members.length}
                </strong>{" "}
                members ·{" "}
                <strong style={{ color: "var(--info)" }}>
                  {visibleBranches.length}
                </strong>{" "}
                branches
              </div>
            </div>
          </div>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              background: "rgba(16, 185, 129, 0.2)",
              color: "var(--credit)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
            }}
          >
            ● active branch
          </span>
        </div>

        <div className="settings-header">
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>
              ⚙️ Settings
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              Configure application settings — scoped to{" "}
              <strong>{branchLabel}</strong>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn-refresh-settings"
              onClick={handleRefreshAll}
              disabled={refreshing}
            >
              <span className={refreshing ? "spinning" : ""}>🔄</span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            {canViewBranches && (
              <button
                className="btn-save"
                style={{
                  background:
                    activeTab === "branches"
                      ? "var(--accent)"
                      : "linear-gradient(135deg, #059669, #0d9488)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onClick={() => setActiveTab("branches")}
              >
                🏢{" "}
                {activeTab === "branches"
                  ? "Branches (current)"
                  : isAdmin
                    ? "Manage Branches"
                    : "My Branch"}
              </button>
            )}
            {activeTab !== "branches" && (
              <button
                className="btn-save"
                onClick={handleSaveSettings}
                disabled={saving || !settingsLoaded}
                title={
                  settingsLoaded
                    ? ""
                    : "Settings for this branch haven't loaded yet"
                }
              >
                {saving ? "Saving..." : "💾 Save Settings"}
              </button>
            )}
          </div>
        </div>

        <div className="tabs-container">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              className={`tab-btn ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
          {canViewBranches && (
            <button
              className={`tab-btn tab-btn-branches ${activeTab === "branches" ? "active" : ""}`}
              onClick={() => setActiveTab("branches")}
            >
              🏢 {isAdmin ? "Branches" : "My Branch"}
              {isAdmin && branches.length > 0 && (
                <span className="branch-tab-badge">{branches.length}</span>
              )}
            </button>
          )}
        </div>

        {activeTab === "general" && (
          <div className="settings-card">
            <div className="settings-card-title">
              🏢 General Settings for{" "}
              <span style={{ color: "var(--accent)" }}>{branchLabel}</span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Shop Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.general.shop_name}
                  onChange={(e) => setGen("shop_name", e.target.value)}
                  placeholder="Enter shop name for this branch"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Shop Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={settings.general.shop_email}
                  onChange={(e) => setGen("shop_email", e.target.value)}
                />
              </div>
              <PhoneField
                label="Shop Phone"
                errLabel="Shop phone number"
                value={settings.general.shop_phone}
                error={generalPhoneError}
                onValue={(v) => setGen("shop_phone", v)}
                onError={setGeneralPhoneError}
              />
              {sel("general", "currency", "Currency", [
                ["NGN", "NGN (₦)"],
                ["USD", "USD ($)"],
                ["EUR", "EUR (€)"],
                ["GBP", "GBP (£)"],
              ])}
            </div>
            <div className="form-group">
              <label className="form-label">Shop Address</label>
              <input
                type="text"
                className="form-input"
                value={settings.general.shop_address}
                onChange={(e) => setGen("shop_address", e.target.value)}
              />
            </div>
          </div>
        )}

        {activeTab === "items" && (
          <div className="settings-card">
            <div className="settings-card-title">
              🧾 Item & Duration Settings for{" "}
              <span style={{ color: "var(--accent)" }}>{branchLabel}</span>
            </div>
            <div className="info-box">
              <p>
                💡 These options control what members see when they pick their
                savings plan and the items they want to save for. Click{" "}
                <strong>💾 Save Settings</strong> (top right) to store your
                changes.
              </p>
            </div>
            <div
              style={{
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <label className="form-label" style={{ marginBottom: 10 }}>
                Savings Method Members Can Use
              </label>
              <MethodRadios
                long
                name="savings_methods"
                value={itemsSettings.savings_methods}
                onChange={(v) => setItem("savings_methods", v)}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ marginBottom: 10 }}>
                Allowed Durations
              </label>
              {DURATION_OPTIONS.map((d) => (
                <Check
                  key={d}
                  label={d}
                  checked={(itemsSettings.durations || []).includes(d)}
                  onChange={(on) => toggleInList("durations", d, on)}
                />
              ))}
              {(itemsSettings.durations || []).length === 0 && (
                <p
                  style={{ color: "var(--debit)", fontSize: 12, marginTop: 4 }}
                >
                  ⚠️ At least one duration must be enabled.
                </p>
              )}
            </div>
            <div
              style={{
                marginBottom: 20,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
              }}
            >
              <label className="form-label" style={{ marginBottom: 10 }}>
                Allowed Savings Plans
              </label>
              {PLAN_OPTIONS.map((p) => (
                <Check
                  key={p}
                  label={p}
                  checked={(itemsSettings.savings_plans || []).includes(p)}
                  onChange={(on) => toggleInList("savings_plans", p, on)}
                />
              ))}
              {(itemsSettings.savings_plans || []).length === 0 && (
                <p
                  style={{ color: "var(--debit)", fontSize: 12, marginTop: 4 }}
                >
                  ⚠️ At least one plan must be enabled.
                </p>
              )}
            </div>
            <div
              style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}
            >
              <label className="form-label" style={{ marginBottom: 10 }}>
                Item Selection Rules
              </label>
              {chk(
                "items",
                "allow_multi_item",
                "Allow members to select multiple items",
              )}
              {chk(
                "items",
                "require_duration_match",
                "Require all selected items to have the same duration",
              )}
              <div style={{ marginTop: 12 }}>
                {sel(
                  "items",
                  "money_check_mode",
                  "Money Check — how should the total contribution be validated against selected items?",
                  [
                    [
                      "strict",
                      "Strict — total must equal the sum of item values",
                    ],
                    [
                      "min",
                      "Minimum — total must be at least the sum of item values",
                    ],
                    ["off", "Disabled — no validation between total and items"],
                  ],
                )}
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    marginTop: -8,
                  }}
                >
                  This controls what members see on their profile form when they
                  pick items.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "branches" && canViewBranches && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18 }}>
                  {isAdmin ? "🏢 Branch Management" : "🏢 My Branch"}
                </h3>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
                  {isAdmin
                    ? "Create branches and share registration links with new members"
                    : "Update your branch's contact and address details"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn-refresh-settings"
                  onClick={fetchBranches}
                  disabled={branchesLoading}
                >
                  <span className={branchesLoading ? "spinning" : ""}>🔄</span>
                  {branchesLoading ? "Loading…" : "Refresh"}
                </button>
                {canCreateBranch && isAdmin && (
                  <button className="btn-save" onClick={openCreateBranch}>
                    ➕ New Branch
                  </button>
                )}
              </div>
            </div>
            {isAdmin && (
              <div
                style={{
                  background: "var(--accent-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: 16,
                  fontSize: 13,
                  color: "var(--text)",
                  lineHeight: 1.5,
                }}
              >
                💡 <strong>How registration links work:</strong> each branch has
                its own link like{" "}
                <code
                  style={{
                    fontFamily: "monospace",
                    background: "var(--bg-surface-2)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {window.location.origin}/register-member?branch=1
                </code>
                . Copy a branch's link and send it to anyone who should register
                into that branch.
              </div>
            )}
            {isAdmin && (
              <div className="branch-summary">
                <div className="branch-summary-card">
                  <div className="branch-summary-label">Total Branches</div>
                  <div className="branch-summary-value">{branches.length}</div>
                </div>
                <div className="branch-summary-card">
                  <div className="branch-summary-label">Active</div>
                  <div className="branch-summary-value credit">
                    {branches.filter((b) => b.status === "active").length}
                  </div>
                </div>
                <div className="branch-summary-card">
                  <div className="branch-summary-label">Inactive</div>
                  <div className="branch-summary-value muted">
                    {branches.filter((b) => b.status !== "active").length}
                  </div>
                </div>
              </div>
            )}
            <div
              className="settings-card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div style={{ overflowX: "auto" }}>
                <table className="suspended-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Manager</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchesLoading ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: 30,
                            textAlign: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          Loading branches…
                        </td>
                      </tr>
                    ) : visibleBranches.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: 40,
                            textAlign: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          <div style={{ fontSize: 40, marginBottom: 8 }}>
                            🏢
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            {isManager
                              ? "You don't have a branch assigned yet."
                              : "No branches yet."}
                          </div>
                          {canCreateBranch && isAdmin && (
                            <button
                              className="btn-save"
                              onClick={openCreateBranch}
                              style={{ padding: "8px 20px", marginTop: 14 }}
                            >
                              ➕ Create First Branch
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      visibleBranches.map((b) => (
                        <tr key={b.id}>
                          <td
                            style={{
                              color: "var(--info)",
                              fontFamily: "monospace",
                              fontSize: 13,
                            }}
                          >
                            {b.id}
                          </td>
                          <td style={{ fontWeight: 600 }}>{b.code}</td>
                          <td>{b.name}</td>
                          <td style={{ color: "var(--text-muted)" }}>
                            {getBranchManagerName(b)}
                          </td>
                          <td
                            style={{ color: "var(--text-muted)", fontSize: 12 }}
                          >
                            <div>{b.phone || "—"}</div>
                            <div style={{ color: "var(--text-dim)" }}>
                              {b.email || ""}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${b.status === "active" ? "badge-branch-active" : "badge-branch-inactive"}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td
                            style={{
                              color: "var(--text-muted)",
                              fontSize: 13,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {b.created_at
                              ? new Date(b.created_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                justifyContent: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              {canCopyLink && isAdmin && (
                                <button
                                  className="btn-branch-action info"
                                  onClick={() => copyRegistrationLink(b)}
                                  title="Copy the registration link for this branch"
                                >
                                  🔗 Copy Link
                                </button>
                              )}
                              {canEditThisBranch(b) && (
                                <button
                                  className="btn-branch-action"
                                  onClick={() => openEditBranch(b)}
                                  title={
                                    isAdmin ? "Edit branch" : "Edit your branch"
                                  }
                                >
                                  ✏️ Edit
                                </button>
                              )}
                              {canToggleBranch && isAdmin && (
                                <button
                                  className={`btn-branch-action ${b.status === "active" ? "warning" : "success"}`}
                                  onClick={() => handleToggleBranchStatus(b)}
                                  title={
                                    b.status === "active"
                                      ? "Deactivate"
                                      : "Activate"
                                  }
                                >
                                  {b.status === "active"
                                    ? "⏸ Deactivate"
                                    : "▶ Activate"}
                                </button>
                              )}
                              {canDeleteBranch && isAdmin && (
                                <button
                                  className="btn-branch-action danger"
                                  onClick={() => handleDeleteBranch(b)}
                                  title="Delete branch"
                                >
                                  🗑 Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "loan" && (
          <div className="settings-card">
            <div className="settings-card-title">💰 Loan Settings</div>
            <div className="info-box">
              <p>
                💡 Configure loan eligibility criteria, interest rates, and
                borrowing limits. Members can borrow up to{" "}
                <strong>
                  {loan.max_borrow_percentage}% of their total savings
                </strong>
                .
              </p>
            </div>
            <div
              style={{
                marginBottom: "20px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h4
                style={{
                  fontSize: "14px",
                  color: "var(--info)",
                  marginBottom: "12px",
                }}
              >
                📋 Eligibility Requirements
              </h4>
              <div className="form-group">
                <label className="form-label">
                  Minimum Membership Days for Loan Eligibility
                </label>
                <div className="form-row">
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      className="form-input"
                      value={loan.min_membership_days}
                      onChange={(e) =>
                        upd(
                          "loan",
                          "min_membership_days",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      min="0"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={getDaysToMonthsDisplay(loan.min_membership_days)}
                      disabled
                      style={{ opacity: 0.6 }}
                    />
                  </div>
                </div>
              </div>
              {chk("loan", "enable_loan_requests", "Enable Loan Requests")}
              {chk(
                "loan",
                "require_admin_approval",
                "Require Admin Approval for Loans",
              )}
              {chk(
                "loan",
                "auto_approve_small_loans",
                "Auto-Approve Small Loans",
              )}
              {loan.auto_approve_small_loans &&
                num("loan", "small_loan_threshold", "Small Loan Threshold (₦)")}
            </div>
            <div
              style={{
                marginBottom: "20px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h4
                style={{
                  fontSize: "14px",
                  color: "var(--warning)",
                  marginBottom: "12px",
                }}
              >
                💰 Interest, Amounts & Duration
              </h4>
              <div className="form-row">
                {num("loan", "interest_rate", "Interest Rate (%)", {
                  parse: parseFloat,
                  min: "0",
                  step: "0.5",
                })}
                {num(
                  "loan",
                  "max_duration_months",
                  "Maximum Loan Duration (Months)",
                  { fallback: 1, min: "1" },
                )}
              </div>
              <div className="form-row">
                {num("loan", "min_loan_amount", "Minimum Loan Amount (₦)", {
                  min: "0",
                })}
                {num("loan", "max_loan_amount", "Maximum Loan Amount (₦)", {
                  min: "0",
                })}
              </div>
              <div className="form-row">
                {num(
                  "loan",
                  "max_borrow_percentage",
                  "Max Borrow (% of Savings)",
                  { min: "0", max: "100" },
                )}
                {num(
                  "loan",
                  "late_payment_penalty",
                  "Late Payment Penalty (%)",
                  { parse: parseFloat, min: "0", step: "0.5" },
                )}
              </div>
              <div className="form-row">
                {num("loan", "grace_period_days", "Grace Period (Days)", {
                  min: "0",
                })}
              </div>
            </div>
            <div
              style={{
                marginBottom: "20px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h4
                style={{
                  fontSize: "14px",
                  color: "var(--accent-text)",
                  marginBottom: "12px",
                }}
              >
                🔒 Loan Restrictions
              </h4>
              <div className="loan-restriction-box">
                <div className="form-row">
                  {num(
                    "loan",
                    "max_loans_per_member",
                    "Maximum Loans Per Member",
                    { fallback: 1, min: "1" },
                  )}
                  {num(
                    "loan",
                    "loan_cooldown_days",
                    "Loan Cooldown Period (Days)",
                    { min: "0" },
                  )}
                </div>
              </div>
            </div>
            <div className="rule-box">
              <h4>
                💰 Borrowing Rule: {loan.max_borrow_percentage}% of Savings
              </h4>
              <p>
                Members can borrow{" "}
                <strong>{loan.max_borrow_percentage}%</strong> of their total
                savings.
              </p>
            </div>
          </div>
        )}

        {activeTab === "contribution" && (
          <div className="settings-card">
            <div className="settings-card-title">💰 Contribution Settings</div>
            <div className="form-row">
              {num("contribution", "daily_limit", "Daily Contribution Limit")}
              {num("contribution", "min_deposit", "Minimum Deposit")}
            </div>
            <div className="form-row">
              {num("contribution", "max_deposit", "Maximum Deposit")}
              {num(
                "contribution",
                "default_contribution_amount",
                "Default Contribution Amount",
              )}
            </div>
            <div className="form-row">
              {num("contribution", "max_daily_deposits", "Max Daily Deposits", {
                fallback: 1,
              })}
              {sel(
                "contribution",
                "contribution_frequency",
                "Contribution Frequency",
                [
                  ["daily", "Daily"],
                  ["weekly", "Weekly"],
                  ["monthly", "Monthly"],
                  ["custom", "Custom"],
                ],
              )}
            </div>
            {chk(
              "contribution",
              "allow_multiple_deposits",
              "Allow Multiple Deposits per Day",
            )}
            {chk(
              "contribution",
              "enable_auto_contribution",
              "Enable Auto-Contribution",
            )}
            {contribution.enable_auto_contribution && (
              <div className="form-group">
                <label className="form-label">Auto-Contribution Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={contribution.auto_contribution_time}
                  onChange={(e) =>
                    upd(
                      "contribution",
                      "auto_contribution_time",
                      e.target.value,
                    )
                  }
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "commission" && (
          <div className="settings-card">
            <div className="settings-card-title">💸 Commission Settings</div>
            {chk("commission", "enable_commission", "Enable Commission")}
            {commission.enable_commission && (
              <>
                <div className="form-row">
                  {sel("commission", "commission_type", "Commission Type", [
                    ["percentage", "Percentage"],
                    ["fixed", "Fixed Amount"],
                    ["both", "Both"],
                  ])}
                  {commission.commission_type !== "fixed" &&
                    num(
                      "commission",
                      "commission_rate",
                      "Commission Rate (%)",
                      { parse: parseFloat, min: "0", step: "0.1" },
                    )}
                  {commission.commission_type !== "percentage" &&
                    num(
                      "commission",
                      "commission_fixed_amount",
                      "Fixed Commission Amount (₦)",
                      { min: "0" },
                    )}
                </div>
                <div className="form-row">
                  {num(
                    "commission",
                    "min_commission_amount",
                    "Min Commission Amount",
                  )}
                  {num(
                    "commission",
                    "max_commission_amount",
                    "Max Commission Amount",
                  )}
                </div>
                <div className="form-row">
                  {sel("commission", "commission_period", "Commission Period", [
                    ["daily", "Daily"],
                    ["weekly", "Weekly"],
                    ["monthly", "Monthly"],
                    ["per_transaction", "Per Transaction"],
                  ])}
                  {sel(
                    "commission",
                    "apply_commission_on",
                    "Apply Commission On",
                    [
                      ["deposit", "Deposits"],
                      ["withdrawal", "Withdrawals"],
                      ["transfer", "Transfers"],
                      ["all", "All Transactions"],
                    ],
                  )}
                </div>
                {sel("commission", "commission_account", "Commission Account", [
                  ["admin", "Admin Account"],
                  ["company", "Company Account"],
                  ["branch", "Branch Account"],
                ])}
              </>
            )}
          </div>
        )}

        {activeTab === "payment" && (
          <div className="settings-card">
            <div className="settings-card-title">💳 Payment Settings</div>
            <div className="form-row">
              {num("payment", "payment_percentage", "Payment Percentage (%)", {
                min: "0",
                max: "100",
              })}
              {num("payment", "max_payment_count", "Max Payment Count", {
                fallback: 1,
                min: "1",
              })}
            </div>
            {chk("payment", "allow_partial_payment", "Allow Partial Payment")}
            {chk("payment", "enable_refunds", "Enable Refunds")}
            {chk(
              "payment",
              "require_admin_approval",
              "Require Admin Approval for Refunds",
            )}
          </div>
        )}

        {activeTab === "discount" && (
          <div className="settings-card">
            <div className="settings-card-title">🏷️ Discount Settings</div>
            {chk("discount", "enable_discounts", "Enable Discounts")}
            <div className="form-row">
              {num(
                "discount",
                "default_discount_percentage",
                "Default Discount (%)",
                { min: "0", max: "100" },
              )}
              {num("discount", "max_discount_percentage", "Max Discount (%)", {
                min: "0",
                max: "100",
              })}
            </div>
            {chk(
              "discount",
              "loyalty_discount_enabled",
              "Enable Loyalty Discount",
            )}
            {chk("discount", "bulk_discount_enabled", "Enable Bulk Discount")}
          </div>
        )}

        {activeTab === "security" && (
          <div className="settings-card">
            <div className="settings-card-title">🔒 Security Settings</div>
            <div className="form-row">
              {num("security", "session_timeout", "Session Timeout (minutes)", {
                fallback: 10,
                min: "1",
              })}
              {num("security", "max_login_attempts", "Max Login Attempts", {
                fallback: 3,
                min: "1",
              })}
            </div>
            {chk(
              "security",
              "two_factor_auth",
              "Enable Two-Factor Authentication",
            )}
            {chk(
              "security",
              "require_strong_password",
              "Require Strong Password",
            )}
          </div>
        )}

        {activeTab === "suspension" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">
                🚫 Account Suspension Settings
              </div>
              {chk(
                "suspension",
                "auto_suspend_inactive",
                "Auto-suspend inactive accounts",
              )}
              {suspension.auto_suspend_inactive &&
                num(
                  "suspension",
                  "inactive_days",
                  "Inactive Days Before Suspension",
                  { fallback: 30, min: "1" },
                )}
              {chk(
                "suspension",
                "suspend_on_negative_balance",
                "Suspend accounts with negative balance",
              )}
              {suspension.suspend_on_negative_balance &&
                num(
                  "suspension",
                  "negative_balance_threshold",
                  "Negative Balance Threshold",
                  { fallback: 5000 },
                )}
              {chk(
                "suspension",
                "require_admin_approval_for_reactivation",
                "Require Admin Approval for Reactivation",
              )}
              {chk(
                "suspension",
                "send_notification_on_suspension",
                "Send Notification to Member on Suspension",
              )}
              {chk(
                "suspension",
                "notify_admin_on_suspension",
                "Notify Admin on Suspension",
              )}
            </div>

            <div className="settings-card">
              <div className="settings-card-title">👥 Active Members</div>
              <div style={{ marginBottom: "16px" }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="suspended-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id}>
                        <td style={{ fontWeight: "500" }}>{member.name}</td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {member.email}
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {member.phone || "N/A"}
                        </td>
                        <td
                          style={{ color: "var(--credit)", fontWeight: "600" }}
                        >
                          {formatNaira(member.balance)}
                        </td>
                        <td>
                          <span className="badge badge-active">
                            {member.status || "Active"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn-suspend"
                            onClick={() => handleSuspendAccount(member)}
                          >
                            Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMembers.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {members.length === 0
                      ? `No active members found in ${branchLabel}`
                      : "No members match your search"}
                  </div>
                )}
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-title">🚫 Suspended Accounts</div>
              <div style={{ overflowX: "auto" }}>
                <table className="suspended-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Reason</th>
                      <th>Date</th>
                      <th>Balance</th>
                      <th>Duration</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuspended.map((account) => (
                      <tr key={account.id}>
                        <td style={{ fontWeight: "500" }}>{account.name}</td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {account.email}
                        </td>
                        <td style={{ color: "var(--debit)", fontSize: "12px" }}>
                          {account.reason}
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {formatDate(account.suspended_date)}
                        </td>
                        <td
                          style={{
                            color:
                              account.balance < 0
                                ? "var(--debit)"
                                : "var(--credit)",
                            fontWeight: "600",
                          }}
                        >
                          {formatNaira(account.balance)}
                        </td>
                        <td>
                          <span
                            className={`badge ${account.duration === "permanent" ? "badge-permanent" : "badge-temporary"}`}
                          >
                            {account.duration}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn-reactivate"
                            onClick={() => handleReactivateAccount(account)}
                          >
                            Reactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSuspended.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--text-muted)",
                    }}
                  >
                    No suspended accounts
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showSuspendModal && selectedMember && (
        <div
          className="modal-overlay"
          onClick={() => setShowSuspendModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🚫 Suspend Account</h3>
              <button
                className="modal-close"
                onClick={() => setShowSuspendModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="info-box">
              <p>
                You are about to suspend <strong>{selectedMember.name}</strong>{" "}
                ({selectedMember.email}).
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Reason *</label>
              <input
                type="text"
                className="form-input"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Why is this account being suspended?"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duration</label>
              <select
                className="form-select"
                value={suspensionDuration}
                onChange={(e) => setSuspensionDuration(e.target.value)}
              >
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn-cancel"
                onClick={() => setShowSuspendModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                style={{ background: "var(--debit)", color: "#fff" }}
                onClick={confirmSuspend}
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {showReactivateModal && selectedMember && (
        <div
          className="modal-overlay"
          onClick={() => setShowReactivateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✅ Reactivate Account</h3>
              <button
                className="modal-close"
                onClick={() => setShowReactivateModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="info-box">
              <p>
                Reactivate <strong>{selectedMember.name}</strong> (
                {selectedMember.email})?
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn-cancel"
                onClick={() => setShowReactivateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm btn-confirm-success"
                onClick={confirmReactivate}
              >
                Reactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {showBranchModal && (
        <div className="modal-overlay" onClick={closeBranchModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBranch
                  ? isAdmin
                    ? "✏️ Edit Branch"
                    : "✏️ Edit My Branch"
                  : "➕ New Branch"}
              </h3>
              <button className="modal-close" onClick={closeBranchModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranch}>
              {!isAdmin && editingBranch && (
                <div
                  style={{
                    background: "var(--accent-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 14,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                >
                  🔒 You can update the <strong>name</strong>,{" "}
                  <strong>address</strong>, <strong>phone</strong> and{" "}
                  <strong>email</strong> of your branch. Code, status, and
                  manager assignment are admin-only.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Branch Code *{" "}
                  {!isAdmin && (
                    <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
                      (admin only)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={branchForm.code}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, code: e.target.value })
                  }
                  placeholder="e.g. BR-A, BR-B"
                  disabled={!isAdmin}
                  required
                />
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-dim)",
                    marginTop: "4px",
                  }}
                >
                  Short unique identifier for the branch
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Branch Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={branchForm.name}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, name: e.target.value })
                  }
                  placeholder="e.g. Branch A — Lagos"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  What Can Members of This Branch Save With?
                </label>
                <MethodRadios
                  name="branch_savings_methods"
                  value={branchForm.savings_methods}
                  onChange={(v) =>
                    setBranchForm((prev) => ({ ...prev, savings_methods: v }))
                  }
                />
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Branch Manager</label>
                  <select
                    className="form-select"
                    value={branchForm.manager_id || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      const picked = id
                        ? managers.find((m) => String(m.id) === String(id))
                        : null;
                      setBranchForm((prev) => ({
                        ...prev,
                        manager_id: id,
                        manager: picked ? picked.name : "",
                      }));
                    }}
                  >
                    <option value="">— No manager assigned —</option>
                    {branchForm.manager_id &&
                      !managers.some(
                        (m) => String(m.id) === String(branchForm.manager_id),
                      ) &&
                      branchForm.manager && (
                        <option value={branchForm.manager_id}>
                          {branchForm.manager} (no longer a Manager)
                        </option>
                      )}
                    {managers.length === 0 ? (
                      <option value="" disabled>
                        No managers available — promote a member to Manager
                        first
                      </option>
                    ) : (
                      managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {m.email ? ` (${m.email})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--text-dim)",
                      marginTop: "4px",
                    }}
                  >
                    Only users with the <strong>Manager</strong> role can be
                    assigned as a branch manager. Optional.
                  </p>
                </div>
              )}

              <div className="form-row">
                <PhoneField
                  label="Phone"
                  errLabel="Branch phone number"
                  value={branchForm.phone}
                  error={branchPhoneError}
                  onValue={(v) => setBranchForm((p) => ({ ...p, phone: v }))}
                  onError={setBranchPhoneError}
                />
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={branchForm.email}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, email: e.target.value })
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={branchForm.address}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, address: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              {editingBranch && isAdmin && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={branchForm.status}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeBranchModal}
                  disabled={branchesSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm btn-confirm-success"
                  disabled={branchesSaving}
                >
                  {branchesSaving
                    ? "Saving…"
                    : editingBranch
                      ? "Save Changes"
                      : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .settings-container { max-width: 1200px; margin: 0 auto; }
  .settings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .tabs-container { display: flex; gap: 4px; background-color: var(--bg-surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 4px; margin-bottom: 24px; flex-wrap: wrap; }
  .tab-btn { padding: 10px 16px; border-radius: 8px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; flex: 1; min-width: 80px; }
  .tab-btn:hover { color: var(--text); background: var(--bg-surface-3); }
  .tab-btn.active { background: var(--accent); color: #ffffff; }
  .tab-btn-branches { background: linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.18)); border: 1px solid var(--accent); color: var(--accent-text, #10b981); font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
  .tab-btn-branches.active { background: var(--accent); color: #ffffff; border-color: var(--accent); }
  .branch-tab-badge { background: var(--accent); color: #ffffff; font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 10px; line-height: 1.4; min-width: 18px; text-align: center; }
  .tab-btn-branches.active .branch-tab-badge { background: #ffffff; color: var(--accent); }
  .settings-card { background-color: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .settings-card-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--text); }
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-muted); margin-bottom: 6px; }
  .form-input, .form-select { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-surface-2); color: var(--text); font-size: 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
  .form-input:focus, .form-select:focus { border-color: var(--accent); }
  .form-input::placeholder { color: var(--text-dim); }
  .form-input:disabled { opacity: 0.55; cursor: not-allowed; background: var(--bg-surface-3, rgba(0,0,0,0.05)); }
  .form-input.input-error { border-color: var(--debit); box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }
  .field-error { color: var(--debit); font-size: 11px; margin-top: 4px; display: flex; align-items: center; gap: 4px; font-weight: 500; }
  .form-select option { background: var(--bg-surface); color: var(--text); }
  .form-checkbox { margin-bottom: 10px; cursor: pointer; }
  .form-checkbox label { cursor: pointer; }
  .form-checkbox input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer; }
  .form-checkbox-label { font-size: 14px; color: var(--text); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .btn-save { padding: 10px 32px; border-radius: 8px; border: none; background: var(--accent); color: #ffffff; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
  .btn-save:hover { background: var(--accent-hover); }
  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-refresh-settings { padding: 10px 20px; border-radius: 8px; border: 1px solid var(--info); background: transparent; color: var(--info); cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
  .btn-refresh-settings:hover:not(:disabled) { background: var(--bg-surface-2); }
  .btn-refresh-settings:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-refresh-settings .spinning { display: inline-block; animation: spin 1s linear infinite; }
  .btn-suspend { padding: 6px 16px; border-radius: 6px; border: none; background: var(--debit); color: #ffffff; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s; }
  .btn-suspend:hover { opacity: 0.85; }
  .btn-reactivate { padding: 6px 16px; border-radius: 6px; border: none; background: var(--accent); color: #ffffff; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s; }
  .btn-reactivate:hover { background: var(--accent-hover); }
  .suspended-table { width: 100%; border-collapse: collapse; }
  .suspended-table th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
  .suspended-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text); }
  .suspended-table tr:hover { background-color: var(--bg-surface-2); }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
  .badge-active { background-color: var(--approved-bg); color: var(--credit); border: 1px solid var(--border); }
  .badge-permanent { background-color: var(--rejected-bg); color: var(--debit); border: 1px solid var(--border); }
  .badge-temporary { background-color: var(--pending-bg); color: var(--warning); border: 1px solid var(--border); }
  .badge-branch-active { background-color: var(--approved-bg); color: var(--credit); border: 1px solid var(--border); }
  .badge-branch-inactive { background-color: var(--bg-surface-2); color: var(--text-muted); border: 1px solid var(--border); }
  .search-input { width: 100%; max-width: 300px; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-surface-2); color: var(--text); font-size: 13px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--text-dim); }
  .modal-overlay { position: fixed; inset: 0; background-color: var(--bg-overlay); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 16px; }
  .modal-content { background-color: var(--bg-surface); border-radius: 16px; padding: 24px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border); color: var(--text); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .modal-title { font-size: 18px; font-weight: bold; color: var(--text); }
  .modal-close { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; font-size: 24px; }
  .modal-close:hover { color: var(--text); }
  .btn-cancel { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
  .btn-cancel:hover { background: var(--bg-surface-2); }
  .btn-confirm { flex: 1; padding: 10px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
  .btn-confirm-success { background: var(--accent); color: #ffffff; }
  .btn-confirm-success:hover { background: var(--accent-hover); }
  .info-box { background: var(--accent-bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
  .info-box p { margin: 0; font-size: 13px; color: var(--text); }
  .rule-box { background: var(--approved-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-top: 16px; }
  .rule-box h4 { font-size: 13px; color: var(--credit); margin: 0 0 8px 0; }
  .rule-box p { font-size: 12px; color: var(--text-muted); margin: 0; }
  .loan-restriction-box { background: var(--accent-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-top: 16px; }
  .branch-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .branch-summary-card { background: var(--bg-surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
  .branch-summary-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .branch-summary-value { font-size: 22px; font-weight: 700; color: var(--text); margin-top: 4px; }
  .branch-summary-value.credit { color: var(--credit); }
  .branch-summary-value.muted { color: var(--text-muted); }
  .btn-branch-action { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-branch-action:hover { background: var(--bg-surface-2); }
  .btn-branch-action.danger { color: var(--debit); border-color: var(--debit); }
  .btn-branch-action.danger:hover { background: var(--rejected-bg); }
  .btn-branch-action.warning { color: var(--warning); border-color: var(--warning); }
  .btn-branch-action.warning:hover { background: var(--pending-bg); }
  .btn-branch-action.success { color: var(--credit); border-color: var(--credit); }
  .btn-branch-action.success:hover { background: var(--approved-bg); }
  .btn-branch-action.info { color: var(--info); border-color: var(--info); }
  .btn-branch-action.info:hover { background: rgba(59, 130, 246, 0.1); }
  .radio-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-surface-2); cursor: pointer; margin-bottom: 8px; transition: border-color 0.15s, background 0.15s; }
  .radio-row:hover { border-color: var(--accent); }
  .radio-row.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .radio-row input[type="radio"] { margin-top: 3px; accent-color: var(--accent); cursor: pointer; }
  .radio-row-body { flex: 1; }
  .radio-row-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
  .radio-row-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
  @media (max-width: 768px) {
    .form-row { grid-template-columns: 1fr; }
    .tabs-container { flex-direction: column; }
    .tab-btn { flex: none; min-width: auto; }
    .settings-header { flex-direction: column; align-items: stretch; }
    .search-input { max-width: 100%; }
  }
`;

export default AdminSettings;