import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const AdminDashboard = () => {
  const [adminUsername, setAdminUsername] = useState("Admin");
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("members");

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

  const testApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin.php`);
      if (response.ok) return true;
      return false;
    } catch (error) {
      return false;
    }
  };

  const refreshData = async () => {
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
  };

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
      value: pendingLoans.length.toString(),
      color: "blue",
    },
    {
      icon: "🔄",
      label: "Total Loans",
      value: loans.length.toString(),
      color: "purple",
    },
  ];

  const colorMap = {
    emerald: { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" },
    gold: { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" },
    cyan: { bg: "rgba(6, 182, 212, 0.2)", color: "#22d3ee" },
    blue: { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" },
    purple: { bg: "rgba(139, 92, 246, 0.2)", color: "#a78bfa" },
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
            style={{ color: "#f87171", fontSize: "20px", marginBottom: "12px" }}
          >
            Connection Error
          </h2>
          <p style={{ color: "#9ca3af", marginBottom: "16px" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
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
        <div style={{ color: "white", fontSize: "20px" }}>Loading...</div>
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
        .modal-overlay {
          position: fixed; inset: 0;
          background-color: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
        }
        .modal-content {
          background-color: #1e293b; border-radius: 16px;
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
          background: none; border: none; color: #94a3b8;
          cursor: pointer; padding: 4px; font-size: 24px;
        }
        .modal-close:hover { color: white; }
        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block; font-size: 14px; font-weight: 500;
          color: #d1d5db; margin-bottom: 6px;
        }
        .form-input {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white; font-size: 14px; outline: none;
          box-sizing: border-box;
        }
        .form-input:focus { border-color: #10b981; }
        .form-input::placeholder { color: #6b7280; }
        .form-select {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white; font-size: 14px; outline: none; cursor: pointer;
        }
        .form-select:focus { border-color: #10b981; }
        .form-select option { background-color: #1e293b; color: white; }
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
          font-weight: 600; color: #9ca3af;
          background-color: rgba(255, 255, 255, 0.08);
          position: sticky; top: 0; z-index: 10;
          white-space: nowrap;
        }
        td {
          padding: 14px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* ====== STAT CARDS — auto-shrinking value ====== */
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
          color: #9ca3af;
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
        .badge-active { background-color: rgba(16, 185, 129, 0.2); color: #34d399; }
        .badge-inactive { background-color: rgba(239, 68, 68, 0.2); color: #f87171; }
        .badge-suspended { background-color: rgba(234, 179, 8, 0.2); color: #fbbf24; }
        .badge-standard { background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .badge-premium { background-color: rgba(234, 179, 8, 0.2); color: #fbbf24; }
        .badge-vip { background-color: rgba(168, 85, 247, 0.2); color: #a78bfa; }
        .badge-pending { background-color: rgba(234, 179, 8, 0.2); color: #fbbf24; }
        .badge-approved { background-color: rgba(16, 185, 129, 0.2); color: #34d399; }
        .badge-rejected { background-color: rgba(239, 68, 68, 0.2); color: #f87171; }
        .loan-actions { display: flex; gap: 8px; }
        .btn-approve {
          background-color: #10b981; color: white;
          padding: 6px 16px; border: none; border-radius: 6px;
          cursor: pointer; font-size: 12px; font-weight: 500;
        }
        .btn-approve:hover { background-color: #059669; }
        .btn-reject {
          background-color: #ef4444; color: white;
          padding: 6px 16px; border: none; border-radius: 6px;
          cursor: pointer; font-size: 12px; font-weight: 500;
        }
        .btn-reject:hover { background-color: #dc2626; }
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
              color: "white",
              margin: 0,
            }}
          >
            Admin Dashboard
          </h2>
          <p
            style={{ fontSize: "14px", color: "#9ca3af", margin: "4px 0 0 0" }}
          >
            Welcome back, {adminUsername} 👋
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={refreshData}
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
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
          <button
            onClick={() => setShowTransactionModal(true)}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
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
              color: "white",
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
            color: activeTab === "members" ? "#34d399" : "#9ca3af",
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
            color: activeTab === "pending_loans" ? "#fbbf24" : "#9ca3af",
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
                backgroundColor: "#ef4444",
                color: "white",
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
            color: activeTab === "all_loans" ? "#a78bfa" : "#9ca3af",
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
            color: activeTab === "transactions" ? "#60a5fa" : "#9ca3af",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          💳 Transactions
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
                color: "white",
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
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                {selectedMembers.length} selected
              </span>
              {selectedMembers.length > 0 && (
                <>
                  <button
                    onClick={handleBulkSuspend}
                    style={{
                      backgroundColor: "rgba(234, 179, 8, 0.15)",
                      color: "#fbbf24",
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
                      color: "#f87171",
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
                        style={{ accentColor: "#10b981", cursor: "pointer" }}
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
                          style={{ accentColor: "#10b981", cursor: "pointer" }}
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
                              color: "#34d399",
                              fontSize: "18px",
                              fontWeight: "bold",
                              flexShrink: 0,
                            }}
                          >
                            {member.name?.charAt(0) || "U"}
                          </div>
                          <div
                            style={{
                              color: "white",
                              fontSize: "14px",
                              fontWeight: "500",
                            }}
                          >
                            {member.name}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ color: "#d1d5db", fontSize: "13px" }}>
                          {member.email}
                        </div>
                        <div style={{ color: "#9ca3af", fontSize: "12px" }}>
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
                          color: "#34d399",
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
                            gap: "4px",
                            alignItems: "center",
                          }}
                        >
                          <button
                            onClick={() => handleViewMember(member)}
                            style={{
                              color: "#60a5fa",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "18px",
                              padding: "4px 6px",
                            }}
                            title="View"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleEditMember(member)}
                            style={{
                              color: "#34d399",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "18px",
                              padding: "4px 6px",
                            }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            style={{
                              color: "#f87171",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "18px",
                              padding: "4px 6px",
                            }}
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
            <h3 style={{ color: "white", margin: 0 }}>
              ⏳ Pending Loans ({pendingLoans.length})
            </h3>
            <button
              onClick={refreshData}
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
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
                          style={{ color: "#60a5fa", fontFamily: "monospace" }}
                        >
                          #{loan.id}
                        </td>
                        <td>
                          <div style={{ color: "white" }}>
                            {member ? member.name : "Unknown"}
                          </div>
                        </td>
                        <td style={{ color: "#34d399", fontWeight: "600" }}>
                          {formatCurrency(loan.amount)}
                        </td>
                        <td style={{ color: "#fbbf24" }}>
                          {formatCurrency(loan.interest)}
                        </td>
                        <td style={{ color: "white", fontWeight: "600" }}>
                          {formatCurrency(loan.total_payable)}
                        </td>
                        <td style={{ color: "#94a3b8" }}>
                          {formatCurrency(loan.monthly_payment)}
                        </td>
                        <td style={{ color: "#94a3b8" }}>
                          {loan.duration_months} months
                        </td>
                        <td style={{ color: "#94a3b8", fontSize: "13px" }}>
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
                      <div style={{ color: "#94a3b8" }}>
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
            <h3 style={{ color: "white", margin: 0 }}>
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
                          style={{ color: "#60a5fa", fontFamily: "monospace" }}
                        >
                          #{loan.id}
                        </td>
                        <td style={{ color: "white" }}>
                          {member ? member.name : "Unknown"}
                        </td>
                        <td style={{ color: "#34d399", fontWeight: "600" }}>
                          {formatCurrency(loan.amount)}
                        </td>
                        <td style={{ color: "#fbbf24" }}>
                          {formatCurrency(loan.interest)}
                        </td>
                        <td style={{ color: "white", fontWeight: "600" }}>
                          {formatCurrency(loan.total_payable)}
                        </td>
                        <td style={{ color: "#94a3b8" }}>
                          {formatCurrency(loan.monthly_payment)}
                        </td>
                        <td>
                          <span className={`badge badge-${loan.status}`}>
                            {loan.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ color: "#94a3b8", fontSize: "13px" }}>
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
                      <div style={{ color: "#94a3b8" }}>
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
            <h3 style={{ color: "white", margin: 0 }}>
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
                    <td style={{ color: "#9ca3af", fontFamily: "monospace" }}>
                      #{transaction.id}
                    </td>
                    <td style={{ color: "white" }}>{transaction.memberName}</td>
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
                              ? "#34d399"
                              : transaction.type === "transfer"
                                ? "#a78bfa"
                                : "#f87171",
                        }}
                      >
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "white",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td style={{ color: "#fbbf24", whiteSpace: "nowrap" }}>
                      {transaction.charge > 0
                        ? `−${formatCurrency(transaction.charge)}`
                        : "—"}
                    </td>
                    <td
                      style={{
                        color: "#34d399",
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
                              ? "#34d399"
                              : transaction.status === "pending"
                                ? "#fbbf24"
                                : "#f87171",
                        }}
                      >
                        {transaction.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>
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
                        <span style={{ color: "#64748b", fontSize: "12px" }}>
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
                      <div style={{ color: "#94a3b8" }}>
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
                          color: "#94a3b8",
                          marginBottom: "6px",
                        }}
                      >
                        <span>Deposit Amount</span>
                        <span style={{ color: "white" }}>
                          {formatCurrency(amt)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          color: "#94a3b8",
                          marginBottom: "6px",
                        }}
                      >
                        <span>
                          Charge ({(rate * 100).toFixed(1)}%{" "}
                          {amt > 200000 ? "> ₦200k" : "≤ ₦200k"})
                        </span>
                        <span style={{ color: "#fbbf24" }}>
                          −{formatCurrency(charge)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "14px",
                          color: "#d1d5db",
                          fontWeight: "600",
                          borderTop: "1px solid rgba(6, 182, 212, 0.2)",
                          paddingTop: "8px",
                          marginTop: "4px",
                        }}
                      >
                        <span>Member Receives</span>
                        <span style={{ color: "#34d399" }}>
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
    </div>
  );
};

export default AdminDashboard;
