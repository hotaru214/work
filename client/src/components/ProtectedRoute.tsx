import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../api/client";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }
  return <>{children}</>;
}