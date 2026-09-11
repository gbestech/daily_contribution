// // src/components/admin/Members.jsx
// import React, { useState, useEffect } from "react";
// import toast from "react-hot-toast";

// const API_BASE_URL = "http://localhost:8000";

// const AdminMembers = () => {
//   const [members, setMembers] = useState([]);
//   const [transactions, setTransactions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedMember, setSelectedMember] = useState(null);
//   const [editPassword, setEditPassword] = useState("");
//   const [showRoleModal, setShowRoleModal] = useState(false);
//   const [roleAssignment, setRoleAssignment] = useState({
//     memberId: "",
//     role: "member",
//   });
//   const [newMember, setNewMember] = useState({
//     firstName: "",
//     lastName: "",
//     email: "",
//     phone: "",
//     password: "",
//     role: "member",
//     status: "Active",
//     initial_balance: "",
//   });
//   const [selectedMemberTransactions, setSelectedMemberTransactions] =
//     useState(null);
//   const [showTransactionModal, setShowTransactionModal] = useState(false);
//   const [transactionFilter, setTransactionFilter] = useState("All");
//   const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
//   const [newTransaction, setNewTransaction] = useState({
//     memberId: "",
//     type: "deposit",
//     amount: "",
//     description: "",
//     status: "pending",
//   });

//   // Generate account number
//   const generateAccountNumber = () => {
//     const prefix = "10";
//     const randomDigits = Math.floor(Math.random() * 100000000)
//       .toString()
//       .padStart(8, "0");
//     return prefix + randomDigits;
//   };

//   // Generate random number for email
//   const generateRandomNumber = () => {
//     return Math.floor(Math.random() * 90000) + 10000;
//   };

//   // Validate phone number
//   const validatePhone = (phone) => {
//     const cleaned = phone.replace(/\D/g, "");
//     if (cleaned.length !== 11) {
//       return {
//         valid: false,
//         message: "Phone number must be exactly 11 digits",
//       };
//     }
//     if (!cleaned.startsWith("0")) {
//       return {
//         valid: false,
//         message: "Phone number must start with 0 (e.g., 080XXXXXXXX)",
//       };
//     }
//     return { valid: true, cleaned };
//   };

//   // Check if phone number is unique
//   const isPhoneUnique = (phone, excludeMemberId = null) => {
//     const cleanedPhone = phone.replace(/\D/g, "");
//     return !members.some((member) => {
//       const memberPhone = (member.phone || "").replace(/\D/g, "");
//       return memberPhone === cleanedPhone && member.id !== excludeMemberId;
//     });
//   };

//   // Auto-generate email when first name changes
//   useEffect(() => {
//     const firstName = newMember.firstName.trim().toLowerCase();
//     if (firstName) {
//       const randomNum = generateRandomNumber();
//       const email = `${firstName}${randomNum}@gmail.com`;
//       setNewMember((prev) => ({ ...prev, email }));
//     } else {
//       setNewMember((prev) => ({ ...prev, email: "" }));
//     }
//   }, [newMember.firstName]);

//   // Fetch members from API
//   useEffect(() => {
//     fetchMembers();
//     fetchTransactions();
//   }, []);

//   const fetchMembers = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/members.php`);
//       if (!response.ok) throw new Error("Failed to fetch members");
//       const data = await response.json();

//       if (data.members) {
//         const formattedMembers = data.members.map((member) => ({
//           id: member.id,
//           membership_number:
//             member.accountNumber || `MEM-${String(member.id).padStart(4, "0")}`,
//           full_name: member.name,
//           email: member.email,
//           phone: member.phone,
//           balance: member.balance || 0,
//           status: member.status?.toLowerCase() || "active",
//           join_date: member.joinDate || new Date().toISOString().split("T")[0],
//           role: member.role || "member",
//         }));
//         setMembers(formattedMembers);
//       } else {
//         setMembers([]);
//       }
//     } catch (error) {
//       console.error("Error fetching members:", error);
//       toast.error("Failed to fetch members");
//       setMembers([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchTransactions = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
//       if (!response.ok) throw new Error("Failed to fetch transactions");
//       const data = await response.json();

//       if (data.transactions) {
//         const formattedTransactions = data.transactions.map((transaction) => ({
//           id: transaction.id,
//           member_id: transaction.memberId,
//           transaction_type: transaction.type,
//           amount: transaction.amount,
//           status: transaction.status,
//           description: transaction.description || "",
//           created_at: transaction.date || new Date().toISOString(),
//         }));
//         setTransactions(formattedTransactions);
//       } else {
//         setTransactions([]);
//       }
//     } catch (error) {
//       console.error("Error fetching transactions:", error);
//       setTransactions([]);
//     }
//   };

//   // Get member transactions
//   const getMemberTransactions = (memberId) => {
//     const allTransactions = transactions.filter(
//       (t) => t.member_id === memberId,
//     );
//     if (transactionFilter === "All") return allTransactions;
//     return allTransactions.filter(
//       (t) => t.transaction_type === transactionFilter.toLowerCase(),
//     );
//   };

//   // Add new member - SEND PLAIN PASSWORD (backend will hash it)
//   const handleAddMember = async (e) => {
//     e.preventDefault();

//     if (newMember.phone) {
//       const validation = validatePhone(newMember.phone);
//       if (!validation.valid) {
//         toast.error(validation.message);
//         return;
//       }
//       if (!isPhoneUnique(newMember.phone)) {
//         toast.error(
//           "Phone number already exists. Please use a different number.",
//         );
//         return;
//       }
//       newMember.phone = validation.cleaned;
//     }

//     if (!newMember.password || newMember.password.trim().length < 6) {
//       toast.error("Password must be at least 6 characters");
//       return;
//     }

//     try {
//       const fullName =
//         `${newMember.firstName.trim()} ${newMember.lastName.trim()}`.trim();
//       const accountNumber = generateAccountNumber();

//       // IMPORTANT: Send plain password - backend will hash it
//       const memberData = {
//         accountNumber: accountNumber,
//         account_number: accountNumber,
//         name: fullName,
//         full_name: fullName,
//         email: newMember.email,
//         phone: newMember.phone || "",
//         password: newMember.password, // Send plain password
//         role: newMember.role || "member",
//         status: newMember.status || "Active",
//         membership_type: "Standard",
//         join_date: new Date().toISOString().split("T")[0],
//         balance: parseFloat(newMember.initial_balance) || 0,
//       };

//       console.log("Sending member data (password plain):", {
//         ...memberData,
//         password: "***",
//       });

//       const response = await fetch(`${API_BASE_URL}/api/members.php`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify(memberData),
//       });

//       const data = await response.json();
//       console.log("Response data:", data);

//       if (response.ok) {
//         toast.success(
//           `✅ Member created successfully with role: ${newMember.role}`,
//         );
//         setShowAddModal(false);
//         setNewMember({
//           firstName: "",
//           lastName: "",
//           email: "",
//           phone: "",
//           password: "",
//           role: "member",
//           status: "Active",
//           initial_balance: "",
//         });
//         fetchMembers();
//       } else {
//         toast.error(data.message || data.error || "Failed to create member");
//       }
//     } catch (error) {
//       console.error("Error creating member:", error);
//       toast.error("Failed to create member: " + error.message);
//     }
//   };

//   // Edit member
//   const handleEditMember = (member) => {
//     setSelectedMember({ ...member });
//     setEditPassword("");
//     setShowEditModal(true);
//   };

//   // Update member - SEND PLAIN PASSWORD (backend will hash it)
//   const handleUpdateMember = async (e) => {
//     e.preventDefault();

//     if (selectedMember.phone) {
//       const validation = validatePhone(selectedMember.phone);
//       if (!validation.valid) {
//         toast.error(validation.message);
//         return;
//       }
//       if (!isPhoneUnique(selectedMember.phone, selectedMember.id)) {
//         toast.error(
//           "Phone number already exists. Please use a different number.",
//         );
//         return;
//       }
//       selectedMember.phone = validation.cleaned;
//     }

//     if (editPassword && editPassword.trim().length < 6) {
//       toast.error("New password must be at least 6 characters");
//       return;
//     }

//     const payload = {
//       name: selectedMember.full_name,
//       email: selectedMember.email,
//       phone: selectedMember.phone || "",
//       balance: parseFloat(selectedMember.balance) || 0,
//       status: selectedMember.status,
//       role: selectedMember.role,
//     };

//     // Send plain password if provided - backend will hash it
//     if (editPassword.trim()) {
//       payload.password = editPassword; // Send plain password
//     }

//     try {
//       const response = await fetch(
//         `${API_BASE_URL}/api/members.php/${selectedMember.id}`,
//         {
//           method: "PUT",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//           body: JSON.stringify(payload),
//         },
//       );

//       const data = await response.json();

//       if (response.ok) {
//         toast.success("✅ Member updated successfully!");
//         setShowEditModal(false);
//         setSelectedMember(null);
//         setEditPassword("");
//         fetchMembers();
//       } else {
//         toast.error(data.message || data.error || "Failed to update member");
//       }
//     } catch (error) {
//       console.error("Error updating member:", error);
//       toast.error("Failed to update member");
//     }
//   };

//   // Delete member
//   const handleDeleteMember = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this member?")) return;

//     try {
//       const response = await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
//         method: "DELETE",
//       });

//       if (response.ok) {
//         toast.success("✅ Member deleted successfully!");
//         fetchMembers();
//       } else {
//         const data = await response.json();
//         toast.error(data.message || "Failed to delete member");
//       }
//     } catch (error) {
//       console.error("Error deleting member:", error);
//       toast.error("Failed to delete member");
//     }
//   };

//   // Assign Role
//   const handleAssignRole = async () => {
//     if (!roleAssignment.memberId) {
//       toast.error("Please select a member");
//       return;
//     }

//     try {
//       const selectedMember = members.find(
//         (m) => m.id === parseInt(roleAssignment.memberId),
//       );

//       const response = await fetch(
//         `${API_BASE_URL}/api/members.php/${roleAssignment.memberId}`,
//         {
//           method: "PUT",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//           },
//           body: JSON.stringify({
//             role: roleAssignment.role,
//             name: selectedMember?.full_name,
//             email: selectedMember?.email,
//             phone: selectedMember?.phone || "",
//             status: selectedMember?.status,
//             balance: selectedMember?.balance || 0,
//           }),
//         },
//       );

//       const data = await response.json();

//       if (response.ok) {
//         toast.success(`✅ Role assigned successfully: ${roleAssignment.role}`);
//         setShowRoleModal(false);
//         setRoleAssignment({ memberId: "", role: "member" });
//         fetchMembers();

//         if (
//           roleAssignment.role === "admin" ||
//           roleAssignment.role === "administrator"
//         ) {
//           toast.success("🔑 This member can now login as an admin!");
//         }
//       } else {
//         toast.error(data.message || "Failed to assign role");
//       }
//     } catch (error) {
//       console.error("Error assigning role:", error);
//       toast.error("Failed to assign role");
//     }
//   };

//   // Add transaction
//   const handleAddTransaction = async (e) => {
//     e.preventDefault();

//     const member = members.find(
//       (m) => m.id === parseInt(newTransaction.memberId),
//     );
//     if (!member) {
//       toast.error("Member not found");
//       return;
//     }

//     const transaction = {
//       memberId: parseInt(newTransaction.memberId),
//       memberName: member.full_name,
//       accountNumber: member.membership_number,
//       type: newTransaction.type,
//       amount: parseFloat(newTransaction.amount),
//       date: new Date().toISOString().split("T")[0],
//       status: "pending",
//       description: newTransaction.description,
//     };

//     try {
//       const response = await fetch(`${API_BASE_URL}/api/transactions.php`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(transaction),
//       });

//       const data = await response.json();

//       if (response.ok) {
//         toast.success("✅ Transaction added successfully!");
//         setShowAddTransactionModal(false);
//         setNewTransaction({
//           memberId: "",
//           type: "deposit",
//           amount: "",
//           description: "",
//           status: "pending",
//         });
//         fetchMembers();
//         fetchTransactions();
//       } else {
//         toast.error(data.message || "Failed to add transaction");
//       }
//     } catch (error) {
//       console.error("Error adding transaction:", error);
//       toast.error("Failed to add transaction");
//     }
//   };

//   // Approve transaction
//   const handleApproveTransaction = async (transactionId) => {
//     try {
//       const response = await fetch(
//         `${API_BASE_URL}/api/transactions.php/${transactionId}/approve`,
//         {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//         },
//       );

//       if (response.ok) {
//         toast.success("✅ Transaction approved!");
//         fetchTransactions();
//         fetchMembers();
//       } else {
//         toast.error("Failed to approve transaction");
//       }
//     } catch (error) {
//       console.error("Error approving transaction:", error);
//       toast.error("Failed to approve transaction");
//     }
//   };

//   // Reject transaction
//   const handleRejectTransaction = async (transactionId) => {
//     try {
//       const response = await fetch(
//         `${API_BASE_URL}/api/transactions.php/${transactionId}/reject`,
//         {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//         },
//       );

//       if (response.ok) {
//         toast.success("✅ Transaction rejected!");
//         fetchTransactions();
//       } else {
//         toast.error("Failed to reject transaction");
//       }
//     } catch (error) {
//       console.error("Error rejecting transaction:", error);
//       toast.error("Failed to reject transaction");
//     }
//   };

//   // View transaction history
//   const handleViewTransactions = (member) => {
//     setSelectedMemberTransactions(member);
//     setShowTransactionModal(true);
//     setTransactionFilter("All");
//   };

//   // Filter members based on search
//   const filteredMembers = members.filter(
//     (member) =>
//       (member.full_name &&
//         member.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (member.email &&
//         member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (member.membership_number &&
//         member.membership_number.includes(searchTerm)) ||
//       (member.phone && member.phone.includes(searchTerm)) ||
//       (member.role &&
//         member.role.toLowerCase().includes(searchTerm.toLowerCase())),
//   );

//   // Get status color
//   const getStatusColor = (status) => {
//     switch (status) {
//       case "active":
//         return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
//       case "inactive":
//         return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" };
//       case "suspended":
//         return { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" };
//       default:
//         return { bg: "rgba(255, 255, 255, 0.1)", color: "#9ca3af" };
//     }
//   };

//   // Get role color
//   const getRoleColor = (role) => {
//     switch (role?.toLowerCase()) {
//       case "admin":
//       case "administrator":
//         return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" };
//       case "manager":
//         return { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" };
//       case "member":
//         return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
//       default:
//         return { bg: "rgba(255, 255, 255, 0.1)", color: "#9ca3af" };
//     }
//   };

//   // Get role icon
//   const getRoleIcon = (role) => {
//     switch (role?.toLowerCase()) {
//       case "admin":
//       case "administrator":
//         return "👑";
//       case "manager":
//         return "📊";
//       case "member":
//         return "👤";
//       default:
//         return "👤";
//     }
//   };

//   // Get transaction type color
//   const getTransactionTypeColor = (type) => {
//     switch (type) {
//       case "deposit":
//       case "contribution":
//         return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399", icon: "💰" };
//       case "withdrawal":
//         return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171", icon: "🏦" };
//       case "transfer":
//       case "transfer_in":
//       case "transfer_out":
//         return { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", icon: "🔄" };
//       default:
//         return { bg: "rgba(255, 255, 255, 0.1)", color: "#9ca3af", icon: "💳" };
//     }
//   };

//   // Get transaction status color
//   const getTransactionStatusColor = (status) => {
//     switch (status) {
//       case "completed":
//       case "approved":
//         return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
//       case "pending":
//         return { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" };
//       case "failed":
//       case "rejected":
//         return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" };
//       default:
//         return { bg: "rgba(255, 255, 255, 0.1)", color: "#9ca3af" };
//     }
//   };

//   // Format date
//   const formatDate = (dateString) => {
//     if (!dateString) return "N/A";
//     try {
//       return new Date(dateString).toLocaleDateString("en-NG", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//       });
//     } catch {
//       return dateString;
//     }
//   };

//   // Format phone number for display
//   const formatPhoneDisplay = (phone) => {
//     if (!phone) return "N/A";
//     const cleaned = phone.replace(/\D/g, "");
//     if (cleaned.length === 11) {
//       return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
//     }
//     return phone;
//   };

//   if (loading) {
//     return (
//       <div
//         style={{
//           padding: "24px",
//           color: "white",
//           backgroundColor: "#0f172a",
//           minHeight: "100vh",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//         }}
//       >
//         <div
//           style={{
//             width: "48px",
//             height: "48px",
//             border: "4px solid rgba(255,255,255,0.1)",
//             borderTopColor: "#10b981",
//             borderRadius: "50%",
//             animation: "spin 1s linear infinite",
//           }}
//         />
//         <style>{`
//           @keyframes spin {
//             to { transform: rotate(360deg); }
//           }
//         `}</style>
//       </div>
//     );
//   }

//   return (
//     <div
//       style={{
//         padding: "24px",
//         color: "white",
//         backgroundColor: "#0f172a",
//         minHeight: "100vh",
//       }}
//     >
//       <style>{`
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
//         .modal-overlay {
//           position: fixed;
//           inset: 0;
//           background-color: rgba(0,0,0,0.7);
//           backdrop-filter: blur(4px);
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           z-index: 1000;
//           padding: 16px;
//         }
//         .modal-content {
//           background-color: #1e293b;
//           border-radius: 12px;
//           padding: 32px;
//           max-width: 500px;
//           width: 100%;
//           max-height: 90vh;
//           overflow-y: auto;
//           border: 1px solid rgba(255,255,255,0.1);
//         }
//         .modal-header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           margin-bottom: 24px;
//         }
//         .modal-title {
//           font-size: 20px;
//           font-weight: bold;
//           color: white;
//           margin: 0;
//         }
//         .modal-close {
//           color: #9ca3af;
//           background: none;
//           border: none;
//           font-size: 28px;
//           cursor: pointer;
//           padding: 0 8px;
//         }
//         .modal-close:hover {
//           color: white;
//         }
//         .form-group {
//           margin-bottom: 16px;
//         }
//         .form-label {
//           display: block;
//           font-size: 14px;
//           font-weight: 500;
//           color: #d1d5db;
//           margin-bottom: 4px;
//         }
//         .form-input {
//           width: 100%;
//           padding: 10px 14px;
//           border-radius: 8px;
//           border: 1px solid rgba(255,255,255,0.1);
//           background-color: rgba(255,255,255,0.08);
//           color: white;
//           font-size: 14px;
//           outline: none;
//           transition: border-color 0.2s;
//           box-sizing: border-box;
//         }
//         .form-input:focus {
//           border-color: #10b981;
//         }
//         .form-input:disabled {
//           opacity: 0.6;
//           cursor: not-allowed;
//         }
//         .form-input::placeholder {
//           color: #6b7280;
//         }
//         .form-select {
//           width: 100%;
//           padding: 10px 14px;
//           border-radius: 8px;
//           border: 1px solid rgba(255,255,255,0.1);
//           background-color: rgba(255,255,255,0.08);
//           color: white;
//           font-size: 14px;
//           outline: none;
//           transition: border-color 0.2s;
//           appearance: none;
//         }
//         .form-select:focus {
//           border-color: #10b981;
//         }
//         .form-select option {
//           background-color: #1e293b;
//           color: white;
//           padding: 8px;
//         }
//         .email-hint {
//           font-size: 12px;
//           color: #94a3b8;
//           margin-top: 4px;
//           font-style: italic;
//         }
//         .email-hint strong {
//           color: #60a5fa;
//           font-style: normal;
//         }
//         .btn-primary {
//           padding: 10px 24px;
//           border-radius: 8px;
//           border: none;
//           background: #10b981;
//           color: white;
//           cursor: pointer;
//           font-size: 14px;
//           font-weight: 500;
//           transition: all 0.2s;
//         }
//         .btn-primary:hover {
//           background: #059669;
//         }
//         .btn-primary:disabled {
//           opacity: 0.5;
//           cursor: not-allowed;
//         }
//         .btn-secondary {
//           padding: 10px 24px;
//           border-radius: 8px;
//           border: 1px solid rgba(255,255,255,0.1);
//           background: transparent;
//           color: white;
//           cursor: pointer;
//           font-size: 14px;
//           font-weight: 500;
//           transition: all 0.2s;
//         }
//         .btn-secondary:hover {
//           background: rgba(255,255,255,0.05);
//         }
//         .btn-danger {
//           padding: 10px 24px;
//           border-radius: 8px;
//           border: none;
//           background: rgba(239, 68, 68, 0.15);
//           color: #f87171;
//           cursor: pointer;
//           font-size: 14px;
//           font-weight: 500;
//           transition: all 0.2s;
//         }
//         .btn-danger:hover {
//           background: rgba(239, 68, 68, 0.25);
//         }
//         .btn-add {
//           padding: 10px 20px;
//           border-radius: 8px;
//           border: none;
//           background: rgba(16, 185, 129, 0.15);
//           color: #34d399;
//           cursor: pointer;
//           font-size: 14px;
//           font-weight: 500;
//           transition: all 0.2s;
//           display: flex;
//           align-items: center;
//           gap: 8px;
//         }
//         .btn-add:hover {
//           background: rgba(16, 185, 129, 0.25);
//         }
//         .btn-edit {
//           padding: 6px 12px;
//           border-radius: 6px;
//           border: none;
//           background: rgba(59, 130, 246, 0.15);
//           color: #60a5fa;
//           cursor: pointer;
//           font-size: 12px;
//           font-weight: 500;
//           transition: all 0.2s;
//           margin-right: 4px;
//         }
//         .btn-edit:hover {
//           background: rgba(59, 130, 246, 0.25);
//         }
//         .btn-role {
//           padding: 6px 12px;
//           border-radius: 6px;
//           border: none;
//           background: rgba(139, 92, 246, 0.15);
//           color: #a78bfa;
//           cursor: pointer;
//           font-size: 12px;
//           font-weight: 500;
//           transition: all 0.2s;
//           margin-right: 4px;
//         }
//         .btn-role:hover {
//           background: rgba(139, 92, 246, 0.25);
//         }
//         .btn-delete {
//           padding: 6px 12px;
//           border-radius: 6px;
//           border: none;
//           background: rgba(239, 68, 68, 0.15);
//           color: #f87171;
//           cursor: pointer;
//           font-size: 12px;
//           font-weight: 500;
//           transition: all 0.2s;
//         }
//         .btn-delete:hover {
//           background: rgba(239, 68, 68, 0.25);
//         }
//         .role-badge {
//           display: inline-flex;
//           align-items: center;
//           gap: 4px;
//           padding: 2px 10px;
//           border-radius: 12px;
//           font-size: 11px;
//           font-weight: 500;
//         }
//         .pagination {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 16px 0;
//           margin-top: 16px;
//           flex-wrap: wrap;
//           gap: 8px;
//         }
//         .pagination-info {
//           font-size: 14px;
//           color: #94a3b8;
//         }
//         .pagination-buttons {
//           display: flex;
//           gap: 4px;
//           flex-wrap: wrap;
//         }
//         .page-btn {
//           padding: 6px 12px;
//           border-radius: 6px;
//           border: 1px solid rgba(255,255,255,0.1);
//           background: transparent;
//           color: #94a3b8;
//           cursor: pointer;
//           font-size: 13px;
//           transition: all 0.2s;
//         }
//         .page-btn:hover:not(:disabled) {
//           background-color: rgba(255,255,255,0.05);
//           color: white;
//         }
//         .page-btn.active {
//           background-color: #00aa69;
//           border-color: #00aa69;
//           color: white;
//         }
//         .page-btn:disabled {
//           opacity: 0.3;
//           cursor: not-allowed;
//         }
//       `}</style>

//       {/* Header */}
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: "24px",
//           flexWrap: "wrap",
//           gap: "16px",
//         }}
//       >
//         <div>
//           <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
//             👥 Members Management
//           </h2>
//           <p style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>
//             Manage members, assign roles, view transactions, and track balances
//           </p>
//         </div>
//         <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
//           <button
//             onClick={() => setShowRoleModal(true)}
//             className="btn-role"
//             style={{ padding: "10px 20px", fontSize: "14px" }}
//           >
//             🔑 Assign Role
//           </button>
//           <button
//             onClick={() => setShowAddTransactionModal(true)}
//             className="btn-primary"
//             style={{ backgroundColor: "#3b82f6" }}
//             onMouseEnter={(e) => (e.target.style.backgroundColor = "#2563eb")}
//             onMouseLeave={(e) => (e.target.style.backgroundColor = "#3b82f6")}
//           >
//             + Add Transaction
//           </button>
//           <button onClick={() => setShowAddModal(true)} className="btn-add">
//             + Add New Member
//           </button>
//         </div>
//       </div>

//       {/* Search Bar */}
//       <div
//         style={{
//           backgroundColor: "rgba(255,255,255,0.05)",
//           borderRadius: "12px",
//           padding: "16px",
//           marginBottom: "24px",
//           border: "1px solid rgba(255,255,255,0.1)",
//         }}
//       >
//         <input
//           type="text"
//           placeholder="🔍 Search members by name, email, phone, role, or membership number..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           style={{
//             width: "100%",
//             backgroundColor: "rgba(255,255,255,0.08)",
//             color: "white",
//             padding: "10px 16px",
//             borderRadius: "8px",
//             border: "1px solid rgba(255,255,255,0.1)",
//             outline: "none",
//             fontSize: "14px",
//           }}
//           onFocus={(e) => (e.target.style.borderColor = "#10b981")}
//           onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
//         />
//       </div>

//       {/* Members Table */}
//       <div
//         style={{
//           backgroundColor: "rgba(255,255,255,0.05)",
//           borderRadius: "12px",
//           border: "1px solid rgba(255,255,255,0.1)",
//           overflow: "hidden",
//         }}
//       >
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse" }}>
//             <thead style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
//               <tr>
//                 <th
//                   style={{
//                     padding: "12px 16px",
//                     textAlign: "left",
//                     fontSize: "12px",
//                     fontWeight: "600",
//                     color: "#9ca3af",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.5px",
//                   }}
//                 >
//                   Membership
//                 </th>
//                 <th
//                   style={{
//                     padding: "12px 16px",
//                     textAlign: "left",
//                     fontSize: "12px",
//                     fontWeight: "600",
//                     color: "#9ca3af",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.5px",
//                   }}
//                 >
//                   Member
//                 </th>
//                 <th
//                   style={{
//                     padding: "12px 16px",
//                     textAlign: "left",
//                     fontSize: "12px",
//                     fontWeight: "600",
//                     color: "#9ca3af",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.5px",
//                   }}
//                 >
//                   Contact
//                 </th>
//                 <th
//                   style={{
//                     padding: "12px 16px",
//                     textAlign: "left",
//                     fontSize: "12px",
//                     fontWeight: "600",
//                     color: "#9ca3af",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.5px",
//                   }}
//                 >
//                   Role
//                 </th>
//                 <th
//                   style={{
//                     padding: "12px 16px",
//                     textAlign: "left",
//                     fontSize: "12px",
//                     fontWeight: "600",
//                     color: "#9ca3af",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.5px",
//                   }}
//                 >
//                   Status
//                 </th>
//                 <th
//                   style={{
//                     padding: "12px 16px",
//                     textAlign: "left",
//                     fontSize: "12px",
//                     fontWeight: "600",
//                     color: "#9ca3af",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.5px",
//                   }}
//                 >
//                   Balance
//                 </th>
//                 <th
//                   style={{
//                     padding: "12px 16px",
//                     textAlign: "left",
//                     fontSize: "12px",
//                     fontWeight: "600",
//                     color: "#9ca3af",
//                     textTransform: "uppercase",
//                     letterSpacing: "0.5px",
//                   }}
//                 >
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredMembers.map((member) => (
//                 <tr
//                   key={member.id}
//                   style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
//                 >
//                   <td style={{ padding: "12px 16px" }}>
//                     <div
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: "600",
//                         color: "#60a5fa",
//                         fontFamily: "monospace",
//                       }}
//                     >
//                       {member.membership_number || "N/A"}
//                     </div>
//                   </td>
//                   <td style={{ padding: "12px 16px" }}>
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "12px",
//                       }}
//                     >
//                       <div
//                         style={{
//                           width: "36px",
//                           height: "36px",
//                           borderRadius: "50%",
//                           backgroundColor: "rgba(16, 185, 129, 0.2)",
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                           color: "#34d399",
//                           fontWeight: "bold",
//                           fontSize: "14px",
//                         }}
//                       >
//                         {(member.full_name || "U").charAt(0)}
//                       </div>
//                       <div>
//                         <div
//                           style={{
//                             color: "white",
//                             fontSize: "14px",
//                             fontWeight: "500",
//                           }}
//                         >
//                           {member.full_name || "Unknown"}
//                         </div>
//                       </div>
//                     </div>
//                   </td>
//                   <td style={{ padding: "12px 16px" }}>
//                     <div style={{ fontSize: "14px", color: "#d1d5db" }}>
//                       {member.email || "N/A"}
//                     </div>
//                     <div style={{ fontSize: "12px", color: "#9ca3af" }}>
//                       {member.phone ? formatPhoneDisplay(member.phone) : "N/A"}
//                     </div>
//                   </td>
//                   <td style={{ padding: "12px 16px" }}>
//                     <span
//                       className="role-badge"
//                       style={{
//                         backgroundColor: getRoleColor(member.role).bg,
//                         color: getRoleColor(member.role).color,
//                       }}
//                     >
//                       {getRoleIcon(member.role)} {member.role || "member"}
//                     </span>
//                   </td>
//                   <td style={{ padding: "12px 16px" }}>
//                     <span
//                       style={{
//                         padding: "4px 12px",
//                         fontSize: "12px",
//                         borderRadius: "20px",
//                         backgroundColor: getStatusColor(member.status).bg,
//                         color: getStatusColor(member.status).color,
//                       }}
//                     >
//                       {member.status || "N/A"}
//                     </span>
//                   </td>
//                   <td
//                     style={{
//                       padding: "12px 16px",
//                       fontSize: "14px",
//                       fontWeight: "600",
//                       color: "#34d399",
//                     }}
//                   >
//                     ₦{parseFloat(member.balance || 0).toLocaleString()}
//                   </td>
//                   <td style={{ padding: "12px 16px" }}>
//                     <div
//                       style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
//                     >
//                       <button
//                         onClick={() => handleViewTransactions(member)}
//                         style={{
//                           color: "#60a5fa",
//                           background: "none",
//                           border: "none",
//                           cursor: "pointer",
//                           fontSize: "12px",
//                           padding: "4px 8px",
//                           borderRadius: "4px",
//                           transition: "background-color 0.3s",
//                         }}
//                         onMouseEnter={(e) =>
//                           (e.target.style.backgroundColor =
//                             "rgba(96, 165, 250, 0.1)")
//                         }
//                         onMouseLeave={(e) =>
//                           (e.target.style.backgroundColor = "transparent")
//                         }
//                       >
//                         📊 History
//                       </button>
//                       <button
//                         onClick={() => handleEditMember(member)}
//                         style={{
//                           color: "#34d399",
//                           background: "none",
//                           border: "none",
//                           cursor: "pointer",
//                           fontSize: "12px",
//                           padding: "4px 8px",
//                           borderRadius: "4px",
//                           transition: "background-color 0.3s",
//                         }}
//                         onMouseEnter={(e) =>
//                           (e.target.style.backgroundColor =
//                             "rgba(52, 211, 153, 0.1)")
//                         }
//                         onMouseLeave={(e) =>
//                           (e.target.style.backgroundColor = "transparent")
//                         }
//                       >
//                         ✏️ Edit
//                       </button>
//                       <button
//                         onClick={() => handleDeleteMember(member.id)}
//                         style={{
//                           color: "#f87171",
//                           background: "none",
//                           border: "none",
//                           cursor: "pointer",
//                           fontSize: "12px",
//                           padding: "4px 8px",
//                           borderRadius: "4px",
//                           transition: "background-color 0.3s",
//                         }}
//                         onMouseEnter={(e) =>
//                           (e.target.style.backgroundColor =
//                             "rgba(248, 113, 113, 0.1)")
//                         }
//                         onMouseLeave={(e) =>
//                           (e.target.style.backgroundColor = "transparent")
//                         }
//                       >
//                         🗑️ Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         {filteredMembers.length === 0 && (
//           <div
//             style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}
//           >
//             <div style={{ fontSize: "48px", marginBottom: "8px" }}>📭</div>
//             <p>No members found</p>
//             <p style={{ fontSize: "14px" }}>
//               Try adjusting your search or add a new member
//             </p>
//           </div>
//         )}
//       </div>

//       {/* Stats */}
//       <div
//         style={{
//           marginTop: "16px",
//           display: "flex",
//           justifyContent: "space-between",
//           color: "#9ca3af",
//           fontSize: "14px",
//           flexWrap: "wrap",
//           gap: "8px",
//         }}
//       >
//         <span>Total Members: {filteredMembers.length}</span>
//         <span>
//           Active: {members.filter((m) => m.status === "active").length}
//         </span>
//         <span>
//           Inactive: {members.filter((m) => m.status === "inactive").length}
//         </span>
//         <span>
//           👑 Admins:{" "}
//           {
//             members.filter(
//               (m) => m.role === "admin" || m.role === "administrator",
//             ).length
//           }
//         </span>
//         <span>
//           📊 Managers: {members.filter((m) => m.role === "manager").length}
//         </span>
//       </div>

//       {/* Add Member Modal */}
//       {showAddModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3 className="modal-title">➕ Add New Member</h3>
//               <button
//                 className="modal-close"
//                 onClick={() => {
//                   setShowAddModal(false);
//                   setNewMember({
//                     firstName: "",
//                     lastName: "",
//                     email: "",
//                     phone: "",
//                     password: "",
//                     role: "member",
//                     status: "Active",
//                     initial_balance: "",
//                   });
//                 }}
//               >
//                 ×
//               </button>
//             </div>

//             <form onSubmit={handleAddMember}>
//               <div className="form-group">
//                 <label className="form-label">First Name *</label>
//                 <input
//                   type="text"
//                   className="form-input"
//                   value={newMember.firstName}
//                   onChange={(e) =>
//                     setNewMember({
//                       ...newMember,
//                       firstName: e.target.value,
//                     })
//                   }
//                   required
//                   placeholder="Enter first name"
//                 />
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Last Name *</label>
//                 <input
//                   type="text"
//                   className="form-input"
//                   value={newMember.lastName}
//                   onChange={(e) =>
//                     setNewMember({ ...newMember, lastName: e.target.value })
//                   }
//                   required
//                   placeholder="Enter last name"
//                 />
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Email (Auto-generated)</label>
//                 <input
//                   type="email"
//                   className="form-input"
//                   value={newMember.email}
//                   disabled
//                   style={{
//                     opacity: 0.7,
//                     cursor: "not-allowed",
//                   }}
//                   placeholder="Email will be auto-generated from first name"
//                 />
//                 {newMember.firstName && newMember.email && (
//                   <div className="email-hint">
//                     📧 Email will be: <strong>{newMember.email}</strong>
//                   </div>
//                 )}
//               </div>

//               <div className="form-group">
//                 <label className="form-label">
//                   Phone Number *
//                   <span
//                     style={{
//                       color: "#9ca3af",
//                       fontWeight: "400",
//                       fontSize: "12px",
//                       marginLeft: "8px",
//                     }}
//                   >
//                     (11 digits, starts with 0)
//                   </span>
//                 </label>
//                 <input
//                   type="tel"
//                   className="form-input"
//                   value={newMember.phone}
//                   onChange={(e) => {
//                     const value = e.target.value.replace(/\D/g, "");
//                     setNewMember({ ...newMember, phone: value });
//                   }}
//                   placeholder="e.g., 08012345678"
//                   maxLength="11"
//                   required
//                 />
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     color: "#6b7280",
//                     marginTop: "4px",
//                   }}
//                 >
//                   📱 Must be exactly 11 digits and start with 0
//                 </div>
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Password *</label>
//                 <input
//                   type="password"
//                   className="form-input"
//                   value={newMember.password}
//                   onChange={(e) =>
//                     setNewMember({ ...newMember, password: e.target.value })
//                   }
//                   required
//                   minLength="6"
//                   placeholder="Enter password (min 6 characters)"
//                 />
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     color: "#6b7280",
//                     marginTop: "4px",
//                   }}
//                 >
//                   🔑 Password will be securely hashed on the server
//                 </div>
//               </div>

//               {/* Role Field */}
//               <div className="form-group">
//                 <label className="form-label">Role *</label>
//                 <select
//                   className="form-select"
//                   value={newMember.role}
//                   onChange={(e) =>
//                     setNewMember({ ...newMember, role: e.target.value })
//                   }
//                   required
//                 >
//                   <option value="member" style={{ backgroundColor: "#1e293b" }}>
//                     👤 Member
//                   </option>
//                   <option
//                     value="manager"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     📊 Manager
//                   </option>
//                   <option value="admin" style={{ backgroundColor: "#1e293b" }}>
//                     👑 Admin
//                   </option>
//                 </select>
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     color: "#6b7280",
//                     marginTop: "4px",
//                   }}
//                 >
//                   {newMember.role === "admin" &&
//                     "🔑 Admins can login to the admin dashboard"}
//                   {newMember.role === "manager" &&
//                     "📊 Managers can manage members and transactions"}
//                   {newMember.role === "member" &&
//                     "👤 Members can view their own data"}
//                 </div>
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Status</label>
//                 <select
//                   className="form-select"
//                   value={newMember.status}
//                   onChange={(e) =>
//                     setNewMember({ ...newMember, status: e.target.value })
//                   }
//                 >
//                   <option value="Active" style={{ backgroundColor: "#1e293b" }}>
//                     Active
//                   </option>
//                   <option
//                     value="Inactive"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     Inactive
//                   </option>
//                   <option
//                     value="Suspended"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     Suspended
//                   </option>
//                 </select>
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Initial Balance (₦)</label>
//                 <input
//                   type="number"
//                   className="form-input"
//                   value={newMember.initial_balance}
//                   onChange={(e) =>
//                     setNewMember({
//                       ...newMember,
//                       initial_balance: e.target.value,
//                     })
//                   }
//                   placeholder="Enter initial balance"
//                   min="0"
//                   step="0.01"
//                 />
//               </div>

//               <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
//                 <button
//                   type="submit"
//                   className="btn-primary"
//                   style={{ flex: 1 }}
//                 >
//                   Create Member
//                 </button>
//                 <button
//                   type="button"
//                   className="btn-secondary"
//                   onClick={() => {
//                     setShowAddModal(false);
//                     setNewMember({
//                       firstName: "",
//                       lastName: "",
//                       email: "",
//                       phone: "",
//                       password: "",
//                       role: "member",
//                       status: "Active",
//                       initial_balance: "",
//                     });
//                   }}
//                   style={{ flex: 1 }}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Edit Member Modal */}
//       {showEditModal && selectedMember && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3 className="modal-title">✏️ Edit Member</h3>
//               <button
//                 className="modal-close"
//                 onClick={() => {
//                   setShowEditModal(false);
//                   setSelectedMember(null);
//                   setEditPassword("");
//                 }}
//               >
//                 ×
//               </button>
//             </div>

//             <form onSubmit={handleUpdateMember}>
//               <div className="form-group">
//                 <label className="form-label">Membership Number</label>
//                 <input
//                   type="text"
//                   className="form-input"
//                   value={selectedMember.membership_number || "N/A"}
//                   disabled
//                   style={{ fontFamily: "monospace" }}
//                 />
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Full Name</label>
//                 <input
//                   type="text"
//                   className="form-input"
//                   value={selectedMember.full_name || ""}
//                   disabled
//                   style={{ color: "#9ca3af" }}
//                 />
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Email Address</label>
//                 <input
//                   type="email"
//                   className="form-input"
//                   value={selectedMember.email || ""}
//                   onChange={(e) =>
//                     setSelectedMember({
//                       ...selectedMember,
//                       email: e.target.value,
//                     })
//                   }
//                   placeholder="member@example.com"
//                 />
//               </div>

//               <div className="form-group">
//                 <label className="form-label">
//                   Phone Number
//                   <span
//                     style={{
//                       color: "#9ca3af",
//                       fontWeight: "400",
//                       fontSize: "12px",
//                       marginLeft: "8px",
//                     }}
//                   >
//                     (11 digits, starts with 0)
//                   </span>
//                 </label>
//                 <input
//                   type="tel"
//                   className="form-input"
//                   value={selectedMember.phone || ""}
//                   onChange={(e) => {
//                     const value = e.target.value.replace(/\D/g, "");
//                     setSelectedMember({
//                       ...selectedMember,
//                       phone: value,
//                     });
//                   }}
//                   placeholder="e.g., 08012345678"
//                   maxLength="11"
//                   required
//                 />
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     color: "#6b7280",
//                     marginTop: "4px",
//                   }}
//                 >
//                   📱 Must be exactly 11 digits and start with 0
//                 </div>
//               </div>

//               {/* Role Field in Edit Modal */}
//               <div className="form-group">
//                 <label className="form-label">Role</label>
//                 <select
//                   className="form-select"
//                   value={selectedMember.role || "member"}
//                   onChange={(e) =>
//                     setSelectedMember({
//                       ...selectedMember,
//                       role: e.target.value,
//                     })
//                   }
//                 >
//                   <option value="member" style={{ backgroundColor: "#1e293b" }}>
//                     👤 Member
//                   </option>
//                   <option
//                     value="manager"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     📊 Manager
//                   </option>
//                   <option value="admin" style={{ backgroundColor: "#1e293b" }}>
//                     👑 Admin
//                   </option>
//                 </select>
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     color: "#6b7280",
//                     marginTop: "4px",
//                   }}
//                 >
//                   {selectedMember.role === "admin" &&
//                     "🔑 This user can login as an admin"}
//                   {selectedMember.role === "manager" &&
//                     "📊 This user can manage members and transactions"}
//                 </div>
//               </div>

//               <div className="form-group">
//                 <label className="form-label">
//                   New Password{" "}
//                   <span style={{ color: "#9ca3af", fontWeight: "400" }}>
//                     (leave blank to keep current)
//                   </span>
//                 </label>
//                 <input
//                   type="password"
//                   className="form-input"
//                   value={editPassword}
//                   onChange={(e) => setEditPassword(e.target.value)}
//                   placeholder="Enter new password (optional)"
//                   minLength="6"
//                 />
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     color: "#6b7280",
//                     marginTop: "4px",
//                   }}
//                 >
//                   🔑 Password will be securely hashed on the server
//                 </div>
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Balance (₦)</label>
//                 <input
//                   type="number"
//                   className="form-input"
//                   value={selectedMember.balance || 0}
//                   onChange={(e) =>
//                     setSelectedMember({
//                       ...selectedMember,
//                       balance: parseFloat(e.target.value) || 0,
//                     })
//                   }
//                   min="0"
//                   step="0.01"
//                 />
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Status</label>
//                 <select
//                   className="form-select"
//                   value={selectedMember.status || "active"}
//                   onChange={(e) =>
//                     setSelectedMember({
//                       ...selectedMember,
//                       status: e.target.value,
//                     })
//                   }
//                 >
//                   <option value="active" style={{ backgroundColor: "#1e293b" }}>
//                     Active
//                   </option>
//                   <option
//                     value="inactive"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     Inactive
//                   </option>
//                   <option
//                     value="suspended"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     Suspended
//                   </option>
//                 </select>
//               </div>

//               <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
//                 <button
//                   type="submit"
//                   className="btn-primary"
//                   style={{ flex: 1 }}
//                 >
//                   Update Member
//                 </button>
//                 <button
//                   type="button"
//                   className="btn-secondary"
//                   onClick={() => {
//                     setShowEditModal(false);
//                     setSelectedMember(null);
//                     setEditPassword("");
//                   }}
//                   style={{ flex: 1 }}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Assign Role Modal */}
//       {showRoleModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3 className="modal-title">🔑 Assign Role</h3>
//               <button
//                 className="modal-close"
//                 onClick={() => {
//                   setShowRoleModal(false);
//                   setRoleAssignment({ memberId: "", role: "member" });
//                 }}
//               >
//                 ×
//               </button>
//             </div>

//             <form
//               onSubmit={(e) => {
//                 e.preventDefault();
//                 handleAssignRole();
//               }}
//             >
//               <div className="form-group">
//                 <label className="form-label">Select Member *</label>
//                 <select
//                   className="form-select"
//                   required
//                   value={roleAssignment.memberId}
//                   onChange={(e) =>
//                     setRoleAssignment({
//                       ...roleAssignment,
//                       memberId: e.target.value,
//                     })
//                   }
//                 >
//                   <option value="" style={{ backgroundColor: "#1e293b" }}>
//                     Choose a member
//                   </option>
//                   {members.map((member) => (
//                     <option
//                       key={member.id}
//                       value={member.id}
//                       style={{ backgroundColor: "#1e293b" }}
//                     >
//                       {member.full_name} ({member.membership_number}) - Current:{" "}
//                       {member.role || "member"}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Assign Role *</label>
//                 <select
//                   className="form-select"
//                   required
//                   value={roleAssignment.role}
//                   onChange={(e) =>
//                     setRoleAssignment({
//                       ...roleAssignment,
//                       role: e.target.value,
//                     })
//                   }
//                 >
//                   <option value="member" style={{ backgroundColor: "#1e293b" }}>
//                     👤 Member - Basic access
//                   </option>
//                   <option
//                     value="manager"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     📊 Manager - Manage members & transactions
//                   </option>
//                   <option value="admin" style={{ backgroundColor: "#1e293b" }}>
//                     👑 Admin - Full access
//                   </option>
//                 </select>
//                 <div
//                   style={{
//                     fontSize: "11px",
//                     color: "#6b7280",
//                     marginTop: "8px",
//                   }}
//                 >
//                   {roleAssignment.role === "admin" && (
//                     <div style={{ color: "#f87171" }}>
//                       ⚠️ Admins have full access to the system. They can login
//                       to the admin dashboard.
//                     </div>
//                   )}
//                   {roleAssignment.role === "manager" && (
//                     <div style={{ color: "#60a5fa" }}>
//                       📊 Managers can manage members, view transactions, and
//                       perform administrative tasks.
//                     </div>
//                   )}
//                   {roleAssignment.role === "member" && (
//                     <div style={{ color: "#34d399" }}>
//                       👤 Members can view their own profile and transaction
//                       history.
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
//                 <button
//                   type="submit"
//                   className="btn-primary"
//                   style={{ flex: 1, backgroundColor: "#8b5cf6" }}
//                   onMouseEnter={(e) =>
//                     (e.target.style.backgroundColor = "#7c3aed")
//                   }
//                   onMouseLeave={(e) =>
//                     (e.target.style.backgroundColor = "#8b5cf6")
//                   }
//                 >
//                   Assign Role
//                 </button>
//                 <button
//                   type="button"
//                   className="btn-secondary"
//                   onClick={() => {
//                     setShowRoleModal(false);
//                     setRoleAssignment({ memberId: "", role: "member" });
//                   }}
//                   style={{ flex: 1 }}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Transaction History Modal */}
//       {showTransactionModal && selectedMemberTransactions && (
//         <div className="modal-overlay">
//           <div className="modal-content" style={{ maxWidth: "800px" }}>
//             <div className="modal-header">
//               <div>
//                 <h3 className="modal-title">📊 Transaction History</h3>
//                 <p
//                   style={{
//                     color: "#9ca3af",
//                     fontSize: "14px",
//                     margin: "4px 0 0 0",
//                   }}
//                 >
//                   {selectedMemberTransactions.full_name || "Member"} •{" "}
//                   {selectedMemberTransactions.membership_number || "N/A"}
//                   {" • "}
//                   <span
//                     className="role-badge"
//                     style={{
//                       backgroundColor: getRoleColor(
//                         selectedMemberTransactions.role,
//                       ).bg,
//                       color: getRoleColor(selectedMemberTransactions.role)
//                         .color,
//                     }}
//                   >
//                     {getRoleIcon(selectedMemberTransactions.role)}{" "}
//                     {selectedMemberTransactions.role || "member"}
//                   </span>
//                 </p>
//               </div>
//               <button
//                 className="modal-close"
//                 onClick={() => setShowTransactionModal(false)}
//               >
//                 ×
//               </button>
//             </div>

//             {/* Balance Summary */}
//             <div
//               style={{
//                 backgroundColor: "rgba(16, 185, 129, 0.1)",
//                 padding: "16px",
//                 borderRadius: "8px",
//                 marginBottom: "16px",
//                 border: "1px solid rgba(16, 185, 129, 0.2)",
//               }}
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center",
//                 }}
//               >
//                 <span style={{ color: "#9ca3af" }}>Current Balance</span>
//                 <span
//                   style={{
//                     fontSize: "24px",
//                     fontWeight: "bold",
//                     color: "#34d399",
//                   }}
//                 >
//                   ₦
//                   {parseFloat(
//                     selectedMemberTransactions.balance || 0,
//                   ).toLocaleString()}
//                 </span>
//               </div>
//             </div>

//             {/* Filter Buttons */}
//             <div
//               style={{
//                 display: "flex",
//                 gap: "8px",
//                 marginBottom: "16px",
//                 flexWrap: "wrap",
//               }}
//             >
//               {["All", "Deposit", "Withdrawal", "Transfer"].map((filter) => (
//                 <button
//                   key={filter}
//                   onClick={() => setTransactionFilter(filter)}
//                   style={{
//                     backgroundColor:
//                       transactionFilter === filter
//                         ? "#10b981"
//                         : "rgba(255,255,255,0.08)",
//                     color: transactionFilter === filter ? "white" : "#d1d5db",
//                     padding: "6px 16px",
//                     border:
//                       transactionFilter === filter
//                         ? "none"
//                         : "1px solid rgba(255,255,255,0.1)",
//                     borderRadius: "20px",
//                     cursor: "pointer",
//                     fontSize: "12px",
//                     transition: "all 0.3s",
//                   }}
//                 >
//                   {filter}
//                 </button>
//               ))}
//             </div>

//             {/* Transactions List */}
//             <div
//               style={{
//                 backgroundColor: "rgba(255,255,255,0.03)",
//                 borderRadius: "8px",
//                 border: "1px solid rgba(255,255,255,0.05)",
//                 overflow: "hidden",
//               }}
//             >
//               {getMemberTransactions(selectedMemberTransactions.id).length >
//               0 ? (
//                 getMemberTransactions(selectedMemberTransactions.id).map(
//                   (transaction) => {
//                     const typeStyle = getTransactionTypeColor(
//                       transaction.transaction_type,
//                     );
//                     const statusStyle = getTransactionStatusColor(
//                       transaction.status,
//                     );
//                     return (
//                       <div
//                         key={transaction.id}
//                         style={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           alignItems: "center",
//                           padding: "12px 16px",
//                           borderBottom: "1px solid rgba(255,255,255,0.05)",
//                         }}
//                       >
//                         <div
//                           style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: "12px",
//                           }}
//                         >
//                           <div
//                             style={{
//                               width: "36px",
//                               height: "36px",
//                               borderRadius: "50%",
//                               backgroundColor: typeStyle.bg,
//                               display: "flex",
//                               alignItems: "center",
//                               justifyContent: "center",
//                               fontSize: "18px",
//                             }}
//                           >
//                             {typeStyle.icon}
//                           </div>
//                           <div>
//                             <div
//                               style={{
//                                 color: "white",
//                                 fontSize: "14px",
//                                 fontWeight: "500",
//                               }}
//                             >
//                               {transaction.transaction_type}
//                             </div>
//                             <div style={{ color: "#9ca3af", fontSize: "12px" }}>
//                               {transaction.description || "No description"}
//                             </div>
//                             <div style={{ color: "#6b7280", fontSize: "10px" }}>
//                               {formatDate(transaction.created_at)}
//                             </div>
//                           </div>
//                         </div>
//                         <div style={{ textAlign: "right" }}>
//                           <div
//                             style={{
//                               color:
//                                 transaction.transaction_type === "deposit" ||
//                                 transaction.transaction_type === "contribution"
//                                   ? "#34d399"
//                                   : "#f87171",
//                               fontSize: "14px",
//                               fontWeight: "600",
//                             }}
//                           >
//                             {transaction.transaction_type === "deposit" ||
//                             transaction.transaction_type === "contribution"
//                               ? "+"
//                               : "-"}
//                             ₦
//                             {parseFloat(
//                               transaction.amount || 0,
//                             ).toLocaleString()}
//                           </div>
//                           <span
//                             style={{
//                               padding: "2px 10px",
//                               fontSize: "10px",
//                               borderRadius: "12px",
//                               backgroundColor: statusStyle.bg,
//                               color: statusStyle.color,
//                             }}
//                           >
//                             {transaction.status}
//                           </span>
//                         </div>
//                       </div>
//                     );
//                   },
//                 )
//               ) : (
//                 <div
//                   style={{
//                     textAlign: "center",
//                     padding: "32px",
//                     color: "#9ca3af",
//                   }}
//                 >
//                   <div style={{ fontSize: "32px", marginBottom: "8px" }}>
//                     💳
//                   </div>
//                   <p>
//                     No {transactionFilter !== "All" ? transactionFilter : ""}{" "}
//                     transactions found
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Transaction Stats */}
//             <div
//               style={{
//                 marginTop: "16px",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 color: "#9ca3af",
//                 fontSize: "12px",
//                 flexWrap: "wrap",
//                 gap: "8px",
//               }}
//             >
//               <span>
//                 Total Transactions:{" "}
//                 {getMemberTransactions(selectedMemberTransactions.id).length}
//               </span>
//               <span>
//                 Completed:{" "}
//                 {
//                   getMemberTransactions(selectedMemberTransactions.id).filter(
//                     (t) => t.status === "completed" || t.status === "approved",
//                   ).length
//                 }
//               </span>
//               <span>
//                 Pending:{" "}
//                 {
//                   getMemberTransactions(selectedMemberTransactions.id).filter(
//                     (t) => t.status === "pending",
//                   ).length
//                 }
//               </span>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Add Transaction Modal */}
//       {showAddTransactionModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3 className="modal-title">Add New Transaction</h3>
//               <button
//                 className="modal-close"
//                 onClick={() => {
//                   setShowAddTransactionModal(false);
//                   setNewTransaction({
//                     memberId: "",
//                     type: "deposit",
//                     amount: "",
//                     description: "",
//                     status: "pending",
//                   });
//                 }}
//               >
//                 ×
//               </button>
//             </div>

//             <form onSubmit={handleAddTransaction}>
//               <div className="form-group">
//                 <label className="form-label">Member *</label>
//                 <select
//                   className="form-select"
//                   required
//                   value={newTransaction.memberId}
//                   onChange={(e) =>
//                     setNewTransaction({
//                       ...newTransaction,
//                       memberId: e.target.value,
//                     })
//                   }
//                 >
//                   <option value="" style={{ backgroundColor: "#1e293b" }}>
//                     Select a member
//                   </option>
//                   {members.map((member) => (
//                     <option
//                       key={member.id}
//                       value={member.id}
//                       style={{ backgroundColor: "#1e293b" }}
//                     >
//                       {member.full_name} - {member.membership_number} [
//                       {member.role || "member"}]
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Transaction Type *</label>
//                 <select
//                   className="form-select"
//                   required
//                   value={newTransaction.type}
//                   onChange={(e) =>
//                     setNewTransaction({
//                       ...newTransaction,
//                       type: e.target.value,
//                     })
//                   }
//                 >
//                   <option
//                     value="deposit"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     💰 Deposit
//                   </option>
//                   <option
//                     value="withdrawal"
//                     style={{ backgroundColor: "#1e293b" }}
//                   >
//                     🏦 Withdrawal
//                   </option>
//                 </select>
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Amount (₦) *</label>
//                 <input
//                   type="number"
//                   className="form-input"
//                   required
//                   value={newTransaction.amount}
//                   onChange={(e) =>
//                     setNewTransaction({
//                       ...newTransaction,
//                       amount: e.target.value,
//                     })
//                   }
//                   placeholder="Enter amount"
//                   min="1"
//                   step="0.01"
//                 />
//               </div>

//               <div className="form-group">
//                 <label className="form-label">Description *</label>
//                 <input
//                   type="text"
//                   className="form-input"
//                   required
//                   value={newTransaction.description}
//                   onChange={(e) =>
//                     setNewTransaction({
//                       ...newTransaction,
//                       description: e.target.value,
//                     })
//                   }
//                   placeholder="Enter transaction description"
//                 />
//               </div>

//               <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
//                 <button
//                   type="submit"
//                   className="btn-primary"
//                   style={{ flex: 1, backgroundColor: "#3b82f6" }}
//                   onMouseEnter={(e) =>
//                     (e.target.style.backgroundColor = "#2563eb")
//                   }
//                   onMouseLeave={(e) =>
//                     (e.target.style.backgroundColor = "#3b82f6")
//                   }
//                 >
//                   Add Transaction
//                 </button>
//                 <button
//                   type="button"
//                   className="btn-secondary"
//                   onClick={() => setShowAddTransactionModal(false)}
//                   style={{ flex: 1 }}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminMembers;


// src/components/admin/Members.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const capitalizeWords = (str) =>
  str
    .split(" ")
    .map((w) =>
      w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "",
    )
    .join(" ");

const AdminMembers = () => {
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleAssignment, setRoleAssignment] = useState({
    memberId: "",
    role: "member",
  });

  const generateAccountNumber = () => {
    const prefix = "10";
    const randomDigits = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
    return prefix + randomDigits;
  };

  const generateRandomNumber = () => Math.floor(Math.random() * 90000) + 10000;

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 11)
      return { valid: false, message: "Phone must be exactly 11 digits" };
    if (!cleaned.startsWith("0"))
      return { valid: false, message: "Phone must start with 0" };
    return { valid: true, cleaned };
  };

  const isPhoneUnique = (phone, excludeId = null) => {
    const cleanedPhone = phone.replace(/\D/g, "");
    return !members.some((m) => {
      const mp = (m.phone || "").replace(/\D/g, "");
      return mp === cleanedPhone && m.id !== excludeId;
    });
  };

  useEffect(() => {
    const firstName = newMember.firstName.trim().toLowerCase();
    if (firstName) {
      const randomNum = generateRandomNumber();
      const email = `${firstName}${randomNum}@gmail.com`;
      setNewMember((prev) => ({ ...prev, email }));
    } else {
      setNewMember((prev) => ({ ...prev, email: "" }));
    }
  }, [newMember.firstName]);

  useEffect(() => {
    fetchMembers();
    fetchTransactions();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      if (data.members) {
        setMembers(
          data.members.map((m) => ({
            id: m.id,
            membership_number:
              m.accountNumber || `MEM-${String(m.id).padStart(4, "0")}`,
            full_name: m.name,
            email: m.email,
            phone: m.phone,
            balance: m.balance || 0,
            status: m.status?.toLowerCase() || "active",
            join_date: m.joinDate || new Date().toISOString().split("T")[0],
            role: m.role || "member",
            profile_completed: m.profile_completed || 0,
            passport_photo: m.passport_photo || null,
          })),
        );
      } else {
        setMembers([]);
      }
    } catch (e) {
      toast.error("Failed to fetch members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions.php`);
      const data = await response.json();
      if (data.transactions) {
        setTransactions(
          data.transactions.map((t) => ({
            id: t.id,
            member_id: t.memberId,
            transaction_type: t.type,
            amount: t.amount,
            charge: t.charge || 0,
            status: t.status,
            description: t.description || "",
            created_at: t.date,
          })),
        );
      }
    } catch (e) {
      setTransactions([]);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.password || newMember.password.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      const fullName = capitalizeWords(
        `${newMember.firstName.trim()} ${newMember.lastName.trim()}`.trim(),
      );
      const accountNumber = generateAccountNumber();

      const payload = {
        accountNumber,
        account_number: accountNumber,
        name: fullName,
        full_name: fullName,
        email: newMember.email,
        phone: "",
        password: newMember.password,
        role: "member",
        status: "Active",
        membership_type: "Standard",
        join_date: new Date().toISOString().split("T")[0],
        balance: 0,
      };

      const res = await fetch(`${API_BASE_URL}/api/members.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`✅ Member created! Account: ${accountNumber}`);
        toast(
          "Ask the member to log in and complete their profile (phone, address, passport, savings plan).",
          { duration: 6000, icon: "📝" },
        );
        setShowAddModal(false);
        setNewMember({ firstName: "", lastName: "", email: "", password: "" });
        fetchMembers();
      } else {
        toast.error(data.message || data.error || "Failed to create member");
      }
    } catch (e) {
      toast.error("Failed to create member");
    }
  };

  const handleEditMember = (m) => {
    setSelectedMember({ ...m });
    setEditPassword("");
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    const payload = {
      name: capitalizeWords(selectedMember.full_name || ""),
      email: selectedMember.email,
      phone: selectedMember.phone || "",
      balance: parseFloat(selectedMember.balance) || 0,
      status: selectedMember.status,
      role: selectedMember.role,
    };
    if (editPassword.trim()) payload.password = editPassword.trim();

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members.php/${selectedMember.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (res.ok) {
        toast.success("✅ Member updated!");
        setShowEditModal(false);
        setSelectedMember(null);
        setEditPassword("");
        fetchMembers();
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm("Delete this member?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/members.php/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("✅ Deleted!");
        fetchMembers();
      } else {
        const data = await res.json();
        toast.error(data.message || "Delete failed");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleAssignRole = async () => {
    if (!roleAssignment.memberId) {
      toast.error("Please select a member");
      return;
    }
    const m = members.find((x) => x.id === parseInt(roleAssignment.memberId));
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/members.php/${roleAssignment.memberId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: roleAssignment.role,
            name: m?.full_name,
            email: m?.email,
            phone: m?.phone || "",
            status: m?.status,
            balance: m?.balance || 0,
          }),
        },
      );
      if (res.ok) {
        toast.success(`✅ Role assigned: ${roleAssignment.role}`);
        setShowRoleModal(false);
        setRoleAssignment({ memberId: "", role: "member" });
        fetchMembers();
      } else {
        toast.error("Failed to assign role");
      }
    } catch {
      toast.error("Failed to assign role");
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      (m.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.membership_number || "").includes(searchTerm) ||
      (m.phone || "").includes(searchTerm),
  );

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
      case "administrator":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" };
      case "manager":
        return { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" };
      default:
        return { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" };
    }
  };

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
        <div style={{ color: "white" }}>Loading...</div>
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
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
        }
        .modal-content {
          background: #1e293b; border-radius: 12px;
          padding: 28px; max-width: 480px; width: 100%;
          max-height: 90vh; overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .modal-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 20px;
        }
        .modal-title { font-size: 18px; font-weight: bold; margin: 0; }
        .modal-close {
          background: none; border: none; color: #9ca3af;
          font-size: 26px; cursor: pointer; padding: 0 6px;
        }
        .form-group { margin-bottom: 14px; }
        .form-label {
          display: block; font-size: 13px; font-weight: 500;
          color: #d1d5db; margin-bottom: 4px;
        }
        .form-input {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.08);
          color: white; font-size: 14px; outline: none;
          box-sizing: border-box;
        }
        .form-input:focus { border-color: #10b981; }
        .form-input:disabled { opacity: 0.6; }
        .form-input::placeholder { color: #6b7280; }
        .form-select {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.08);
          color: white; font-size: 14px; outline: none;
        }
        .form-select option { background: #1e293b; }
        .btn-primary {
          padding: 10px 24px; border-radius: 8px; border: none;
          background: #10b981; color: white; cursor: pointer;
          font-size: 14px; font-weight: 500;
        }
        .btn-primary:hover { background: #059669; }
        .btn-secondary {
          padding: 10px 24px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: white;
          cursor: pointer; font-size: 14px;
        }
        .btn-add {
          padding: 10px 20px; border-radius: 8px; border: none;
          background: rgba(16, 185, 129, 0.15); color: #34d399;
          cursor: pointer; font-size: 14px; font-weight: 500;
        }
        .btn-add:hover { background: rgba(16, 185, 129, 0.25); }
        .btn-role {
          padding: 10px 20px; border-radius: 8px; border: none;
          background: rgba(139, 92, 246, 0.15); color: #a78bfa;
          cursor: pointer; font-size: 14px;
        }
      `}</style>

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
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
            👥 Members Management
          </h2>
          <p
            style={{ color: "#9ca3af", margin: "4px 0 0 0", fontSize: "14px" }}
          >
            Manage members, assign roles, view balances
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => setShowRoleModal(true)} className="btn-role">
            🔑 Assign Role
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-add">
            + Add New Member
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search by name, email, phone, or account number..."
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
            boxSizing: "border-box",
          }}
        />
      </div>

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
                {[
                  "Membership",
                  "Member",
                  "Contact",
                  "Role",
                  "Status",
                  "Profile",
                  "Balance",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      color: "#9ca3af",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
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
                      {member.membership_number}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
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
                          overflow: "hidden",
                        }}
                      >
                        {member.passport_photo ? (
                          <img
                            src={`${API_BASE_URL}/api/uploads/passports/${member.passport_photo}`}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          (member.full_name || "U").charAt(0)
                        )}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {member.full_name}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: "13px", color: "#d1d5db" }}>
                      {member.email}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {member.phone || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        fontSize: "11px",
                        borderRadius: "12px",
                        backgroundColor: getRoleColor(member.role).bg,
                        color: getRoleColor(member.role).color,
                      }}
                    >
                      {member.role}
                    </span>
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
                      {member.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {member.profile_completed ? (
                      <span style={{ color: "#34d399", fontSize: "12px" }}>
                        ✅ Complete
                      </span>
                    ) : (
                      <span style={{ color: "#fbbf24", fontSize: "12px" }}>
                        ⏳ Pending
                      </span>
                    )}
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
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleEditMember(member)}
                        style={{
                          color: "#34d399",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
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
                        }}
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
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📭</div>
            <p>No members found</p>
          </div>
        )}
      </div>

      {/* Add Member Modal — MINIMAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">➕ Add New Member</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setNewMember({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                  });
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p style={{ margin: 0, fontSize: "13px", color: "#93c5fd" }}>
                💡 Only basic info here. The member will complete their profile
                (phone, address, next of kin, passport, savings plan) after
                logging in.
              </p>
            </div>

            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMember.firstName}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      firstName: capitalizeWords(e.target.value),
                    })
                  }
                  required
                  placeholder="First name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMember.lastName}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      lastName: capitalizeWords(e.target.value),
                    })
                  }
                  required
                  placeholder="Last name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  value={newMember.password}
                  onChange={(e) =>
                    setNewMember({ ...newMember, password: e.target.value })
                  }
                  required
                  minLength="6"
                  placeholder="Min 6 characters"
                />
              </div>

              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "12px",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", color: "#34d399" }}>
                  📧 Auto email:{" "}
                  <strong style={{ color: "white" }}>
                    {newMember.email || "—"}
                  </strong>
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Create Member
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewMember({
                      firstName: "",
                      lastName: "",
                      email: "",
                      password: "",
                    });
                  }}
                  style={{ flex: 1 }}
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit Member</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMember(null);
                  setEditPassword("");
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateMember}>
              <div className="form-group">
                <label className="form-label">Membership Number</label>
                <input
                  className="form-input"
                  value={selectedMember.membership_number || "N/A"}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={selectedMember.full_name || ""}
                  disabled
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
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={selectedMember.phone || ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setSelectedMember({ ...selectedMember, phone: v });
                  }}
                  maxLength="11"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={selectedMember.role}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="member">👤 Member</option>
                  <option value="manager">📊 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">New Password (optional)</label>
                <input
                  type="password"
                  className="form-input"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength="6"
                  placeholder="Leave blank to keep current"
                />
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
                  value={selectedMember.status}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                    setEditPassword("");
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">🔑 Assign Role</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRoleModal(false);
                  setRoleAssignment({ memberId: "", role: "member" });
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAssignRole();
              }}
            >
              <div className="form-group">
                <label className="form-label">Select Member *</label>
                <select
                  className="form-select"
                  required
                  value={roleAssignment.memberId}
                  onChange={(e) =>
                    setRoleAssignment({
                      ...roleAssignment,
                      memberId: e.target.value,
                    })
                  }
                >
                  <option value="">Choose a member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.membership_number}) — {m.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Role *</label>
                <select
                  className="form-select"
                  required
                  value={roleAssignment.role}
                  onChange={(e) =>
                    setRoleAssignment({
                      ...roleAssignment,
                      role: e.target.value,
                    })
                  }
                >
                  <option value="member">👤 Member</option>
                  <option value="manager">📊 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, background: "#8b5cf6" }}
                >
                  Assign Role
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowRoleModal(false);
                    setRoleAssignment({ memberId: "", role: "member" });
                  }}
                  style={{ flex: 1 }}
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
