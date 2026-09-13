// src/context/PermissionsContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";

const API_BASE_URL = "http://localhost:8000";
const PermissionsContext = createContext(null);

export const PermissionsProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize the role consistently with Layout.jsx
  const role = String(user?.role || "member")
    .trim()
    .toLowerCase();

  const refreshPermissions = useCallback(async () => {
    // No user → nothing to load
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions.php`);
      const data = await res.json();

      if (data.status && data.permissions) {
        const rolePerms = data.permissions[role] || [];
        setPermissions(rolePerms);
        // eslint-disable-next-line no-console
        console.log(
          `[PermissionsContext] Loaded for role "${role}":`,
          rolePerms,
        );
      } else {
        throw new Error(data.error || "Failed to load permissions");
      }
    } catch (err) {
      console.error("[PermissionsContext] Error:", err);
      setError(err.message);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // can(key) → true if the current role has that permission
  const can = useCallback(
    (key) => {
      if (!key) return false;
      // Admins implicitly have everything (safety net)
      if (role === "admin" || role === "administrator") return true;
      return permissions.includes(key);
    },
    [permissions, role],
  );

  const value = useMemo(
    () => ({
      permissions,
      loading,
      error,
      role,
      can,
      refreshPermissions,
    }),
    [permissions, loading, error, role, can, refreshPermissions],
  );

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
