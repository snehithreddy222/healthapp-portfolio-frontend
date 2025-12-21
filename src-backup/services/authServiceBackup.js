// src/services/authService.js
import http, { API_BASE } from "./http";

const USER_KEY = "user";

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

/**
 * Decide if this identifier looks like a staff (AD) account.
 *
 * Rules (you can adjust domains if needed):
 * - Contains a backslash: "DOMAIN\\username"
 * - Ends with "@healthcare-portal.local" (AD domain)
 * - Ends with "@healthapp.local" (example staff domain)
 *
 * Note: We keep this helper for future use, but the current
 * login() implementation below ignores it so that all logins
 * go through the local /auth/login endpoint while AD is down.
 */
function isStaffIdentifier(identifier) {
  if (!identifier) return false;
  const lower = identifier.toLowerCase();

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
    // On successful register, store user so they are logged in
    if (data?.success && data?.data) {
      storeUser(data.data);
    }
    return data;
  },

  /**
   * Login flow (TEMPORARY, AD DISABLED):
   *
   * For now, we always call /auth/login and never /auth/staff-ad-login,
   * even if the identifier looks like a staff (AD) username. This lets
   * the portal work normally using DB-backed accounts while the AD VM
   * is unavailable.
   *
   * Both endpoints (when enabled) return:
   *   { success, message, data: { userId, username, email, role, token, patientId, doctorId } }
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

    // TEMP: Only use local /auth/login for all users
    try {
      const { data } = await http.post("/auth/login", {
        username: identifier,
        password,
      });
      return handleSuccess(data);
    } catch (err) {
      const status = err?.response?.status;

      // 401/404 here means "invalid username or password" for a local account.
      // We rethrow so Login.jsx can show the friendly message.
      if (status === 401 || status === 404) {
        throw err;
      }

      // Other errors (500, network, etc.) also bubble up
      throw err;
    }
  },

  async fetchProfile() {
    const { data } = await http.get("/auth/profile");
    return data?.data;
  },

  logout() {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  },
};