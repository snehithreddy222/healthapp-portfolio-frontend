// src/services/patientService.js
import http from "./http";
import { authService } from "./authService";

export const patientService = {
  /**
   * Return the current patient's profile.
   * Tries /patients/me first; falls back to token-stored patientId or /auth/profile.
   * This is "for pages" where we always want some shape, even if the user is not a real patient yet.
   */
  async me() {
    try {
      const res = await http.get("/patients/me");
      if (res?.data?.success) return res.data.data;
      if (res?.data?.id) return res.data;
    } catch (_) {
      // swallow and try fallbacks
    }

    const u = authService.getCurrentUser?.();
    if (u?.patientId) {
      const r = await http.get(`/patients/${u.patientId}`);
      return r?.data?.data || r?.data || null;
    }

    const prof = await http.get("/auth/profile");
    return prof?.data?.data || prof?.data || null;
  },

  /**
   * Strict version for onboarding logic.
   * If there is no Patient row, return null instead of falling back.
   */
  async meOrNull() {
    try {
      const res = await http.get("/patients/me");
      if (res?.data?.success) {
        return res.data.data;
      }
      return null;
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 404 || status === 403 || msg === "Not a patient") {
        return null;
      }
      throw e;
    }
  },

  /**
   * Onboard or update the logged-in patient's profile.
   * Backend: POST /patients/onboarding
   */
  async onboard(payload) {
    const res = await http.post("/patients/onboarding", payload);
    return res?.data?.data || res?.data || null;
  },

  /**
   * Update own patient profile by id (used in settings).
   */
  async updateSelf(id, payload) {
    const res = await http.put(`/patients/${id}`, payload);
    return res?.data?.data || res?.data || res;
  },
};
