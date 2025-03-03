import { getCookie } from "@/utils/cookieUtil";
import { Outlet, Navigate } from "react-router-dom";

const isAuthenticated = () => {
  return getCookie("auth") !== null;
};
const ProtectedRoute = () => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
