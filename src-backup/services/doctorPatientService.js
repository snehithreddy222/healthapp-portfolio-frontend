// src/services/doctorPatientService.js
import http from "./http";

function computeAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age -= 1;
  }
  return age;
}

function mapDoctorPatient(p) {
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  const initials =
    [p.firstName?.[0], p.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "PT";

  const lastVisitDate = p.lastVisit?.dateTime
    ? new Date(p.lastVisit.dateTime)
    : null;

  return {
    id: p.id,
    fullName: fullName || "Patient",
    initials,
    phone: p.phoneNumber || "",
    gender: p.gender || "",
    age: computeAge(p.dateOfBirth),
    visitCount: p.visitCount || 0,
    lastVisitDate,
    lastVisitReason: p.lastVisit?.reason || "",
    lastVisitStatus: p.lastVisit?.status || "",
  };
}

export const doctorPatientService = {
  async listMyPatients(search) {
    const params = {};
    if (search && search.trim()) {
      params.search = search.trim();
    }

    const { data } = await http.get("/doctors/my-patients", { params });
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map(mapDoctorPatient);
  },
};
