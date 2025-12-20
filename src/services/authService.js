
//---------------------------------------------------------------------
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
   * Login flow (revised):
   *
   * - For normal (patient-style) identifiers:
   *     Only call /auth/login.
   *     If it fails with 401/404, rethrow so the UI shows a patient-friendly
   *     "Incorrect username or password" message. We do NOT fall back to AD.
   *
   * - For staff-style identifiers (AD usernames):
   *     Try /auth/staff-ad-login first.
   *     If that fails, optionally fall back to /auth/login as a backup.
   *
   * Both endpoints return:
   *   { success, message, data: { userId, username, email, role, token, patientId, doctorId } }
   */
  async login({ username, password }) {
    const identifier = (username || "").trim();

    if (!identifier || !password) {
      throw new Error("Username and password are required");
    }

    const staffStyle = isStaffIdentifier(identifier);

    const handleSuccess = (data) => {
      if (data?.success && data?.data) {
        storeUser(data.data);
      }
      return data;
    };

    // Staff (AD) style login: try AD first
    if (staffStyle) {
      try {
        const { data } = await http.post("/auth/staff-ad-login", {
          username: identifier,
          password,
        });
        return handleSuccess(data);
      } catch (err) {
        const status = err?.response?.status;

        // If it is a pure auth failure, just surface it
        if (status === 401 || status === 403) {
          throw err;
        }

        // If AD infra is having trouble, we can optionally fall back to local login
        try {
          const { data } = await http.post("/auth/login", {
            username: identifier,
            password,
          });
          return handleSuccess(data);
        } catch (err2) {
          throw err2;
        }
      }
    }

    // Patient-style / local accounts: only use /auth/login, never AD fallback
    try {
      const { data } = await http.post("/auth/login", {
        username: identifier,
        password,
      });
      return handleSuccess(data);
    } catch (err) {
      const status = err?.response?.status;

      // 401/404 here means "invalid username or password" for a local account.
      // We rethrow so Login.jsx can show the friendly message and we do NOT call AD.
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
