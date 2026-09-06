import React, { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:8000";

const AdminDashboard = () => {
  const [adminUsername, setAdminUsername] = useState("Admin");
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("members");

  // Form states
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

  // Format currency in Nigerian Naira
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format currency without ₦ symbol (for display in inputs)
  const formatNumber = (amount) => {
    if (!amount && amount !== 0) return "0";
    return new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Test API connection
  const testApiConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin.php`);
      if (response.ok) {
        console.log("✅ API Connection successful");
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ API Connection failed:", error);
      return false;
    }
  };

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchAllData();
      toast.success("Data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    try {
      // Test connection
      const isConnected = await testApiConnection();
      if (!isConnected) {
        throw new Error(
          "Cannot connect to API server. Please check if the server is running on port 8000.",
        );
      }

      // Fetch admin profile
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin.php`);
        const adminData = await response.json();
        console.log("Admin data:", adminData);
        if (adminData.username) {
          setAdminUsername(adminData.username);
        }
      } catch (profileError) {
        console.log("Using default admin name");
        setAdminUsername("Admin");
      }

      // Fetch members
      try {
        const response = await fetch(`${API_BASE_URL}/api/members.php`);
        const membersData = await response.json();
        console.log("Members data:", membersData);
        if (membersData.members) {
          setMembers(membersData.members);
        }
      } catch (membersError) {
        console.error("Error fetching members:", membersError);
        setMembers([]);
      }

      // Fetch transactions
      try {
        const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
        const transactionsData = await response.json();
        console.log("Transactions data:", transactionsData);
        if (transactionsData.transactions) {
          setTransactions(transactionsData.transactions);
        }
      } catch (transactionsError) {
        console.error("Error fetching transactions:", transactionsError);
        setTransactions([]);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      throw error;
    }
  };

  // Fetch all data on component mount
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

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers([]);
    } else {
      const allIds = filteredMembers.map((m) => m.id);
      setSelectedMembers(allIds);
    }
    setSelectAll(!selectAll);
  };

  // Handle select single member
  const handleSelectMember = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((mId) => mId !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  // Bulk Suspend
  const handleBulkSuspend = async () => {
    if (selectedMembers.length === 0) {
      alert("Please select at least one member to suspend");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to suspend ${selectedMembers.length} member(s)?`,
      )
    ) {
      return;
    }

    try {
      for (const id of selectedMembers) {
        const member = members.find((m) => m.id === id);
        if (member) {
          const response = await fetch(
            `${API_BASE_URL}/api/members.php/${id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...member,
                status: "Suspended",
                suspension_reason: "Bulk suspension by admin",
                suspended_date: new Date().toISOString().split("T")[0],
                suspended_by: "Admin",
              }),
            },
          );
          if (!response.ok) {
            console.error(`Failed to suspend member ${id}`);
          }
        }
      }
      alert(`✅ ${selectedMembers.length} member(s) suspended successfully!`);
      setSelectedMembers([]);
      setSelectAll(false);
      refreshData();
    } catch (error) {
      console.error("Error suspending members:", error);
      alert("Failed to suspend members. Please try again.");
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) {
      alert("Please select at least one member to delete");
      return;
    }

    if (
      !window.confirm(
        `⚠️ Are you sure you want to permanently delete ${selectedMembers.length} member(s)? This action cannot be undone!`,
      )
    ) {
      return;
    }

    try {
      for (const id of selectedMembers) {
        const response = await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          console.error(`Failed to delete member ${id}`);
        }
      }
      alert(`✅ ${selectedMembers.length} member(s) deleted successfully!`);
      setSelectedMembers([]);
      setSelectAll(false);
      refreshData();
    } catch (error) {
      console.error("Error deleting members:", error);
      alert("Failed to delete members. Please try again.");
    }
  };

  // Generate account number
  const generateAccountNumber = () => {
    const prefix = "10";
    const randomDigits = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
    return prefix + randomDigits;
  };

  // Stats
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
      icon: "⏳",
      label: "Pending Approvals",
      value: transactions
        .filter((t) => t.status === "pending")
        .length.toString(),
      color: "blue",
    },
    {
      icon: "🔄",
      label: "Total Transactions",
      value: transactions.length.toString(),
      color: "purple",
    },
  ];

  const colorMap = {
    emerald: "bg-green-500/20 text-green-400",
    gold: "bg-yellow-500/20 text-yellow-400",
    blue: "bg-blue-500/20 text-blue-400",
    purple: "bg-purple-500/20 text-purple-400",
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.accountNumber?.includes(searchTerm),
  );

  const pendingTransactions = transactions.filter(
    (t) => t.status === "pending",
  );

  // Create Member
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
      console.error("Error creating member:", error);
      alert("Failed to create member. Please try again.");
    }
  };

  // Transaction
  const handleTransaction = async (e) => {
    e.preventDefault();
    const member = members.find(
      (m) => m.id === parseInt(transactionData.memberId),
    );
    if (!member) {
      alert("Member not found!");
      return;
    }

    // Check if member has an account number
    if (!member.accountNumber || member.accountNumber === "") {
      alert(
        `⚠️ Member "${member.name}" does not have an account number. Please update the member profile first.`,
      );
      return;
    }

    const amount = parseFloat(transactionData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    if (transactionData.type === "withdrawal" && amount > member.balance) {
      alert(
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

    console.log("📤 Sending transaction:", transaction);

    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
      });

      const data = await response.json();
      console.log("📥 Response:", data);

      if (response.ok) {
        setTransactions([...transactions, data.transaction]);
        setShowTransactionModal(false);
        setTransactionData({
          memberId: "",
          type: "deposit",
          amount: "",
          description: "",
        });
        alert(`✅ ${transactionData.type} request submitted for approval!`);
      } else {
        alert(data.error || data.message || "Failed to submit transaction");
        console.error("❌ Error response:", data);
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      alert("Failed to submit transaction. Please try again.");
    }
  };

  // Transfer
  const handleTransfer = async (e) => {
    e.preventDefault();
    const fromMember = members.find(
      (m) => m.id === parseInt(transferData.fromMemberId),
    );
    const toMember = members.find(
      (m) => m.id === parseInt(transferData.toMemberId),
    );

    if (!fromMember || !toMember) {
      alert("Please select valid members!");
      return;
    }

    if (fromMember.id === toMember.id) {
      alert("Cannot transfer to the same member!");
      return;
    }

    if (!fromMember.accountNumber || fromMember.accountNumber === "") {
      alert(
        `⚠️ Member "${fromMember.name}" does not have an account number. Please update the member profile first.`,
      );
      return;
    }

    if (!toMember.accountNumber || toMember.accountNumber === "") {
      alert(
        `⚠️ Member "${toMember.name}" does not have an account number. Please update the member profile first.`,
      );
      return;
    }

    const amount = parseFloat(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    if (amount > fromMember.balance) {
      alert(
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
      description: `Transfer to ${toMember.name}`,
    };

    console.log("📤 Sending transfer:", transfer);

    try {
      const response = await fetch(`${API_BASE_URL}/api/transfers.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transfer),
      });

      const data = await response.json();
      console.log("📥 Transfer response:", data);

      if (response.ok) {
        // Add the new transaction to the list
        const newTransaction = {
          ...data.transaction,
          id: data.transaction?.id || Date.now(),
          memberName: fromMember.name,
          accountNumber: fromMember.accountNumber,
          type: "transfer",
          status: "pending",
          date: new Date().toISOString().split("T")[0],
          description: `Transfer to ${toMember.name}`,
        };
        setTransactions([...transactions, newTransaction]);
        setShowTransferModal(false);
        setTransferData({
          fromMemberId: "",
          toMemberId: "",
          amount: "",
          description: "",
        });
        alert(`✅ Transfer request submitted for approval!`);
      } else {
        alert(data.error || data.message || "Failed to submit transfer");
        console.error("❌ Error response:", data);
      }
    } catch (error) {
      console.error("Error submitting transfer:", error);
      alert("Failed to submit transfer. Please try again.");
    }
  };

  // Approve Transaction
  const handleApproveTransaction = async (transactionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php/${transactionId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await response.json();
      if (response.ok) {
        const updatedTransactions = transactions.map((t) =>
          t.id === transactionId ? { ...t, status: "approved" } : t,
        );
        setTransactions(updatedTransactions);
        alert(`✅ Transaction approved successfully!`);
      } else {
        alert(data.message || "Failed to approve transaction");
      }
    } catch (error) {
      console.error("Error approving transaction:", error);
      alert("Failed to approve transaction. Please try again.");
    }
  };

  // Reject Transaction
  const handleRejectTransaction = async (transactionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php/${transactionId}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await response.json();
      if (response.ok) {
        const updatedTransactions = transactions.map((t) =>
          t.id === transactionId ? { ...t, status: "rejected" } : t,
        );
        setTransactions(updatedTransactions);
        alert(`❌ Transaction rejected!`);
      } else {
        alert(data.message || "Failed to reject transaction");
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      alert("Failed to reject transaction. Please try again.");
    }
  };

  // Edit Member
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
        alert("✅ Member updated successfully!");
      } else {
        alert(data.message || "Failed to update member");
      }
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Failed to update member. Please try again.");
    }
  };

  // Delete Member
  const handleDeleteMember = async (id) => {
    if (window.confirm("⚠️ Are you sure you want to delete this member?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          setMembers(members.filter((member) => member.id !== id));
          alert("✅ Member deleted successfully!");
        } else {
          const data = await response.json();
          alert(data.message || "Failed to delete member");
        }
      } catch (error) {
        console.error("Error deleting member:", error);
        alert("Failed to delete member. Please try again.");
      }
    }
  };

  // View Member
  const handleViewMember = (member) => {
    setSelectedMember(member);
    setShowViewModal(true);
  };

  // Error state
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

  // Loading state
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

  // Main render
  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#0f172a",
        minHeight: "100vh",
      }}
    >
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
            style={{
              fontSize: "14px",
              color: "#9ca3af",
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
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              padding: "10px 20px",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(59, 130, 246, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
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
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: "#10b981",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ➕ New Member
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(10px)",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  backgroundColor: colorMap[stat.color].split(" ")[0],
                  color: colorMap[stat.color].split(" ")[1],
                }}
              >
                <span style={{ fontSize: "24px" }}>{stat.icon}</span>
              </div>
              <div>
                <p
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    margin: "0 0 4px 0",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "white",
                    margin: 0,
                  }}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
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
        }}
      >
        <button
          onClick={() => setActiveTab("members")}
          style={{
            flex: 1,
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
          onClick={() => setActiveTab("pending")}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor:
              activeTab === "pending"
                ? "rgba(59, 130, 246, 0.2)"
                : "transparent",
            color: activeTab === "pending" ? "#60a5fa" : "#9ca3af",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            position: "relative",
          }}
        >
          ⏳ Pending Approvals
          {pendingTransactions.length > 0 && (
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
              }}
            >
              {pendingTransactions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor:
              activeTab === "transactions"
                ? "rgba(139, 92, 246, 0.2)"
                : "transparent",
            color: activeTab === "transactions" ? "#a78bfa" : "#9ca3af",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          📊 All Transactions
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
              placeholder="🔍 Search by name, email, or account number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                outline: "none",
                fontSize: "14px",
              }}
            />
          </div>

          {/* Bulk Actions */}
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
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(234, 179, 8, 0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(234, 179, 8, 0.15)";
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
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(239, 68, 68, 0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor =
                        "rgba(239, 68, 68, 0.15)";
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
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}>
                  <tr>
                    <th
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#9ca3af",
                        width: "40px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        style={{
                          width: "16px",
                          height: "16px",
                          accentColor: "#10b981",
                          cursor: "pointer",
                        }}
                      />
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#9ca3af",
                      }}
                    >
                      Account
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#9ca3af",
                      }}
                    >
                      Member
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#9ca3af",
                      }}
                    >
                      Contact
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#9ca3af",
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#9ca3af",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#9ca3af",
                      }}
                    >
                      Balance
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#9ca3af",
                      }}
                    >
                      Actions
                    </th>
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
                      <td
                        style={{
                          padding: "12px 20px",
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          style={{
                            width: "16px",
                            height: "16px",
                            accentColor: "#10b981",
                            cursor: "pointer",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "12px 20px",
                          color: "#60a5fa",
                          fontFamily: "monospace",
                        }}
                      >
                        {member.accountNumber}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div
                            style={{
                              height: "40px",
                              width: "40px",
                              borderRadius: "50%",
                              backgroundColor: "rgba(16, 185, 129, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#34d399",
                              fontWeight: "bold",
                            }}
                          >
                            {member.name?.charAt(0) || "U"}
                          </div>
                          <div style={{ marginLeft: "12px" }}>
                            <div style={{ color: "white" }}>{member.name}</div>
                            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                              Joined: {member.joinDate}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ color: "#d1d5db" }}>{member.email}</div>
                        <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                          {member.phone}
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            fontSize: "12px",
                            borderRadius: "20px",
                            backgroundColor:
                              member.membershipType === "Premium"
                                ? "rgba(234, 179, 8, 0.2)"
                                : member.membershipType === "VIP"
                                  ? "rgba(168, 85, 247, 0.2)"
                                  : "rgba(59, 130, 246, 0.2)",
                            color:
                              member.membershipType === "Premium"
                                ? "#fbbf24"
                                : member.membershipType === "VIP"
                                  ? "#a78bfa"
                                  : "#60a5fa",
                          }}
                        >
                          {member.membershipType}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            fontSize: "12px",
                            borderRadius: "20px",
                            backgroundColor:
                              member.status === "Active"
                                ? "rgba(16, 185, 129, 0.2)"
                                : "rgba(239, 68, 68, 0.2)",
                            color:
                              member.status === "Active"
                                ? "#34d399"
                                : "#f87171",
                          }}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 20px",
                          color: "#34d399",
                          fontWeight: "600",
                        }}
                      >
                        {formatCurrency(member.balance)}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleViewMember(member)}
                            style={{
                              color: "#60a5fa",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
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
                            }}
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
                            }}
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

      {/* Pending Approvals Tab */}
      {activeTab === "pending" && (
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
              ⏳ Pending Approvals ({pendingTransactions.length})
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}>
                <tr>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Member
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Amount
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
                  >
                    <td
                      style={{
                        padding: "12px 20px",
                        color: "#9ca3af",
                        fontFamily: "monospace",
                      }}
                    >
                      #{transaction.id}
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ color: "white" }}>
                        {transaction.memberName}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                          fontFamily: "monospace",
                        }}
                      >
                        {transaction.accountNumber}
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          fontSize: "12px",
                          borderRadius: "20px",
                          backgroundColor:
                            transaction.type === "deposit"
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(239, 68, 68, 0.2)",
                          color:
                            transaction.type === "deposit"
                              ? "#34d399"
                              : "#f87171",
                        }}
                      >
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 20px",
                        color: "white",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td style={{ padding: "12px 20px", color: "#9ca3af" }}>
                      {transaction.date}
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() =>
                            handleApproveTransaction(transaction.id)
                          }
                          style={{
                            backgroundColor: "#10b981",
                            color: "white",
                            padding: "6px 16px",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() =>
                            handleRejectTransaction(transaction.id)
                          }
                          style={{
                            backgroundColor: "#ef4444",
                            color: "white",
                            padding: "6px 16px",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Transactions Tab */}
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
            }}
          >
            <h3 style={{ color: "white", margin: 0 }}>
              📊 All Transactions ({transactions.length})
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}>
                <tr>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Member
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Amount
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#9ca3af",
                    }}
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
                  >
                    <td
                      style={{
                        padding: "12px 20px",
                        color: "#9ca3af",
                        fontFamily: "monospace",
                      }}
                    >
                      #{transaction.id}
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ color: "white" }}>
                        {transaction.memberName}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#9ca3af",
                          fontFamily: "monospace",
                        }}
                      >
                        {transaction.accountNumber}
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          fontSize: "12px",
                          borderRadius: "20px",
                          backgroundColor:
                            transaction.type === "deposit"
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(239, 68, 68, 0.2)",
                          color:
                            transaction.type === "deposit"
                              ? "#34d399"
                              : "#f87171",
                        }}
                      >
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 20px",
                        color: "white",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td style={{ padding: "12px 20px" }}>
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
                    <td style={{ padding: "12px 20px", color: "#9ca3af" }}>
                      {transaction.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Create Member Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ color: "white", margin: "0 0 24px 0" }}>
              Create New Member
            </h3>
            <form onSubmit={handleCreateMember}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Phone
                </label>
                <input
                  type="text"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Membership Type
                </label>
                <select
                  value={newMember.membershipType}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      membershipType: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                >
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Initial Balance (₦)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newMember.balance}
                  onChange={(e) =>
                    setNewMember({ ...newMember, balance: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                  placeholder="0.00"
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent",
                    color: "#9ca3af",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#10b981",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ color: "white", margin: "0 0 24px 0" }}>
              Edit Member
            </h3>
            <form onSubmit={handleUpdateMember}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={selectedMember.name || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      name: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={selectedMember.email || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      email: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Phone
                </label>
                <input
                  type="text"
                  value={selectedMember.phone || ""}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      phone: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Status
                </label>
                <select
                  value={selectedMember.status || "Active"}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      status: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Balance (₦)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedMember.balance || 0}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      balance: parseFloat(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent",
                    color: "#9ca3af",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Update Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Member Modal */}
      {showViewModal && selectedMember && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <h3 style={{ color: "white", margin: "0 0 24px 0" }}>
              Member Details
            </h3>
            <div style={{ color: "#d1d5db" }}>
              <p>
                <strong>Name:</strong> {selectedMember.name}
              </p>
              <p>
                <strong>Email:</strong> {selectedMember.email}
              </p>
              <p>
                <strong>Phone:</strong> {selectedMember.phone}
              </p>
              <p>
                <strong>Account:</strong> {selectedMember.accountNumber}
              </p>
              <p>
                <strong>Type:</strong> {selectedMember.membershipType}
              </p>
              <p>
                <strong>Status:</strong> {selectedMember.status}
              </p>
              <p>
                <strong>Balance:</strong>{" "}
                {formatCurrency(selectedMember.balance)}
              </p>
              <p>
                <strong>Joined:</strong> {selectedMember.joinDate}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "24px",
              }}
            >
              <button
                onClick={() => setShowViewModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <h3 style={{ color: "white", margin: "0 0 24px 0" }}>
              New Transaction
            </h3>
            <form onSubmit={handleTransaction}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Member *
                </label>
                <select
                  required
                  value={transactionData.memberId}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      memberId: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option
                      key={member.id}
                      value={member.id}
                      style={{ backgroundColor: "#1e293b", color: "white" }}
                    >
                      {member.name} - {member.accountNumber} (
                      {formatCurrency(member.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Type *
                </label>
                <select
                  required
                  value={transactionData.type}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      type: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Amount (₦) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="1"
                  value={transactionData.amount}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      amount: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                  placeholder="0.00"
                />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Description
                </label>
                <textarea
                  value={transactionData.description}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      description: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                    minHeight: "80px",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent",
                    color: "#9ca3af",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
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
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <h3 style={{ color: "white", margin: "0 0 24px 0" }}>
              Transfer Funds
            </h3>
            <form onSubmit={handleTransfer}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  From Member *
                </label>
                <select
                  required
                  value={transferData.fromMemberId}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      fromMemberId: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option
                      key={member.id}
                      value={member.id}
                      style={{ backgroundColor: "#1e293b", color: "white" }}
                    >
                      {member.name} - {formatCurrency(member.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  To Member *
                </label>
                <select
                  required
                  value={transferData.toMemberId}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      toMemberId: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option
                      key={member.id}
                      value={member.id}
                      style={{ backgroundColor: "#1e293b", color: "white" }}
                    >
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Amount (₦) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="1"
                  value={transferData.amount}
                  onChange={(e) =>
                    setTransferData({ ...transferData, amount: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                  }}
                  placeholder="0.00"
                />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Description
                </label>
                <textarea
                  value={transferData.description}
                  onChange={(e) =>
                    setTransferData({
                      ...transferData,
                      description: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                    minHeight: "80px",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent",
                    color: "#9ca3af",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
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
