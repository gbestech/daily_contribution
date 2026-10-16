// src/components/admin/Settings.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useBranch } from "../../context/BranchContext";
import { usePermission } from "../../context/PermissionsContext";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

// ============================================================
// PHONE VALIDATION — STRICTLY exactly 11 digits
// ============================================================
const PHONE_REGEX = /^\d{11}$/;

const validatePhone = (
  phone,
  { required = false, label = "Phone number" } = {},
) => {
  const value = String(phone || "").trim();

  // Empty is allowed unless required
  if (!value) {
    return required ? `${label} is required` : "";
  }

  // Strip common separators (space, dash, parens) for a friendlier check
  const digitsOnly = value.replace(/[\s\-()]/g, "");

  // Must be digits only
  if (!/^\d+$/.test(digitsOnly)) {
    return `${label} must contain only digits (0-9)`;
  }

  // Must be EXACTLY 11 digits — no more, no less
  if (digitsOnly.length !== 11) {
    return `${label} must be exactly 11 digits (you entered ${digitsOnly.length})`;
  }

  return "";
};

const AdminSettings = () => {
  const { activeBranch, activeBranchId } = useBranch();
  const { can } = usePermission() || {};
  const { user } = useAuth();

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
  const canViewBranches =
    typeof can === "function" ? can("view_branches") : false;
  const canCreateBranch =
    typeof can === "function" ? can("create_branch") : false;
  const canEditBranch = typeof can === "function" ? can("edit_branch") : false;
  const canDeleteBranch =
    typeof can === "function" ? can("delete_branch") : false;
  const canToggleBranch =
    typeof can === "function" ? can("toggle_branch_status") : false;
  const canCopyLink =
    typeof can === "function" ? can("copy_registration_link") : false;

  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    shop_name: "",
    shop_email: "",
    shop_phone: "",
    shop_address: "",
    currency: "NGN",
    timezone: "Africa/Lagos",
    date_format: "DD/MM/YYYY",
  });

  // Contribution Settings
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

  // Commission Settings
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

  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState({
    payment_percentage: 80,
    allow_partial_payment: true,
    max_payment_count: 2,
    enable_refunds: true,
    require_admin_approval: true,
  });

  // Discount Settings
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

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_auth: false,
    session_timeout: 30,
    max_login_attempts: 5,
    password_expiry_days: 90,
    require_strong_password: true,
  });

  // Suspension Settings
  const [suspensionSettings, setSuspensionSettings] = useState({
    auto_suspend_inactive: false,
    inactive_days: 30,
    suspend_on_negative_balance: true,
    negative_balance_threshold: 5000,
    require_admin_approval_for_reactivation: true,
    send_notification_on_suspension: true,
    notify_admin_on_suspension: true,
  });

  // Loan Settings
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

  // Items Settings (with savings_methods)
  const [itemsSettings, setItemsSettings] = useState({
    durations: ["6 months", "1 year"],
    savings_plans: ["Daily", "Weekly", "Monthly", "Random"],
    allow_multi_item: true,
    money_check_mode: "strict",
    require_duration_match: true,
    savings_methods: "both",
  });

  // Data from database
  const [members, setMembers] = useState([]);
  const [suspendedAccounts, setSuspendedAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // All managers across ALL branches
  const [allManagers, setAllManagers] = useState([]);

  // Branches
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesSaving, setBranchesSaving] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(false);
  const [branchForm, setBranchForm] = useState({
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
  });

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionDuration, setSuspensionDuration] = useState("permanent");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [newTier, setNewTier] = useState({
    min_amount: "",
    max_amount: "",
    rate: "",
  });

  // ============================================================
  // PHONE VALIDATION ERRORS
  // ============================================================
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

  const managers = useMemo(() => {
    const source = isAdmin ? allManagers : members;
    return source.filter((m) => {
      const r = String(m.role || "")
        .trim()
        .toLowerCase();
      return (
        r === "manager" ||
        r === "branch_manager" ||
        r === "branch-manager" ||
        r === "branchmanager"
      );
    });
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
  // Reload when branch changes
  // ============================================================
  useEffect(() => {
    setGeneralSettings({
      shop_name: "",
      shop_email: "",
      shop_phone: "",
      shop_address: "",
      currency: "NGN",
      timezone: "Africa/Lagos",
      date_format: "DD/MM/YYYY",
    });
    setGeneralPhoneError("");
    setSearchTerm("");
    fetchSettings();
    fetchMembers();
    fetchTransactions();
    fetchSuspendedAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  // ============================================================
  // Auto-switch away from branches tab if not allowed
  // ============================================================
  useEffect(() => {
    if (activeTab === "branches" && !canViewBranches) {
      setActiveTab("general");
    }
    if (activeTab === "branches" && isManager && !myBranchId) {
      setActiveTab("general");
    }
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
        console.error("[branches] HTTP error:", res.status, data);
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
  // BRANCH MODAL HANDLERS
  // ============================================================
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

  const openCreateBranch = () => {
    if (!isAdmin) {
      toast.error("Only admins can create branches");
      return;
    }
    setBranchForm(emptyBranchForm);
    setBranchPhoneError("");
    setEditingBranch(false);
    setShowBranchModal(true);
  };

  const openEditBranch = (b) => {
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

    let branchSavingsMethods = "both";
    if (String(b.id) === String(activeBranchId)) {
      branchSavingsMethods = itemsSettings.savings_methods || "both";
    }

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
    setBranchPhoneError("");
    setEditingBranch(false);
  };

  // ============================================================
  // COPY REGISTRATION LINK
  // ============================================================
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
        .then(() => {
          toast.success(`📋 Link copied for ${branch.name}`, {
            duration: 4000,
          });
        })
        .catch(() => fallbackCopy(link, branch));
    } else {
      fallbackCopy(link, branch);
    }
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
      if (ok) {
        toast.success(`📋 Link copied for ${branch.name}`, { duration: 4000 });
      } else {
        window.prompt("Copy this registration link:", link);
      }
    } catch {
      window.prompt("Copy this registration link:", link);
    }
  };

  // ============================================================
  // SAVE BRANCH
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

    // ✅ Validate branch phone — MUST be exactly 11 digits if provided
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
        if (isAdmin) {
          payload.status = branchForm.status;
        }
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

      if (!res.ok) {
        throw new Error(data.error || "Failed to save branch");
      }

      const targetBranchId =
        data?.branch?.id ?? branchForm.id ?? activeBranchId;
      if (targetBranchId && branchForm.savings_methods) {
        try {
          const currentSettings = {
            ...itemsSettings,
            savings_methods: branchForm.savings_methods,
          };
          await fetch(
            `${API_BASE_URL}/api/settings.php?branch_id=${targetBranchId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                branch_id: targetBranchId,
                items: currentSettings,
              }),
            },
          );
        } catch (err) {
          console.warn("[branches] savings_methods save failed:", err);
        }
      }

      toast.success(editingBranch ? "✅ Branch updated" : "✅ Branch created");
      setShowBranchModal(false);
      setBranchForm(emptyBranchForm);
      setBranchPhoneError("");
      setEditingBranch(false);
      await fetchBranches();
      await fetchSettings();

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

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

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

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete branch");
      }

      toast.success("🗑️ Branch deleted");
      await fetchBranches();
    } catch (err) {
      toast.error(err.message || "Failed to delete branch");
    }
  };

  // ============================================================
  // SETTINGS FETCH — branch-scoped
  // ============================================================
  const fetchSettings = async () => {
    try {
      const url = activeBranchId
        ? `${API_BASE_URL}/api/settings.php?branch_id=${activeBranchId}`
        : `${API_BASE_URL}/api/settings.php`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status && data.data) {
        const s = data.data;

        setGeneralSettings({
          shop_name: "",
          shop_email: "",
          shop_phone: "",
          shop_address: "",
          currency: "NGN",
          timezone: "Africa/Lagos",
          date_format: "DD/MM/YYYY",
          ...(s.general || {}),
        });

        setContributionSettings((prev) => ({
          ...prev,
          ...(s.contribution || {}),
        }));
        setCommissionSettings((prev) => ({
          ...prev,
          ...(s.commission || {}),
        }));
        setPaymentSettings((prev) => ({
          ...prev,
          ...(s.payment || {}),
        }));
        setDiscountSettings((prev) => ({
          ...prev,
          ...(s.discount || {}),
        }));
        setSecuritySettings((prev) => ({
          ...prev,
          ...(s.security || {}),
        }));
        setSuspensionSettings((prev) => ({
          ...prev,
          ...(s.suspension || {}),
        }));
        setLoanSettings((prev) => ({
          ...prev,
          ...(s.loan || {}),
        }));
        setItemsSettings((prev) => ({
          ...prev,
          ...(s.items || {}),
        }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  // Branch-scoped members
  const fetchMembers = async () => {
    try {
      const url = activeBranchId
        ? `${API_BASE_URL}/api/members.php?branch_id=${activeBranchId}`
        : `${API_BASE_URL}/api/members.php`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.members) {
        const activeMembers = data.members.filter(
          (m) => m.status !== "Suspended",
        );
        setMembers(activeMembers);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch members");
    }
  };

  // Branch-scoped transactions
  const fetchTransactions = async () => {
    try {
      const url = activeBranchId
        ? `${API_BASE_URL}/api/transactions.php?branch_id=${activeBranchId}`
        : `${API_BASE_URL}/api/transactions.php`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  // Branch-scoped suspended accounts
  const fetchSuspendedAccounts = async () => {
    try {
      const url = activeBranchId
        ? `${API_BASE_URL}/api/members.php?branch_id=${activeBranchId}`
        : `${API_BASE_URL}/api/members.php`;
      const response = await fetch(url);
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
          }));
        setSuspendedAccounts(suspended);
      }
    } catch (error) {
      console.error("Error fetching suspended accounts:", error);
    }
  };

  // All managers across branches
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

      const mgrs = data.members.filter((m) => {
        const r = String(m.role || "")
          .trim()
          .toLowerCase();
        return (
          r === "manager" ||
          r === "branch_manager" ||
          r === "branch-manager" ||
          r === "branchmanager"
        );
      });
      setAllManagers(mgrs);
    } catch (err) {
      console.error("[Settings] fetchAllManagers error:", err);
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
    if (days < 30) {
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) {
      return `${months} month${months !== 1 ? "s" : ""}`;
    }
    return `${months} month${months !== 1 ? "s" : ""}, ${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
  };

  // ============================================================
  // SAVE SETTINGS — branch-scoped
  // ============================================================
  const handleSaveSettings = async () => {
    // ✅ Validate shop phone — MUST be exactly 11 digits if provided
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

    setSaving(true);
    try {
      const settings = {
        branch_id: activeBranchId || 0,
        general: generalSettings,
        contribution: contributionSettings,
        commission: commissionSettings,
        payment: paymentSettings,
        discount: discountSettings,
        security: securitySettings,
        suspension: suspensionSettings,
        loan: loanSettings,
        items: itemsSettings,
      };

      const url = activeBranchId
        ? `${API_BASE_URL}/api/settings.php?branch_id=${activeBranchId}`
        : `${API_BASE_URL}/api/settings.php`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned non-JSON: ${text.slice(0, 200)}`);
      }

      if (response.ok && data.status) {
        toast.success(
          `Settings saved for ${activeBranch?.name || "this branch"}`,
        );
        await fetchSettings();
      } else {
        toast.error(data.error || data.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(`❌ ${error.message || "Failed to save settings"}`);
    } finally {
      setSaving(false);
    }
  };

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
        ...(activeBranchId ? { branch_id: activeBranchId } : {}),
      };

      const url = `${API_BASE_URL}/api/members.php/${selectedMember.id}${
        activeBranchId ? `?branch_id=${activeBranchId}` : ""
      }`;

      const response = await fetch(url, {
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
        ...(activeBranchId ? { branch_id: activeBranchId } : {}),
      };

      const url = `${API_BASE_URL}/api/members.php/${selectedMember.id}${
        activeBranchId ? `?branch_id=${activeBranchId}` : ""
      }`;

      const response = await fetch(url, {
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

  const handleAddTier = () => {
    if (!newTier.min_amount || !newTier.max_amount || !newTier.rate) {
      toast.error("Please fill in all tier fields");
      return;
    }
    const tier = {
      min_amount: parseFloat(newTier.min_amount),
      max_amount: parseFloat(newTier.max_amount),
      rate: parseFloat(newTier.rate),
    };
    setCommissionSettings({
      ...commissionSettings,
      tiers: [...commissionSettings.tiers, tier].sort(
        (a, b) => a.min_amount - b.min_amount,
      ),
    });
    setNewTier({ min_amount: "", max_amount: "", rate: "" });
    setShowAddTierModal(false);
    toast.success("Tier added successfully!");
  };

  const handleRemoveTier = (index) => {
    const updatedTiers = commissionSettings.tiers.filter((_, i) => i !== index);
    setCommissionSettings({ ...commissionSettings, tiers: updatedTiers });
    toast.success("Tier removed successfully!");
  };

  const filteredSuspended = suspendedAccounts.filter((account) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = (account.name || "").toLowerCase();
    const email = (account.email || "").toLowerCase();
    const phone = account.phone || "";
    return name.includes(term) || email.includes(term) || phone.includes(term);
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
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        color: "var(--text)",
        backgroundColor: "var(--bg-app)",
        minHeight: "100vh",
      }}
    >
      <style>{`
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
          opacity: 0.55;
          cursor: not-allowed;
          background: var(--bg-surface-3, rgba(0,0,0,0.05));
        }
        .form-input.input-error {
          border-color: var(--debit);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .field-error {
          color: var(--debit);
          font-size: 11px;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }
        .form-select option { background: var(--bg-surface); color: var(--text); }
        .form-checkbox {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 10px; cursor: pointer;
        }
        .form-checkbox input[type="checkbox"] {
          width: 18px; height: 18px;
          accent-color: var(--accent); cursor: pointer;
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
          cursor: pointer; font-size: 12px; font-weight: 500;
          transition: all 0.2s;
        }
        .btn-suspend:hover { opacity: 0.85; }
        .btn-reactivate {
          padding: 6px 16px; border-radius: 6px; border: none;
          background: var(--accent); color: #ffffff;
          cursor: pointer; font-size: 12px; font-weight: 500;
          transition: all 0.2s;
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
          cursor: pointer; font-size: 13px; font-weight: 500;
          transition: all 0.2s;
        }
        .btn-cancel:hover { background: var(--bg-surface-2); }
        .btn-confirm {
          flex: 1; padding: 10px; border-radius: 8px;
          border: none; cursor: pointer;
          font-size: 13px; font-weight: 500;
          transition: all 0.2s;
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
        .branch-summary-value {
          font-size: 22px; font-weight: 700;
          color: var(--text); margin-top: 4px;
        }
        .branch-summary-value.credit { color: var(--credit); }
        .branch-summary-value.muted  { color: var(--text-muted); }
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
        .radio-row input[type="radio"] {
          margin-top: 3px;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .radio-row-body { flex: 1; }
        .radio-row-title {
          font-size: 14px; font-weight: 600; color: var(--text);
          margin-bottom: 2px;
        }
        .radio-row-desc {
          font-size: 12px; color: var(--text-muted); line-height: 1.4;
        }
        @media (max-width: 768px) {
          .form-row { grid-template-columns: 1fr; }
          .tabs-container { flex-direction: column; }
          .tab-btn { flex: none; min-width: auto; }
          .settings-header { flex-direction: column; align-items: stretch; }
          .search-input { max-width: 100%; }
        }
      `}</style>

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
                {activeBranch?.name || "Branch"}
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
              <strong>{activeBranch?.name || "this branch"}</strong>
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
          <button
            className={`tab-btn ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            ⚙️ General
          </button>
          <button
            className={`tab-btn ${activeTab === "loan" ? "active" : ""}`}
            onClick={() => setActiveTab("loan")}
          >
            💰 Loan
          </button>
          <button
            className={`tab-btn ${
              activeTab === "contribution" ? "active" : ""
            }`}
            onClick={() => setActiveTab("contribution")}
          >
            💰 Contribution
          </button>
          <button
            className={`tab-btn ${activeTab === "commission" ? "active" : ""}`}
            onClick={() => setActiveTab("commission")}
          >
            💸 Commission
          </button>
          <button
            className={`tab-btn ${activeTab === "payment" ? "active" : ""}`}
            onClick={() => setActiveTab("payment")}
          >
            💳 Payment
          </button>
          <button
            className={`tab-btn ${activeTab === "discount" ? "active" : ""}`}
            onClick={() => setActiveTab("discount")}
          >
            🏷️ Discount
          </button>
          <button
            className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            🔒 Security
          </button>
          <button
            className={`tab-btn ${activeTab === "suspension" ? "active" : ""}`}
            onClick={() => setActiveTab("suspension")}
          >
            🚫 Suspension
          </button>
          <button
            className={`tab-btn ${activeTab === "items" ? "active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            🧾 Items
          </button>
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

        {/* General Settings */}
        {activeTab === "general" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">
                🏢 General Settings for{" "}
                <span style={{ color: "var(--accent)" }}>
                  {activeBranch?.name || "this branch"}
                </span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Shop Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={generalSettings.shop_name}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        shop_name: e.target.value,
                      })
                    }
                    placeholder="Enter shop name for this branch"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Shop Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={generalSettings.shop_email}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        shop_email: e.target.value,
                      })
                    }
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
                      setGeneralSettings({
                        ...generalSettings,
                        shop_phone: e.target.value,
                      });
                      // Live re-validate if an error is already showing
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
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        currency: e.target.value,
                      })
                    }
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
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      shop_address: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ITEMS TAB */}
        {activeTab === "items" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">
                🧾 Item & Duration Settings for{" "}
                <span style={{ color: "var(--accent)" }}>
                  {activeBranch?.name || "this branch"}
                </span>
              </div>

              <div className="info-box">
                <p>
                  💡 These options control what members see when they pick their
                  savings plan and the items they want to save for.
                </p>
              </div>

              {/* Savings method for this branch */}
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

                {[
                  {
                    value: "both",
                    title: "💵 + 📦 Both Cash & Item",
                    desc: "Members can choose between paying cash or saving for items.",
                  },
                  {
                    value: "cash",
                    title: "💵 Cash Only",
                    desc: "Members of this branch can only pay cash. Item selection is hidden.",
                  },
                  {
                    value: "item",
                    title: "📦 Item Only",
                    desc: "Members of this branch can only save for items. Cash option is hidden.",
                  },
                ].map((opt) => {
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
                        onChange={() =>
                          setItemsSettings({
                            ...itemsSettings,
                            savings_methods: opt.value,
                          })
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

              {/* Durations */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ marginBottom: 10 }}>
                  Allowed Durations
                </label>
                {["6 months", "1 year"].map((d) => {
                  const checked = (itemsSettings.durations || []).includes(d);
                  return (
                    <div className="form-checkbox" key={d}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [
                                ...new Set([
                                  ...(itemsSettings.durations || []),
                                  d,
                                ]),
                              ]
                            : (itemsSettings.durations || []).filter(
                                (x) => x !== d,
                              );
                          setItemsSettings({
                            ...itemsSettings,
                            durations: next,
                          });
                        }}
                      />
                      <span className="form-checkbox-label">{d}</span>
                    </div>
                  );
                })}
                {(itemsSettings.durations || []).length === 0 && (
                  <p
                    style={{
                      color: "var(--debit)",
                      fontSize: 12,
                      marginTop: 4,
                    }}
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
                {["Daily", "Weekly", "Monthly", "Random"].map((p) => {
                  const checked = (itemsSettings.savings_plans || []).includes(
                    p,
                  );
                  return (
                    <div className="form-checkbox" key={p}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [
                                ...new Set([
                                  ...(itemsSettings.savings_plans || []),
                                  p,
                                ]),
                              ]
                            : (itemsSettings.savings_plans || []).filter(
                                (x) => x !== p,
                              );
                          setItemsSettings({
                            ...itemsSettings,
                            savings_plans: next,
                          });
                        }}
                      />
                      <span className="form-checkbox-label">{p}</span>
                    </div>
                  );
                })}
                {(itemsSettings.savings_plans || []).length === 0 && (
                  <p
                    style={{
                      color: "var(--debit)",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    ⚠️ At least one plan must be enabled.
                  </p>
                )}
              </div>

              {/* Item rules */}
              <div
                style={{
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <label className="form-label" style={{ marginBottom: 10 }}>
                  Item Selection Rules
                </label>

                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={!!itemsSettings.allow_multi_item}
                    onChange={(e) =>
                      setItemsSettings({
                        ...itemsSettings,
                        allow_multi_item: e.target.checked,
                      })
                    }
                  />
                  <span className="form-checkbox-label">
                    Allow members to select multiple items
                  </span>
                </div>

                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={!!itemsSettings.require_duration_match}
                    onChange={(e) =>
                      setItemsSettings({
                        ...itemsSettings,
                        require_duration_match: e.target.checked,
                      })
                    }
                  />
                  <span className="form-checkbox-label">
                    Require all selected items to have the same duration
                  </span>
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">
                    Money Check — how should the total contribution be validated
                    against selected items?
                  </label>
                  <select
                    className="form-select"
                    value={itemsSettings.money_check_mode || "strict"}
                    onChange={(e) =>
                      setItemsSettings({
                        ...itemsSettings,
                        money_check_mode: e.target.value,
                      })
                    }
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
                    This controls what members see on their profile form when
                    they pick items.
                  </p>
                </div>
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
                            style={{
                              color: "var(--text-muted)",
                              fontSize: 12,
                            }}
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

        {/* Loan Settings */}
        {activeTab === "loan" && (
          <div>
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

                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={loanSettings.enable_loan_requests}
                    onChange={(e) =>
                      setLoanSettings({
                        ...loanSettings,
                        enable_loan_requests: e.target.checked,
                      })
                    }
                  />
                  <span className="form-checkbox-label">
                    Enable Loan Requests
                  </span>
                </div>

                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={loanSettings.require_admin_approval}
                    onChange={(e) =>
                      setLoanSettings({
                        ...loanSettings,
                        require_admin_approval: e.target.checked,
                      })
                    }
                  />
                  <span className="form-checkbox-label">
                    Require Admin Approval for Loans
                  </span>
                </div>

                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={loanSettings.auto_approve_small_loans}
                    onChange={(e) =>
                      setLoanSettings({
                        ...loanSettings,
                        auto_approve_small_loans: e.target.checked,
                      })
                    }
                  />
                  <span className="form-checkbox-label">
                    Auto-Approve Small Loans
                  </span>
                </div>

                {loanSettings.auto_approve_small_loans && (
                  <div className="form-group">
                    <label className="form-label">
                      Small Loan Threshold (₦)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={loanSettings.small_loan_threshold}
                      onChange={(e) =>
                        setLoanSettings({
                          ...loanSettings,
                          small_loan_threshold: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
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
                  <div className="form-group">
                    <label className="form-label">Interest Rate (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={loanSettings.interest_rate}
                      onChange={(e) =>
                        setLoanSettings({
                          ...loanSettings,
                          interest_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Maximum Loan Duration (Months)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={loanSettings.max_duration_months}
                      onChange={(e) =>
                        setLoanSettings({
                          ...loanSettings,
                          max_duration_months: parseInt(e.target.value) || 1,
                        })
                      }
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Late Payment Penalty (%)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={loanSettings.late_payment_penalty}
                      onChange={(e) =>
                        setLoanSettings({
                          ...loanSettings,
                          late_payment_penalty: parseFloat(e.target.value) || 0,
                        })
                      }
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Grace Period (Days)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={loanSettings.grace_period_days}
                      onChange={(e) =>
                        setLoanSettings({
                          ...loanSettings,
                          grace_period_days: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                    />
                  </div>
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
                    <div className="form-group">
                      <label className="form-label">
                        Maximum Loans Per Member
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={loanSettings.max_loans_per_member}
                        onChange={(e) =>
                          setLoanSettings({
                            ...loanSettings,
                            max_loans_per_member: parseInt(e.target.value) || 1,
                          })
                        }
                        min="1"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Loan Cooldown Period (Days)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={loanSettings.loan_cooldown_days}
                        onChange={(e) =>
                          setLoanSettings({
                            ...loanSettings,
                            loan_cooldown_days: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rule-box">
                <h4>💰 Borrowing Rule: 50% of Savings</h4>
                <p>
                  Members can borrow <strong>50%</strong> of their total
                  savings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contribution Settings */}
        {activeTab === "contribution" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">
                💰 Contribution Settings
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Daily Contribution Limit</label>
                  <input
                    type="number"
                    className="form-input"
                    value={contributionSettings.daily_limit}
                    onChange={(e) =>
                      setContributionSettings({
                        ...contributionSettings,
                        daily_limit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Minimum Deposit</label>
                  <input
                    type="number"
                    className="form-input"
                    value={contributionSettings.min_deposit}
                    onChange={(e) =>
                      setContributionSettings({
                        ...contributionSettings,
                        min_deposit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Maximum Deposit</label>
                  <input
                    type="number"
                    className="form-input"
                    value={contributionSettings.max_deposit}
                    onChange={(e) =>
                      setContributionSettings({
                        ...contributionSettings,
                        max_deposit: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Default Contribution Amount
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={contributionSettings.default_contribution_amount}
                    onChange={(e) =>
                      setContributionSettings({
                        ...contributionSettings,
                        default_contribution_amount:
                          parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Max Daily Deposits</label>
                  <input
                    type="number"
                    className="form-input"
                    value={contributionSettings.max_daily_deposits}
                    onChange={(e) =>
                      setContributionSettings({
                        ...contributionSettings,
                        max_daily_deposits: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
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

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={contributionSettings.allow_multiple_deposits}
                  onChange={(e) =>
                    setContributionSettings({
                      ...contributionSettings,
                      allow_multiple_deposits: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Allow Multiple Deposits per Day
                </span>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={contributionSettings.enable_auto_contribution}
                  onChange={(e) =>
                    setContributionSettings({
                      ...contributionSettings,
                      enable_auto_contribution: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Enable Auto-Contribution
                </span>
              </div>

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
          </div>
        )}

        {/* Commission Settings */}
        {activeTab === "commission" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">💸 Commission Settings</div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={commissionSettings.enable_commission}
                  onChange={(e) =>
                    setCommissionSettings({
                      ...commissionSettings,
                      enable_commission: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">Enable Commission</span>
              </div>

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
                    <div className="form-group">
                      <label className="form-label">Commission Rate</label>
                      <input
                        type="number"
                        className="form-input"
                        value={commissionSettings.commission_rate}
                        onChange={(e) =>
                          setCommissionSettings({
                            ...commissionSettings,
                            commission_rate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Min Commission Amount
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={commissionSettings.min_commission_amount}
                        onChange={(e) =>
                          setCommissionSettings({
                            ...commissionSettings,
                            min_commission_amount:
                              parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Max Commission Amount
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={commissionSettings.max_commission_amount}
                        onChange={(e) =>
                          setCommissionSettings({
                            ...commissionSettings,
                            max_commission_amount:
                              parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
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
          </div>
        )}

        {/* Payment Settings */}
        {activeTab === "payment" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">💳 Payment Settings</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Payment Percentage (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={paymentSettings.payment_percentage}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        payment_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Payment Count</label>
                  <input
                    type="number"
                    className="form-input"
                    value={paymentSettings.max_payment_count}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        max_payment_count: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={paymentSettings.allow_partial_payment}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      allow_partial_payment: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Allow Partial Payment
                </span>
              </div>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={paymentSettings.enable_refunds}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      enable_refunds: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">Enable Refunds</span>
              </div>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={paymentSettings.require_admin_approval}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      require_admin_approval: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Require Admin Approval for Refunds
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Discount Settings */}
        {activeTab === "discount" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">🏷️ Discount Settings</div>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={discountSettings.enable_discounts}
                  onChange={(e) =>
                    setDiscountSettings({
                      ...discountSettings,
                      enable_discounts: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">Enable Discounts</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Default Discount (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={discountSettings.default_discount_percentage}
                    onChange={(e) =>
                      setDiscountSettings({
                        ...discountSettings,
                        default_discount_percentage:
                          parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Discount (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={discountSettings.max_discount_percentage}
                    onChange={(e) =>
                      setDiscountSettings({
                        ...discountSettings,
                        max_discount_percentage: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={discountSettings.loyalty_discount_enabled}
                  onChange={(e) =>
                    setDiscountSettings({
                      ...discountSettings,
                      loyalty_discount_enabled: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Enable Loyalty Discount
                </span>
              </div>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={discountSettings.bulk_discount_enabled}
                  onChange={(e) =>
                    setDiscountSettings({
                      ...discountSettings,
                      bulk_discount_enabled: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Enable Bulk Discount
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === "security" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">🔒 Security Settings</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={securitySettings.session_timeout}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        session_timeout: parseInt(e.target.value) || 10,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Login Attempts</label>
                  <input
                    type="number"
                    className="form-input"
                    value={securitySettings.max_login_attempts}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        max_login_attempts: parseInt(e.target.value) || 3,
                      })
                    }
                  />
                </div>
              </div>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={securitySettings.two_factor_auth}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      two_factor_auth: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Enable Two-Factor Authentication
                </span>
              </div>
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={securitySettings.require_strong_password}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      require_strong_password: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Require Strong Password
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Suspension Settings */}
        {activeTab === "suspension" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">
                🚫 Account Suspension Settings
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={suspensionSettings.auto_suspend_inactive}
                  onChange={(e) =>
                    setSuspensionSettings({
                      ...suspensionSettings,
                      auto_suspend_inactive: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Auto-suspend inactive accounts
                </span>
              </div>

              {suspensionSettings.auto_suspend_inactive && (
                <div className="form-group">
                  <label className="form-label">
                    Inactive Days Before Suspension
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={suspensionSettings.inactive_days}
                    onChange={(e) =>
                      setSuspensionSettings({
                        ...suspensionSettings,
                        inactive_days: parseInt(e.target.value) || 30,
                      })
                    }
                  />
                </div>
              )}

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={suspensionSettings.suspend_on_negative_balance}
                  onChange={(e) =>
                    setSuspensionSettings({
                      ...suspensionSettings,
                      suspend_on_negative_balance: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Suspend accounts with negative balance
                </span>
              </div>

              {suspensionSettings.suspend_on_negative_balance && (
                <div className="form-group">
                  <label className="form-label">
                    Negative Balance Threshold
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={suspensionSettings.negative_balance_threshold}
                    onChange={(e) =>
                      setSuspensionSettings({
                        ...suspensionSettings,
                        negative_balance_threshold:
                          parseInt(e.target.value) || 5000,
                      })
                    }
                  />
                </div>
              )}

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={
                    suspensionSettings.require_admin_approval_for_reactivation
                  }
                  onChange={(e) =>
                    setSuspensionSettings({
                      ...suspensionSettings,
                      require_admin_approval_for_reactivation: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Require Admin Approval for Reactivation
                </span>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={suspensionSettings.send_notification_on_suspension}
                  onChange={(e) =>
                    setSuspensionSettings({
                      ...suspensionSettings,
                      send_notification_on_suspension: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Send Notification to Member on Suspension
                </span>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  checked={suspensionSettings.notify_admin_on_suspension}
                  onChange={(e) =>
                    setSuspensionSettings({
                      ...suspensionSettings,
                      notify_admin_on_suspension: e.target.checked,
                    })
                  }
                />
                <span className="form-checkbox-label">
                  Notify Admin on Suspension
                </span>
              </div>
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
                    No active members found in{" "}
                    {activeBranch?.name || "this branch"}
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

              {/* Savings Method selection */}
              <div className="form-group">
                <label className="form-label">
                  What Can Members of This Branch Save With?
                </label>
                {[
                  {
                    value: "both",
                    title: "💵 + 📦 Both Cash & Item",
                    desc: "Members can choose between cash or item.",
                  },
                  {
                    value: "cash",
                    title: "💵 Cash Only",
                    desc: "Only cash savings. Item selection is hidden.",
                  },
                  {
                    value: "item",
                    title: "📦 Item Only",
                    desc: "Only item savings. Cash option is hidden.",
                  },
                ].map((opt) => {
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
                          setBranchForm({
                            ...branchForm,
                            savings_methods: opt.value,
                          })
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
                      setBranchForm({
                        ...branchForm,
                        manager_id: id,
                        manager: picked ? picked.name : "",
                      });
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

export default AdminSettings;
