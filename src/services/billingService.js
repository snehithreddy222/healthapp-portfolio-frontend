// src/services/billingService.js
import http from "./http";

export const billingService = {
  async list() {
    const r = await http.get("/payments/invoices/mine");
    if (Array.isArray(r?.data?.data)) {
      return r.data.data;
    }
    if (Array.isArray(r?.data)) {
      return r.data;
    }
    return [];
  },

  async pay(invoiceId) {
    const r = await http.post("/payments/checkout-session", { invoiceId });
    return r?.data || null;
  },

  async confirm(sessionId) {
    const r = await http.post("/payments/confirm", { sessionId });
    return r?.data || null;
  },
};
