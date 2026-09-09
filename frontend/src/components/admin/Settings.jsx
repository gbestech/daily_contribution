// src/components/admin/Settings.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
    max_loans_per_member: 3, // NEW: Maximum number of loans per member
    loan_cooldown_days: 30, // NEW: Days before a member can request another loan
  });

  // Data from database
  const [members, setMembers] = useState([]);
  const [suspendedAccounts, setSuspendedAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

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

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSettings(),
        fetchMembers(),
        fetchTransactions(),
        fetchSuspendedAccounts(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings.php`);
      const data = await response.json();

      if (data.status && data.data) {
        const settings = data.data;

        if (settings.general) {
          setGeneralSettings((prev) => ({ ...prev, ...settings.general }));
        }
        if (settings.contribution) {
          setContributionSettings((prev) => ({
            ...prev,
            ...settings.contribution,
          }));
        }
        if (settings.commission) {
          setCommissionSettings((prev) => ({
            ...prev,
            ...settings.commission,
          }));
        }
        if (settings.payment) {
          setPaymentSettings((prev) => ({ ...prev, ...settings.payment }));
        }
        if (settings.discount) {
          setDiscountSettings((prev) => ({ ...prev, ...settings.discount }));
        }
        if (settings.security) {
          setSecuritySettings((prev) => ({ ...prev, ...settings.security }));
        }
        if (settings.suspension) {
          setSuspensionSettings((prev) => ({
            ...prev,
            ...settings.suspension,
          }));
        }
        if (settings.loan) {
          setLoanSettings((prev) => ({ ...prev, ...settings.loan }));
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
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

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
      const data = await response.json();

      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchSuspendedAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
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

  // Helper function to convert days to months and days
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

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settings = {
        general: generalSettings,
        contribution: contributionSettings,
        commission: commissionSettings,
        payment: paymentSettings,
        discount: discountSettings,
        security: securitySettings,
        suspension: suspensionSettings,
        loan: loanSettings,
      };

      const response = await fetch(`${API_BASE_URL}/api/settings.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok && data.status) {
        toast.success("Settings saved successfully!");
      } else {
        toast.error(data.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendAccount = async (member) => {
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
      const response = await fetch(
        `${API_BASE_URL}/api/members.php/${selectedMember.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...selectedMember,
            status: "Suspended",
            suspension_reason: suspensionReason,
            suspension_duration: suspensionDuration,
            suspended_date: new Date().toISOString().split("T")[0],
            suspended_by: "Admin",
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(`Account for ${selectedMember.name} has been suspended!`);
        setShowSuspendModal(false);
        setSelectedMember(null);
        setSuspensionReason("");
        await fetchAllData();
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
      const response = await fetch(
        `${API_BASE_URL}/api/members.php/${selectedMember.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...selectedMember,
            status: "Active",
            suspension_reason: null,
            suspension_duration: null,
            suspended_date: null,
            suspended_by: null,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Account for ${selectedMember.name} has been reactivated!`,
        );
        setShowReactivateModal(false);
        setSelectedMember(null);
        await fetchAllData();
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
    return (
      account.name.toLowerCase().includes(term) ||
      account.email.toLowerCase().includes(term) ||
      account.phone.includes(term)
    );
  });

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          color: "white",
          backgroundColor: "#0f172a",
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
            border: "4px solid rgba(255,255,255,0.1)",
            borderTopColor: "#00aa69",
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
        color: "white",
        backgroundColor: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <style>{`
        .settings-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .tabs-container {
          display: flex;
          gap: 4px;
          background-color: rgba(255,255,255,0.03);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          flex: 1;
          min-width: 80px;
        }
        .tab-btn:hover {
          color: white;
          background: rgba(255,255,255,0.05);
        }
        .tab-btn.active {
          background: #00aa69;
          color: white;
        }
        .settings-card {
          background-color: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .settings-card-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: #00aa69;
        }
        .form-input::placeholder {
          color: #64748b;
        }
        .form-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .form-select:focus {
          border-color: #00aa69;
        }
        .form-select option {
          background: #1e293b;
          color: white;
        }
        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          cursor: pointer;
        }
        .form-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #00aa69;
          cursor: pointer;
        }
        .form-checkbox-label {
          font-size: 14px;
          color: #e5e7eb;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .btn-save {
          padding: 10px 32px;
          border-radius: 8px;
          border: none;
          background: #00aa69;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-save:hover {
          background: #008854;
        }
        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-suspend {
          padding: 6px 16px;
          border-radius: 6px;
          border: none;
          background: #ef4444;
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-suspend:hover {
          background: #dc2626;
        }
        .btn-reactivate {
          padding: 6px 16px;
          border-radius: 6px;
          border: none;
          background: #00aa69;
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-reactivate:hover {
          background: #008854;
        }
        .btn-add-tier {
          padding: 8px 20px;
          border-radius: 6px;
          border: none;
          background: #3b82f6;
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-add-tier:hover {
          background: #2563eb;
        }
        .btn-remove-tier {
          padding: 4px 12px;
          border-radius: 4px;
          border: none;
          background: #ef4444;
          color: white;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-remove-tier:hover {
          background: #dc2626;
        }
        .suspended-table {
          width: 100%;
          border-collapse: collapse;
        }
        .suspended-table th {
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .suspended-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 13px;
        }
        .suspended-table tr:hover {
          background-color: rgba(255,255,255,0.02);
        }
        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
        }
        .badge-suspended {
          background-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .badge-active {
          background-color: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .badge-permanent {
          background-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .badge-temporary {
          background-color: rgba(234, 179, 8, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(234, 179, 8, 0.3);
        }
        .search-input {
          width: 100%;
          max-width: 300px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .search-input:focus {
          border-color: #00aa69;
        }
        .search-input::placeholder {
          color: #64748b;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 16px;
        }
        .modal-content {
          background-color: #1e293b;
          border-radius: 16px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .modal-title {
          font-size: 18px;
          font-weight: bold;
        }
        .modal-close {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          font-size: 24px;
        }
        .modal-close:hover {
          color: white;
        }
        .btn-cancel {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          background: rgba(255,255,255,0.05);
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-cancel:hover {
          background: rgba(255,255,255,0.1);
        }
        .btn-confirm {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-confirm-danger {
          background: #ef4444;
          color: white;
        }
        .btn-confirm-danger:hover {
          background: #dc2626;
        }
        .btn-confirm-success {
          background: #00aa69;
          color: white;
        }
        .btn-confirm-success:hover {
          background: #008854;
        }
        .textarea-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }
        .textarea-input:focus {
          border-color: #ef4444;
        }
        .textarea-input::placeholder {
          color: #64748b;
        }
        .tier-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .tier-item span {
          font-size: 13px;
          color: #e5e7eb;
        }
        .info-box {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        .info-box p {
          margin: 0;
          font-size: 13px;
          color: #93c5fd;
        }
        .info-box strong {
          color: white;
        }
        .rule-box {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }
        .rule-box h4 {
          font-size: 13px;
          color: #34d399;
          margin: 0 0 8px 0;
        }
        .rule-box p {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        .rule-box strong {
          color: #34d399;
        }
        .rule-example {
          margin-top: 12px;
          padding: 12px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 6px;
        }
        .rule-example p {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        .rule-example strong {
          color: #34d399;
        }
        .loan-restriction-box {
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }
        .loan-restriction-box h4 {
          font-size: 13px;
          color: #a78bfa;
          margin: 0 0 8px 0;
        }
        .loan-restriction-box p {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        .loan-restriction-box strong {
          color: #a78bfa;
        }
        .days-display {
          color: #60a5fa;
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          .tabs-container {
            flex-direction: column;
          }
          .tab-btn {
            flex: none;
            min-width: auto;
          }
          .settings-header {
            flex-direction: column;
            align-items: stretch;
          }
          .search-input {
            max-width: 100%;
          }
        }
      `}</style>

      <div className="settings-container">
        {/* Header */}
        <div className="settings-header">
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>
              ⚙️ Settings
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>
              Configure application settings and manage accounts
            </p>
          </div>
          <button
            className="btn-save"
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? "Saving..." : "💾 Save Settings"}
          </button>
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
            className={`tab-btn ${activeTab === "contribution" ? "active" : ""}`}
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
        </div>

        {/* General Settings */}
        {activeTab === "general" && (
          <div>
            <div className="settings-card">
              <div className="settings-card-title">🏢 General Settings</div>
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
                  <label className="form-label">Shop Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={generalSettings.shop_phone}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        shop_phone: e.target.value,
                      })
                    }
                  />
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

              {/* Eligibility Section */}
              <div
                style={{
                  marginBottom: "20px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    color: "#60a5fa",
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
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "4px",
                    }}
                  >
                    Members must be active for at least this many days before
                    they can request a loan.
                    <span
                      className="days-display"
                      style={{ marginLeft: "4px" }}
                    >
                      (
                      {getDaysToMonthsDisplay(loanSettings.min_membership_days)}
                      )
                    </span>
                  </p>
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
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Loans below this amount will be auto-approved
                    </p>
                  </div>
                )}
              </div>

              {/* Interest & Duration Section */}
              <div
                style={{
                  marginBottom: "20px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    color: "#fbbf24",
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
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Interest rate applied to each loan
                    </p>
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
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Maximum repayment period for loans
                    </p>
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
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Penalty percentage for late loan payments
                    </p>
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
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Days after due date before late payment penalty applies
                    </p>
                  </div>
                </div>
              </div>

              {/* Loan Restrictions Section - NEW */}
              <div
                style={{
                  marginBottom: "20px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    color: "#a78bfa",
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
                        style={{ borderColor: "rgba(139, 92, 246, 0.3)" }}
                      />
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        Maximum number of loans a member can take (active +
                        completed)
                      </p>
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
                        style={{ borderColor: "rgba(139, 92, 246, 0.3)" }}
                      />
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        Days a member must wait after completing a loan before
                        requesting another. Set to 0 for no cooldown.
                        <span
                          className="days-display"
                          style={{ marginLeft: "4px" }}
                        >
                          {loanSettings.loan_cooldown_days > 0
                            ? `(${getDaysToMonthsDisplay(loanSettings.loan_cooldown_days)})`
                            : "(No cooldown)"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      backgroundColor: "rgba(139, 92, 246, 0.08)",
                      borderRadius: "6px",
                    }}
                  >
                    <p
                      style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}
                    >
                      <strong style={{ color: "#a78bfa" }}>Example:</strong>
                      <br />
                      If a member has taken{" "}
                      <strong style={{ color: "white" }}>
                        {loanSettings.max_loans_per_member || 3}
                      </strong>{" "}
                      loans already, they cannot request another until they
                      complete one.
                      {loanSettings.loan_cooldown_days > 0 && (
                        <>
                          <br />
                          After completing a loan, they must wait{" "}
                          <strong style={{ color: "#60a5fa" }}>
                            {loanSettings.loan_cooldown_days} days
                          </strong>{" "}
                          before requesting a new one.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* 50% Rule Information Box */}
              <div className="rule-box">
                <h4>💰 Borrowing Rule: 50% of Savings</h4>
                <p>
                  Members can borrow <strong>50%</strong> of their total
                  savings. There is no fixed minimum or maximum amount - the
                  borrow limit is <strong>automatically calculated</strong>{" "}
                  based on each member's savings.
                </p>
                <div className="rule-example">
                  <p>
                    <strong style={{ color: "#34d399" }}>Example:</strong>
                    <br />
                    If a member has{" "}
                    <strong style={{ color: "white" }}>₦100,000</strong> in
                    savings, they can borrow up to{" "}
                    <strong style={{ color: "#34d399" }}>₦50,000</strong> (50%).
                  </p>
                  <p style={{ marginTop: "4px" }}>
                    <strong style={{ color: "#60a5fa" }}>Formula:</strong>
                    <br />
                    Savings × 50% = Maximum Borrow Amount
                  </p>
                </div>
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
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "4px",
                    }}
                  >
                    Maximum total contribution per member per day
                  </p>
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
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "4px",
                    }}
                  >
                    Minimum amount a member can deposit at once
                  </p>
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
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "4px",
                    }}
                  >
                    Maximum amount a member can deposit at once
                  </p>
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
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "4px",
                    }}
                  >
                    Default amount pre-filled when making contribution
                  </p>
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
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "4px",
                    }}
                  >
                    Maximum number of deposits a member can make per day
                  </p>
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
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        {commissionSettings.commission_type === "percentage"
                          ? "Percentage of transaction amount"
                          : "Fixed amount per transaction"}
                      </p>
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
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        Minimum commission to charge
                      </p>
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
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        Maximum commission to charge
                      </p>
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

                  <div className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={commissionSettings.enable_tiered_commission}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          enable_tiered_commission: e.target.checked,
                        })
                      }
                    />
                    <span className="form-checkbox-label">
                      Enable Tiered Commission
                    </span>
                  </div>

                  {commissionSettings.enable_tiered_commission && (
                    <div style={{ marginTop: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                          Commission Tiers
                        </span>
                        <button
                          className="btn-add-tier"
                          onClick={() => setShowAddTierModal(true)}
                        >
                          + Add Tier
                        </button>
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        {commissionSettings.tiers.map((tier, index) => (
                          <div key={index} className="tier-item">
                            <span>
                              {formatNaira(tier.min_amount)} -{" "}
                              {formatNaira(tier.max_amount)} → {tier.rate}%
                            </span>
                            <button
                              className="btn-remove-tier"
                              onClick={() => handleRemoveTier(index)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={commissionSettings.enable_referral_commission}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          enable_referral_commission: e.target.checked,
                        })
                      }
                    />
                    <span className="form-checkbox-label">
                      Enable Referral Commission
                    </span>
                  </div>

                  {commissionSettings.enable_referral_commission && (
                    <div className="form-group">
                      <label className="form-label">
                        Referral Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={commissionSettings.referral_commission_rate}
                        onChange={(e) =>
                          setCommissionSettings({
                            ...commissionSettings,
                            referral_commission_rate:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        Commission earned by referrer for each referred member's
                        transaction
                      </p>
                    </div>
                  )}

                  <div className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={commissionSettings.enable_loyalty_commission}
                      onChange={(e) =>
                        setCommissionSettings({
                          ...commissionSettings,
                          enable_loyalty_commission: e.target.checked,
                        })
                      }
                    />
                    <span className="form-checkbox-label">
                      Enable Loyalty Commission
                    </span>
                  </div>

                  {commissionSettings.enable_loyalty_commission && (
                    <div className="form-group">
                      <label className="form-label">
                        Loyalty Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={commissionSettings.loyalty_commission_rate}
                        onChange={(e) =>
                          setCommissionSettings({
                            ...commissionSettings,
                            loyalty_commission_rate:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        Additional commission for loyal members based on
                        transaction history
                      </p>
                    </div>
                  )}
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

            {/* Active Members List */}
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
                          m.name.toLowerCase().includes(term) ||
                          m.email.toLowerCase().includes(term) ||
                          (m.phone && m.phone.includes(term))
                        );
                      })
                      .map((member) => (
                        <tr key={member.id}>
                          <td style={{ fontWeight: "500" }}>{member.name}</td>
                          <td style={{ color: "#94a3b8" }}>{member.email}</td>
                          <td style={{ color: "#94a3b8" }}>
                            {member.phone || "N/A"}
                          </td>
                          <td style={{ color: "#34d399", fontWeight: "600" }}>
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
                      color: "#94a3b8",
                    }}
                  >
                    No active members found
                  </div>
                )}
              </div>
            </div>

            {/* Suspended Accounts List */}
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
                        <td style={{ color: "#94a3b8" }}>{account.email}</td>
                        <td style={{ color: "#f87171", fontSize: "12px" }}>
                          {account.reason}
                        </td>
                        <td style={{ color: "#94a3b8" }}>
                          {formatDate(account.suspended_date)}
                        </td>
                        <td
                          style={{
                            color: account.balance < 0 ? "#f87171" : "#34d399",
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
                      color: "#94a3b8",
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

      {/* Add Tier Modal */}
      {showAddTierModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">➕ Add Commission Tier</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddTierModal(false);
                  setNewTier({ min_amount: "", max_amount: "", rate: "" });
                }}
              >
                ✕
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Amount</label>
              <input
                type="number"
                className="form-input"
                value={newTier.min_amount}
                onChange={(e) =>
                  setNewTier({ ...newTier, min_amount: e.target.value })
                }
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Maximum Amount</label>
              <input
                type="number"
                className="form-input"
                value={newTier.max_amount}
                onChange={(e) =>
                  setNewTier({ ...newTier, max_amount: e.target.value })
                }
                placeholder="10000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Commission Rate (%)</label>
              <input
                type="number"
                className="form-input"
                value={newTier.rate}
                onChange={(e) =>
                  setNewTier({ ...newTier, rate: e.target.value })
                }
                placeholder="5"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowAddTierModal(false);
                  setNewTier({ min_amount: "", max_amount: "", rate: "" });
                }}
              >
                Cancel
              </button>
              <button
                className="btn-confirm btn-confirm-success"
                onClick={handleAddTier}
              >
                Add Tier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && selectedMember && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🚫 Suspend Account</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedMember(null);
                  setSuspensionReason("");
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                paddingBottom: "16px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                Member:{" "}
                <strong style={{ color: "white" }}>
                  {selectedMember.name}
                </strong>
              </div>
              <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                Email:{" "}
                <strong style={{ color: "white" }}>
                  {selectedMember.email}
                </strong>
              </div>
              <div style={{ fontSize: "14px", color: "#94a3b8" }}>
                Balance:{" "}
                <strong style={{ color: "#34d399" }}>
                  {formatNaira(selectedMember.balance)}
                </strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Suspension *</label>
              <textarea
                className="textarea-input"
                placeholder="Please provide a reason for suspending this account..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Suspension Duration</label>
              <select
                className="form-select"
                value={suspensionDuration}
                onChange={(e) => setSuspensionDuration(e.target.value)}
              >
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary (30 days)</option>
                <option value="temporary_60">Temporary (60 days)</option>
                <option value="temporary_90">Temporary (90 days)</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedMember(null);
                  setSuspensionReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn-confirm btn-confirm-danger"
                onClick={confirmSuspend}
              >
                Yes, Suspend Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Modal */}
      {showReactivateModal && selectedMember && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">✅ Reactivate Account</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowReactivateModal(false);
                  setSelectedMember(null);
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>🔄</div>
              <p style={{ fontSize: "16px", fontWeight: "500" }}>
                Reactivate {selectedMember.name}'s account?
              </p>
              <p
                style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}
              >
                This will restore access to the account.
              </p>
              <p style={{ fontSize: "14px", color: "#94a3b8" }}>
                Reason for suspension:{" "}
                <strong style={{ color: "#f87171" }}>
                  {selectedMember.reason}
                </strong>
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowReactivateModal(false);
                  setSelectedMember(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-confirm btn-confirm-success"
                onClick={confirmReactivate}
              >
                Yes, Reactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
