// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  // Read from context; fall back to localStorage (key: "user")
  let user = null;
  try {
    user = useAuth().user || authService.getCurrentUser();
  } catch {
    user = authService.getCurrentUser();
  }

  // Not logged in
  if (!user || !user.token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Role check (if provided)
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const role = String(user.role || "").toUpperCase();
    if (!allowedRoles.map((r) => String(r).toUpperCase()).includes(role)) {
      // You’re logged in but not authorized for this route.
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
