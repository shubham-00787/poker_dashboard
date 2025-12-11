// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ unlocked, children }) {
  if (!unlocked) return <Navigate to="/login" replace />;
  return children;
}
