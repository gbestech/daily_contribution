// src/components/admin/UserManagement.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:8000";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
    status: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/members.php`);
      const data = await response.json();

      if (data.members) {
        setUsers(data.members);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const updatedUser = { ...user, role: newRole };

      const response = await fetch(
        `${API_BASE_URL}/api/members.php/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUser),
        },
      );

      const data = await response.json();

      if (response.ok) {
        // Check if the updated user is the current logged-in user
        const storedUser = localStorage.getItem("user");
        let isCurrentUser = false;
        let currentUser = null;

        if (storedUser) {
          currentUser = JSON.parse(storedUser);
          isCurrentUser = currentUser.id === userId;
        }

        if (isCurrentUser) {
          // Update the stored user with new role
          currentUser.role = newRole;
          localStorage.setItem("user", JSON.stringify(currentUser));

          toast.success(`✅ Your role has been updated to ${newRole}!`);
          toast.info("🔄 Refreshing page to apply changes...");

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.success(`✅ ${user.name}'s role updated to ${newRole}!`);
        }

        fetchUsers();
        setShowRoleModal(false);
        setSelectedUser(null);
      } else {
        toast.error(data.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      role: user.role || "member",
      status: user.status || "Active",
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        role: editFormData.role,
        status: editFormData.status,
      };

      // Only include password if it's provided
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/members.php/${selectedUser.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        },
      );

      const data = await response.json();

      if (response.ok) {
        // Check if the updated user is the current logged-in user
        const storedUser = localStorage.getItem("user");
        let isCurrentUser = false;
        let currentUser = null;

        if (storedUser) {
          currentUser = JSON.parse(storedUser);
          isCurrentUser = currentUser.id === selectedUser.id;
        }

        if (isCurrentUser) {
          // Update the stored user with new data
          currentUser.name = editFormData.name;
          currentUser.full_name = editFormData.name;
          currentUser.email = editFormData.email;
          currentUser.phone = editFormData.phone;
          currentUser.role = editFormData.role;
          currentUser.status = editFormData.status;
          localStorage.setItem("user", JSON.stringify(currentUser));

          toast.success("✅ Your profile has been updated!");
          toast.info("🔄 Refreshing page to apply changes...");

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.success("✅ User updated successfully!");
        }

        fetchUsers();
        setShowEditModal(false);
        setSelectedUser(null);
        setEditFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "",
          status: "",
        });
      } else {
        toast.error(data.message || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" },
      administrator: { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" },
      manager: { bg: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" },
      member: { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" },
    };
    const style = colors[role] || colors.member;
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "500",
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.color}33`,
        }}
      >
        {role || "member"}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      Active: { bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" },
      Inactive: { bg: "rgba(239, 68, 68, 0.2)", color: "#f87171" },
      Suspended: { bg: "rgba(234, 179, 8, 0.2)", color: "#fbbf24" },
    };
    const style = colors[status] || colors.Active;
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "500",
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.color}33`,
        }}
      >
        {status || "Active"}
      </span>
    );
  };

  // Filter and Pagination
  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.accountNumber?.includes(searchTerm) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
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
        @keyframes spin {
          to { transform: rotate(360deg); }
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
          padding: 32px;
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
          color: white;
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
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #d1d5db;
          margin-bottom: 6px;
        }
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: #10b981;
        }
        .form-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background-color: rgba(255,255,255,0.05);
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          appearance: none;
        }
        .form-select:focus {
          border-color: #10b981;
        }
        .form-select option {
          background-color: #1e293b;
          color: white;
          padding: 8px;
        }
        .form-select option:hover {
          background-color: #2d3748;
        }
        .btn-primary {
          padding: 10px 24px;
          border-radius: 8px;
          border: none;
          background: #00aa69;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          background: #008854;
        }
        .btn-secondary {
          padding: 10px 24px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.05);
        }
        .btn-edit {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
          margin-right: 4px;
        }
        .btn-edit:hover {
          background: rgba(59, 130, 246, 0.25);
        }
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          margin-top: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pagination-info {
          font-size: 14px;
          color: #94a3b8;
        }
        .pagination-buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .page-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled) {
          background-color: rgba(255,255,255,0.05);
          color: white;
        }
        .page-btn.active {
          background-color: #00aa69;
          border-color: #00aa69;
          color: white;
        }
        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .pagination {
            flex-direction: column;
            align-items: center;
          }
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
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
            👥 User Management
          </h2>
          <p style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>
            Manage user roles and permissions
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ color: "#9ca3af", fontSize: "14px" }}>
            Total Users: {filteredUsers.length}
          </span>
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
          placeholder="🔍 Search by name, email, account number, or role..."
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
          onFocus={(e) => (e.target.style.borderColor = "#00aa69")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />
      </div>

      {/* Users Table */}
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
              <tr>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Account
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  User
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Role
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
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
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Balance
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length > 0 ? (
                currentUsers.map((user) => (
                  <tr
                    key={user.id}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#60a5fa",
                        fontFamily: "monospace",
                        fontSize: "14px",
                      }}
                    >
                      {user.accountNumber}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div>
                        <div
                          style={{
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                        >
                          {user.name}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {getRoleBadge(user.role)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {getStatusBadge(user.status)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#34d399",
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      ₦{parseFloat(user.balance || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          justifyContent: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="btn-edit"
                          onClick={() => handleEditUser(user)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleModal(true);
                          }}
                          style={{
                            backgroundColor: "rgba(59, 130, 246, 0.15)",
                            color: "#60a5fa",
                            padding: "6px 12px",
                            border: "1px solid rgba(59, 130, 246, 0.2)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor =
                              "rgba(59, 130, 246, 0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor =
                              "rgba(59, 130, 246, 0.15)";
                          }}
                        >
                          🔄 Role
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ color: "#94a3b8" }}>
                      <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                        📭
                      </div>
                      <p>No users found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredUsers.length > 0 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {indexOfFirstItem + 1} to{" "}
            {Math.min(indexOfLastItem, filteredUsers.length)} of{" "}
            <span style={{ fontWeight: "600", color: "white" }}>
              {filteredUsers.length}
            </span>{" "}
            users
          </div>
          <div className="pagination-buttons">
            <button
              className="page-btn"
              onClick={prevPage}
              disabled={currentPage === 1}
            >
              ◀
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNumber}
                  className={`page-btn ${
                    currentPage === pageNumber ? "active" : ""
                  }`}
                  onClick={() => paginate(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              className="page-btn"
              onClick={nextPage}
              disabled={currentPage === totalPages}
            >
              ▶
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          gap: "20px",
          color: "#94a3b8",
          fontSize: "13px",
          flexWrap: "wrap",
        }}
      >
        <span>
          👥 Total: <strong style={{ color: "white" }}>{users.length}</strong>
        </span>
        <span>
          👑 Admin:{" "}
          <strong style={{ color: "#f87171" }}>
            {
              users.filter(
                (u) => u.role === "admin" || u.role === "administrator",
              ).length
            }
          </strong>
        </span>
        <span>
          📊 Manager:{" "}
          <strong style={{ color: "#60a5fa" }}>
            {users.filter((u) => u.role === "manager").length}
          </strong>
        </span>
        <span>
          👤 Member:{" "}
          <strong style={{ color: "#34d399" }}>
            {users.filter((u) => u.role === "member").length}
          </strong>
        </span>
      </div>

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Change User Role</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(16,185,129,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#34d399",
                  }}
                >
                  {selectedUser.name?.charAt(0) || "U"}
                </div>
                <div>
                  <div style={{ color: "white", fontWeight: "500" }}>
                    {selectedUser.name}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                    {selectedUser.email}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                    Current Role: {getRoleBadge(selectedUser.role)}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Select New Role</label>
                <select
                  className="form-select"
                  value={selectedUser.role}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, role: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                  }}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  updateUserRole(selectedUser.id, selectedUser.role)
                }
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">✏️ Edit User</h3>
              <button
                className="modal-close"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  setEditFormData({
                    name: "",
                    email: "",
                    phone: "",
                    password: "",
                    role: "",
                    status: "",
                  });
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  required
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  required
                  placeholder="Enter email address"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={editFormData.password}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                  }}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "white",
                    fontSize: "14px",
                    outline: "none",
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setEditFormData({
                      name: "",
                      email: "",
                      phone: "",
                      password: "",
                      role: "",
                      status: "",
                    });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
