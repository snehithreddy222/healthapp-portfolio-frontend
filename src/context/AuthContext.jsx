// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  // Existing login for normal app accounts (patients, non-AD users)
  const login = async (payload) => {
    const out = await authService.login(payload);
    if (out?.success && out?.data) {
      setUser(out.data); // contains token, role, patientId/doctorId
    }
    return out;
  };

  // New: staff login using Active Directory
  const staffLogin = async (payload) => {
    const out = await authService.staffLogin(payload);
    if (out?.success && out?.data) {
      setUser(out.data);
    }
    return out;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Keep state in sync if another tab changes localStorage
  useEffect(() => {
    const handler = () => setUser(authService.getCurrentUser());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      staffLogin,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
