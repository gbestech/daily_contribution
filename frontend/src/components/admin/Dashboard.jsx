// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const AdminDashboard = () => {
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

  // ===== VOICE STATE (mirrors Broadsheet) =====
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef(null);
  const voiceFeedbackTimerRef = useRef(null);

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

  const totalCharges = transactions.reduce((sum, t) => {
    const c = parseFloat(t.charge) || 0;
    return sum + c;
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => {
    if (e.status === "approved") return sum + (parseFloat(e.amount) || 0);
    return sum;
  }, 0);

  const testApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin.php`);
      if (response.ok) return true;
      return false;
    } catch (error) {
      return false;
    }
  };

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchAllData();
      toast.success("Data refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    try {
      const isConnected = await testApiConnection();
      if (!isConnected) {
        throw new Error(
          "Cannot connect to API server. Please check if the server is running on port 8000.",
        );
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/admin.php`);
        const adminData = await response.json();
        if (adminData.username) setAdminUsername(adminData.username);
      } catch (profileError) {
        setAdminUsername("Admin");
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/members.php`);
        const membersData = await response.json();
        if (membersData.members) setMembers(membersData.members);
      } catch (membersError) {
        setMembers([]);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
        const transactionsData = await response.json();
        if (transactionsData.transactions)
          setTransactions(transactionsData.transactions);
      } catch (transactionsError) {
        setTransactions([]);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/loans.php`);
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
        const response = await fetch(`${API_BASE_URL}/api/expenses.php`);
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
      const response = await fetch(`${API_BASE_URL}/api/loans.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loanId, status: "approved" }),
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
      const response = await fetch(`${API_BASE_URL}/api/loans.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loanId, status: "rejected" }),
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
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php/${transactionId}/approve`,
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
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php/${transactionId}/reject`,
        { method: "PUT", headers: { "Content-Type": "application/json" } },
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
      const response = await fetch(
        `${API_BASE_URL}/api/expenses.php/${expenseId}/approve`,
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
      const response = await fetch(
        `${API_BASE_URL}/api/expenses.php/${expenseId}/reject`,
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
      const response = await fetch(
        `${API_BASE_URL}/api/expenses.php/${expenseId}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } },
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
      title: expenseData.title,
      category: expenseData.category,
      amount: amount,
      description: expenseData.description || expenseData.title,
      requested_by: expenseData.requestedBy,
      date: expenseData.date,
      status: "pending",
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/expenses.php`, {
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

  useEffect(() => {
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
  }, []);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
    } else {
      const allIds = filteredMembers.map((m) => m.id);
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
          await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...member,
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
        await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
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
    emerald: { bg: "rgba(16, 185, 129, 0.2)", color: "var(--credit)" },
    gold: { bg: "rgba(234, 179, 8, 0.2)", color: "var(--warning)" },
    cyan: { bg: "rgba(6, 182, 212, 0.2)", color: "#22d3ee" },
    blue: { bg: "rgba(59, 130, 246, 0.2)", color: "var(--info)" },
    purple: { bg: "rgba(139, 92, 246, 0.2)", color: "var(--purple)" },
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.accountNumber?.includes(searchTerm) ||
      member.phone?.includes(searchTerm),
  );

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
      const response = await fetch(`${API_BASE_URL}/api/members.php`, {
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
          `✅ Member created successfully!\nAccount Number: ${accountNumber}`,
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
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
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
      const response = await fetch(`${API_BASE_URL}/api/transfers.php`, {
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

  const handleEditMember = (member) => {
    setSelectedMember(member);
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/members.php/${selectedMember.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedMember),
        },
      );
      const data = await response.json();
      if (response.ok) {
        const updatedMembers = members.map((member) =>
          member.id === selectedMember.id ? data.member : member,
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
        const response = await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          setMembers(members.filter((member) => member.id !== id));
          toast.success("✅ Member deleted successfully!");
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
  // ===== VOICE RECOGNITION (mirrors Broadsheet pattern) =====
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

      // ---- TAB NAVIGATION ----
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

      // ---- ACTIONS ----
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

      // ---- STATS ----
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

      // ---- HELP ----
      if (text.includes("help") || text.includes("what can i say")) {
        const helpMsg =
          "You can say: open members, open transactions, open expenses, new transaction, new transfer, new expense, refresh data, search for a name, how many members, total balance, or close.";
        showVoiceFeedback(`ℹ️ ${helpMsg}`);
        speak(helpMsg);
        return;
      }

      // ---- SEARCH (explicit) ----
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

      // ---- FALLBACK: treat short phrases as a name search ----
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
    ],
  );

  // Keep handler in a ref (avoids stale closures)
  const processCommandRef = useRef(processVoiceCommand);
  useEffect(() => {
    processCommandRef.current = processVoiceCommand;
  }, [processVoiceCommand]);

  // Setup SpeechRecognition once
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

  // Ctrl + M shortcut
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

  // ============================================================
  // ===== END VOICE RECOGNITION =====
  // ============================================================

  if (error) {
    return (
      <div
        style={{
          padding: "24px",
          backgroundColor: "#0f172a",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "500px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2
            style={{ color: "var(--debit)", fontSize: "20px", marginBottom: "12px" }}
          >
            Connection Error
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#3b82f6",
              color: "var(--text)",
              padding: "10px 24px",
              border: "none",
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
          backgroundColor: "#0f172a",
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
        backgroundColor: "#0f172a",
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
          padding: 32px; max-width: 500px; width: 100%;
          max-height: 90vh; overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
          animation: fadeIn 0.3s ease;
        }
        .modal-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 16px;
        }
        .modal-title { font-size: 18px; font-weight: bold; color: white; }
        .modal-close {
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; padding: 4px; font-size: 24px;
        }
        .modal-close:hover { color: white; }
        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block; font-size: 14px; font-weight: 500;
          color: var(--text); margin-bottom: 6px;
        }
        .form-input {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white; font-size: 14px; outline: none;
          box-sizing: border-box;
        }
        .form-input:focus { border-color: var(--accent); }
        .form-input::placeholder { color: var(--text-dim); }
        .form-select {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white; font-size: 14px; outline: none; cursor: pointer;
        }
        .form-select:focus { border-color: var(--accent); }
        .form-select option { background-color: var(--bg-surface); color: white; }
        .btn-submit {
          width: 100%; padding: 12px; border-radius: 8px; border: none;
          background: linear-gradient(to right, #059669, #0d9488);
          color: white; font-size: 16px; font-weight: 600;
          cursor: pointer;
        }
        .btn-cancel {
          width: 100%; padding: 12px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: white; font-size: 16px;
          cursor: pointer;
        }
        .btn-cancel:hover { background-color: rgba(255,255,255,0.05); }
        .modal-buttons { display: flex; gap: 12px; margin-top: 16px; }
        .modal-buttons button { flex: 1; }
        .table-container {
          overflow-x: auto; max-height: 550px; overflow-y: auto;
        }
        table { width: 100%; border-collapse: collapse; }
        th {
          padding: 14px 16px; text-align: left; font-size: 12px;
          font-weight: 600; color: var(--text-muted);
          background-color: rgba(255, 255, 255, 0.08);
          position: sticky; top: 0; z-index: 10;
          white-space: nowrap;
        }
        td {
          padding: 14px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .stat-card {
          background-color: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s;
          min-width: 0;
          overflow: hidden;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .stat-icon-wrap {
          padding: 10px;
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
          color: white;
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

        /* ===== VOICE MIC BUTTON (matches Broadsheet) ===== */
        .ad-mic-btn {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          border: 1px solid rgba(16,185,129,0.3);
          background: rgba(16,185,129,0.15);
          color: var(--credit);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ad-mic-btn:hover { background: rgba(16,185,129,0.25); }
        .ad-mic-btn.listening {
          border-color: var(--debit);
          background: rgba(239,68,68,0.25);
          color: #fca5a5;
          animation: pulseMic 1.2s infinite;
        }
        .ad-mic-btn.unsupported {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: rgba(148,163,184,0.3);
          background: rgba(148,163,184,0.15);
          color: var(--text-muted);
        }
        .ad-mic-btn.unsupported:hover { background: rgba(148,163,184,0.15); }

        .voice-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          max-width: 360px;
          background-color: rgba(30, 41, 59, 0.98);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 14px 18px;
          color: white;
          font-size: 14px;
          z-index: 1100;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: fadeIn 0.25s ease;
          backdrop-filter: blur(8px);
        }
        .voice-toast .transcript {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 6px;
          font-style: italic;
          border-top: 1px solid rgba(255,255,255,0.08);
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
      `}</style>

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
            style={{ fontSize: "14px", color: "var(--text-muted)", margin: "4px 0 0 0" }}
          >
            Welcome back, {adminUsername} 👋
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={refreshData}
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "var(--info)",
              padding: "10px 20px",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🔄 Refresh
          </button>

          {/* 🎙️ Voice button — same style as Broadsheet */}
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
            onClick={() => setShowTransactionModal(true)}
            style={{
              backgroundColor: "#3b82f6",
              color: "var(--text)",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            💳 New Transaction
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            style={{
              backgroundColor: "#8b5cf6",
              color: "var(--text)",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🔄 Transfer
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            style={{
              backgroundColor: "var(--debit)",
              color: "var(--text)",
              padding: "10px 20px",
              border: "none",
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

      {/* Stats Grid */}
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
                    backgroundColor: colorMap[stat.color].bg,
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
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          padding: "4px",
          marginBottom: "24px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setActiveTab("members")}
          style={{
            flex: 1,
            minWidth: "120px",
            padding: "10px",
            backgroundColor:
              activeTab === "members"
                ? "rgba(16, 185, 129, 0.2)"
                : "transparent",
            color: activeTab === "members" ? "var(--credit)" : "var(--text-muted)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          👥 Members
        </button>
        <button
          onClick={() => setActiveTab("pending_loans")}
          style={{
            flex: 1,
            minWidth: "120px",
            padding: "10px",
            backgroundColor:
              activeTab === "pending_loans"
                ? "rgba(234, 179, 8, 0.2)"
                : "transparent",
            color: activeTab === "pending_loans" ? "var(--warning)" : "var(--text-muted)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            position: "relative",
          }}
        >
          ⏳ Pending Loans
          {pendingLoans.length > 0 && (
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
              {pendingLoans.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("all_loans")}
          style={{
            flex: 1,
            minWidth: "120px",
            padding: "10px",
            backgroundColor:
              activeTab === "all_loans"
                ? "rgba(139, 92, 246, 0.2)"
                : "transparent",
            color: activeTab === "all_loans" ? "var(--purple)" : "var(--text-muted)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          📊 All Loans
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          style={{
            flex: 1,
            minWidth: "120px",
            padding: "10px",
            backgroundColor:
              activeTab === "transactions"
                ? "rgba(59, 130, 246, 0.2)"
                : "transparent",
            color: activeTab === "transactions" ? "var(--info)" : "var(--text-muted)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          💳 Transactions
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          style={{
            flex: 1,
            minWidth: "120px",
            padding: "10px",
            backgroundColor:
              activeTab === "expenses"
                ? "rgba(239, 68, 68, 0.2)"
                : "transparent",
            color: activeTab === "expenses" ? "var(--debit)" : "var(--text-muted)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            position: "relative",
          }}
        >
          🧾 Expenses
          {pendingExpenses.length > 0 && (
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
              {pendingExpenses.length}
            </span>
          )}
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === "members" && (
        <>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: "24px",
            }}
          >
            <input
              type="text"
              placeholder="🔍 Search by name, email, phone, or account number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "var(--text)",
                padding: "12px 18px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                outline: "none",
                fontSize: "15px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {filteredMembers.length > 0 && (
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: "12px 16px",
                marginBottom: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                {selectedMembers.length} selected
              </span>
              {selectedMembers.length > 0 && (
                <>
                  <button
                    onClick={handleBulkSuspend}
                    style={{
                      backgroundColor: "rgba(234, 179, 8, 0.15)",
                      color: "var(--warning)",
                      padding: "6px 16px",
                      border: "1px solid rgba(234, 179, 8, 0.2)",
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
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      color: "var(--debit)",
                      padding: "6px 16px",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    🗑️ Delete Selected
                  </button>
                </>
              )}
            </div>
          )}

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
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
                        checked={selectAll}
                        onChange={handleSelectAll}
                        style={{ accentColor: "var(--accent)", cursor: "pointer" }}
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
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      style={{
                        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          style={{ accentColor: "var(--accent)", cursor: "pointer" }}
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
                          <div
                            style={{
                              height: "44px",
                              width: "44px",
                              borderRadius: "50%",
                              backgroundColor: "rgba(16, 185, 129, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--credit)",
                              fontSize: "18px",
                              fontWeight: "bold",
                              flexShrink: 0,
                            }}
                          >
                            {member.name?.charAt(0) || "U"}
                          </div>
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
                        <div style={{ color: "var(--text)", fontSize: "13px" }}>
                          {member.email}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pending Loans Tab */}
      {activeTab === "pending_loans" && (
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
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
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "var(--info)",
                padding: "6px 16px",
                border: "1px solid rgba(59, 130, 246, 0.2)",
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
                      <tr
                        key={loan.id}
                        style={{
                          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <td
                          style={{ color: "var(--info)", fontFamily: "monospace" }}
                        >
                          #{loan.id}
                        </td>
                        <td>
                          <div style={{ color: "var(--text)" }}>
                            {member ? member.name : "Unknown"}
                          </div>
                        </td>
                        <td style={{ color: "var(--credit)", fontWeight: "600" }}>
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
                        <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>
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
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
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
                      <tr
                        key={loan.id}
                        style={{
                          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <td
                          style={{ color: "var(--info)", fontFamily: "monospace" }}
                        >
                          #{loan.id}
                        </td>
                        <td style={{ color: "var(--text)" }}>
                          {member ? member.name : "Unknown"}
                        </td>
                        <td style={{ color: "var(--credit)", fontWeight: "600" }}>
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
                        <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>
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
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
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
                backgroundColor: "rgba(6, 182, 212, 0.15)",
                color: "#22d3ee",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                border: "1px solid rgba(6, 182, 212, 0.2)",
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
                  <tr
                    key={transaction.id}
                    style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
                  >
                    <td style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>
                      #{transaction.id}
                    </td>
                    <td style={{ color: "var(--text)" }}>{transaction.memberName}</td>
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
                    <td style={{ color: "var(--warning)", whiteSpace: "nowrap" }}>
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
                    <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
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
                        <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>
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
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
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
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "var(--debit)",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                🧾 Total Approved: {formatCurrency(totalExpenses)}
              </div>
              <button
                onClick={refreshData}
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "var(--info)",
                  padding: "6px 16px",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
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
                    <tr
                      key={expense.id}
                      style={{
                        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <td style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>
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
                      <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
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

              {transactionData.type === "deposit" &&
                transactionData.amount &&
                parseFloat(transactionData.amount) > 0 &&
                (() => {
                  const amt = parseFloat(transactionData.amount);
                  const rate = amt > 200000 ? 0.004 : 0.01;
                  const charge = Math.round(amt * rate * 100) / 100;
                  const net = Math.round((amt - charge) * 100) / 100;
                  return (
                    <div
                      style={{
                        backgroundColor: "rgba(6, 182, 212, 0.08)",
                        border: "1px solid rgba(6, 182, 212, 0.2)",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          marginBottom: "6px",
                        }}
                      >
                        <span>Deposit Amount</span>
                        <span style={{ color: "var(--text)" }}>
                          {formatCurrency(amt)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          marginBottom: "6px",
                        }}
                      >
                        <span>
                          Charge ({(rate * 100).toFixed(1)}%{" "}
                          {amt > 200000 ? "> ₦200k" : "≤ ₦200k"})
                        </span>
                        <span style={{ color: "var(--warning)" }}>
                          −{formatCurrency(charge)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "14px",
                          color: "var(--text)",
                          fontWeight: "600",
                          borderTop: "1px solid rgba(6, 182, 212, 0.2)",
                          paddingTop: "8px",
                          marginTop: "4px",
                        }}
                      >
                        <span>Member Receives</span>
                        <span style={{ color: "var(--credit)" }}>
                          {formatCurrency(net)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

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
        <div
          className="modal-overlay"
          onClick={() => setShowTransferModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                <label className="form-label">From Member</label>
                <select
                  className="form-select"
                  value={transferData.fromMemberId}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      fromMemberId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select sender...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} (Balance: {formatCurrency(member.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To Member</label>
                <select
                  className="form-select"
                  value={transferData.toMemberId}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      toMemberId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select recipient...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} (Balance: {formatCurrency(member.balance)})
                    </option>
                  ))}
                </select>
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
                  onClick={() => setShowTransferModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
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

      {/* ===== VOICE FEEDBACK TOAST ===== */}
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
