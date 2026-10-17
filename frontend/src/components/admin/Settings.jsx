// src/components/admin/Settings.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import toast from "react-hot-toast";
import { useBranch } from "../../context/BranchContext";
import { usePermission } from "../../context/PermissionsContext";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

// ============================================================
// PHONE VALIDATION — STRICTLY exactly 11 digits
// ============================================================
const validatePhone = (
  phone,
  { required = false, label = "Phone number" } = {},
) => {
  const value = String(phone || "").trim();
  if (!value) return required ? `${label} is required` : "";

  const digitsOnly = value.replace(/[\s\-()]/g, "");
  if (!/^\d+$/.test(digitsOnly))
    return `${label} must contain only digits (0-9)`;
  if (digitsOnly.length !== 11)
    return `${label} must be exactly 11 digits (you entered ${digitsOnly.length})`;
  return "";
};

// ============================================================
// ITEMS (savings plan / durations / method) helpers
// ============================================================
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

const normalizeItems = (raw) => {
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    ...DEFAULT_ITEMS,
    ...r,
    durations: Array.isArray(r.durations)
      ? r.durations
      : DEFAULT_ITEMS.durations,
    savings_plans: Array.isArray(r.savings_plans)
      ? r.savings_plans
      : DEFAULT_ITEMS.savings_plans,
    savings_methods: SAVINGS_METHODS.includes(r.savings_methods)
      ? r.savings_methods
      : "both",
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

const readSavedBranchId = () => {
  try {
    return localStorage.getItem("selectedBranchId");
  } catch {
    return null;
  }
};

// Small form helpers
const Check = ({ label, checked, onChange }) => (
  <div className="form-checkbox">
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="form-checkbox-label">{label}</span>
    </label>
  </div>
);

const NumField = ({
  label,
  value,
  onChange,
  parse = parseInt,
  fallback = 0,
  ...rest
}) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input
      type="number"
      className="form-input"
      value={value}
      onChange={(e) => onChange(parse(e.target.value) || fallback)}
      {...rest}
    />
  </div>
);

const AdminSettings = () => {
  const branchCtx = useBranch() || {};
  const { can } = usePermission() || {};
  const { user } = useAuth();

  // Resolve the active branch from whichever shape the context exposes
  const activeBranch =
    branchCtx.activeBranch || branchCtx.selectedBranch || null;
  const activeBranchId =
    branchCtx.activeBranchId ??
    activeBranch?.id ??
    user?.branch_id ??
    readSavedBranchId() ??
    null;
  const hasBranch = activeBranchId !== null && activeBranchId !== "";

  // ============================================================
  // Role detection
  // ============================================================
  const roleStr = String(user?.role || "")
    .trim()
    .toLowerCase();
  const isAdmin = roleStr === "admin" || roleStr === "administrator";
  const isManager = roleStr === "manager" || roleStr === "branch_manager";

  // ============================================================
  // Permission flags
  // ============================================================
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

  const settingsReq = useRef(0); // guards against stale responses

  // General Settings
  const emptyGeneral = {
    shop_name: "",
    shop_email: "",
    shop_phone: "",
    shop_address: "",
    currency: "NGN",
    timezone: "Africa/Lagos",
    date_format: "DD/MM/YYYY",
  };
  const [generalSettings, setGeneralSettings] = useState(emptyGeneral);

  const [contributionSettings, setContributionSettings] = useState({
    daily_limit: 100000,
    min_deposit: 500,
    max_deposit: 50000,
    allow_multiple_deposits: true,
    max_daily_deposits: 3,
    contribution_frequency: "daily",
    default_contribution_amount: 5000,
    enable_auto_contribution: false,
    auto_contribution_time: "09:00",
  });

  const [commissionSettings, setCommissionSettings] = useState({
    enable_commission: true,
    commission_type: "percentage",
    commission_rate: 5,
    commission_fixed_amount: 500,
    min_commission_amount: 100,
    max_commission_amount: 10000,
    commission_period: "daily",
    apply_commission_on: "deposit",
    commission_account: "admin",
    enable_tiered_commission: false,
    tiers: [],
    enable_referral_commission: false,
    referral_commission_rate: 2,
    enable_loyalty_commission: false,
    loyalty_commission_rate: 1,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    payment_percentage: 80,
    allow_partial_payment: true,
    max_payment_count: 2,
    enable_refunds: true,
    require_admin_approval: true,
  });

  const [discountSettings, setDiscountSettings] = useState({
    enable_discounts: true,
    discount_type: "percentage",
    default_discount_percentage: 10,
    default_discount_fixed: 1000,
    max_discount_percentage: 50,
    max_discount_amount: 10000,
    require_admin_approval: false,
    loyalty_discount_enabled: true,
    loyalty_discount_percentage: 5,
    bulk_discount_enabled: true,
    bulk_discount_min_qty: 10,
    bulk_discount_percentage: 15,
    seasonal_discount_enabled: false,
    seasonal_discount_percentage: 20,
    seasonal_start_date: "",
    seasonal_end_date: "",
  });

  const [securitySettings, setSecuritySettings] = useState({
    two_factor_auth: false,
    session_timeout: 30,
    max_login_attempts: 5,
    password_expiry_days: 90,
    require_strong_password: true,
  });

  const [suspensionSettings, setSuspensionSettings] = useState({
    auto_suspend_inactive: false,
    inactive_days: 30,
    suspend_on_negative_balance: true,
    negative_balance_threshold: 5000,
    require_admin_approval_for_reactivation: true,
    send_notification_on_suspension: true,
    notify_admin_on_suspension: true,
  });

  const [loanSettings, setLoanSettings] = useState({
    min_membership_days: 180,
    interest_rate: 5,
    max_duration_months: 6,
    enable_loan_requests: true,
    require_admin_approval: true,
    auto_approve_small_loans: false,
    small_loan_threshold: 5000,
    late_payment_penalty: 10,
    grace_period_days: 7,
    max_loans_per_member: 3,
    loan_cooldown_days: 30,
  });

  // Items settings (durations, savings plans, savings method, rules)
  const [itemsSettings, setItemsSettings] = useState(DEFAULT_ITEMS);

  // Data from database
  const [members, setMembers] = useState([]);
  const [suspendedAccounts, setSuspendedAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]); // eslint-disable-line no-unused-vars
  const [allManagers, setAllManagers] = useState([]);

  // Branches
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesSaving, setBranchesSaving] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(false);
  const emptyBranchForm = {
    id: null,
    code: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    manager_id: "",
    manager: "",
    status: "active",
    savings_methods: "both",
  };
  const [branchForm, setBranchForm] = useState(emptyBranchForm);
  // Full "items" object of the branch being edited (so we never clobber its plans)
  const [branchFormItems, setBranchFormItems] = useState(null);

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionDuration, setSuspensionDuration] = useState("permanent");
  const [searchTerm, setSearchTerm] = useState("");

  const [generalPhoneError, setGeneralPhoneError] = useState("");
  const [branchPhoneError, setBranchPhoneError] = useState("");

  // ============================================================
  // Branch ownership
  // ============================================================
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
    if (isManager && myBranchId) {
      return branches.filter((b) => String(b.id) === String(myBranchId));
    }
    return [];
  }, [branches, isAdmin, isManager, myBranchId]);

  const isManagerRole = (m) => {
    const r = String(m.role || "")
      .trim()
      .toLowerCase();
    return (
      r === "manager" ||
      r === "branch_manager" ||
      r === "branch-manager" ||
      r === "branchmanager"
    );
  };

  const managers = useMemo(() => {
    const source = isAdmin ? allManagers : members;
    return source.filter(isManagerRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allManagers, members, isAdmin]);

  // ============================================================
  // Initial mount
  // ============================================================
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchSettings(),
          fetchBranches(),
          fetchMembers(),
          fetchAllManagers(),
        ]);
      } catch (error) {
        console.error("Error fetching settings data:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // Reload when the branch changes
  // ============================================================
  useEffect(() => {
    setGeneralSettings(emptyGeneral);
    setGeneralPhoneError("");
    setSearchTerm("");
    fetchSettings();
    fetchMembers();
    fetchTransactions();
    fetchSuspendedAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  useEffect(() => {
    if (activeTab === "branches" && !canViewBranches) setActiveTab("general");
    if (activeTab === "branches" && isManager && !myBranchId)
      setActiveTab("general");
  }, [activeTab, canViewBranches, isManager, myBranchId]);

  // ============================================================
  // MANUAL REFRESH
  // ============================================================
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSettings(),
        fetchMembers(),
        fetchTransactions(),
        fetchSuspendedAccounts(),
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

  // ============================================================
  // FETCH BRANCHES
  // ============================================================
  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/branches.php`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("[branches] Non-JSON response:", text);
        throw new Error(
          `Server returned non-JSON (HTTP ${res.status}). Check api/branches.php for PHP errors.`,
        );
      }
      if (!res.ok) {
        throw new Error(
          data.error || `Failed to load branches (HTTP ${res.status})`,
        );
      }
      setBranches(Array.isArray(data.branches) ? data.branches : []);
    } catch (err) {
      console.error("Error fetching branches:", err);
      toast.error(err.message || "Failed to load branches");
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  // ============================================================
  // Load ANY branch's items settings (used by the branch modal)
  // ============================================================
  const getBranchItems = async (branchId) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/settings.php?branch_id=${branchId}`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      const data = await res.json();
      if (data?.status && data?.data?.items) {
        return normalizeItems(data.data.items);
      }
    } catch (err) {
      console.warn("[branches] getBranchItems failed:", err);
    }
    return null;
  };

  // ============================================================
  // BRANCH MODAL HANDLERS
  // ============================================================
  const openCreateBranch = () => {
    if (!isAdmin) {
      toast.error("Only admins can create branches");
      return;
    }
    setBranchForm(emptyBranchForm);
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
    if (b.manager_id) {
      matchedManager = managers.find(
        (m) => String(m.id) === String(b.manager_id),
      );
    }
    if (!matchedManager && b.manager) {
      const target = b.manager.trim().toLowerCase();
      matchedManager = managers.find(
        (m) => (m.name || "").trim().toLowerCase() === target,
      );
    }

    // Pull this branch's REAL items settings from the server
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
    setShowBranchModal(false);
    setBranchForm(emptyBranchForm);
    setBranchFormItems(null);
    setBranchPhoneError("");
    setEditingBranch(false);
  };

  // ============================================================
  // COPY REGISTRATION LINK
  // ============================================================
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
      if (ok) {
        toast.success(`📋 Link copied for ${branch.name}`, { duration: 4000 });
      } else {
        window.prompt("Copy this registration link:", link);
      }
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
    } else {
      fallbackCopy(link, branch);
    }
  };

  // ============================================================
  // SAVE BRANCH
  // Persists the branch AND its savings method, merging with that
  // branch's own items so its plans/durations are never overwritten.
  // ============================================================
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

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": user?.role || "",
          "X-User-Branch-Id": String(myBranchId || ""),
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("[branches] Non-JSON save response:", text);
        throw new Error(
          `Server returned non-JSON (HTTP ${res.status}). Check api/branches.php for PHP errors.`,
        );
      }
      if (!res.ok) throw new Error(data.error || "Failed to save branch");

      const targetBranchId = data?.branch?.id ?? branchForm.id ?? null;
      const formValue = SAVINGS_METHODS.includes(branchForm.savings_methods)
        ? branchForm.savings_methods
        : "both";

      // Save the savings method into THIS branch's items settings
      if (targetBranchId) {
        try {
          const isActiveTarget =
            String(targetBranchId) === String(activeBranchId);

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

          const settingsRes = await fetch(
            `${API_BASE_URL}/api/settings.php?branch_id=${targetBranchId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-User-Role": user?.role || "",
                "X-User-Branch-Id": String(myBranchId || ""),
              },
              body: JSON.stringify({ items: itemsToSave }),
            },
          );
          const settingsText = await settingsRes.text();
          let settingsData = null;
          try {
            settingsData = settingsText ? JSON.parse(settingsText) : null;
          } catch {}

          if (!settingsRes.ok || !settingsData?.status) {
            console.error(
              "[branches] savings_methods save failed:",
              settingsRes.status,
              settingsText,
            );
            toast.error(
              settingsData?.error ||
                "Branch saved, but the savings method could not be stored.",
              { duration: 7000 },
            );
          } else if (isActiveTarget) {
            setItemsSettings(normalizeItems(settingsData.items || itemsToSave));
          }
        } catch (err) {
          console.error("[branches] savings_methods network error:", err);
          toast.error("Branch saved but the savings method request failed.");
        }
      }

      toast.success(editingBranch ? "✅ Branch updated" : "✅ Branch created");
      setShowBranchModal(false);
      setBranchForm(emptyBranchForm);
      setBranchFormItems(null);
      setBranchPhoneError("");
      setEditingBranch(false);

      await fetchBranches();

      if (!editingBranch && data.branch?.id) {
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

  // ============================================================
  // TOGGLE STATUS
  // ============================================================
  const handleToggleBranchStatus = async (b) => {
    if (!isAdmin) {
      toast.error("Only admins can activate/deactivate branches");
      return;
    }
    const next = b.status === "active" ? "inactive" : "active";
    if (!window.confirm(`Change "${b.name}" to ${next.toUpperCase()}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/branches.php/${b.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": user?.role || "",
          "X-User-Branch-Id": String(myBranchId || ""),
        },
        body: JSON.stringify({ id: b.id, status: next }),
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned non-JSON (HTTP ${res.status})`);
      }
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      toast.success(`Branch is now ${next}`);
      await fetchBranches();
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // ============================================================
  // DELETE BRANCH
  // ============================================================
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
      const res = await fetch(`${API_BASE_URL}/api/branches.php/${b.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-User-Role": user?.role || "",
          "X-User-Branch-Id": String(myBranchId || ""),
        },
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `Server returned non-JSON (HTTP ${res.status}). Check api/branches.php for PHP errors.`,
        );
      }
      if (!res.ok) throw new Error(data.error || "Failed to delete branch");

      toast.success("🗑️ Branch deleted");
      await fetchBranches();
    } catch (err) {
      toast.error(err.message || "Failed to delete branch");
    }
  };

  // ============================================================
  // SETTINGS FETCH — branch-scoped, server is the source of truth
  // ============================================================
  const settingsUrl = (bid) =>
    bid !== null && bid !== undefined && bid !== ""
      ? `${API_BASE_URL}/api/settings.php?branch_id=${bid}`
      : `${API_BASE_URL}/api/settings.php`;

  const fetchSettings = async (bid = activeBranchId) => {
    const reqId = ++settingsReq.current;
    try {
      const response = await fetch(settingsUrl(bid), {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await response.json();

      // Ignore stale responses (e.g. after switching branch quickly)
      if (reqId !== settingsReq.current) return null;

      if (data.status && data.data) {
        const s = data.data;

        setGeneralSettings({ ...emptyGeneral, ...(s.general || {}) });
        setContributionSettings((prev) => ({
          ...prev,
          ...(s.contribution || {}),
        }));
        setCommissionSettings((prev) => ({ ...prev, ...(s.commission || {}) }));
        setPaymentSettings((prev) => ({ ...prev, ...(s.payment || {}) }));
        setDiscountSettings((prev) => ({ ...prev, ...(s.discount || {}) }));
        setSecuritySettings((prev) => ({ ...prev, ...(s.security || {}) }));
        setSuspensionSettings((prev) => ({
          ...prev,
          ...(s.suspension || {}),
        }));
        setLoanSettings((prev) => ({ ...prev, ...(s.loan || {}) }));

        // items — the server value is authoritative
        setItemsSettings(normalizeItems(s.items));
        return s;
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
    return null;
  };

  const branchQuery = (extra = "") =>
    hasBranch
      ? `?branch_id=${activeBranchId}${extra}`
      : extra
        ? `?${extra.replace(/^&/, "")}`
        : "";

  const fetchMembers = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/members.php${branchQuery()}`,
      );
      const data = await response.json();
      if (data.members) {
        setMembers(data.members.filter((m) => m.status !== "Suspended"));
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch members");
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php${branchQuery()}`,
      );
      const data = await response.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchSuspendedAccounts = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/members.php${branchQuery()}`,
      );
      const data = await response.json();
      if (data.members) {
        const suspended = data.members
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
          }));
        setSuspendedAccounts(suspended);
      }
    } catch (error) {
      console.error("Error fetching suspended accounts:", error);
    }
  };

  const fetchAllManagers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/members.php?all=1`, {
        headers: {
          Accept: "application/json",
          "X-User-Role": user?.role || "",
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.members) return;
      setAllManagers(data.members.filter(isManagerRole));
    } catch (err) {
      console.error("[Settings] fetchAllManagers error:", err);
    }
  };

  // ============================================================
  // Formatting
  // ============================================================
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

  // ============================================================
  // SAVE SETTINGS — branch-scoped, verified against the server
  // ============================================================
  const handleSaveSettings = async () => {
    const phoneErr = validatePhone(generalSettings.shop_phone, {
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

    // Items validation — stop before sending an empty plan / duration list
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

    if (!hasBranch) {
      toast.error(
        "No active branch detected — pick a branch first so settings are saved to the right one.",
      );
      return;
    }

    setSaving(true);
    try {
      const itemsToSave = normalizeItems(itemsSettings);

      const body = {
        branch_id: activeBranchId,
        general: generalSettings,
        contribution: contributionSettings,
        commission: commissionSettings,
        payment: paymentSettings,
        discount: discountSettings,
        security: securitySettings,
        suspension: suspensionSettings,
        loan: loanSettings,
        items: itemsToSave,
      };

      const response = await fetch(settingsUrl(activeBranchId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned non-JSON: ${text.slice(0, 200)}`);
      }

      if (!(response.ok && data.status)) {
        toast.error(data.error || data.message || "Failed to save settings", {
          duration: 8000,
        });
        return;
      }

      // Re-read from the server and compare, so a "silent" failure is visible
      let verified = true;
      try {
        const verifyRes = await fetch(settingsUrl(activeBranchId), {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const verifyData = await verifyRes.json();
        const stored = verifyData?.data?.items;

        if (!sameItems(stored, itemsToSave)) {
          verified = false;
          console.error("[Settings] items mismatch", {
            sent: itemsToSave,
            stored,
          });
          toast.error(
            "⚠️ The server did not keep your plan/duration selection. " +
              "Check the settings table's unique index (see api/error.log).",
            { duration: 9000 },
          );
        }
      } catch (err) {
        console.warn("[Settings] Verify failed:", err);
      }

      if (verified) {
        toast.success(
          `Settings saved for ${activeBranch?.name || "this branch"}`,
        );
      }

      await fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(`❌ ${error.message || "Failed to save settings"}`);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Suspend / Reactivate
  // ============================================================
  const handleSuspendAccount = (member) => {
    setSelectedMember(member);
    setSuspensionReason("");
    setSuspensionDuration("permanent");
    setShowSuspendModal(true);
  };

  const memberPutUrl = (id) =>
    `${API_BASE_URL}/api/members.php/${id}${hasBranch ? `?branch_id=${activeBranchId}` : ""}`;

  const confirmSuspend = async () => {
    if (!suspensionReason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }
    try {
      const payload = {
        name: selectedMember.name || selectedMember.full_name,
        email: selectedMember.email,
        phone: selectedMember.phone || "",
        balance: selectedMember.balance || 0,
        role: selectedMember.role || "member",
        status: "Suspended",
        suspension_reason: suspensionReason,
        suspension_duration: suspensionDuration,
        suspended_date: new Date().toISOString().split("T")[0],
        suspended_by: "Admin",
        ...(hasBranch ? { branch_id: activeBranchId } : {}),
      };

      const response = await fetch(memberPutUrl(selectedMember.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(`Account for ${selectedMember.name} has been suspended!`);
        setShowSuspendModal(false);
        setSelectedMember(null);
        setSuspensionReason("");
        await fetchMembers();
        await fetchSuspendedAccounts();
      } else {
        toast.error(data.message || "Failed to suspend account");
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
      const payload = {
        name: selectedMember.name || selectedMember.full_name,
        email: selectedMember.email,
        phone: selectedMember.phone || "",
        balance: selectedMember.balance || 0,
        role: selectedMember.role || "member",
        status: "Active",
        suspension_reason: null,
        suspension_duration: null,
        suspended_date: null,
        suspended_by: null,
        ...(hasBranch ? { branch_id: activeBranchId } : {}),
      };

      const response = await fetch(memberPutUrl(selectedMember.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Account for ${selectedMember.name} has been reactivated!`,
        );
        setShowReactivateModal(false);
        setSelectedMember(null);
        await fetchMembers();
        await fetchSuspendedAccounts();
      } else {
        toast.error(data.message || "Failed to reactivate account");
      }
    } catch (error) {
      console.error("Error reactivating account:", error);
      toast.error("Failed to reactivate account");
    }
  };

  const filteredSuspended = suspendedAccounts.filter((account) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (account.name || "").toLowerCase().includes(term) ||
      (account.email || "").toLowerCase().includes(term) ||
      (account.phone || "").includes(term)
    );
  });

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

  // Generic setters
  const setGen = (k, v) => setGeneralSettings((p) => ({ ...p, [k]: v }));
  const setItem = (k, v) => setItemsSettings((p) => ({ ...p, [k]: v }));
  const toggleInList = (key, value, on) =>
    setItemsSettings((p) => {
      const cur = p[key] || [];
      const next = on
        ? [...new Set([...cur, value])]
        : cur.filter((x) => x !== value);
      return { ...p, [key]: next };
    });

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

  const METHOD_OPTIONS = (long) => [
    {
      value: "both",
      title: "💵 + 📦 Both Cash & Item",
      desc: long
        ? "Members can choose between paying cash or saving for items."
        : "Members can choose between cash or item.",
    },
    {
      value: "cash",
      title: "💵 Cash Only",
      desc: long
        ? "Members of this branch can only pay cash. Item selection is hidden."
        : "Only cash savings. Item selection is hidden.",
    },
    {
      value: "item",
      title: "📦 Item Only",
      desc: long
        ? "Members of this branch can only save for items. Cash option is hidden."
        : "Only item savings. Cash option is hidden.",
    },
  ];

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
        {/* BRANCH BANNER */}
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
                  {isAdmin ? branches.length : visibleBranches.length}
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

        {/* Header */}
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
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Save Settings"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
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
              className={`tab-btn tab-btn-branches ${
                activeTab === "branches" ? "active" : ""
              }`}
              onClick={() => setActiveTab("branches")}
            >
              🏢 {isAdmin ? "Branches" : "My Branch"}
              {isAdmin && branches.length > 0 && (
                <span className="branch-tab-badge">{branches.length}</span>
              )}
            </button>
          )}
        </div>

        {/* GENERAL */}
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
                  value={generalSettings.shop_name}
                  onChange={(e) => setGen("shop_name", e.target.value)}
                  placeholder="Enter shop name for this branch"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Shop Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={generalSettings.shop_email}
                  onChange={(e) => setGen("shop_email", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Shop Phone{" "}
                  <span style={{ color: "var(--text-dim)" }}>
                    (exactly 11 digits)
                  </span>
                </label>
                <input
                  type="tel"
                  className={`form-input ${generalPhoneError ? "input-error" : ""}`}
                  value={generalSettings.shop_phone}
                  onChange={(e) => {
                    setGen("shop_phone", e.target.value);
                    if (generalPhoneError) {
                      setGeneralPhoneError(
                        validatePhone(e.target.value, {
                          required: false,
                          label: "Shop phone number",
                        }),
                      );
                    }
                  }}
                  onBlur={(e) =>
                    setGeneralPhoneError(
                      validatePhone(e.target.value, {
                        required: false,
                        label: "Shop phone number",
                      }),
                    )
                  }
                  placeholder="e.g. 08012345678"
                  maxLength={15}
                  inputMode="numeric"
                />
                {generalPhoneError && (
                  <div className="field-error">
                    <span>⚠️</span> {generalPhoneError}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  className="form-select"
                  value={generalSettings.currency}
                  onChange={(e) => setGen("currency", e.target.value)}
                >
                  <option value="NGN">NGN (₦)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Shop Address</label>
              <input
                type="text"
                className="form-input"
                value={generalSettings.shop_address}
                onChange={(e) => setGen("shop_address", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ITEMS */}
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

            {/* Savings method */}
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
              {METHOD_OPTIONS(true).map((opt) => {
                const selected =
                  (itemsSettings.savings_methods || "both") === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`radio-row ${selected ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="savings_methods"
                      value={opt.value}
                      checked={selected}
                      onChange={() => setItem("savings_methods", opt.value)}
                    />
                    <div className="radio-row-body">
                      <div className="radio-row-title">{opt.title}</div>
                      <div className="radio-row-desc">{opt.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Durations */}
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

            {/* Savings plans */}
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

            {/* Item rules */}
            <div
              style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}
            >
              <label className="form-label" style={{ marginBottom: 10 }}>
                Item Selection Rules
              </label>
              <Check
                label="Allow members to select multiple items"
                checked={itemsSettings.allow_multi_item}
                onChange={(v) => setItem("allow_multi_item", v)}
              />
              <Check
                label="Require all selected items to have the same duration"
                checked={itemsSettings.require_duration_match}
                onChange={(v) => setItem("require_duration_match", v)}
              />

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">
                  Money Check — how should the total contribution be validated
                  against selected items?
                </label>
                <select
                  className="form-select"
                  value={itemsSettings.money_check_mode || "strict"}
                  onChange={(e) => setItem("money_check_mode", e.target.value)}
                >
                  <option value="strict">
                    Strict — total must equal the sum of item values
                  </option>
                  <option value="min">
                    Minimum — total must be at least the sum of item values
                  </option>
                  <option value="off">
                    Disabled — no validation between total and items
                  </option>
                </select>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    marginTop: 4,
                  }}
                >
                  This controls what members see on their profile form when they
                  pick items.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BRANCHES TAB */}
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
                              className={`badge ${
                                b.status === "active"
                                  ? "badge-branch-active"
                                  : "badge-branch-inactive"
                              }`}
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
                                  className={`btn-branch-action ${
                                    b.status === "active"
                                      ? "warning"
                                      : "success"
                                  }`}
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

        {/* LOAN */}
        {activeTab === "loan" && (
          <div className="settings-card">
            <div className="settings-card-title">💰 Loan Settings</div>

            <div className="info-box">
              <p>
                💡 Configure loan eligibility criteria, interest rates, and
                borrowing limits. Members can borrow up to{" "}
                <strong>50% of their total savings</strong>.
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
                      value={loanSettings.min_membership_days}
                      onChange={(e) =>
                        setLoanSettings({
                          ...loanSettings,
                          min_membership_days: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={getDaysToMonthsDisplay(
                        loanSettings.min_membership_days,
                      )}
                      disabled
                      style={{ opacity: 0.6 }}
                    />
                  </div>
                </div>
              </div>

              <Check
                label="Enable Loan Requests"
                checked={loanSettings.enable_loan_requests}
                onChange={(v) =>
                  setLoanSettings({ ...loanSettings, enable_loan_requests: v })
                }
              />
              <Check
                label="Require Admin Approval for Loans"
                checked={loanSettings.require_admin_approval}
                onChange={(v) =>
                  setLoanSettings({
                    ...loanSettings,
                    require_admin_approval: v,
                  })
                }
              />
              <Check
                label="Auto-Approve Small Loans"
                checked={loanSettings.auto_approve_small_loans}
                onChange={(v) =>
                  setLoanSettings({
                    ...loanSettings,
                    auto_approve_small_loans: v,
                  })
                }
              />

              {loanSettings.auto_approve_small_loans && (
                <NumField
                  label="Small Loan Threshold (₦)"
                  value={loanSettings.small_loan_threshold}
                  onChange={(v) =>
                    setLoanSettings({
                      ...loanSettings,
                      small_loan_threshold: v,
                    })
                  }
                />
              )}
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
                💰 Interest & Duration
              </h4>
              <div className="form-row">
                <NumField
                  label="Interest Rate (%)"
                  value={loanSettings.interest_rate}
                  parse={parseFloat}
                  min="0"
                  step="0.5"
                  onChange={(v) =>
                    setLoanSettings({ ...loanSettings, interest_rate: v })
                  }
                />
                <NumField
                  label="Maximum Loan Duration (Months)"
                  value={loanSettings.max_duration_months}
                  fallback={1}
                  min="1"
                  onChange={(v) =>
                    setLoanSettings({ ...loanSettings, max_duration_months: v })
                  }
                />
              </div>
              <div className="form-row">
                <NumField
                  label="Late Payment Penalty (%)"
                  value={loanSettings.late_payment_penalty}
                  parse={parseFloat}
                  min="0"
                  step="0.5"
                  onChange={(v) =>
                    setLoanSettings({
                      ...loanSettings,
                      late_payment_penalty: v,
                    })
                  }
                />
                <NumField
                  label="Grace Period (Days)"
                  value={loanSettings.grace_period_days}
                  min="0"
                  onChange={(v) =>
                    setLoanSettings({ ...loanSettings, grace_period_days: v })
                  }
                />
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
                  <NumField
                    label="Maximum Loans Per Member"
                    value={loanSettings.max_loans_per_member}
                    fallback={1}
                    min="1"
                    onChange={(v) =>
                      setLoanSettings({
                        ...loanSettings,
                        max_loans_per_member: v,
                      })
                    }
                  />
                  <NumField
                    label="Loan Cooldown Period (Days)"
                    value={loanSettings.loan_cooldown_days}
                    min="0"
                    onChange={(v) =>
                      setLoanSettings({
                        ...loanSettings,
                        loan_cooldown_days: v,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rule-box">
              <h4>💰 Borrowing Rule: 50% of Savings</h4>
              <p>
                Members can borrow <strong>50%</strong> of their total savings.
              </p>
            </div>
          </div>
        )}

        {/* CONTRIBUTION */}
        {activeTab === "contribution" && (
          <div className="settings-card">
            <div className="settings-card-title">💰 Contribution Settings</div>
            <div className="form-row">
              <NumField
                label="Daily Contribution Limit"
                value={contributionSettings.daily_limit}
                onChange={(v) =>
                  setContributionSettings({
                    ...contributionSettings,
                    daily_limit: v,
                  })
                }
              />
              <NumField
                label="Minimum Deposit"
                value={contributionSettings.min_deposit}
                onChange={(v) =>
                  setContributionSettings({
                    ...contributionSettings,
                    min_deposit: v,
                  })
                }
              />
            </div>
            <div className="form-row">
              <NumField
                label="Maximum Deposit"
                value={contributionSettings.max_deposit}
                onChange={(v) =>
                  setContributionSettings({
                    ...contributionSettings,
                    max_deposit: v,
                  })
                }
              />
              <NumField
                label="Default Contribution Amount"
                value={contributionSettings.default_contribution_amount}
                onChange={(v) =>
                  setContributionSettings({
                    ...contributionSettings,
                    default_contribution_amount: v,
                  })
                }
              />
            </div>
            <div className="form-row">
              <NumField
                label="Max Daily Deposits"
                value={contributionSettings.max_daily_deposits}
                fallback={1}
                onChange={(v) =>
                  setContributionSettings({
                    ...contributionSettings,
                    max_daily_deposits: v,
                  })
                }
              />
              <div className="form-group">
                <label className="form-label">Contribution Frequency</label>
                <select
                  className="form-select"
                  value={contributionSettings.contribution_frequency}
                  onChange={(e) =>
                    setContributionSettings({
                      ...contributionSettings,
                      contribution_frequency: e.target.value,
                    })
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <Check
              label="Allow Multiple Deposits per Day"
              checked={contributionSettings.allow_multiple_deposits}
              onChange={(v) =>
                setContributionSettings({
                  ...contributionSettings,
                  allow_multiple_deposits: v,
                })
              }
            />
            <Check
              label="Enable Auto-Contribution"
              checked={contributionSettings.enable_auto_contribution}
              onChange={(v) =>
                setContributionSettings({
                  ...contributionSettings,
                  enable_auto_contribution: v,
                })
              }
            />
            {contributionSettings.enable_auto_contribution && (
              <div className="form-group">
                <label className="form-label">Auto-Contribution Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={contributionSettings.auto_contribution_time}
                  onChange={(e) =>
                    setContributionSettings({
                      ...contributionSettings,
                      auto_contribution_time: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* COMMISSION */}
        {activeTab === "commission" && (
          <div className="settings-card">
            <div className="settings-card-title">💸 Commission Settings</div>
            <Check
              label="Enable Commission"
              checked={commissionSettings.enable_commission}
              onChange={(v) =>
                setCommissionSettings({
                  ...commissionSettings,
                  enable_commission: v,
                })
              }
            />

            {commissionSettings.enable_commission && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Commission Type</label>
                    <select
                      className="form-select"
                      value={commissionSettings.commission_type}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          commission_type: e.target.value,
                        })
                      }
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <NumField
                    label="Commission Rate"
                    value={commissionSettings.commission_rate}
                    parse={parseFloat}
                    onChange={(v) =>
                      setCommissionSettings({
                        ...commissionSettings,
                        commission_rate: v,
                      })
                    }
                  />
                </div>

                <div className="form-row">
                  <NumField
                    label="Min Commission Amount"
                    value={commissionSettings.min_commission_amount}
                    onChange={(v) =>
                      setCommissionSettings({
                        ...commissionSettings,
                        min_commission_amount: v,
                      })
                    }
                  />
                  <NumField
                    label="Max Commission Amount"
                    value={commissionSettings.max_commission_amount}
                    onChange={(v) =>
                      setCommissionSettings({
                        ...commissionSettings,
                        max_commission_amount: v,
                      })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Commission Period</label>
                    <select
                      className="form-select"
                      value={commissionSettings.commission_period}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          commission_period: e.target.value,
                        })
                      }
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="per_transaction">Per Transaction</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apply Commission On</label>
                    <select
                      className="form-select"
                      value={commissionSettings.apply_commission_on}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          apply_commission_on: e.target.value,
                        })
                      }
                    >
                      <option value="deposit">Deposits</option>
                      <option value="withdrawal">Withdrawals</option>
                      <option value="transfer">Transfers</option>
                      <option value="all">All Transactions</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Commission Account</label>
                  <select
                    className="form-select"
                    value={commissionSettings.commission_account}
                    onChange={(e) =>
                      setCommissionSettings({
                        ...commissionSettings,
                        commission_account: e.target.value,
                      })
                    }
                  >
                    <option value="admin">Admin Account</option>
                    <option value="company">Company Account</option>
                    <option value="branch">Branch Account</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* PAYMENT */}
        {activeTab === "payment" && (
          <div className="settings-card">
            <div className="settings-card-title">💳 Payment Settings</div>
            <div className="form-row">
              <NumField
                label="Payment Percentage (%)"
                value={paymentSettings.payment_percentage}
                onChange={(v) =>
                  setPaymentSettings({
                    ...paymentSettings,
                    payment_percentage: v,
                  })
                }
              />
              <NumField
                label="Max Payment Count"
                value={paymentSettings.max_payment_count}
                fallback={1}
                onChange={(v) =>
                  setPaymentSettings({
                    ...paymentSettings,
                    max_payment_count: v,
                  })
                }
              />
            </div>
            <Check
              label="Allow Partial Payment"
              checked={paymentSettings.allow_partial_payment}
              onChange={(v) =>
                setPaymentSettings({
                  ...paymentSettings,
                  allow_partial_payment: v,
                })
              }
            />
            <Check
              label="Enable Refunds"
              checked={paymentSettings.enable_refunds}
              onChange={(v) =>
                setPaymentSettings({ ...paymentSettings, enable_refunds: v })
              }
            />
            <Check
              label="Require Admin Approval for Refunds"
              checked={paymentSettings.require_admin_approval}
              onChange={(v) =>
                setPaymentSettings({
                  ...paymentSettings,
                  require_admin_approval: v,
                })
              }
            />
          </div>
        )}

        {/* DISCOUNT */}
        {activeTab === "discount" && (
          <div className="settings-card">
            <div className="settings-card-title">🏷️ Discount Settings</div>
            <Check
              label="Enable Discounts"
              checked={discountSettings.enable_discounts}
              onChange={(v) =>
                setDiscountSettings({
                  ...discountSettings,
                  enable_discounts: v,
                })
              }
            />
            <div className="form-row">
              <NumField
                label="Default Discount (%)"
                value={discountSettings.default_discount_percentage}
                onChange={(v) =>
                  setDiscountSettings({
                    ...discountSettings,
                    default_discount_percentage: v,
                  })
                }
              />
              <NumField
                label="Max Discount (%)"
                value={discountSettings.max_discount_percentage}
                onChange={(v) =>
                  setDiscountSettings({
                    ...discountSettings,
                    max_discount_percentage: v,
                  })
                }
              />
            </div>
            <Check
              label="Enable Loyalty Discount"
              checked={discountSettings.loyalty_discount_enabled}
              onChange={(v) =>
                setDiscountSettings({
                  ...discountSettings,
                  loyalty_discount_enabled: v,
                })
              }
            />
            <Check
              label="Enable Bulk Discount"
              checked={discountSettings.bulk_discount_enabled}
              onChange={(v) =>
                setDiscountSettings({
                  ...discountSettings,
                  bulk_discount_enabled: v,
                })
              }
            />
          </div>
        )}

        {/* SECURITY */}
        {activeTab === "security" && (
          <div className="settings-card">
            <div className="settings-card-title">🔒 Security Settings</div>
            <div className="form-row">
              <NumField
                label="Session Timeout (minutes)"
                value={securitySettings.session_timeout}
                fallback={10}
                onChange={(v) =>
                  setSecuritySettings({
                    ...securitySettings,
                    session_timeout: v,
                  })
                }
              />
              <NumField
                label="Max Login Attempts"
                value={securitySettings.max_login_attempts}
                fallback={3}
                onChange={(v) =>
                  setSecuritySettings({
                    ...securitySettings,
                    max_login_attempts: v,
                  })
                }
              />
            </div>
            <Check
              label="Enable Two-Factor Authentication"
              checked={securitySettings.two_factor_auth}
              onChange={(v) =>
                setSecuritySettings({ ...securitySettings, two_factor_auth: v })
              }
            />
            <Check
              label="Require Strong Password"
              checked={securitySettings.require_strong_password}
              onChange={(v) =>
                setSecuritySettings({
                  ...securitySettings,
                  require_strong_password: v,
                })
              }
            />
          </div>
        )}

        {/* SUSPENSION */}
        {activeTab === "suspension" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">
                🚫 Account Suspension Settings
              </div>

              <Check
                label="Auto-suspend inactive accounts"
                checked={suspensionSettings.auto_suspend_inactive}
                onChange={(v) =>
                  setSuspensionSettings({
                    ...suspensionSettings,
                    auto_suspend_inactive: v,
                  })
                }
              />
              {suspensionSettings.auto_suspend_inactive && (
                <NumField
                  label="Inactive Days Before Suspension"
                  value={suspensionSettings.inactive_days}
                  fallback={30}
                  onChange={(v) =>
                    setSuspensionSettings({
                      ...suspensionSettings,
                      inactive_days: v,
                    })
                  }
                />
              )}

              <Check
                label="Suspend accounts with negative balance"
                checked={suspensionSettings.suspend_on_negative_balance}
                onChange={(v) =>
                  setSuspensionSettings({
                    ...suspensionSettings,
                    suspend_on_negative_balance: v,
                  })
                }
              />
              {suspensionSettings.suspend_on_negative_balance && (
                <NumField
                  label="Negative Balance Threshold"
                  value={suspensionSettings.negative_balance_threshold}
                  fallback={5000}
                  onChange={(v) =>
                    setSuspensionSettings({
                      ...suspensionSettings,
                      negative_balance_threshold: v,
                    })
                  }
                />
              )}

              <Check
                label="Require Admin Approval for Reactivation"
                checked={
                  suspensionSettings.require_admin_approval_for_reactivation
                }
                onChange={(v) =>
                  setSuspensionSettings({
                    ...suspensionSettings,
                    require_admin_approval_for_reactivation: v,
                  })
                }
              />
              <Check
                label="Send Notification to Member on Suspension"
                checked={suspensionSettings.send_notification_on_suspension}
                onChange={(v) =>
                  setSuspensionSettings({
                    ...suspensionSettings,
                    send_notification_on_suspension: v,
                  })
                }
              />
              <Check
                label="Notify Admin on Suspension"
                checked={suspensionSettings.notify_admin_on_suspension}
                onChange={(v) =>
                  setSuspensionSettings({
                    ...suspensionSettings,
                    notify_admin_on_suspension: v,
                  })
                }
              />
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
                    {members
                      .filter((m) => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
                        return (
                          (m.name || "").toLowerCase().includes(term) ||
                          (m.email || "").toLowerCase().includes(term) ||
                          (m.phone && m.phone.includes(term))
                        );
                      })
                      .map((member) => (
                        <tr key={member.id}>
                          <td style={{ fontWeight: "500" }}>{member.name}</td>
                          <td style={{ color: "var(--text-muted)" }}>
                            {member.email}
                          </td>
                          <td style={{ color: "var(--text-muted)" }}>
                            {member.phone || "N/A"}
                          </td>
                          <td
                            style={{
                              color: "var(--credit)",
                              fontWeight: "600",
                            }}
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
                {members.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--text-muted)",
                    }}
                  >
                    No active members found in {branchLabel}
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
                            className={`badge ${
                              account.duration === "permanent"
                                ? "badge-permanent"
                                : "badge-temporary"
                            }`}
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

      {/* SUSPEND MODAL */}
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

      {/* REACTIVATE MODAL */}
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

      {/* BRANCH MODAL */}
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
                {METHOD_OPTIONS(false).map((opt) => {
                  const selected =
                    (branchForm.savings_methods || "both") === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`radio-row ${selected ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="branch_savings_methods"
                        value={opt.value}
                        checked={selected}
                        onChange={() =>
                          setBranchForm((prev) => ({
                            ...prev,
                            savings_methods: opt.value,
                          }))
                        }
                      />
                      <div className="radio-row-body">
                        <div className="radio-row-title">{opt.title}</div>
                        <div className="radio-row-desc">{opt.desc}</div>
                      </div>
                    </label>
                  );
                })}
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
                <div className="form-group">
                  <label className="form-label">
                    Phone{" "}
                    <span style={{ color: "var(--text-dim)" }}>
                      (exactly 11 digits)
                    </span>
                  </label>
                  <input
                    type="tel"
                    className={`form-input ${branchPhoneError ? "input-error" : ""}`}
                    value={branchForm.phone}
                    onChange={(e) => {
                      setBranchForm({ ...branchForm, phone: e.target.value });
                      if (branchPhoneError) {
                        setBranchPhoneError(
                          validatePhone(e.target.value, {
                            required: false,
                            label: "Branch phone number",
                          }),
                        );
                      }
                    }}
                    onBlur={(e) =>
                      setBranchPhoneError(
                        validatePhone(e.target.value, {
                          required: false,
                          label: "Branch phone number",
                        }),
                      )
                    }
                    placeholder="e.g. 08012345678"
                    maxLength={15}
                    inputMode="numeric"
                  />
                  {branchPhoneError && (
                    <div className="field-error">
                      <span>⚠️</span> {branchPhoneError}
                    </div>
                  )}
                </div>
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
  .settings-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
  }
  .tabs-container {
    display: flex; gap: 4px;
    background-color: var(--bg-surface-2);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 4px;
    margin-bottom: 24px; flex-wrap: wrap;
  }
  .tab-btn {
    padding: 10px 16px; border-radius: 8px; border: none;
    background: transparent; color: var(--text-muted);
    cursor: pointer; font-size: 13px; font-weight: 500;
    transition: all 0.2s; flex: 1; min-width: 80px;
  }
  .tab-btn:hover { color: var(--text); background: var(--bg-surface-3); }
  .tab-btn.active { background: var(--accent); color: #ffffff; }
  .tab-btn-branches {
    background: linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.18));
    border: 1px solid var(--accent);
    color: var(--accent-text, #10b981);
    font-weight: 700; display: inline-flex;
    align-items: center; justify-content: center; gap: 6px;
  }
  .tab-btn-branches.active { background: var(--accent); color: #ffffff; border-color: var(--accent); }
  .branch-tab-badge {
    background: var(--accent); color: #ffffff;
    font-size: 11px; font-weight: 700;
    padding: 1px 7px; border-radius: 10px;
    line-height: 1.4; min-width: 18px; text-align: center;
  }
  .tab-btn-branches.active .branch-tab-badge { background: #ffffff; color: var(--accent); }
  .settings-card {
    background-color: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 20px; margin-bottom: 20px;
  }
  .settings-card-title {
    font-size: 16px; font-weight: 600; margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px; color: var(--text);
  }
  .form-group { margin-bottom: 16px; }
  .form-label {
    display: block; font-size: 13px; font-weight: 500;
    color: var(--text-muted); margin-bottom: 6px;
  }
  .form-input, .form-select {
    width: 100%; padding: 10px 14px; border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-surface-2); color: var(--text);
    font-size: 14px; outline: none;
    transition: border-color 0.2s; box-sizing: border-box;
  }
  .form-input:focus, .form-select:focus { border-color: var(--accent); }
  .form-input::placeholder { color: var(--text-dim); }
  .form-input:disabled {
    opacity: 0.55; cursor: not-allowed;
    background: var(--bg-surface-3, rgba(0,0,0,0.05));
  }
  .form-input.input-error {
    border-color: var(--debit);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }
  .field-error {
    color: var(--debit); font-size: 11px; margin-top: 4px;
    display: flex; align-items: center; gap: 4px; font-weight: 500;
  }
  .form-select option { background: var(--bg-surface); color: var(--text); }
  .form-checkbox { margin-bottom: 10px; cursor: pointer; }
  .form-checkbox label { cursor: pointer; }
  .form-checkbox input[type="checkbox"] {
    width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer;
  }
  .form-checkbox-label { font-size: 14px; color: var(--text); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .btn-save {
    padding: 10px 32px; border-radius: 8px; border: none;
    background: var(--accent); color: #ffffff; cursor: pointer;
    font-size: 14px; font-weight: 500; transition: all 0.2s;
  }
  .btn-save:hover { background: var(--accent-hover); }
  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-refresh-settings {
    padding: 10px 20px; border-radius: 8px;
    border: 1px solid var(--info); background: transparent;
    color: var(--info); cursor: pointer;
    font-size: 14px; font-weight: 600;
    transition: all 0.2s; display: inline-flex;
    align-items: center; gap: 8px;
  }
  .btn-refresh-settings:hover:not(:disabled) { background: var(--bg-surface-2); }
  .btn-refresh-settings:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-refresh-settings .spinning { display: inline-block; animation: spin 1s linear infinite; }
  .btn-suspend {
    padding: 6px 16px; border-radius: 6px; border: none;
    background: var(--debit); color: #ffffff;
    cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;
  }
  .btn-suspend:hover { opacity: 0.85; }
  .btn-reactivate {
    padding: 6px 16px; border-radius: 6px; border: none;
    background: var(--accent); color: #ffffff;
    cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;
  }
  .btn-reactivate:hover { background: var(--accent-hover); }
  .suspended-table { width: 100%; border-collapse: collapse; }
  .suspended-table th {
    text-align: left; padding: 10px 12px;
    font-size: 11px; font-weight: 600;
    color: var(--text-muted); text-transform: uppercase;
    letter-spacing: 0.05em; border-bottom: 1px solid var(--border);
  }
  .suspended-table td {
    padding: 10px 12px; border-bottom: 1px solid var(--border);
    font-size: 13px; color: var(--text);
  }
  .suspended-table tr:hover { background-color: var(--bg-surface-2); }
  .badge {
    display: inline-block; padding: 3px 10px;
    border-radius: 9999px; font-size: 11px; font-weight: 500;
  }
  .badge-active { background-color: var(--approved-bg); color: var(--credit); border: 1px solid var(--border); }
  .badge-permanent { background-color: var(--rejected-bg); color: var(--debit); border: 1px solid var(--border); }
  .badge-temporary { background-color: var(--pending-bg); color: var(--warning); border: 1px solid var(--border); }
  .badge-branch-active { background-color: var(--approved-bg); color: var(--credit); border: 1px solid var(--border); }
  .badge-branch-inactive { background-color: var(--bg-surface-2); color: var(--text-muted); border: 1px solid var(--border); }
  .search-input {
    width: 100%; max-width: 300px;
    padding: 8px 14px; border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-surface-2); color: var(--text);
    font-size: 13px; outline: none;
    transition: border-color 0.2s; box-sizing: border-box;
  }
  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--text-dim); }
  .modal-overlay {
    position: fixed; inset: 0;
    background-color: var(--bg-overlay);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 999; padding: 16px;
  }
  .modal-content {
    background-color: var(--bg-surface);
    border-radius: 16px; padding: 24px;
    max-width: 500px; width: 100%;
    max-height: 90vh; overflow-y: auto;
    border: 1px solid var(--border); color: var(--text);
  }
  .modal-header {
    display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 16px;
  }
  .modal-title { font-size: 18px; font-weight: bold; color: var(--text); }
  .modal-close {
    background: none; border: none;
    color: var(--text-muted); cursor: pointer;
    padding: 4px; font-size: 24px;
  }
  .modal-close:hover { color: var(--text); }
  .btn-cancel {
    flex: 1; padding: 10px; border-radius: 8px;
    border: 1px solid var(--border);
    background: transparent; color: var(--text);
    cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;
  }
  .btn-cancel:hover { background: var(--bg-surface-2); }
  .btn-confirm {
    flex: 1; padding: 10px; border-radius: 8px;
    border: none; cursor: pointer;
    font-size: 13px; font-weight: 500; transition: all 0.2s;
  }
  .btn-confirm-success { background: var(--accent); color: #ffffff; }
  .btn-confirm-success:hover { background: var(--accent-hover); }
  .info-box {
    background: var(--accent-bg);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;
  }
  .info-box p { margin: 0; font-size: 13px; color: var(--text); }
  .rule-box {
    background: var(--approved-bg);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 16px; margin-top: 16px;
  }
  .rule-box h4 { font-size: 13px; color: var(--credit); margin: 0 0 8px 0; }
  .rule-box p { font-size: 12px; color: var(--text-muted); margin: 0; }
  .loan-restriction-box {
    background: var(--accent-bg);
    border: 1px solid var(--border);
    border-radius: 8px; padding: 16px; margin-top: 16px;
  }
  .branch-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px; margin-bottom: 20px;
  }
  .branch-summary-card {
    background: var(--bg-surface-2);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 16px;
  }
  .branch-summary-label {
    font-size: 12px; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .branch-summary-value { font-size: 22px; font-weight: 700; color: var(--text); margin-top: 4px; }
  .branch-summary-value.credit { color: var(--credit); }
  .branch-summary-value.muted { color: var(--text-muted); }
  .btn-branch-action {
    padding: 6px 12px; border-radius: 6px;
    border: 1px solid var(--border);
    background: transparent; color: var(--text);
    font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.2s;
  }
  .btn-branch-action:hover { background: var(--bg-surface-2); }
  .btn-branch-action.danger { color: var(--debit); border-color: var(--debit); }
  .btn-branch-action.danger:hover { background: var(--rejected-bg); }
  .btn-branch-action.warning { color: var(--warning); border-color: var(--warning); }
  .btn-branch-action.warning:hover { background: var(--pending-bg); }
  .btn-branch-action.success { color: var(--credit); border-color: var(--credit); }
  .btn-branch-action.success:hover { background: var(--approved-bg); }
  .btn-branch-action.info { color: var(--info); border-color: var(--info); }
  .btn-branch-action.info:hover { background: rgba(59, 130, 246, 0.1); }
  .radio-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg-surface-2);
    cursor: pointer; margin-bottom: 8px;
    transition: border-color 0.15s, background 0.15s;
  }
  .radio-row:hover { border-color: var(--accent); }
  .radio-row.selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
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
