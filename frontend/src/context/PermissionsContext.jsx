// src/context/PermissionsContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const API_BASE_URL = "http://localhost:8000";

const PermissionsContext = createContext(null);

export const PermissionsProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    admin: [],
    manager: [],
    member: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions.php`);
      const data = await res.json();
      if (data.status && data.permissions) {
        setPermissions({
          admin: data.permissions.admin || [],
          manager: data.permissions.manager || [],
          member: data.permissions.member || [],
        });
      }
    } catch (err) {
      console.error("Failed to load permissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  /**
   * can("delete_member") -> true/false
   * Super-admin always returns true (so you can't lock yourself out).
   */
  const can = (operation) => {
    if (!user || !operation) return false;

    // The original administrator account(s) always bypass
    if (user.role === "administrator") return true;

    const role = (user.role || "member").toLowerCase();
    const ops = permissions[role] || [];
    return ops.includes(operation);
  };

  const value = {
    permissions,
    loading,
    can,
    refresh: fetchPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermission = () => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermission must be used inside <PermissionsProvider>");
  }
  return ctx;
};
