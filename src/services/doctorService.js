// src/services/doctorService.js
import http from "./http";

function mapDoctorSummary(d) {
  if (!d) return null;

  const first = d.firstName || "";
  const last = d.lastName || "";
  const fullName =
    first || last ? `Dr. ${[first, last].filter(Boolean).join(" ")}` : "Doctor";

  return {
    id: d.id,
    name: fullName,
    firstName: first,
    lastName: last,
    specialization: d.specialization || "",
    licenseNumber: d.licenseNumber || "",
    phoneNumber: d.phoneNumber || "",
    // backend can return yearsExperience or years_experience, we normalize
    yearsExperience:
      d.yearsExperience ??
      d.years_experience ??
      d.experienceYears ??
      null,
  };
}

export const doctorService = {
  // Used for patient flows (doctor dropdown etc)
  async list() {
    const res = await http.get("/doctors");

    const raw = Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];

    return raw
      .map(mapDoctorSummary)
      .filter(Boolean)
      .map((d) => {
        const specialty = d.specialization || "";
        const experienceText =
          typeof d.yearsExperience === "number" && d.yearsExperience > 0
            ? `${d.yearsExperience}+ years experience`
            : "";

        const labelParts = [
          d.name,
          specialty ? `(${specialty})` : "",
          experienceText,
        ].filter(Boolean);

        return {
          // existing fields that current callers already use
          id: d.id,
          name: d.name,
          specialty,

          // richer fields for new UI
          specialization: specialty,
          yearsExperience: d.yearsExperience,
          licenseNumber: d.licenseNumber,
          phoneNumber: d.phoneNumber,

          // ready-to-use label for dropdowns
          label: labelParts.join(" · "),
        };
      });
  },

  // Fetch current doctor profile or null if not created yet
  async meOrNull() {
    try {
      const res = await http.get("/doctors/me");
      const doc = res?.data?.data || res?.data || null;
      return doc ? mapDoctorSummary(doc) : null;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) return null;
      throw e;
    }
  },

  // Create or update doctor profile during onboarding
  async onboard(payload) {
    const res = await http.post("/doctors/onboard", payload);
    const doc = res?.data?.data || res?.data || null;
    return mapDoctorSummary(doc);
  },

  isProfileComplete(doc) {
    if (!doc) return false;
    const required = [
      doc.firstName,
      doc.lastName,
      doc.specialization,
      doc.licenseNumber,
      doc.phoneNumber,
    ];
    return required.every((v) => typeof v === "string" && v.trim().length > 0);
  },
};
