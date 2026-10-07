import { Navigate, Outlet } from "react-router-dom";
import { getAccessToken } from "../utils/auth";

// Login/Signup sirf unke liye jo logged-in nahi hain
export default function PublicRoute() {
  return getAccessToken() ? <Navigate to="/" replace /> : <Outlet />;
}