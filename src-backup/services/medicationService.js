// frontend/src/services/medicationService.js
import http from "./http";

export const medicationService = {
  // Patient view: list my own medications
  async list() {
    const { data } = await http.get("/medications");
    return data?.data || [];
  },

  // Doctor view: list medications for a specific patient
  async listForPatient(patientId) {
    if (!patientId) return [];
    const { data } = await http.get("/medications", {
      params: { patientId },
    });
    return data?.data || [];
  },

  // Doctor view: create a prescription for a specific patient (optionally with PDF)
  async createForPatient(patientId, payload, file) {
    if (!patientId) throw new Error("patientId is required");

    const form = new FormData();
    form.append("patientId", patientId);
    form.append("medicationName", payload.medicationName);
    form.append("dosage", payload.dosage);
    form.append("frequency", payload.frequency);
    form.append("duration", payload.duration);
    if (payload.instructions) {
      form.append("instructions", payload.instructions);
    }
    if (file) {
      form.append("file", file);
    }

    const { data } = await http.post("/medications", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data?.data || null;
  },
};
