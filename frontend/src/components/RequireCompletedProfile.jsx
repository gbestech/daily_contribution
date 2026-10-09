// src/components/RequireCompletedProfile.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireCompletedProfile = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === "admin" || user.role === "administrator";

  const completed =
    user.profile_completed === 1 ||
    user.profile_completed === "1" ||
    user.profile_completed === true;

  if (!isAdmin && !completed) {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

export default RequireCompletedProfile;
