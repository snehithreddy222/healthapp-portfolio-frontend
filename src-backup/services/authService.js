//---------------------------------------------------------------------
// src/services/authService.js
import http from "./http";

const USER_KEY = "user";

/**
 * Portfolio behavior:
 * By default, do NOT use Active Directory login at all.
 * If you ever want to enable it again, set:
 * VITE_ENABLE_AD_LOGIN=true
 * in your frontend .env
 */
const ENABLE_AD_LOGIN = import.meta?.env?.VITE_ENABLE_AD_LOGIN === "true";

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(obj) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(obj));
  } catch {
    // ignore storage errors
  }
}

function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Decide if this identifier looks like a staff (AD) account.
 * This is only used when ENABLE_AD_LOGIN is true.
 */
function isStaffIdentifier(identifier) {
  if (!identifier) return false;
  const lower = String(identifier).toLowerCase();

  if (lower.includes("\\")) return true;
  if (lower.endsWith("@healthcare-portal.local")) return true;
  if (lower.endsWith("@healthapp.local")) return true;

  return false;
}

export const authService = {
  getCurrentUser() {
    return getStoredUser();
  },

  async register({ username, email, password, role }) {
    const { data } = await http.post("/auth/register", {
      username,
      email,
      password,
      role,
    });

    if (data?.success && data?.data) {
      storeUser(data.data);
    }

    return data;
  },

  /**
   * Login behavior:
   * Normal portfolio login always uses /auth/login.
   * AD login is supported only when ENABLE_AD_LOGIN is true.
   */
  async login({ username, password }) {
    const identifier = (username || "").trim();

    if (!identifier || !password) {
      throw new Error("Username and password are required");
    }

    const handleSuccess = (data) => {
      if (data?.success && data?.data) {
        storeUser(data.data);
      }
      return data;
    };

    if (!ENABLE_AD_LOGIN) {
      const { data } = await http.post("/auth/login", {
        username: identifier,
        password,
      });
      return handleSuccess(data);
    }

    const staffStyle = isStaffIdentifier(identifier);

    if (staffStyle) {
      try {
        const { data } = await http.post("/auth/staff-ad-login", {
          username: identifier,
          password,
        });
        return handleSuccess(data);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) throw err;

        const { data } = await http.post("/auth/login", {
          username: identifier,
          password,
        });
        return handleSuccess(data);
      }
    }

    const { data } = await http.post("/auth/login", {
      username: identifier,
      password,
    });
    return handleSuccess(data);
  },

  async fetchProfile() {
    const { data } = await http.get("/auth/profile");
    return data?.data;
  },

  logout() {
    clearUser();
  },
};
