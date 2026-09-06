// src/components/admin/Members.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [commissionData, setCommissionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMember, setNewMember] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    initial_balance: "",
  });
  const [selectedMemberTransactions, setSelectedMemberTransactions] =
    useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    memberId: "",
    type: "deposit",
    amount: "",
    description: "",
    status: "pending",
  });
  const [transactionHistoryTab, setTransactionHistoryTab] =
    useState("transactions");

  // Phone number validation function - exactly 11 digits starting with 0
  const validatePhoneNumber = (phone) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 11) return false;
    if (!cleanPhone.startsWith("0")) return false;
    const validPrefixes = ["080", "081", "070", "090", "091"];
    const firstThree = cleanPhone.substring(0, 3);
    if (!validPrefixes.includes(firstThree)) return false;
    return true;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11 && clean.startsWith("0")) {
      return `${clean.substring(0, 4)} ${clean.substring(4, 7)} ${clean.substring(7)}`;
    }
    return phone;
  };

  const generateEmailFromName = (fullName) => {
    if (!fullName || fullName.trim() === "") return "";
    const name = fullName.trim();
    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0].toLowerCase();
    const lastName =
      nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : "";
    let email = firstName;
    if (lastName && lastName !== firstName) {
      email = `${firstName}.${lastName}`;
    }
    return `${email}@osittech.com`;
  };

  const isPhoneNumberExists = (phone, excludeId = null) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, "");
    return members.some((m) => {
      const memberPhone = m.phone ? m.phone.replace(/\D/g, "") : "";
      return memberPhone === cleanPhone && m.id !== excludeId;
    });
  };

  const handleFullNameChange = (e) => {
    const fullName = e.target.value;
    setNewMember({
      ...newMember,
      full_name: fullName,
      email: generateEmailFromName(fullName),
    });
  };

  useEffect(() => {
    fetchMembers();
    fetchTransactions();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      if (!response.ok) throw new Error("Failed to fetch members");
      const data = await response.json();

      if (data.members) {
        const formattedMembers = data.members.map((member) => ({
          id: member.id,
          membership_number:
            member.accountNumber || `MEM-${String(member.id).padStart(4, "0")}`,
          full_name: member.name,
          email: member.email,
          phone: member.phone,
          balance: member.balance || 0,
          status: member.status?.toLowerCase() || "active",
          join_date: member.joinDate || new Date().toISOString().split("T")[0],
          password: member.password || "",
          commission_rate: member.commission_rate || 5,
          total_commission: member.total_commission || 0,
        }));
        setMembers(formattedMembers);
        // Fetch commission for each member
        formattedMembers.forEach((member) => {
          fetchMemberCommission(member.id);
        });
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to fetch members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();

      if (data.transactions) {
        const formattedTransactions = data.transactions.map((transaction) => ({
          id: transaction.id,
          member_id: transaction.memberId,
          transaction_type: transaction.type,
          amount: transaction.amount,
          status: transaction.status,
          description: transaction.description || "",
          commission: transaction.commission || 0,
          created_at: transaction.date || new Date().toISOString(),
        }));
        setTransactions(formattedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    }
  };

  const fetchMemberCommission = async (memberId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/member-commission.php?member_id=${memberId}`,
      );
      const data = await response.json();
      setCommissionData((prev) => ({
        ...prev,
        [memberId]: data,
      }));
    } catch (error) {
      console.error("Error fetching commission:", error);
      // Set default commission data on error
      setCommissionData((prev) => ({
        ...prev,
        [memberId]: {
          total: 0,
          monthly: 0,
          pending: 0,
          history: [],
        },
      }));
    }
  };

  const getMemberTransactions = (memberId) => {
    const allTransactions = transactions.filter(
      (t) => t.member_id === memberId,
    );
    if (transactionFilter === "All") return allTransactions;
    return allTransactions.filter(
      (t) => t.transaction_type === transactionFilter.toLowerCase(),
    );
  };

  const getMemberCommissionHistory = (memberId) => {
    const memberCommData = commissionData[memberId];
    if (!memberCommData) return [];
    return memberCommData.history || [];
  };

  const getMemberTotalCommission = (memberId) => {
    const memberCommData = commissionData[memberId];
    if (!memberCommData) return 0;
    return memberCommData.total || 0;
  };

  const getMemberMonthlyCommission = (memberId) => {
    const memberCommData = commissionData[memberId];
    if (!memberCommData) return 0;
    return memberCommData.monthly || 0;
  };

  const getMemberPendingCommission = (memberId) => {
    const memberCommData = commissionData[memberId];
    if (!memberCommData) return 0;
    return memberCommData.pending || 0;
  };

  const getMemberCommissionRate = (memberId) => {
    const member = members.find((m) => m.id === memberId);
    return member?.commission_rate || 5;
  };

  // Add new member
  const handleAddMember = async (e) => {
    e.preventDefault();

    if (!validatePhoneNumber(newMember.phone)) {
      toast.error(
        "Please enter a valid 11-digit phone number starting with 0 (e.g., 08012345678)",
      );
      return;
    }

    if (isPhoneNumberExists(newMember.phone)) {
      toast.error(
        "This phone number is already registered. Please use a different number.",
      );
      return;
    }

    if (!newMember.password || newMember.password.length < 8) {
      toast.error(
        "Password is required and must be at least 8 characters long",
      );
      return;
    }

    if (!newMember.full_name || newMember.full_name.trim().length < 2) {
      toast.error("Full name is required and must be at least 2 characters");
      return;
    }

    let email = newMember.email;
    if (!email || email.trim() === "") {
      email = generateEmailFromName(newMember.full_name);
    }

    const accountNumber = `10${Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0")}`;
    const memberData = {
      accountNumber: accountNumber,
      name: newMember.full_name,
      email: email,
      phone: newMember.phone,
      membershipType: "Standard",
      joinDate: new Date().toISOString().split("T")[0],
      status: "Active",
      balance: parseFloat(newMember.initial_balance) || 0,
      password: newMember.password,
      commission_rate: 5,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberData),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("✅ Member created successfully!");
        setShowAddModal(false);
        setNewMember({
          full_name: "",
          email: "",
          phone: "",
          password: "",
          initial_balance: "",
        });
        fetchMembers();
      } else {
        toast.error(data.message || "Failed to create member");
      }
    } catch (error) {
      console.error("Error creating member:", error);
      toast.error("Failed to create member");
    }
  };

  // Edit member
  const handleEditMember = (member) => {
    setSelectedMember(member);
    setShowEditModal(true);
  };

  // Update member
  const handleUpdateMember = async (e) => {
    e.preventDefault();

    if (selectedMember.phone && !validatePhoneNumber(selectedMember.phone)) {
      toast.error("Please enter a valid 11-digit phone number starting with 0");
      return;
    }

    if (
      selectedMember.phone &&
      isPhoneNumberExists(selectedMember.phone, selectedMember.id)
    ) {
      toast.error("This phone number is already registered to another member.");
      return;
    }

    if (
      selectedMember.password &&
      selectedMember.password.length > 0 &&
      selectedMember.password.length < 8
    ) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (
      !selectedMember.full_name ||
      selectedMember.full_name.trim().length < 2
    ) {
      toast.error("Full name must be at least 2 characters");
      return;
    }

    try {
      const updateData = {
        name: selectedMember.full_name,
        email: selectedMember.email,
        phone: selectedMember.phone,
        balance: selectedMember.balance,
        status: selectedMember.status,
        commission_rate: selectedMember.commission_rate,
      };

      if (selectedMember.password && selectedMember.password.length >= 8) {
        updateData.password = selectedMember.password;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/members.php/${selectedMember.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        },
      );

      const data = await response.json();
      if (response.ok) {
        toast.success("✅ Member updated successfully!");
        setShowEditModal(false);
        setSelectedMember(null);
        fetchMembers();
      } else {
        toast.error(data.message || "Failed to update member");
      }
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    }
  };

  // Delete member
  const handleDeleteMember = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("✅ Member deleted successfully!");
        fetchMembers();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete member");
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Failed to delete member");
    }
  };

  // Add transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();

    const member = members.find(
      (m) => m.id === parseInt(newTransaction.memberId),
    );
    if (!member) {
      toast.error("Member not found");
      return;
    }

    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    const transaction = {
      memberId: parseInt(newTransaction.memberId),
      memberName: member.full_name,
      accountNumber: member.membership_number,
      type: newTransaction.type,
      amount: parseFloat(newTransaction.amount),
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      description: newTransaction.description,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("✅ Transaction added successfully!");
        setShowAddTransactionModal(false);
        setNewTransaction({
          memberId: "",
          type: "deposit",
          amount: "",
          description: "",
          status: "pending",
        });
        fetchMembers();
        fetchTransactions();
      } else {
        toast.error(data.message || "Failed to add transaction");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  // Approve transaction
  const handleApproveTransaction = async (transactionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php/${transactionId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        toast.success("✅ Transaction approved!");
        fetchTransactions();
        fetchMembers();
      } else {
        toast.error("Failed to approve transaction");
      }
    } catch (error) {
      console.error("Error approving transaction:", error);
      toast.error("Failed to approve transaction");
    }
  };

  // Reject transaction
  const handleRejectTransaction = async (transactionId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions.php/${transactionId}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        toast.success("✅ Transaction rejected!");
        fetchTransactions();
      } else {
        toast.error("Failed to reject transaction");
      }
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      toast.error("Failed to reject transaction");
    }
  };

  // View transaction history
  const handleViewTransactions = (member) => {
    setSelectedMemberTransactions(member);
    setShowTransactionModal(true);
    setTransactionFilter("All");
    setTransactionHistoryTab("transactions");
  };

  // Filter members based on search
  const filteredMembers = members.filter(
    (member) =>
      (member.full_name &&
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.email &&
        member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.membership_number &&
        member.membership_number.includes(searchTerm)) ||
      (member.phone && member.phone.includes(searchTerm)),
  );

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
      case "inactive":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" };
      case "suspended":
        return { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" };
      default:
        return { bg: "rgba(255, 255, 255, 0.1)", color: "#9ca3af" };
    }
  };

  // Get transaction type color
  const getTransactionTypeColor = (type) => {
    switch (type) {
      case "deposit":
      case "contribution":
        return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399", icon: "💰" };
      case "withdrawal":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171", icon: "🏦" };
      case "transfer":
      case "transfer_in":
      case "transfer_out":
        return { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", icon: "🔄" };
      default:
        return { bg: "rgba(255, 255, 255, 0.1)", color: "#9ca3af", icon: "💳" };
    }
  };

  // Get transaction status color
  const getTransactionStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "approved":
        return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
      case "pending":
        return { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" };
      case "failed":
      case "rejected":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" };
      default:
        return { bg: "rgba(255, 255, 255, 0.1)", color: "#9ca3af" };
    }
  };

  // Format date
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
            borderTopColor: "#10b981",
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
        <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
          👥 Members Management
        </h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowAddTransactionModal(true)}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#2563eb")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#3b82f6")}
          >
            + Add Transaction
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: "#10b981",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#059669")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#10b981")}
          >
            + Add New Member
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search members by name, email, phone or membership number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            outline: "none",
            fontSize: "14px",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#10b981")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />
      </div>

      {/* Members Table */}
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              <tr>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Membership
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Member
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Contact
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Joined
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Balance
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  💸 Commission
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
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
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#60a5fa",
                        fontFamily: "monospace",
                      }}
                    >
                      {member.membership_number || "N/A"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(16, 185, 129, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#34d399",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        {(member.full_name || "U").charAt(0)}
                      </div>
                      <div>
                        <div
                          style={{
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                        >
                          {member.full_name || "Unknown"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "14px", color: "#d1d5db" }}>
                      {member.email || "N/A"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {formatPhoneNumber(member.phone)}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {formatDate(member.join_date)}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        borderRadius: "20px",
                        backgroundColor: getStatusColor(member.status).bg,
                        color: getStatusColor(member.status).color,
                      }}
                    >
                      {member.status || "N/A"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#34d399",
                    }}
                  >
                    ₦{parseFloat(member.balance || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#fbbf24",
                      }}
                    >
                      ₦{getMemberTotalCommission(member.id).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>
                      Rate: {getMemberCommissionRate(member.id)}%
                    </div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>
                      Monthly: ₦
                      {getMemberMonthlyCommission(member.id).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      <button
                        onClick={() => handleViewTransactions(member)}
                        style={{
                          color: "#60a5fa",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          transition: "background-color 0.3s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor =
                            "rgba(96, 165, 250, 0.1)")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                      >
                        📊 History
                      </button>
                      <button
                        onClick={() => handleEditMember(member)}
                        style={{
                          color: "#34d399",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          transition: "background-color 0.3s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor =
                            "rgba(52, 211, 153, 0.1)")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        style={{
                          color: "#f87171",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          transition: "background-color 0.3s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor =
                            "rgba(248, 113, 113, 0.1)")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}
          >
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>📭</div>
            <p>No members found</p>
            <p style={{ fontSize: "14px" }}>
              Try adjusting your search or add a new member
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          justifyContent: "space-between",
          color: "#9ca3af",
          fontSize: "14px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span>Total Members: {filteredMembers.length}</span>
        <span>
          Active: {members.filter((m) => m.status === "active").length}
        </span>
        <span>
          Inactive: {members.filter((m) => m.status === "inactive").length}
        </span>
        <span>
          Total Commission: ₦
          {members
            .reduce((sum, m) => sum + getMemberTotalCommission(m.id), 0)
            .toLocaleString()}
        </span>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "32px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "white",
                  margin: 0,
                }}
              >
                Add New Member
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  color: "#9ca3af",
                  background: "none",
                  border: "none",
                  fontSize: "28px",
                  cursor: "pointer",
                  padding: "0 8px",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddMember}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newMember.full_name}
                    onChange={handleFullNameChange}
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Enter full name"
                    minLength={2}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Email Address *
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
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Email auto-generated from name"
                  />
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Auto-generated from full name (or enter custom)
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newMember.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      const limitedValue = value.slice(0, 11);
                      setNewMember({ ...newMember, phone: limitedValue });
                    }}
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="08012345678"
                    maxLength={11}
                  />
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Must be exactly 11 digits starting with 0 (e.g.,
                    08012345678) - Unique
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newMember.password}
                    onChange={(e) =>
                      setNewMember({ ...newMember, password: e.target.value })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Enter password (minimum 8 characters)"
                    minLength={8}
                  />
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Password must be at least 8 characters
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Initial Balance (₦)
                  </label>
                  <input
                    type="number"
                    value={newMember.initial_balance}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        initial_balance: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Enter initial balance"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: "#10b981",
                    color: "white",
                    padding: "10px",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.3s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#059669")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#10b981")
                  }
                >
                  Create Member
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "white",
                    padding: "10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
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
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "32px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "white",
                  margin: 0,
                }}
              >
                Edit Member
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  color: "#9ca3af",
                  background: "none",
                  border: "none",
                  fontSize: "28px",
                  cursor: "pointer",
                  padding: "0 8px",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateMember}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Membership Number
                  </label>
                  <input
                    type="text"
                    value={selectedMember.membership_number || "N/A"}
                    disabled
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      color: "#9ca3af",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.05)",
                      fontSize: "14px",
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={selectedMember.full_name || ""}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        full_name: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Enter full name"
                    minLength={2}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={selectedMember.email || ""}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        email: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={selectedMember.phone || ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      const limitedValue = value.slice(0, 11);
                      setSelectedMember({
                        ...selectedMember,
                        phone: limitedValue,
                      });
                    }}
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="08012345678"
                    maxLength={11}
                  />
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Must be exactly 11 digits starting with 0 - Must be unique
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Balance (₦)
                  </label>
                  <input
                    type="number"
                    value={selectedMember.balance || 0}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        balance: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    min="0"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    value={selectedMember.commission_rate || 5}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        commission_rate: parseFloat(e.target.value) || 5,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    min="0"
                    max="100"
                  />
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Commission rate for this member (0-100%)
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={selectedMember.password || ""}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        password: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Enter new password (min 8 characters)"
                    minLength={8}
                  />
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Password must be at least 8 characters if changed
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={selectedMember.status || "active"}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        status: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  >
                    <option
                      value="active"
                      style={{ backgroundColor: "#1e293b" }}
                    >
                      Active
                    </option>
                    <option
                      value="inactive"
                      style={{ backgroundColor: "#1e293b" }}
                    >
                      Inactive
                    </option>
                    <option
                      value="suspended"
                      style={{ backgroundColor: "#1e293b" }}
                    >
                      Suspended
                    </option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: "#10b981",
                    color: "white",
                    padding: "10px",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.3s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#059669")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#10b981")
                  }
                >
                  Update Member
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "white",
                    padding: "10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History Modal with Commission Tab */}
      {showTransactionModal && selectedMemberTransactions && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "32px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
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
              <div>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "white",
                    margin: 0,
                  }}
                >
                  📊 Member Details
                </h3>
                <p
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                    margin: "4px 0 0 0",
                  }}
                >
                  {selectedMemberTransactions.full_name || "Member"} •{" "}
                  {selectedMemberTransactions.membership_number || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setShowTransactionModal(false)}
                style={{
                  color: "#9ca3af",
                  background: "none",
                  border: "none",
                  fontSize: "28px",
                  cursor: "pointer",
                  padding: "0 8px",
                }}
              >
                ×
              </button>
            </div>

            {/* Balance Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                }}
              >
                <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                  Balance
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#34d399",
                  }}
                >
                  ₦
                  {parseFloat(
                    selectedMemberTransactions.balance || 0,
                  ).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "rgba(251, 191, 36, 0.1)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(251, 191, 36, 0.2)",
                }}
              >
                <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                  Total Commission
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#fbbf24",
                  }}
                >
                  ₦
                  {getMemberTotalCommission(
                    selectedMemberTransactions.id,
                  ).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "rgba(96, 165, 250, 0.1)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(96, 165, 250, 0.2)",
                }}
              >
                <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                  Commission Rate
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#60a5fa",
                  }}
                >
                  {getMemberCommissionRate(selectedMemberTransactions.id)}%
                </div>
              </div>
            </div>

            {/* Tab Buttons */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setTransactionHistoryTab("transactions")}
                style={{
                  backgroundColor:
                    transactionHistoryTab === "transactions"
                      ? "#10b981"
                      : "rgba(255,255,255,0.08)",
                  color:
                    transactionHistoryTab === "transactions"
                      ? "white"
                      : "#d1d5db",
                  padding: "6px 16px",
                  border:
                    transactionHistoryTab === "transactions"
                      ? "none"
                      : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "all 0.3s",
                }}
              >
                📊 Transactions
              </button>
              <button
                onClick={() => setTransactionHistoryTab("commission")}
                style={{
                  backgroundColor:
                    transactionHistoryTab === "commission"
                      ? "#fbbf24"
                      : "rgba(255,255,255,0.08)",
                  color:
                    transactionHistoryTab === "commission"
                      ? "white"
                      : "#d1d5db",
                  padding: "6px 16px",
                  border:
                    transactionHistoryTab === "commission"
                      ? "none"
                      : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "all 0.3s",
                }}
              >
                💸 Commission
              </button>
            </div>

            {/* Transactions Tab Content */}
            {transactionHistoryTab === "transactions" && (
              <>
                {/* Filter Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  {["All", "Deposit", "Withdrawal", "Transfer"].map(
                    (filter) => (
                      <button
                        key={filter}
                        onClick={() => setTransactionFilter(filter)}
                        style={{
                          backgroundColor:
                            transactionFilter === filter
                              ? "#10b981"
                              : "rgba(255,255,255,0.08)",
                          color:
                            transactionFilter === filter ? "white" : "#d1d5db",
                          padding: "6px 16px",
                          border:
                            transactionFilter === filter
                              ? "none"
                              : "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "20px",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.3s",
                        }}
                      >
                        {filter}
                      </button>
                    ),
                  )}
                </div>

                {/* Transactions List */}
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.05)",
                    overflow: "hidden",
                  }}
                >
                  {getMemberTransactions(selectedMemberTransactions.id).length >
                  0 ? (
                    getMemberTransactions(selectedMemberTransactions.id).map(
                      (transaction) => {
                        const typeStyle = getTransactionTypeColor(
                          transaction.transaction_type,
                        );
                        const statusStyle = getTransactionStatusColor(
                          transaction.status,
                        );
                        return (
                          <div
                            key={transaction.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px 16px",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "50%",
                                  backgroundColor: typeStyle.bg,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "18px",
                                }}
                              >
                                {typeStyle.icon}
                              </div>
                              <div>
                                <div
                                  style={{
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                  }}
                                >
                                  {transaction.transaction_type}
                                </div>
                                <div
                                  style={{
                                    color: "#9ca3af",
                                    fontSize: "12px",
                                  }}
                                >
                                  {transaction.description || "No description"}
                                </div>
                                <div
                                  style={{
                                    color: "#6b7280",
                                    fontSize: "10px",
                                  }}
                                >
                                  {formatDate(transaction.created_at)}
                                </div>
                                {transaction.commission > 0 && (
                                  <div
                                    style={{
                                      color: "#fbbf24",
                                      fontSize: "10px",
                                    }}
                                  >
                                    Commission: ₦
                                    {parseFloat(
                                      transaction.commission || 0,
                                    ).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  color:
                                    transaction.transaction_type ===
                                      "deposit" ||
                                    transaction.transaction_type ===
                                      "contribution"
                                      ? "#34d399"
                                      : "#f87171",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                }}
                              >
                                {transaction.transaction_type === "deposit" ||
                                transaction.transaction_type === "contribution"
                                  ? "+"
                                  : "-"}
                                ₦
                                {parseFloat(
                                  transaction.amount || 0,
                                ).toLocaleString()}
                              </div>
                              <span
                                style={{
                                  padding: "2px 10px",
                                  fontSize: "10px",
                                  borderRadius: "12px",
                                  backgroundColor: statusStyle.bg,
                                  color: statusStyle.color,
                                }}
                              >
                                {transaction.status}
                              </span>
                            </div>
                          </div>
                        );
                      },
                    )
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#9ca3af",
                      }}
                    >
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                        💳
                      </div>
                      <p>
                        No{" "}
                        {transactionFilter !== "All" ? transactionFilter : ""}{" "}
                        transactions found
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Commission Tab Content */}
            {transactionHistoryTab === "commission" && (
              <div>
                {/* Commission Summary */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "rgba(251, 191, 36, 0.1)",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(251, 191, 36, 0.2)",
                    }}
                  >
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                      Total Commission
                    </div>
                    <div
                      style={{
                        color: "#fbbf24",
                        fontSize: "20px",
                        fontWeight: "bold",
                      }}
                    >
                      ₦
                      {getMemberTotalCommission(
                        selectedMemberTransactions.id,
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "rgba(52, 211, 153, 0.1)",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(52, 211, 153, 0.2)",
                    }}
                  >
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                      Monthly Commission
                    </div>
                    <div
                      style={{
                        color: "#34d399",
                        fontSize: "20px",
                        fontWeight: "bold",
                      }}
                    >
                      ₦
                      {getMemberMonthlyCommission(
                        selectedMemberTransactions.id,
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "rgba(248, 113, 113, 0.1)",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(248, 113, 113, 0.2)",
                    }}
                  >
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                      Pending Commission
                    </div>
                    <div
                      style={{
                        color: "#f87171",
                        fontSize: "20px",
                        fontWeight: "bold",
                      }}
                    >
                      ₦
                      {getMemberPendingCommission(
                        selectedMemberTransactions.id,
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "rgba(96, 165, 250, 0.1)",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(96, 165, 250, 0.2)",
                    }}
                  >
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                      Commission Rate
                    </div>
                    <div
                      style={{
                        color: "#60a5fa",
                        fontSize: "20px",
                        fontWeight: "bold",
                      }}
                    >
                      {getMemberCommissionRate(selectedMemberTransactions.id)}%
                    </div>
                  </div>
                </div>

                {/* Commission History */}
                <h4 style={{ color: "#d1d5db", marginBottom: "12px" }}>
                  Commission History
                </h4>
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.05)",
                    overflow: "hidden",
                  }}
                >
                  {getMemberCommissionHistory(selectedMemberTransactions.id)
                    .length > 0 ? (
                    getMemberCommissionHistory(
                      selectedMemberTransactions.id,
                    ).map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "10px 16px",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: "white",
                              fontSize: "13px",
                            }}
                          >
                            {item.description || "Commission earned"}
                          </div>
                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: "11px",
                            }}
                          >
                            {formatDate(item.date)}
                          </div>
                          {item.transaction_id && (
                            <div
                              style={{
                                color: "#4b5563",
                                fontSize: "10px",
                              }}
                            >
                              Transaction: #{item.transaction_id}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            color: "#fbbf24",
                            fontWeight: "600",
                          }}
                        >
                          +₦
                          {parseFloat(item.amount || 0).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "#9ca3af",
                      }}
                    >
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                        💸
                      </div>
                      <p>No commission history found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                color: "#9ca3af",
                fontSize: "12px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span>
                Total Transactions:{" "}
                {getMemberTransactions(selectedMemberTransactions.id).length}
              </span>
              <span>
                Completed:{" "}
                {
                  getMemberTransactions(selectedMemberTransactions.id).filter(
                    (t) => t.status === "completed" || t.status === "approved",
                  ).length
                }
              </span>
              <span>
                Pending:{" "}
                {
                  getMemberTransactions(selectedMemberTransactions.id).filter(
                    (t) => t.status === "pending",
                  ).length
                }
              </span>
              <span>
                Total Commission: ₦
                {getMemberTotalCommission(
                  selectedMemberTransactions.id,
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "32px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "white",
                  margin: 0,
                }}
              >
                Add New Transaction
              </h3>
              <button
                onClick={() => setShowAddTransactionModal(false)}
                style={{
                  color: "#9ca3af",
                  background: "none",
                  border: "none",
                  fontSize: "28px",
                  cursor: "pointer",
                  padding: "0 8px",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddTransaction}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Member *
                  </label>
                  <select
                    required
                    value={newTransaction.memberId}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        memberId: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  >
                    <option value="" style={{ backgroundColor: "#1e293b" }}>
                      Select a member
                    </option>
                    {members.map((member) => (
                      <option
                        key={member.id}
                        value={member.id}
                        style={{ backgroundColor: "#1e293b" }}
                      >
                        {member.full_name} - {member.membership_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Transaction Type *
                  </label>
                  <select
                    required
                    value={newTransaction.type}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        type: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                  >
                    <option
                      value="deposit"
                      style={{ backgroundColor: "#1e293b" }}
                    >
                      💰 Deposit
                    </option>
                    <option
                      value="withdrawal"
                      style={{ backgroundColor: "#1e293b" }}
                    >
                      🏦 Withdrawal
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Amount (₦) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newTransaction.amount}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        amount: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Enter amount"
                    min="1"
                    step="0.01"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#d1d5db",
                      marginBottom: "4px",
                    }}
                  >
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTransaction.description}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        description: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      fontSize: "14px",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                    placeholder="Enter transaction description"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "10px",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.3s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#2563eb")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "#3b82f6")
                  }
                >
                  Add Transaction
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTransactionModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: "white",
                    padding: "10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMembers;
