// src/services/doctorScheduleService.js
import http from "./http";

function toBadgeFromDate(dateISO) {
  const d = new Date(dateISO);
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  return { mon, day };
}

function mapDoctorAppt(a) {
  const dt = a?.dateTime ? new Date(a.dateTime) : new Date();

  const time = dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const patient = a.patient || {};

  const fullName = [patient.firstName, patient.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const initials = [patient.firstName?.[0], patient.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "PT";

  const status = a.status || "SCHEDULED";

  return {
    id: a.id,
    dateTime: dt,
    date: dt.toISOString().slice(0, 10),
    time,
    status,
    reason: a.reason || "Consultation",
    notes: a.notes || "",
    badge: toBadgeFromDate(dt.toISOString()),
    // patient info
    patientId: a.patientId,
    patientName: fullName || "Patient",
    patientInitials: initials,
    patientPhone: patient.phoneNumber || "",
    patientGender: patient.gender || "",
    patientDob: patient.dateOfBirth ? new Date(patient.dateOfBirth) : null,
  };
}

export const doctorScheduleService = {
  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  async listSchedule(dateISO) {
    const { data } = await http.get("/appointments/doctor/schedule", {
      params: { date: dateISO },
    });

    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map(mapDoctorAppt);
  },

  async listPatientHistory(patientId) {
    if (!patientId) return [];
    const { data } = await http.get(
      `/appointments/doctor/patient/${patientId}`
    );

    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map(mapDoctorAppt);
  },
};
