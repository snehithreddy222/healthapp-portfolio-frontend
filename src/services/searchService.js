// src/services/searchService.js
import { appointmentService } from "./appointmentService";
import { testResultsService } from "./testResultsService";
import http from "./http";

/**
 * Very small helper to normalize text safely.
 */
function toText(value) {
  if (!value) return "";
  return String(value).toLowerCase();
}

/**
 * First version "global" search.
 * It fans out to a few existing endpoints and filters on the frontend.
 */
export const searchService = {
  async searchAll(query) {
    const term = (query || "").trim();
    if (!term) {
      return {
        appointments: [],
        messages: [],
        tests: [],
      };
    }

    const q = term.toLowerCase();

    const [apptRes, msgRes, testRes] = await Promise.allSettled([
      // Use your existing upcoming appointments helper
      appointmentService
        .listUpcoming()
        .catch(() => []),

      // Threads API: GET /messages/threads
      http("/messages/threads").catch(() => []),

      // Lab results: reuse existing list helper
      testResultsService
        .list({ limit: 50 })
        .catch(() => ({ items: [] })),
    ]);

    // Appointments
    let appointments = [];
    if (apptRes.status === "fulfilled") {
      const raw = Array.isArray(apptRes.value) ? apptRes.value : [];
      appointments = raw.filter((a) => {
        const haystack = [
          toText(a.title),
          toText(a.clinicianName),
          toText(a.specialty),
        ].join(" ");
        return haystack.includes(q);
      });
    }

    // Messages
    let messages = [];
    if (msgRes.status === "fulfilled") {
      const payload = msgRes.value;
      const raw =
        Array.isArray(payload?.data?.items) ||
        Array.isArray(payload?.items)
          ? payload.data?.items || payload.items
          : Array.isArray(payload)
          ? payload
          : [];

      messages = raw.filter((t) => {
        const haystack = [
          toText(t.subject),
          toText(t.title),
          toText(t.preview),
          toText(t.lastMessageText),
        ].join(" ");
        return haystack.includes(q);
      });
    }

    // Test results
    let tests = [];
    if (testRes.status === "fulfilled") {
      const payload = testRes.value || {};
      const raw = Array.isArray(payload.items) ? payload.items : [];
      tests = raw.filter((r) => {
        const haystack = [
          toText(r.name),
          toText(r.title),
          toText(r.testName),
          toText(r.status),
        ].join(" ");
        return haystack.includes(q);
      });
    }

    // Limit each bucket a bit for the dropdown
    return {
      appointments: appointments.slice(0, 3),
      messages: messages.slice(0, 3),
      tests: tests.slice(0, 3),
    };
  },
};
