// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/api";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:8000";
const MEMBERS_PER_PAGE = 10;

const AdminDashboard = () => {
  const { activeBranch, activeBranchId } = useBranch();
  const { user } = useAuth();

  // Branch ID used for every API call in this dashboard
  const branchId = activeBranchId || user?.branch_id || null;

  const [fallbackBranch, setFallbackBranch] = useState(null);

  useEffect(() => {
    if (activeBranch?.name || !branchId) {
      setFallbackBranch(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/branches.php`);
        const data = await res.json();
        const found = (data.branches || []).find(
          (b) => String(b.id) === String(branchId),
        );
        if (!cancelled) setFallbackBranch(found || null);
      } catch {
        if (!cancelled) setFallbackBranch(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBranch?.name, branchId]);

  const branch = activeBranch?.name
    ? activeBranch
    : fallbackBranch ||
      (user?.branch_name
        ? { name: user.branch_name, code: user.branch_code }
        : null);

  // ============================================================
  // Branch savings method
  // ============================================================
  const [branchSavingsMethod, setBranchSavingsMethod] = useState("both");
  const [branchSettingsLoaded, setBranchSettingsLoaded] = useState(false);

  const fetchBranchSettings = useCallback(async () => {
    if (!branchId) {
      setBranchSavingsMethod("both");
      setBranchSettingsLoaded(true);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/settings.php?branch_id=${encodeURIComponent(branchId)}`,
      );
      const data = await res.json();
      const method = data?.data?.items?.savings_methods;
      setBranchSavingsMethod(
        method === "cash" || method === "item" || method === "both"
          ? method
          : "both",
      );
    } catch (err) {
      console.warn("[dashboard] branch settings fetch failed:", err);
      setBranchSavingsMethod("both");
    } finally {
      setBranchSettingsLoaded(true);
    }
  }, [branchId]);

  useEffect(() => {
    fetchBranchSettings();
  }, [fetchBranchSettings]);

  const allowCash =
    branchSavingsMethod === "both" || branchSavingsMethod === "cash";
  const allowItem =
    branchSavingsMethod === "both" || branchSavingsMethod === "item";

  const branchPlanLabel = !branchSettingsLoaded
    ? "…"
    : branchSavingsMethod === "cash"
      ? "💵 Cash Only"
      : branchSavingsMethod === "item"
        ? "📦 Item Only"
        : "💵 + 📦 Cash & Item";

  const [adminUsername, setAdminUsername] = useState("Admin");
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("members");

  const [membersPage, setMembersPage] = useState(1);

  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef(null);
  const voiceFeedbackTimerRef = useRef(null);

  const [fromAccountInput, setFromAccountInput] = useState("");
  const [toAccountInput, setToAccountInput] = useState("");
  const [fromMemberError, setFromMemberError] = useState("");
  const [toMemberError, setToMemberError] = useState("");

  const [transactionData, setTransactionData] = useState({
    memberId: "",
    type: "deposit",
    amount: "",
    description: "",
  });

  const [transferData, setTransferData] = useState({
    fromMemberId: "",
    toMemberId: "",
    amount: "",
    description: "",
  });

  const [expenseData, setExpenseData] = useState({
    title: "",
    category: "General",
    amount: "",
    description: "",
    requestedBy: "Admin",
    date: new Date().toISOString().split("T")[0],
  });

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    membershipType: "Standard",
    balance: "",
  });

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // ===== Reusable Member Avatar =====
  const MemberAvatar = ({ member, size = 48 }) => {
    const raw =
      member?.passport_photo ||
      member?.image ||
      member?.avatar ||
      member?.photo ||
      member?.profileImage ||
      member?.profile_image ||
      "";
    const imageUrl =
      raw && !raw.startsWith("http") && !raw.startsWith("data:")
        ? `${API_BASE_URL}/api/uploads/passports/${raw.replace(/^\/+/, "")}`
        : raw;

    const initial = (member?.name?.charAt(0) || "U").toUpperCase();

    const palette = [
      "rgba(16, 185, 129, 0.25)",
      "rgba(59, 130, 246, 0.25)",
      "rgba(168, 85, 247, 0.25)",
      "rgba(234, 179, 8, 0.25)",
      "rgba(239, 68, 68, 0.25)",
      "rgba(6, 182, 212, 0.25)",
    ];
    const textPalette = [
      "var(--credit)",
      "var(--info)",
      "var(--purple)",
      "var(--warning)",
      "var(--debit)",
      "#22d3ee",
    ];
    const idx = member?.id ? Math.abs(Number(member.id)) % palette.length : 0;

    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={member?.name || "Member"}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            if (e.currentTarget.nextSibling) {
              e.currentTarget.nextSibling.style.display = "flex";
            }
          }}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid var(--border)",
            flexShrink: 0,
            backgroundColor: "var(--bg-surface-2)",
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: palette[idx],
          color: textPalette[idx],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "700",
          fontSize: size * 0.42,
          flexShrink: 0,
          border: "2px solid var(--border)",
        }}
      >
        {initial}
      </div>
    );
  };

  const totalCharges = transactions.reduce((sum, t) => {
    const c = parseFloat(t.charge) || 0;
    return sum + c;
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => {
    if (e.status === "approved") return sum + (parseFloat(e.amount) || 0);
    return sum;
  }, 0);

  const memberByAccount = React.useMemo(() => {
    const map = {};
    members.forEach((m) => {
      if (m.accountNumber) map[String(m.accountNumber)] = m;
    });
    return map;
  }, [members]);

  const fromMemberLookup = transferData.fromMemberId
    ? members.find((m) => m.id === parseInt(transferData.fromMemberId))
    : null;
  const toMemberLookup = transferData.toMemberId
    ? members.find((m) => m.id === parseInt(transferData.toMemberId))
    : null;

  const testApiConnection = async () => {
    try {
      const response = await apiFetch("/api/admin.php");
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchAllData();
      await fetchBranchSettings();
      toast.success("Data refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // ✅ THIS IS THE KEY FIX: append ?branch_id= to every call
  // ============================================================
  const fetchAllData = async () => {
    if (!branchId) {
      // No branch yet — do NOT fire requests (backend would 400)
      return;
    }

    const q = `?branch_id=${encodeURIComponent(branchId)}`;

    try {
      const isConnected = await testApiConnection();
      if (!isConnected) {
        throw new Error(
          "Cannot connect to API server. Please check if the server is running on port 8000.",
        );
      }

      try {
        const response = await apiFetch(`/api/admin.php${q}`);
        const adminData = await response.json();
        if (adminData.username) setAdminUsername(adminData.username);
      } catch (profileError) {
        setAdminUsername("Admin");
      }

      try {
        const response = await apiFetch(`/api/members.php${q}`);
        const membersData = await response.json();
        if (membersData.members) setMembers(membersData.members);
      } catch (membersError) {
        setMembers([]);
      }

      try {
        const response = await apiFetch(`/api/transactions.php${q}`);
        const transactionsData = await response.json();
        if (transactionsData.transactions)
          setTransactions(transactionsData.transactions);
      } catch (transactionsError) {
        setTransactions([]);
      }

      try {
        const response = await apiFetch(`/api/loans.php${q}`);
        const loansData = await response.json();
        if (loansData.loans) {
          setLoans(loansData.loans);
          const pending = loansData.loans.filter(
            (loan) => loan.status === "pending",
          );
          setPendingLoans(pending);
        }
      } catch (loansError) {
        setLoans([]);
        setPendingLoans([]);
      }

      try {
        const response = await apiFetch(`/api/expenses.php${q}`);
        const expensesData = await response.json();
        if (expensesData.expenses) {
          setExpenses(expensesData.expenses);
          const pending = expensesData.expenses.filter(
            (expense) => expense.status === "pending",
          );
          setPendingExpenses(pending);
        }
      } catch (expensesError) {
        setExpenses([]);
        setPendingExpenses([]);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleApproveLoan = async (loanId) => {
    if (!window.confirm("Are you sure you want to approve this loan?")) return;
    try {
      const response = await apiFetch("/api/loans.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loanId,
          status: "approved",
          branch_id: branchId,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("✅ Loan approved successfully!");
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to approve loan");
      }
    } catch (error) {
      toast.error("Failed to approve loan. Please try again.");
    }
  };

  const handleRejectLoan = async (loanId) => {
    if (!window.confirm("Are you sure you want to reject this loan?")) return;
    try {
      const response = await apiFetch("/api/loans.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loanId,
          status: "rejected",
          branch_id: branchId,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("❌ Loan rejected!");
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to reject loan");
      }
    } catch (error) {
      toast.error("Failed to reject loan. Please try again.");
    }
  };

  const handleApproveTransaction = async (transactionId) => {
    if (!window.confirm("Approve this transaction?")) return;
    try {
      const response = await apiFetch(
        `/api/transactions.php/${transactionId}/approve?branch_id=${encodeURIComponent(branchId)}`,
        { method: "PUT", headers: { "Content-Type": "application/json" } },
      );
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(
          `✅ Approved! Charge: ${formatCurrency(data.charge || 0)}, Net: ${formatCurrency(data.net_amount || 0)}`,
        );
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to approve transaction");
      }
    } catch (error) {
      toast.error("Failed to approve transaction. Please try again.");
    }
  };

  const handleRejectTransaction = async (transactionId) => {
    if (!window.confirm("Reject this transaction?")) return;
    try {
      const response = await apiFetch(
        `/api/transactions.php/${transactionId}/reject?branch_id=${encodeURIComponent(branchId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: branchId,
            reason: "Rejected by admin",
          }),
        },
      );
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("❌ Transaction rejected!");
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to reject transaction");
      }
    } catch (error) {
      toast.error("Failed to reject transaction. Please try again.");
    }
  };

  const handleApproveExpense = async (expenseId) => {
    if (!window.confirm("Approve this expense?")) return;
    try {
      const response = await apiFetch(
        `/api/expenses.php/${expenseId}/approve?branch_id=${encodeURIComponent(branchId)}`,
        { method: "PUT", headers: { "Content-Type": "application/json" } },
      );
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("✅ Expense approved successfully!");
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to approve expense");
      }
    } catch (error) {
      toast.error("Failed to approve expense. Please try again.");
    }
  };

  const handleRejectExpense = async (expenseId) => {
    if (!window.confirm("Reject this expense?")) return;
    try {
      const response = await apiFetch(
        `/api/expenses.php/${expenseId}/reject?branch_id=${encodeURIComponent(branchId)}`,
        { method: "PUT", headers: { "Content-Type": "application/json" } },
      );
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("❌ Expense rejected!");
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to reject expense");
      }
    } catch (error) {
      toast.error("Failed to reject expense. Please try again.");
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("⚠️ Delete this expense record permanently?")) return;
    try {
      const response = await apiFetch(
        `/api/expenses.php/${expenseId}?branch_id=${encodeURIComponent(branchId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (response.ok) {
        toast.success("✅ Expense deleted!");
        await fetchAllData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete expense");
      }
    } catch (error) {
      toast.error("Failed to delete expense. Please try again.");
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    const amount = parseFloat(expenseData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!expenseData.title.trim()) {
      toast.error("Please enter an expense title");
      return;
    }

    const expense = {
      branch_id: branchId,
      title: expenseData.title,
      category: expenseData.category,
      amount: amount,
      description: expenseData.description || expenseData.title,
      requested_by: expenseData.requestedBy,
      date: expenseData.date,
      status: "pending",
    };

    try {
      const response = await apiFetch("/api/expenses.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });
      const data = await response.json();
      if (response.ok) {
        setShowExpenseModal(false);
        setExpenseData({
          title: "",
          category: "General",
          amount: "",
          description: "",
          requestedBy: "Admin",
          date: new Date().toISOString().split("T")[0],
        });
        toast.success("✅ Expense request submitted!");
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to create expense");
      }
    } catch (error) {
      toast.error("Failed to create expense. Please try again.");
    }
  };

  // ============================================================
  // Initial load — wait for branchId before firing
  // ============================================================
  useEffect(() => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchAllData();
      } catch (error) {
        setError(
          error.message || "Failed to load data. Please refresh the page.",
        );
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
    } else {
      const allIds = paginatedMembers.map((m) => m.id);
      setSelectedMembers(allIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectMember = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((mId) => mId !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedMembers.length === 0) {
      alert("Please select at least one member to suspend");
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to suspend ${selectedMembers.length} member(s)?`,
      )
    )
      return;

    try {
      for (const id of selectedMembers) {
        const member = members.find((m) => m.id === id);
        if (member) {
          await apiFetch(`/api/members.php/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...member,
              branch_id: branchId,
              status: "Suspended",
              suspension_reason: "Bulk suspension by admin",
              suspended_date: new Date().toISOString().split("T")[0],
              suspended_by: "Admin",
            }),
          });
        }
      }
      alert(`✅ ${selectedMembers.length} member(s) suspended successfully!`);
      setSelectedMembers([]);
      setSelectAll(false);
      refreshData();
    } catch (error) {
      alert("Failed to suspend members. Please try again.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) {
      alert("Please select at least one member to delete");
      return;
    }
    if (
      !window.confirm(
        `⚠️ Are you sure you want to permanently delete ${selectedMembers.length} member(s)? This action cannot be undone!`,
      )
    )
      return;

    try {
      for (const id of selectedMembers) {
        await apiFetch(`/api/members.php/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
      }
      alert(`✅ ${selectedMembers.length} member(s) deleted successfully!`);
      setSelectedMembers([]);
      setSelectAll(false);
      refreshData();
    } catch (error) {
      alert("Failed to delete members. Please try again.");
    }
  };

  const generateAccountNumber = () => {
    const prefix = "10";
    const randomDigits = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
    return prefix + randomDigits;
  };

  const stats = [
    {
      icon: "👥",
      label: "Total Members",
      value: members.length.toString(),
      color: "emerald",
    },
    {
      icon: "💰",
      label: "Total Balance",
      value: formatCurrency(
        members.reduce((sum, m) => sum + (m.balance || 0), 0),
      ),
      color: "gold",
    },
    {
      icon: "💸",
      label: "Total Charges",
      value: formatCurrency(totalCharges),
      color: "cyan",
    },
    {
      icon: "⏳",
      label: "Pending Approvals",
      value: (pendingLoans.length + pendingExpenses.length).toString(),
      color: "blue",
    },
    {
      icon: "🧾",
      label: "Total Expenses",
      value: formatCurrency(totalExpenses),
      color: "purple",
    },
  ];

  const colorMap = {
    emerald: { bg: "transparent", color: "var(--credit)" },
    gold: { bg: "transparent", color: "var(--warning)" },
    cyan: { bg: "transparent", color: "#22d3ee" },
    blue: { bg: "transparent", color: "var(--info)" },
    purple: { bg: "transparent", color: "var(--purple)" },
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.accountNumber?.includes(searchTerm) ||
      member.phone?.includes(searchTerm),
  );

  const totalMemberPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE),
  );

  const currentMembersPage = Math.min(membersPage, totalMemberPages);

  const paginatedMembers = filteredMembers.slice(
    (currentMembersPage - 1) * MEMBERS_PER_PAGE,
    currentMembersPage * MEMBERS_PER_PAGE,
  );

  useEffect(() => {
    setMembersPage(1);
  }, [searchTerm]);

  const goToPage = (p) => {
    const clamped = Math.max(1, Math.min(p, totalMemberPages));
    setMembersPage(clamped);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const getPageNumbers = () => {
    const total = totalMemberPages;
    const current = currentMembersPage;
    const pages = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (current > 3) pages.push("…");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("…");
    pages.push(total);
    return pages;
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    const accountNumber = generateAccountNumber();

    const existingAccount = members.find(
      (m) => m.accountNumber === accountNumber,
    );
    if (existingAccount) {
      alert("Account number conflict. Please try again.");
      return;
    }

    const memberData = {
      branch_id: branchId,
      accountNumber: accountNumber,
      name: newMember.name,
      email: newMember.email,
      phone: newMember.phone,
      membershipType: newMember.membershipType,
      joinDate: new Date().toISOString().split("T")[0],
      status: "Active",
      balance: newMember.balance ? parseFloat(newMember.balance) : 0,
    };

    try {
      const response = await apiFetch("/api/members.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberData),
      });

      const data = await response.json();
      if (response.ok) {
        setMembers([...members, data.member]);
        setShowCreateModal(false);
        setNewMember({
          name: "",
          email: "",
          phone: "",
          membershipType: "Standard",
          balance: "",
        });
        alert(
          `✅ Member created successfully!\nAccount Number: ${accountNumber}\nBranch: ${branch?.name || "N/A"}`,
        );
      } else {
        alert(data.message || "Failed to create member");
      }
    } catch (error) {
      alert("Failed to create member. Please try again.");
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();

    if (!allowCash) {
      toast.error("This branch does not allow cash transactions");
      return;
    }

    if (!transactionData.memberId) {
      toast.error("Please select a member");
      return;
    }
    const amount = parseFloat(transactionData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const member = members.find(
      (m) => m.id === parseInt(transactionData.memberId),
    );
    if (!member) {
      toast.error("Member not found!");
      return;
    }
    if (!member.accountNumber || member.accountNumber === "") {
      toast.error(
        `⚠️ Member "${member.name}" does not have an account number.`,
      );
      return;
    }
    if (transactionData.type === "withdrawal" && amount > member.balance) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(member.balance)}`,
      );
      return;
    }

    const transaction = {
      branch_id: branchId,
      memberId: member.id,
      memberName: member.name,
      accountNumber: member.accountNumber,
      type: transactionData.type,
      amount: amount,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      description:
        transactionData.description || `${transactionData.type} request`,
    };

    try {
      const response = await apiFetch("/api/transactions.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transaction),
      });
      const data = await response.json();
      if (response.ok) {
        setTransactions([
          data.transaction || { ...transaction, id: Date.now() },
          ...transactions,
        ]);
        setShowTransactionModal(false);
        setTransactionData({
          memberId: "",
          type: "deposit",
          amount: "",
          description: "",
        });
        toast.success(
          `✅ ${transactionData.type} request submitted! Go to Transactions tab to approve.`,
        );
        refreshData();
      } else {
        toast.error(
          data.error || data.message || "Failed to submit transaction",
        );
      }
    } catch (error) {
      toast.error("Failed to submit transaction. Please try again.");
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!allowCash) {
      toast.error("This branch does not allow cash transfers");
      return;
    }
    if (!transferData.fromMemberId || !transferData.toMemberId) {
      toast.error("Please select both members");
      return;
    }
    const amount = parseFloat(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const fromMember = members.find(
      (m) => m.id === parseInt(transferData.fromMemberId),
    );
    const toMember = members.find(
      (m) => m.id === parseInt(transferData.toMemberId),
    );
    if (!fromMember || !toMember) {
      toast.error("Please select valid members!");
      return;
    }
    if (fromMember.id === toMember.id) {
      toast.error("Cannot transfer to the same member!");
      return;
    }
    if (amount > fromMember.balance) {
      toast.error(
        `Insufficient balance! Available: ${formatCurrency(fromMember.balance)}`,
      );
      return;
    }

    const transfer = {
      branch_id: branchId,
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      fromMemberName: fromMember.name,
      toMemberName: toMember.name,
      fromAccountNumber: fromMember.accountNumber,
      toAccountNumber: toMember.accountNumber,
      amount: amount,
      date: new Date().toISOString().split("T")[0],
      description: transferData.description || `Transfer to ${toMember.name}`,
    };

    try {
      const response = await apiFetch("/api/transfers.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(transfer),
      });
      const data = await response.json();
      if (response.ok) {
        const newTransaction = {
          id: data.transaction?.id || Date.now(),
          memberName: fromMember.name,
          accountNumber: fromMember.accountNumber,
          type: "transfer",
          amount: amount,
          status: "pending",
          date: new Date().toISOString().split("T")[0],
          description: `Transfer to ${toMember.name}`,
          fromMemberId: fromMember.id,
          toMemberId: toMember.id,
        };
        setTransactions([newTransaction, ...transactions]);
        setShowTransferModal(false);
        setFromAccountInput("");
        setToAccountInput("");
        setFromMemberError("");
        setToMemberError("");
        setTransferData({
          fromMemberId: "",
          toMemberId: "",
          amount: "",
          description: "",
        });
        toast.success(`✅ Transfer request submitted!`);
        refreshData();
      } else {
        toast.error(data.error || data.message || "Failed to submit transfer");
      }
    } catch (error) {
      toast.error("Failed to submit transfer. Please try again.");
    }
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setFromAccountInput("");
    setToAccountInput("");
    setFromMemberError("");
    setToMemberError("");
    setTransferData({
      fromMemberId: "",
      toMemberId: "",
      amount: "",
      description: "",
    });
  };

  const handleEditMember = (member) => {
    setSelectedMember({ ...member });
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    try {
      const response = await apiFetch(`/api/members.php/${selectedMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selectedMember, branch_id: branchId }),
      });
      const data = await response.json();
      if (response.ok) {
        const updatedMembers = members.map((member) =>
          member.id === selectedMember.id
            ? data.member || selectedMember
            : member,
        );
        setMembers(updatedMembers);
        setShowEditModal(false);
        setSelectedMember(null);
        toast.success("✅ Member updated successfully!");
        refreshData();
      } else {
        toast.error(data.message || "Failed to update member");
      }
    } catch (error) {
      toast.error("Failed to update member. Please try again.");
    }
  };

  const handleDeleteMember = async (id) => {
    if (window.confirm("⚠️ Are you sure you want to delete this member?")) {
      try {
        const response = await apiFetch(`/api/members.php/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          setMembers(members.filter((member) => member.id !== id));
          toast.success("Member deleted successfully!");
          refreshData();
        } else {
          const data = await response.json();
          toast.error(data.message || "Failed to delete member");
        }
      } catch (error) {
        toast.error("Failed to delete member. Please try again.");
      }
    }
  };

  const handleViewMember = (member) => {
    setSelectedMember(member);
    setShowViewModal(true);
  };

  // ============================================================
  // Voice recognition (unchanged)
  // ============================================================
  const showVoiceFeedback = useCallback((msg) => {
    setVoiceFeedback(msg);
    if (voiceFeedbackTimerRef.current) {
      clearTimeout(voiceFeedbackTimerRef.current);
    }
    voiceFeedbackTimerRef.current = setTimeout(() => {
      setVoiceFeedback("");
    }, 4000);
  }, []);

  const speak = useCallback((text) => {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // silent
    }
  }, []);

  const switchTab = useCallback(
    (tab) => {
      setActiveTab(tab);
      const tabNames = {
        members: "Members",
        pending_loans: "Pending Loans",
        all_loans: "All Loans",
        transactions: "Transactions",
        expenses: "Expenses",
      };
      showVoiceFeedback(`📂 Opened ${tabNames[tab]}`);
      speak(`Opening ${tabNames[tab]}`);
    },
    [showVoiceFeedback, speak],
  );

  const processVoiceCommand = useCallback(
    (rawText) => {
      const text = rawText.toLowerCase().trim();
      setVoiceTranscript(rawText);

      if (text.includes("pending loan")) {
        switchTab("pending_loans");
        return;
      }
      if (text.includes("all loan") || text === "loans") {
        switchTab("all_loans");
        return;
      }
      if (text.includes("transaction") && !text.includes("new")) {
        switchTab("transactions");
        return;
      }
      if (text.includes("expense") && !text.includes("new")) {
        switchTab("expenses");
        return;
      }
      if (text.includes("member") && !text.includes("new")) {
        switchTab("members");
        return;
      }

      if (text.includes("refresh") || text.includes("reload")) {
        showVoiceFeedback("🔄 Refreshing data...");
        speak("Refreshing data");
        refreshData();
        return;
      }

      if (
        text.includes("new transaction") ||
        text.includes("add transaction") ||
        text.includes("create transaction")
      ) {
        if (!allowCash) {
          showVoiceFeedback("🚫 This branch is item-only");
          speak("This branch does not allow cash transactions");
          return;
        }
        setShowTransactionModal(true);
        showVoiceFeedback("💳 Opening transaction form");
        speak("Opening new transaction");
        return;
      }

      if (
        text.includes("new transfer") ||
        text.includes("make transfer") ||
        text.includes("transfer funds")
      ) {
        if (!allowCash) {
          showVoiceFeedback("🚫 This branch is item-only");
          speak("This branch does not allow cash transfers");
          return;
        }
        setShowTransferModal(true);
        showVoiceFeedback("🔄 Opening transfer form");
        speak("Opening transfer form");
        return;
      }

      if (
        text.includes("new expense") ||
        text.includes("add expense") ||
        text.includes("create expense")
      ) {
        setShowExpenseModal(true);
        showVoiceFeedback("🧾 Opening expense form");
        speak("Opening new expense");
        return;
      }

      if (text === "close" || text === "cancel") {
        setShowTransactionModal(false);
        setShowTransferModal(false);
        setShowExpenseModal(false);
        setShowCreateModal(false);
        setShowEditModal(false);
        setShowViewModal(false);
        showVoiceFeedback("❌ Closed modal");
        speak("Closed");
        return;
      }

      if (
        text.includes("how many members") ||
        text.includes("total members") ||
        text.includes("number of members")
      ) {
        const msg = `There are ${members.length} members`;
        showVoiceFeedback(`👥 ${msg}`);
        speak(msg);
        return;
      }

      if (text.includes("total balance") || text.includes("how much balance")) {
        const total = members.reduce((s, m) => s + (m.balance || 0), 0);
        const msg = `Total balance is ${formatCurrency(total)}`;
        showVoiceFeedback(`💰 ${msg}`);
        speak(msg);
        return;
      }

      if (text.includes("pending") && text.includes("count")) {
        const msg = `There are ${pendingLoans.length} pending loans and ${pendingExpenses.length} pending expenses`;
        showVoiceFeedback(`⏳ ${msg}`);
        speak(msg);
        return;
      }

      if (
        text.includes("branch plan") ||
        text.includes("savings method") ||
        text.includes("savings plan") ||
        text.includes("what plan") ||
        (text.includes("branch") && text.includes("method"))
      ) {
        const spoken =
          branchSavingsMethod === "cash"
            ? "This branch is cash only"
            : branchSavingsMethod === "item"
              ? "This branch is item only"
              : "This branch allows both cash and item savings";
        showVoiceFeedback(`🏢 ${spoken}`);
        speak(spoken);
        return;
      }

      if (text.includes("help") || text.includes("what can i say")) {
        const helpMsg =
          "You can say: open members, open transactions, open expenses, new transaction, new transfer, new expense, refresh data, search for a name, how many members, total balance, branch plan, or close.";
        showVoiceFeedback(`ℹ️ ${helpMsg}`);
        speak(helpMsg);
        return;
      }

      const searchMatch = text.match(
        /^(search|find|look for|lookup)( for)?\s+(.+)$/,
      );
      if (searchMatch) {
        const query = searchMatch[3].trim();
        setSearchTerm(query);
        setActiveTab("members");
        showVoiceFeedback(`🔍 Searching for "${query}"`);
        speak(`Searching for ${query}`);
        return;
      }

      if (text.includes("clear search") || text === "clear") {
        setSearchTerm("");
        showVoiceFeedback("🧹 Search cleared");
        speak("Search cleared");
        return;
      }

      if (text.split(/\s+/).length <= 4) {
        setSearchTerm(text);
        setActiveTab("members");
        showVoiceFeedback(`🔍 Searching for "${text}"`);
        speak(`Searching for ${text}`);
        return;
      }

      showVoiceFeedback(`🤔 Didn't understand: "${rawText}"`);
      speak("Sorry, I did not understand that command");
    },
    [
      switchTab,
      refreshData,
      showVoiceFeedback,
      speak,
      members,
      pendingLoans.length,
      pendingExpenses.length,
      allowCash,
      branchSavingsMethod,
    ],
  );

  const processCommandRef = useRef(processVoiceCommand);
  useEffect(() => {
    processCommandRef.current = processVoiceCommand;
  }, [processVoiceCommand]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback("🎤 Listening...");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      processCommandRef.current(transcript);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        showVoiceFeedback("🚫 Microphone permission denied");
        toast.error("Microphone access denied");
      } else if (event.error === "no-speech") {
        showVoiceFeedback("🔇 No speech detected");
      } else if (event.error !== "aborted") {
        showVoiceFeedback(`⚠️ Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (voiceFeedbackTimerRef.current) {
        clearTimeout(voiceFeedbackTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListening = useCallback(() => {
    if (!voiceSupported) {
      toast.error("Voice recognition not supported in this browser");
      return;
    }
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      setVoiceFeedback("");
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // already started
      }
    }
  }, [isListening, voiceSupported]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  if (error) {
    return (
      <div
        style={{
          padding: "24px",
          backgroundColor: "transparent",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "transparent",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "500px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2
            style={{
              color: "var(--debit)",
              fontSize: "20px",
              marginBottom: "12px",
            }}
          >
            Connection Error
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "transparent",
              color: "var(--info)",
              padding: "10px 24px",
              border: "1px solid var(--info)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          backgroundColor: "transparent",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "var(--text)", fontSize: "20px" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "transparent",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseMic {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
        }
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .modal-overlay {
          position: fixed; inset: 0;
          background-color: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
        }
        .modal-content {
          background-color: var(--bg-surface); border-radius: 16px;
          padding: 32px; max-width: 560px; width: 100%;
          max-height: 90vh; overflow-y: auto;
          border: 1px solid var(--border);
          animation: fadeIn 0.3s ease;
        }
        .modal-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 16px;
        }
        .modal-title { font-size: 18px; font-weight: bold; color: var(--text); }
        .modal-close {
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; padding: 4px; font-size: 24px;
        }
        .modal-close:hover { color: var(--text); }
        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block; font-size: 14px; font-weight: 500;
          color: var(--text); margin-bottom: 6px;
        }
        .form-input {
          width: 100%; padding: 10px 0; border-radius: 0;
          border: none;
          border-bottom: 1px solid var(--border);
          background-color: transparent;
          color: var(--text); font-size: 14px; outline: none;
          box-sizing: border-box;
        }
        .form-input:focus { border-bottom-color: var(--accent); }
        .form-input::placeholder { color: var(--text-dim); }
        .form-select {
          width: 100%; padding: 10px 0; border-radius: 0;
          border: none;
          border-bottom: 1px solid var(--border);
          background-color: transparent;
          color: var(--text); font-size: 14px; outline: none; cursor: pointer;
        }
        .form-select:focus { border-bottom-color: var(--accent); }
        .form-select option { background-color: var(--bg-surface); color: var(--text); }
        .btn-submit {
          width: 100%; padding: 12px; border-radius: 8px; border: none;
          background: linear-gradient(to right, #059669, #0d9488);
          color: white; font-size: 16px; font-weight: 600;
          cursor: pointer;
        }
        .btn-cancel {
          width: 100%; padding: 12px; border-radius: 8px;
          border: 1px solid var(--border);
          background: transparent; color: var(--text); font-size: 16px;
          cursor: pointer;
        }
        .btn-cancel:hover { background-color: var(--bg-surface-2); }
        .modal-buttons { display: flex; gap: 12px; margin-top: 16px; }
        .modal-buttons button { flex: 1; }
        .table-container {
          overflow-x: auto; max-height: 550px; overflow-y: auto;
        }
        table { width: 100%; border-collapse: collapse; background: transparent; }
        th {
          padding: 14px 16px; text-align: left; font-size: 12px;
          font-weight: 600; color: var(--text-muted);
          background-color: transparent;
          position: sticky; top: 0; z-index: 10;
          white-space: nowrap;
          border-bottom: 1px solid var(--border);
        }
        td {
          padding: 14px 16px;
          border: none;
          border-top: 1px solid var(--border);
          background: transparent;
        }
        tr { background: transparent; }

        .stat-card {
          background-color: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          border-radius: 0;
          padding: 8px 0 12px 0;
          transition: all 0.3s;
          min-width: 0;
          overflow: hidden;
        }
        .stat-icon-wrap {
          padding: 0;
          border-radius: 12px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
        }
        .stat-label {
          color: var(--text-muted);
          font-size: 13px;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: var(--text);
          margin: 0;
          white-space: nowrap;
          line-height: 1.2;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }
        .stat-value.long   { font-size: 17px; }
        .stat-value.xlong  { font-size: 15px; }
        .stat-value.xxlong { font-size: 13px; }

        .badge {
          padding: 4px 12px; font-size: 12px; border-radius: 20px;
          font-weight: 500; display: inline-block;
        }
        .badge-active { background-color: rgba(16, 185, 129, 0.2); color: var(--credit); }
        .badge-inactive { background-color: rgba(239, 68, 68, 0.2); color: var(--debit); }
        .badge-suspended { background-color: rgba(234, 179, 8, 0.2); color: var(--warning); }
        .badge-standard { background-color: rgba(59, 130, 246, 0.2); color: var(--info); }
        .badge-premium { background-color: rgba(234, 179, 8, 0.2); color: var(--warning); }
        .badge-vip { background-color: rgba(168, 85, 247, 0.2); color: var(--purple); }
        .badge-pending { background-color: rgba(234, 179, 8, 0.2); color: var(--warning); }
        .badge-approved { background-color: rgba(16, 185, 129, 0.2); color: var(--credit); }
        .badge-rejected { background-color: rgba(239, 68, 68, 0.2); color: var(--debit); }
        .loan-actions { display: flex; gap: 8px; }
        .btn-approve {
          background-color: var(--accent); color: white;
          padding: 6px 16px; border: none; border-radius: 6px;
          cursor: pointer; font-size: 12px; font-weight: 500;
        }
        .btn-approve:hover { background-color: #059669; }
        .btn-reject {
          background-color: var(--debit); color: white;
          padding: 6px 16px; border: none; border-radius: 6px;
          cursor: pointer; font-size: 12px; font-weight: 500;
        }
        .btn-reject:hover { background-color: #dc2626; }

        .ad-mic-btn {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          border: 1px solid rgba(16,185,129,0.3);
          background: transparent;
          color: var(--credit);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ad-mic-btn:hover { background: rgba(16,185,129,0.1); }
        .ad-mic-btn.listening {
          border-color: var(--debit);
          background: rgba(239,68,68,0.15);
          color: var(--debit);
          animation: pulseMic 1.2s infinite;
        }
        .ad-mic-btn.unsupported {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: var(--border);
          background: transparent;
          color: var(--text-muted);
        }
        .ad-mic-btn.unsupported:hover { background: transparent; }

        .voice-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          max-width: 360px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 18px;
          color: var(--text);
          font-size: 14px;
          z-index: 1100;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: fadeIn 0.25s ease;
          backdrop-filter: blur(8px);
        }
        .voice-toast .transcript {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 6px;
          font-style: italic;
          border-top: 1px solid var(--border);
          padding-top: 6px;
        }
        .sound-wave {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          height: 16px;
          margin-left: 6px;
        }
        .sound-wave span {
          display: inline-block;
          width: 3px;
          height: 100%;
          background-color: var(--debit);
          border-radius: 2px;
          animation: soundWave 0.8s ease-in-out infinite;
        }
        .sound-wave span:nth-child(1) { animation-delay: 0s; }
        .sound-wave span:nth-child(2) { animation-delay: 0.15s; }
        .sound-wave span:nth-child(3) { animation-delay: 0.3s; }
        .sound-wave span:nth-child(4) { animation-delay: 0.45s; }
        .sound-wave span:nth-child(5) { animation-delay: 0.6s; }

        .pagination-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .pagination-info {
          color: var(--text-muted);
          font-size: 13px;
        }
        .pagination-controls {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .page-btn {
          min-width: 36px;
          height: 36px;
          padding: 0 12px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .page-btn:hover:not(:disabled):not(.active) {
          background: var(--bg-surface-2);
        }
        .page-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
          cursor: default;
        }
        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .page-btn.nav-btn {
          padding: 0 16px;
          font-weight: 700;
        }
        .page-ellipsis {
          padding: 0 6px;
          color: var(--text-muted);
          user-select: none;
        }

        .detail-section {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          background: transparent;
        }
        .detail-section-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-muted);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .detail-item {
          min-width: 0;
        }
        .detail-label {
          color: var(--text-muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .detail-value {
          color: var(--text);
          font-size: 14px;
          word-break: break-all;
        }
        .detail-value.mono {
          font-family: monospace;
        }
        .detail-highlight {
          color: var(--credit);
          font-size: 22px;
          font-weight: 700;
          margin-top: 4px;
        }
        .detail-highlight.debit {
          color: var(--debit);
        }
        .detail-highlight.warning {
          color: var(--warning);
        }

        .mini-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .mini-table th {
          padding: 8px 10px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
          background: transparent;
          position: static;
        }
        .mini-table td {
          padding: 8px 10px;
          border-top: 1px solid var(--border);
          color: var(--text);
          background: transparent;
        }
        .mini-table .amount-credit { color: var(--credit); font-weight: 600; }
        .mini-table .amount-debit  { color: var(--debit); font-weight: 600; }
        .mini-table .amount-warning { color: var(--warning); font-weight: 600; }
        .mini-table .status-badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          display: inline-block;
          font-weight: 600;
        }
        .mini-table .status-approved { background: rgba(16,185,129,0.2); color: var(--credit); }
        .mini-table .status-pending  { background: rgba(234,179,8,0.2);  color: var(--warning); }
        .mini-table .status-rejected { background: rgba(239,68,68,0.2);  color: var(--debit); }
        .mini-table .status-active   { background: rgba(16,185,129,0.2); color: var(--credit); }
        .mini-table .status-default  { background: rgba(148,163,184,0.2); color: var(--text-muted); }

        .empty-mini {
          text-align: center;
          color: var(--text-dim);
          padding: 20px 0;
          font-size: 13px;
        }
        .summary-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .summary-pill {
          flex: 1;
          min-width: 120px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        .summary-pill .pill-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }
        .summary-pill .pill-value {
          font-size: 16px;
          font-weight: 700;
          margin-top: 4px;
        }

        .savings-plan-card {
          border: 1px solid rgba(16, 185, 129, 0.35);
          border-radius: 14px;
          padding: 20px;
          background: rgba(16, 185, 129, 0.05);
          margin-bottom: 20px;
        }
        .savings-plan-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .savings-plan-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .savings-plan-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          background: rgba(16, 185, 129, 0.2);
          color: var(--credit);
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .savings-plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 14px;
        }
        .savings-plan-item {
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
        }
        .savings-plan-item .sp-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--text-muted);
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .savings-plan-item .sp-value {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }
        .savings-plan-item .sp-value.credit { color: var(--credit); }
        .savings-plan-item .sp-value.info   { color: var(--info); }
        .savings-plan-item .sp-value.warning { color: var(--warning); }
        .savings-plan-item .sp-value.purple  { color: var(--purple); }
        .savings-plan-progress-wrap {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px dashed var(--border);
        }
        .savings-plan-progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .savings-plan-progress-bar {
          height: 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .savings-plan-progress-fill {
          height: 100%;
          background: linear-gradient(to right, #059669, #22d3ee);
          border-radius: 6px;
          transition: width 0.6s ease;
        }

        .branch-plan-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          white-space: nowrap;
          border: 1px solid var(--border);
        }
        .branch-plan-pill.both {
          background: rgba(59, 130, 246, 0.14);
          color: var(--info);
          border-color: rgba(59, 130, 246, 0.4);
        }
        .branch-plan-pill.cash {
          background: rgba(16, 185, 129, 0.14);
          color: var(--credit);
          border-color: rgba(16, 185, 129, 0.4);
        }
        .branch-plan-pill.item {
          background: rgba(168, 85, 247, 0.14);
          color: var(--purple);
          border-color: rgba(168, 85, 247, 0.4);
        }

        .branch-plan-warning {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: rgba(234, 179, 8, 0.08);
          border: 1px solid rgba(234, 179, 8, 0.35);
          color: var(--text);
          font-size: 13px;
          line-height: 1.5;
        }
      `}</style>

      {/* BRANCH BANNER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "12px 16px",
          marginBottom: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          background: "rgba(16, 185, 129, 0.06)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>🏢</span>
          <div>
            <div
              style={{
                color: "var(--text)",
                fontSize: "15px",
                fontWeight: "700",
              }}
            >
              {branch?.name || "Branch"}
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "12px",
                marginTop: "2px",
              }}
            >
              {branch?.code || "—"} · Members in this branch:{" "}
              <strong style={{ color: "var(--credit)" }}>
                {members.length}
              </strong>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            className={`branch-plan-pill ${branchSavingsMethod}`}
            title="Savings method configured for this branch"
          >
            {branchSavingsMethod === "cash"
              ? "💵 Cash Only"
              : branchSavingsMethod === "item"
                ? "📦 Item Only"
                : "💵 + 📦 Cash & Item"}
          </span>

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
            ● active group
          </span>
        </div>
      </div>

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
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "var(--text)",
              margin: 0,
            }}
          >
            Admin Dashboard
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              margin: "4px 0 0 0",
            }}
          >
            Welcome back, {adminUsername} 👋
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={refreshData}
            style={{
              backgroundColor: "transparent",
              color: "var(--info)",
              padding: "10px 20px",
              border: "1px solid var(--info)",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🔄 Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              if (!voiceSupported) {
                toast.error(
                  "🎙️ Voice not supported. Use Chrome/Edge/Safari on localhost or HTTPS.",
                );
                return;
              }
              toggleListening();
            }}
            className={`ad-mic-btn ${isListening ? "listening" : ""} ${
              !voiceSupported ? "unsupported" : ""
            }`}
            title={
              !voiceSupported
                ? "Voice not supported in this browser/context"
                : isListening
                  ? "Stop listening (Ctrl+M)"
                  : "Speak a command (Ctrl+M)"
            }
          >
            {isListening ? "🔴 Stop" : voiceSupported ? "🎙️ Voice" : "🎙️ N/A"}
          </button>

          <button
            onClick={() => {
              if (!allowCash) {
                toast.error(
                  "This branch is item-only — cash transactions are disabled.",
                );
                return;
              }
              setShowTransactionModal(true);
            }}
            disabled={!allowCash}
            style={{
              backgroundColor: "transparent",
              color: allowCash ? "var(--info)" : "var(--text-dim)",
              padding: "10px 20px",
              border: `1px solid ${allowCash ? "var(--info)" : "var(--border)"}`,
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: allowCash ? "pointer" : "not-allowed",
              opacity: allowCash ? 1 : 0.5,
            }}
            title={!allowCash ? "Branch is item-only" : "New cash transaction"}
          >
            💳 New Transaction
          </button>
          <button
            onClick={() => {
              if (!allowCash) {
                toast.error(
                  "This branch is item-only — transfers are disabled.",
                );
                return;
              }
              setShowTransferModal(true);
            }}
            disabled={!allowCash}
            style={{
              backgroundColor: "transparent",
              color: allowCash ? "var(--purple)" : "var(--text-dim)",
              padding: "10px 20px",
              border: `1px solid ${allowCash ? "var(--purple)" : "var(--border)"}`,
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: allowCash ? "pointer" : "not-allowed",
              opacity: allowCash ? 1 : 0.5,
            }}
            title={!allowCash ? "Branch is item-only" : "Transfer funds"}
          >
            🔄 Transfer
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            style={{
              backgroundColor: "transparent",
              color: "var(--debit)",
              padding: "10px 20px",
              border: "1px solid var(--debit)",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🧾 New Expense
          </button>
        </div>
      </div>

      {/* Branch plan warning */}
      {branchSettingsLoaded && branchSavingsMethod !== "both" && (
        <div className="branch-plan-warning">
          <span style={{ fontSize: 20 }}>
            {branchSavingsMethod === "cash" ? "💵" : "📦"}
          </span>
          <div>
            <strong>This branch is set to {branchPlanLabel}.</strong>{" "}
            {branchSavingsMethod === "cash"
              ? "Item savings features are hidden for members in this branch. Cash deposits, withdrawals, and transfers remain available."
              : "Cash deposits, withdrawals, and transfers are disabled. Members save only via item-based plans."}{" "}
            <span style={{ color: "var(--text-muted)" }}>
              Change this in Settings → Items (or edit the branch).
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {stats.map((stat, index) => {
          const valueStr = String(stat.value || "");
          let sizeClass = "";
          if (valueStr.length > 14) sizeClass = "xxlong";
          else if (valueStr.length > 11) sizeClass = "xlong";
          else if (valueStr.length > 8) sizeClass = "long";

          return (
            <div key={index} className="stat-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: 0,
                }}
              >
                <div
                  className="stat-icon-wrap"
                  style={{
                    backgroundColor: "transparent",
                    color: colorMap[stat.color].color,
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{stat.icon}</span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="stat-label">{stat.label}</p>
                  <p className={`stat-value ${sizeClass}`} title={valueStr}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          backgroundColor: "transparent",
          borderRadius: "0",
          padding: "0",
          marginBottom: "24px",
          borderBottom: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        {[
          { key: "members", label: "👥 Members", color: "var(--credit)" },
          {
            key: "pending_loans",
            label: "⏳ Pending Loans",
            color: "var(--warning)",
          },
          { key: "all_loans", label: "📊 All Loans", color: "var(--purple)" },
          {
            key: "transactions",
            label: "💳 Transactions",
            color: "var(--info)",
          },
          { key: "expenses", label: "🧾 Expenses", color: "var(--debit)" },
        ].map((tab) => {
          const count =
            tab.key === "pending_loans"
              ? pendingLoans.length
              : tab.key === "expenses"
                ? pendingExpenses.length
                : 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                minWidth: "120px",
                padding: "10px",
                backgroundColor: "transparent",
                color: activeTab === tab.key ? tab.color : "var(--text-muted)",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? `2px solid ${tab.color}`
                    : "2px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                position: "relative",
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    backgroundColor: "var(--debit)",
                    color: "var(--text)",
                    fontSize: "10px",
                    fontWeight: "bold",
                    padding: "2px 6px",
                    borderRadius: "50%",
                    minWidth: "18px",
                    textAlign: "center",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Members Tab */}
      {activeTab === "members" && (
        <>
          <div
            style={{
              backgroundColor: "transparent",
              borderRadius: "0",
              padding: "0 0 16px 0",
              borderBottom: "1px solid var(--border)",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="🔍 Search by name, email, phone, or account number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: "220px",
                backgroundColor: "transparent",
                color: "var(--text)",
                padding: "10px 0",
                borderRadius: "0",
                border: "none",
                borderBottom: "1px solid var(--border)",
                outline: "none",
                fontSize: "15px",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "13px",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              👥 Total Users:{" "}
              <span style={{ color: "var(--text)" }}>{members.length}</span>
              {searchTerm && (
                <>
                  {" · "}Matching:{" "}
                  <span style={{ color: "var(--text)" }}>
                    {filteredMembers.length}
                  </span>
                </>
              )}
            </div>
          </div>

          {selectedMembers.length > 0 && (
            <div
              style={{
                backgroundColor: "transparent",
                borderRadius: "0",
                padding: "12px 0",
                marginBottom: "16px",
                border: "none",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                {selectedMembers.length} selected
              </span>
              <button
                onClick={handleBulkSuspend}
                style={{
                  backgroundColor: "transparent",
                  color: "var(--warning)",
                  padding: "6px 16px",
                  border: "1px solid var(--warning)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                🚫 Suspend Selected
              </button>
              <button
                onClick={handleBulkDelete}
                style={{
                  backgroundColor: "transparent",
                  color: "var(--debit)",
                  padding: "6px 16px",
                  border: "1px solid var(--debit)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                🗑️ Delete Selected
              </button>
            </div>
          )}

          <div
            style={{
              backgroundColor: "transparent",
              borderRadius: "0",
              border: "none",
              overflow: "hidden",
            }}
          >
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>
                      <input
                        type="checkbox"
                        checked={
                          paginatedMembers.length > 0 &&
                          paginatedMembers.every((m) =>
                            selectedMembers.includes(m.id),
                          )
                        }
                        onChange={handleSelectAll}
                        style={{
                          accentColor: "var(--accent)",
                          cursor: "pointer",
                        }}
                      />
                    </th>
                    <th>Member</th>
                    <th>Contact</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.length > 0 ? (
                    paginatedMembers.map((member) => (
                      <tr key={member.id}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={() => handleSelectMember(member.id)}
                            style={{
                              accentColor: "var(--accent)",
                              cursor: "pointer",
                            }}
                          />
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <MemberAvatar member={member} size={44} />
                            <div
                              style={{
                                color: "var(--text)",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}
                            >
                              {member.name}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{ color: "var(--text)", fontSize: "13px" }}
                          >
                            {member.email}
                          </div>
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "12px",
                            }}
                          >
                            {member.phone || "No phone"}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge badge-${member.membershipType?.toLowerCase() || "standard"}`}
                          >
                            {member.membershipType}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge badge-${member.status?.toLowerCase() || "active"}`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "var(--credit)",
                            fontWeight: "600",
                            fontSize: "15px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatCurrency(member.balance)}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              alignItems: "center",
                            }}
                          >
                            <button
                              onClick={() => handleViewMember(member)}
                              className="action-btn action-btn-view"
                              title="View"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => handleEditMember(member)}
                              className="action-btn action-btn-edit"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="action-btn action-btn-delete"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        style={{ textAlign: "center", padding: "40px" }}
                      >
                        <div style={{ color: "var(--text-muted)" }}>
                          <div
                            style={{ fontSize: "48px", marginBottom: "8px" }}
                          >
                            📭
                          </div>
                          <p>
                            No members in{" "}
                            <strong>{branch?.name || "this branch"}</strong>
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination-wrap">
              <div className="pagination-info">
                {filteredMembers.length === 0
                  ? "No members to show"
                  : `Showing ${
                      (currentMembersPage - 1) * MEMBERS_PER_PAGE + 1
                    }–${Math.min(
                      currentMembersPage * MEMBERS_PER_PAGE,
                      filteredMembers.length,
                    )} of ${filteredMembers.length} ${
                      filteredMembers.length === 1 ? "member" : "members"
                    }`}
              </div>

              {totalMemberPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="page-btn nav-btn"
                    onClick={() => goToPage(currentMembersPage - 1)}
                    disabled={currentMembersPage === 1}
                    title="Previous page"
                  >
                    ‹ Prev
                  </button>

                  {getPageNumbers().map((p, idx) =>
                    p === "…" ? (
                      <span key={`ellipsis-${idx}`} className="page-ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        className={`page-btn ${
                          p === currentMembersPage ? "active" : ""
                        }`}
                        onClick={() => goToPage(p)}
                        disabled={p === currentMembersPage}
                      >
                        {p}
                      </button>
                    ),
                  )}

                  <button
                    className="page-btn nav-btn"
                    onClick={() => goToPage(currentMembersPage + 1)}
                    disabled={currentMembersPage === totalMemberPages}
                    title="Next page"
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Pending Loans Tab */}
      {activeTab === "pending_loans" && (
        <div
          style={{
            backgroundColor: "transparent",
            borderRadius: "0",
            border: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0 0 16px 0",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ color: "var(--text)", margin: 0 }}>
              ⏳ Pending Loans ({pendingLoans.length})
            </h3>
            <button
              onClick={refreshData}
              style={{
                backgroundColor: "transparent",
                color: "var(--info)",
                padding: "6px 16px",
                border: "1px solid var(--info)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              🔄 Refresh
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Interest</th>
                  <th>Total Payable</th>
                  <th>Monthly Payment</th>
                  <th>Duration</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLoans.length > 0 ? (
                  pendingLoans.map((loan) => {
                    const member = members.find((m) => m.id === loan.user_id);
                    return (
                      <tr key={loan.id}>
                        <td
                          style={{
                            color: "var(--info)",
                            fontFamily: "monospace",
                          }}
                        >
                          #{loan.id}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            {member && (
                              <MemberAvatar member={member} size={36} />
                            )}
                            <div style={{ color: "var(--text)" }}>
                              {member ? member.name : "Unknown"}
                            </div>
                          </div>
                        </td>
                        <td
                          style={{ color: "var(--credit)", fontWeight: "600" }}
                        >
                          {formatCurrency(loan.amount)}
                        </td>
                        <td style={{ color: "var(--warning)" }}>
                          {formatCurrency(loan.interest)}
                        </td>
                        <td style={{ color: "var(--text)", fontWeight: "600" }}>
                          {formatCurrency(loan.total_payable)}
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {formatCurrency(loan.monthly_payment)}
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {loan.duration_months} months
                        </td>
                        <td
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "13px",
                          }}
                        >
                          {new Date(loan.request_date).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="loan-actions">
                            <button
                              onClick={() => handleApproveLoan(loan.id)}
                              className="btn-approve"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleRejectLoan(loan.id)}
                              className="btn-reject"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      <div style={{ color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                          ✅
                        </div>
                        <p>No pending loans</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Loans Tab */}
      {activeTab === "all_loans" && (
        <div
          style={{
            backgroundColor: "transparent",
            borderRadius: "0",
            border: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0 0 16px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h3 style={{ color: "var(--text)", margin: 0 }}>
              📊 All Loans ({loans.length})
            </h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Interest</th>
                  <th>Total Payable</th>
                  <th>Monthly Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loans.length > 0 ? (
                  loans.map((loan) => {
                    const member = members.find((m) => m.id === loan.user_id);
                    return (
                      <tr key={loan.id}>
                        <td
                          style={{
                            color: "var(--info)",
                            fontFamily: "monospace",
                          }}
                        >
                          #{loan.id}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            {member && (
                              <MemberAvatar member={member} size={36} />
                            )}
                            <div style={{ color: "var(--text)" }}>
                              {member ? member.name : "Unknown"}
                            </div>
                          </div>
                        </td>
                        <td
                          style={{ color: "var(--credit)", fontWeight: "600" }}
                        >
                          {formatCurrency(loan.amount)}
                        </td>
                        <td style={{ color: "var(--warning)" }}>
                          {formatCurrency(loan.interest)}
                        </td>
                        <td style={{ color: "var(--text)", fontWeight: "600" }}>
                          {formatCurrency(loan.total_payable)}
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>
                          {formatCurrency(loan.monthly_payment)}
                        </td>
                        <td>
                          <span className={`badge badge-${loan.status}`}>
                            {loan.status.toUpperCase()}
                          </span>
                        </td>
                        <td
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "13px",
                          }}
                        >
                          {new Date(loan.request_date).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      <div style={{ color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                          📭
                        </div>
                        <p>No loans found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div
          style={{
            backgroundColor: "transparent",
            borderRadius: "0",
            border: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0 0 16px 0",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <h3 style={{ color: "var(--text)", margin: 0 }}>
              💳 All Transactions ({transactions.length})
            </h3>
            <div
              style={{
                backgroundColor: "transparent",
                color: "#22d3ee",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                border: "1px solid rgba(6, 182, 212, 0.3)",
              }}
            >
              💸 Charges: {formatCurrency(totalCharges)}
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Member</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Charge</th>
                  <th>Net</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      #{transaction.id}
                    </td>
                    <td style={{ color: "var(--text)" }}>
                      {transaction.memberName}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "4px 12px",
                          fontSize: "12px",
                          borderRadius: "20px",
                          backgroundColor:
                            transaction.type === "deposit"
                              ? "rgba(16, 185, 129, 0.2)"
                              : transaction.type === "transfer"
                                ? "rgba(139, 92, 246, 0.2)"
                                : "rgba(239, 68, 68, 0.2)",
                          color:
                            transaction.type === "deposit"
                              ? "var(--credit)"
                              : transaction.type === "transfer"
                                ? "var(--purple)"
                                : "var(--debit)",
                        }}
                      >
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "var(--text)",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td
                      style={{ color: "var(--warning)", whiteSpace: "nowrap" }}
                    >
                      {transaction.charge > 0
                        ? `−${formatCurrency(transaction.charge)}`
                        : "—"}
                    </td>
                    <td
                      style={{
                        color: "var(--credit)",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(
                        transaction.net_amount ?? transaction.amount,
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "4px 12px",
                          fontSize: "12px",
                          borderRadius: "20px",
                          backgroundColor:
                            transaction.status === "approved"
                              ? "rgba(16, 185, 129, 0.2)"
                              : transaction.status === "pending"
                                ? "rgba(234, 179, 8, 0.2)"
                                : "rgba(239, 68, 68, 0.2)",
                          color:
                            transaction.status === "approved"
                              ? "var(--credit)"
                              : transaction.status === "pending"
                                ? "var(--warning)"
                                : "var(--debit)",
                        }}
                      >
                        {transaction.status.toUpperCase()}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {transaction.date}
                    </td>
                    <td>
                      {transaction.status === "pending" ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() =>
                              handleApproveTransaction(transaction.id)
                            }
                            className="btn-approve"
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() =>
                              handleRejectTransaction(transaction.id)
                            }
                            className="btn-reject"
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{ color: "var(--text-dim)", fontSize: "12px" }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      <div style={{ color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                          📭
                        </div>
                        <p>No transactions found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <div
          style={{
            backgroundColor: "transparent",
            borderRadius: "0",
            border: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0 0 16px 0",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <h3 style={{ color: "var(--text)", margin: 0 }}>
              🧾 All Expenses ({expenses.length}) — Pending:{" "}
              {pendingExpenses.length}
            </h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <div
                style={{
                  backgroundColor: "transparent",
                  color: "var(--debit)",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "1px solid var(--debit)",
                }}
              >
                🧾 Total Approved: {formatCurrency(totalExpenses)}
              </div>
              <button
                onClick={refreshData}
                style={{
                  backgroundColor: "transparent",
                  color: "var(--info)",
                  padding: "6px 16px",
                  border: "1px solid var(--info)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        #{expense.id}
                      </td>
                      <td style={{ color: "var(--text)", fontWeight: "500" }}>
                        {expense.title}
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {expense.category || "General"}
                      </td>
                      <td style={{ color: "var(--debit)", fontWeight: "600" }}>
                        {formatCurrency(expense.amount)}
                      </td>
                      <td style={{ color: "var(--text)" }}>
                        {expense.requested_by || "Admin"}
                      </td>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {expense.date}
                      </td>
                      <td>
                        <span className={`badge badge-${expense.status}`}>
                          {expense.status?.toUpperCase() || "PENDING"}
                        </span>
                      </td>
                      <td>
                        {expense.status === "pending" ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleApproveExpense(expense.id)}
                              className="btn-approve"
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleRejectExpense(expense.id)}
                              className="btn-reject"
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="action-btn action-btn-delete"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      <div style={{ color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                          📭
                        </div>
                        <p>No expenses found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MEMBER MODAL */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Add New Member</h3>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateMember}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter full name"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter email"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Enter phone"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Membership Type</label>
                <select
                  className="form-select"
                  value={newMember.membershipType}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      membershipType: e.target.value,
                    })
                  }
                >
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Initial Balance (₦)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  value={newMember.balance}
                  onChange={(e) =>
                    setNewMember({ ...newMember, balance: e.target.value })
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MEMBER MODAL */}
      {showViewModal &&
        selectedMember &&
        (() => {
          const memberTransactions = transactions.filter(
            (t) =>
              t.memberId === selectedMember.id ||
              t.accountNumber === selectedMember.accountNumber,
          );
          const memberLoans = loans.filter(
            (l) => l.user_id === selectedMember.id,
          );

          const memberTotalDeposits = memberTransactions
            .filter((t) => t.type === "deposit" && t.status === "approved")
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

          const memberTotalWithdrawals = memberTransactions
            .filter((t) => t.type === "withdrawal" && t.status === "approved")
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

          const memberTotalTransfersOut = memberTransactions
            .filter((t) => t.type === "transfer" && t.status === "approved")
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

          const memberTotalCharges = memberTransactions.reduce(
            (s, t) => s + (parseFloat(t.charge) || 0),
            0,
          );

          const activeLoans = memberLoans.filter(
            (l) => l.status === "approved" || l.status === "active",
          );
          const totalLoanBalance = activeLoans.reduce(
            (s, l) => s + (parseFloat(l.total_payable) || 0),
            0,
          );
          const totalMonthlyLoan = activeLoans.reduce(
            (s, l) => s + (parseFloat(l.monthly_payment) || 0),
            0,
          );

          const savingsBalance =
            memberTotalDeposits -
            memberTotalWithdrawals -
            memberTotalTransfersOut -
            memberTotalCharges;

          const planType =
            selectedMember.savingsPlan ||
            selectedMember.savings_plan ||
            "Daily";

          const memberMethodRaw =
            selectedMember.savingsMethod || selectedMember.savings_method;
          const savingsMethod = memberMethodRaw
            ? memberMethodRaw
            : branchSavingsMethod === "cash"
              ? "Cash"
              : branchSavingsMethod === "item"
                ? "Item"
                : "Cash";

          const planDuration =
            selectedMember.savingsDuration ||
            selectedMember.savings_duration ||
            "4 years";
          const amountPerDay = parseFloat(
            selectedMember.amountPerDay || selectedMember.amount_per_day || 500,
          );
          const numberOfPayments = parseInt(
            selectedMember.numberOfPayments ||
              selectedMember.number_of_payments ||
              1440,
            10,
          );
          const totalToSave = parseFloat(
            selectedMember.totalToSave ||
              selectedMember.total_to_save ||
              amountPerDay * numberOfPayments,
          );
          const amountSavedSoFar = parseFloat(
            selectedMember.amountSaved ||
              selectedMember.amount_saved ||
              memberTotalDeposits ||
              0,
          );
          const progressPct =
            totalToSave > 0
              ? Math.min(
                  100,
                  Math.round((amountSavedSoFar / totalToSave) * 100),
                )
              : 0;

          const renderStatusBadge = (status) => {
            const s = (status || "").toLowerCase();
            let cls = "status-default";
            if (s === "approved" || s === "active") cls = "status-approved";
            else if (s === "pending") cls = "status-pending";
            else if (s === "rejected" || s === "suspended" || s === "inactive")
              cls = "status-rejected";
            return (
              <span className={`status-badge ${cls}`}>
                {(status || "N/A").toUpperCase()}
              </span>
            );
          };

          return (
            <div
              className="modal-overlay"
              onClick={() => setShowViewModal(false)}
            >
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "760px" }}
              >
                <div className="modal-header">
                  <h3 className="modal-title">👁️ Member Full Details</h3>
                  <button
                    className="modal-close"
                    onClick={() => setShowViewModal(false)}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "20px",
                    paddingBottom: "20px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <MemberAvatar member={selectedMember} size={72} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "var(--text)",
                        fontSize: "20px",
                        fontWeight: "700",
                      }}
                    >
                      {selectedMember.name}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "13px",
                        marginTop: "4px",
                      }}
                    >
                      {selectedMember.membershipType || "Standard"} Member ·{" "}
                      <span
                        className={`badge badge-${selectedMember.status?.toLowerCase() || "active"}`}
                        style={{ fontSize: "11px", padding: "2px 10px" }}
                      >
                        {selectedMember.status || "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="savings-plan-card">
                  <div className="savings-plan-header">
                    <div className="savings-plan-title">💼 My Savings Plan</div>
                    <span className="savings-plan-badge">{planType}</span>
                  </div>

                  <div className="savings-plan-grid">
                    <div className="savings-plan-item">
                      <div className="sp-label">📅 Savings Plan</div>
                      <div className="sp-value info">{planType}</div>
                    </div>
                    <div className="savings-plan-item">
                      <div className="sp-label">
                        💵 Savings Method
                        {!memberMethodRaw && (
                          <span
                            style={{
                              fontSize: 9,
                              color: "var(--text-dim)",
                              marginLeft: 4,
                              textTransform: "none",
                              letterSpacing: 0,
                            }}
                          >
                            (branch default)
                          </span>
                        )}
                      </div>
                      <div className="sp-value purple">{savingsMethod}</div>
                    </div>
                    <div className="savings-plan-item">
                      <div className="sp-label">⏱️ Duration</div>
                      <div className="sp-value warning">{planDuration}</div>
                    </div>
                    <div className="savings-plan-item">
                      <div className="sp-label">💰 Amount per Day</div>
                      <div className="sp-value credit">
                        {formatCurrency(amountPerDay)}
                      </div>
                    </div>
                    <div className="savings-plan-item">
                      <div className="sp-label">🔢 Number of Payments</div>
                      <div className="sp-value">
                        {numberOfPayments.toLocaleString()}
                      </div>
                    </div>
                    <div className="savings-plan-item">
                      <div className="sp-label">🎯 Total to Save</div>
                      <div className="sp-value credit">
                        {formatCurrency(totalToSave)}
                      </div>
                    </div>
                  </div>

                  <div className="savings-plan-progress-wrap">
                    <div className="savings-plan-progress-label">
                      <span>
                        Progress: {formatCurrency(amountSavedSoFar)} of{" "}
                        {formatCurrency(totalToSave)}
                      </span>
                      <span
                        style={{ fontWeight: "700", color: "var(--credit)" }}
                      >
                        {progressPct}%
                      </span>
                    </div>
                    <div className="savings-plan-progress-bar">
                      <div
                        className="savings-plan-progress-fill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">
                    <span>📋</span> Personal Information
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-label">Email</div>
                      <div className="detail-value">
                        {selectedMember.email || "—"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Phone</div>
                      <div className="detail-value">
                        {selectedMember.phone || "—"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Account Number</div>
                      <div
                        className="detail-value mono"
                        style={{ color: "var(--info)" }}
                      >
                        {selectedMember.accountNumber || "—"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Membership Type</div>
                      <div className="detail-value">
                        {selectedMember.membershipType || "Standard"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Join Date</div>
                      <div className="detail-value">
                        {selectedMember.joinDate || "—"}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Status</div>
                      <div
                        className="detail-value"
                        style={{ textTransform: "capitalize" }}
                      >
                        {selectedMember.status || "Active"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">
                    <span>💰</span> Savings & Balance
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <div className="detail-label">Current Balance</div>
                    <div className="detail-highlight">
                      {formatCurrency(selectedMember.balance)}
                    </div>
                  </div>
                  <div className="summary-pills">
                    <div className="summary-pill">
                      <div className="pill-label">Total Deposits</div>
                      <div
                        className="pill-value"
                        style={{ color: "var(--credit)" }}
                      >
                        {formatCurrency(memberTotalDeposits)}
                      </div>
                    </div>
                    <div className="summary-pill">
                      <div className="pill-label">Total Withdrawals</div>
                      <div
                        className="pill-value"
                        style={{ color: "var(--debit)" }}
                      >
                        {formatCurrency(memberTotalWithdrawals)}
                      </div>
                    </div>
                    <div className="summary-pill">
                      <div className="pill-label">Transfers Out</div>
                      <div
                        className="pill-value"
                        style={{ color: "var(--purple)" }}
                      >
                        {formatCurrency(memberTotalTransfersOut)}
                      </div>
                    </div>
                    <div className="summary-pill">
                      <div className="pill-label">Total Charges</div>
                      <div
                        className="pill-value"
                        style={{ color: "var(--warning)" }}
                      >
                        {formatCurrency(memberTotalCharges)}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "12px 16px",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      Net Savings (Deposits − Withdrawals − Transfers − Charges)
                    </span>
                    <span
                      style={{
                        color:
                          savingsBalance >= 0
                            ? "var(--credit)"
                            : "var(--debit)",
                        fontSize: "18px",
                        fontWeight: "700",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(savingsBalance)}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">
                    <span>🏦</span> Loan Summary
                  </div>
                  {memberLoans.length > 0 ? (
                    <>
                      <div
                        className="summary-pills"
                        style={{ marginBottom: "14px" }}
                      >
                        <div className="summary-pill">
                          <div className="pill-label">Total Loans</div>
                          <div
                            className="pill-value"
                            style={{ color: "var(--info)" }}
                          >
                            {memberLoans.length}
                          </div>
                        </div>
                        <div className="summary-pill">
                          <div className="pill-label">Active Loans</div>
                          <div
                            className="pill-value"
                            style={{ color: "var(--warning)" }}
                          >
                            {activeLoans.length}
                          </div>
                        </div>
                        <div className="summary-pill">
                          <div className="pill-label">Outstanding Balance</div>
                          <div
                            className="pill-value"
                            style={{ color: "var(--debit)" }}
                          >
                            {formatCurrency(totalLoanBalance)}
                          </div>
                        </div>
                        <div className="summary-pill">
                          <div className="pill-label">Monthly Payment</div>
                          <div
                            className="pill-value"
                            style={{ color: "var(--purple)" }}
                          >
                            {formatCurrency(totalMonthlyLoan)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          maxHeight: "220px",
                          overflowY: "auto",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                        }}
                      >
                        <table className="mini-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Amount</th>
                              <th>Total Payable</th>
                              <th>Monthly</th>
                              <th>Duration</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberLoans.map((loan) => (
                              <tr key={loan.id}>
                                <td style={{ fontFamily: "monospace" }}>
                                  #{loan.id}
                                </td>
                                <td className="amount-credit">
                                  {formatCurrency(loan.amount)}
                                </td>
                                <td>{formatCurrency(loan.total_payable)}</td>
                                <td>{formatCurrency(loan.monthly_payment)}</td>
                                <td>{loan.duration_months} mo</td>
                                <td>{renderStatusBadge(loan.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="empty-mini">No loans on record</div>
                  )}
                </div>

                <div className="detail-section">
                  <div className="detail-section-title">
                    <span>📊</span> Transaction History
                  </div>
                  {memberTransactions.length > 0 ? (
                    <div
                      style={{
                        maxHeight: "260px",
                        overflowY: "auto",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                      }}
                    >
                      <table className="mini-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Charge</th>
                            <th>Net</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberTransactions.map((t) => (
                            <tr key={t.id}>
                              <td style={{ fontFamily: "monospace" }}>
                                #{t.id}
                              </td>
                              <td
                                style={{
                                  textTransform: "uppercase",
                                  fontSize: "11px",
                                }}
                              >
                                {t.type}
                              </td>
                              <td
                                className={
                                  t.type === "deposit"
                                    ? "amount-credit"
                                    : t.type === "withdrawal"
                                      ? "amount-debit"
                                      : "amount-warning"
                                }
                              >
                                {formatCurrency(t.amount)}
                              </td>
                              <td style={{ color: "var(--warning)" }}>
                                {t.charge > 0
                                  ? `−${formatCurrency(t.charge)}`
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  color: "var(--credit)",
                                  fontWeight: "600",
                                }}
                              >
                                {formatCurrency(t.net_amount ?? t.amount)}
                              </td>
                              <td>{renderStatusBadge(t.status)}</td>
                              <td
                                style={{
                                  color: "var(--text-muted)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {t.date}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-mini">No transactions on record</div>
                  )}
                </div>

                <div className="modal-buttons" style={{ marginTop: "8px" }}>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={() => {
                      setShowViewModal(false);
                      setTimeout(() => handleEditMember(selectedMember), 150);
                    }}
                  >
                    ✏️ Edit This Member
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* EDIT MEMBER MODAL */}
      {showEditModal && selectedMember && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowEditModal(false);
            setSelectedMember(null);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Member</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMember(null);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateMember}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedMember.name || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={selectedMember.email || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      email: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={selectedMember.phone || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Membership Type</label>
                <select
                  className="form-select"
                  value={selectedMember.membershipType || "Standard"}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      membershipType: e.target.value,
                    })
                  }
                >
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Balance (₦)</label>
                <input
                  type="number"
                  className="form-input"
                  value={selectedMember.balance || 0}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={selectedMember.status || "Active"}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowTransactionModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💳 New Transaction</h3>
              <button
                className="modal-close"
                onClick={() => setShowTransactionModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleTransaction}>
              <div className="form-group">
                <label className="form-label">Select Member</label>
                <select
                  className="form-select"
                  value={transactionData.memberId}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      memberId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Choose a member...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} (Balance: {formatCurrency(member.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Transaction Type</label>
                <select
                  className="form-select"
                  value={transactionData.type}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      type: e.target.value,
                    })
                  }
                >
                  <option value="deposit">💰 Deposit</option>
                  <option value="withdrawal">🏦 Withdrawal</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₦)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Enter amount"
                  value={transactionData.amount}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      amount: e.target.value,
                    })
                  }
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter description"
                  value={transactionData.description}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowTransactionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Submit Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={closeTransferModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🔄 Transfer Funds</h3>
              <button className="modal-close" onClick={closeTransferModal}>
                ✕
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label className="form-label">
                  From Member (Account Number)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter sender's account number..."
                  value={fromAccountInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFromAccountInput(val);
                    const found = memberByAccount[val];
                    if (found) {
                      setTransferData({
                        ...transferData,
                        fromMemberId: found.id,
                      });
                      setFromMemberError("");
                    } else {
                      setTransferData({ ...transferData, fromMemberId: "" });
                      setFromMemberError(
                        val ? "No member found with that account number" : "",
                      );
                    }
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">To Member (Account Number)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter recipient's account number..."
                  value={toAccountInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setToAccountInput(val);
                    const found = memberByAccount[val];
                    if (found) {
                      setTransferData({
                        ...transferData,
                        toMemberId: found.id,
                      });
                      setToMemberError("");
                    } else {
                      setTransferData({ ...transferData, toMemberId: "" });
                      setToMemberError(
                        val ? "No member found with that account number" : "",
                      );
                    }
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₦)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Enter amount to transfer"
                  value={transferData.amount}
                  onChange={(e) =>
                    setTransferData({ ...transferData, amount: e.target.value })
                  }
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter transfer description"
                  value={transferData.description}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeTransferModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={
                    !transferData.fromMemberId || !transferData.toMemberId
                  }
                  style={{
                    opacity:
                      !transferData.fromMemberId || !transferData.toMemberId
                        ? 0.5
                        : 1,
                    cursor:
                      !transferData.fromMemberId || !transferData.toMemberId
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Submit Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowExpenseModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🧾 New Expense Request</h3>
              <button
                className="modal-close"
                onClick={() => setShowExpenseModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="form-group">
                <label className="form-label">Expense Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Office rent, Electricity bill"
                  value={expenseData.title}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={expenseData.category}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, category: e.target.value })
                  }
                >
                  <option value="General">General</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Rent">Rent</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Transport">Transport</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₦)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Enter amount"
                  value={expenseData.amount}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, amount: e.target.value })
                  }
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Requested By</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Name of requester"
                  value={expenseData.requestedBy}
                  onChange={(e) =>
                    setExpenseData({
                      ...expenseData,
                      requestedBy: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={expenseData.date}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, date: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter expense description"
                  value={expenseData.description}
                  onChange={(e) =>
                    setExpenseData({
                      ...expenseData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowExpenseModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Submit Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Feedback Toast */}
      {voiceFeedback && (
        <div className="voice-toast">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontWeight: "600" }}>{voiceFeedback}</span>
            {isListening && (
              <span className="sound-wave">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </span>
            )}
          </div>
          {voiceTranscript && isListening && (
            <div className="transcript">"{voiceTranscript}"</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
