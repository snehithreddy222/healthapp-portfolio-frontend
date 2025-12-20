// src/services/appointmentService.js
import http from "./http";
import { authService } from "./authService";

// Parse "YYYY-MM-DD" as a local date to avoid UTC shift
function parseIsoDateLocal(dateISO) {
  if (!dateISO) return new Date();
  const parts = String(dateISO).split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }
  return new Date(dateISO);
}

function toBadgeFromDate(dateISO) {
  const d = parseIsoDateLocal(dateISO);
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  return { mon, day };
}

function mapServerAppointment(a) {
  const iso =
    a?.dateTime ??
    (a?.date && a?.time ? `${a.date}T${a.time}:00` : undefined);

  const d = iso ? new Date(iso) : new Date();
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const patientName = a?.patient
    ? [a.patient.firstName, a.patient.lastName].filter(Boolean).join(" ")
    : a?.patientName || "";

  const patientPhone = a?.patient?.phoneNumber || a?.patientPhone || "";

  return {
    id: a.id,
    dateTime: d,
    date: d.toISOString().slice(0, 10),
    time,
    clinicianId: a.doctorId,
    clinicianName: a?.doctor
      ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`
      : a?.clinicianName || "",
    specialty: a?.doctor?.specialization || a?.specialty || "",
    location: a?.location || "",
    title: a?.reason || "Visit",
    status: a?.status || "SCHEDULED",
    notes: a?.notes || "",
    patientName,
    patientPhone,
  };
}

function isFuture(dt) {
  return dt.getTime() >= Date.now();
}

// Today as local date string, not UTC
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Keep localStorage user in sync with patientId
function syncPatientIdToAuth(patientId) {
  if (!patientId) return;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const user = JSON.parse(raw);
    if (!user) return;
    if (user.patientId === patientId) return;

    const updated = { ...user, patientId };
    localStorage.setItem("user", JSON.stringify(updated));
  } catch {
    // ignore parse errors
  }
}

export const appointmentService = {
  todayISO,

  toBadge(dateISO) {
    return toBadgeFromDate(dateISO);
  },

  async ensureLoggedIn() {
    const u = authService.getCurrentUser();
    if (!u?.token) throw new Error("Not authenticated");
  },

  // Patient: upcoming appointments (future, scheduled)
  async listUpcoming() {
    await this.ensureLoggedIn();
    try {
      const { data } = await http.get("/appointments/mine");
      const list = Array.isArray(data?.data)
        ? data.data.map(mapServerAppointment)
        : [];
      const filtered = list
        .filter((a) => a.status === "SCHEDULED" && isFuture(a.dateTime))
        .sort((a, b) => a.dateTime - b.dateTime);
      return filtered;
    } catch (e) {
      if (e?.response?.status === 404) return [];
      throw e;
    }
  },

  // Patient: past appointments (any non-SCHEDULED status)
  async listPast() {
    await this.ensureLoggedIn();
    try {
      const { data } = await http.get("/appointments/mine");
      const list = Array.isArray(data?.data)
        ? data.data.map(mapServerAppointment)
        : [];

      // Key change: show everything that is no longer SCHEDULED (COMPLETED, CANCELLED, NO_SHOW, etc.)
      const filtered = list
        .filter((a) => a.status && a.status !== "SCHEDULED")
        .sort((a, b) => b.dateTime - a.dateTime);

      return filtered;
    } catch (e) {
      if (e?.response?.status === 404) return [];
      throw e;
    }
  },

  async getById(id) {
    await this.ensureLoggedIn();
    const { data } = await http.get(`/appointments/${id}`);
    return mapServerAppointment(data?.data);
  },

  async create({ clinicianId, date, time, reason, notes }) {
    await this.ensureLoggedIn();

    const u = authService.getCurrentUser();
    let patientId = u?.patientId;

    if (!patientId) {
      try {
        const res = await http.get("/patients/me");
        const patient = res?.data?.data || res?.data || null;
        if (patient?.id) {
          patientId = patient.id;
          syncPatientIdToAuth(patientId);
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) {
          throw new Error(
            "Please complete your profile before scheduling an appointment."
          );
        }
        throw new Error(
          "Unable to look up your patient profile. Please try again."
        );
      }
    }

    if (!patientId) {
      throw new Error(
        "Please complete your profile before scheduling an appointment."
      );
    }

    const [hh, mm] = time.split(":");
    const iso = new Date(
      `${date}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`
    ).toISOString();

    const { data } = await http.post("/appointments", {
      patientId,
      doctorId: clinicianId,
      dateTime: iso,
      reason,
      notes,
    });

    return mapServerAppointment(data?.data);
  },

  async update(id, payload) {
    await this.ensureLoggedIn();
    const { clinicianId, date, time, reason, notes } = payload;
    const [hh, mm] = time.split(":");
    const iso = new Date(
      `${date}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`
    ).toISOString();

    const { data } = await http.put(`/appointments/${id}`, {
      doctorId: clinicianId,
      dateTime: iso,
      reason,
      notes,
    });
    return mapServerAppointment(data?.data);
  },

  async cancel(id) {
    await this.ensureLoggedIn();
    await http.patch(`/appointments/${id}/cancel`);
    return true;
  },

  async getAvailability(date, clinicianId) {
    try {
      const { data } = await http.get("/appointments/availability", {
        params: { date, doctorId: clinicianId },
      });
      const slots = data?.data?.slots || data?.slots || [];
      return Array.isArray(slots) ? slots : [];
    } catch {
      return ["09:00", "09:30", "10:00", "10:30", "14:00", "14:30"];
    }
  },

  // Doctor: all upcoming appointments (not tied to a single day)
  async listDoctorUpcoming() {
    await this.ensureLoggedIn();
    try {
      const { data } = await http.get("/appointments/doctor/upcoming");
      const list = Array.isArray(data?.data)
        ? data.data.map(mapServerAppointment)
        : [];
      const filtered = list
        .filter((a) => a.status === "SCHEDULED" && isFuture(a.dateTime))
        .sort((a, b) => a.dateTime - b.dateTime);
      return filtered;
    } catch (e) {
      if (e?.response?.status === 404) return [];
      throw e;
    }
  },

  // Doctor: schedule for a specific day
  async listDoctorForDate(dateISO) {
    await this.ensureLoggedIn();
    const date = dateISO || todayISO();
    try {
      const { data } = await http.get("/appointments/doctor/schedule", {
        params: { date, status: "SCHEDULED" },
      });
      const list = Array.isArray(data?.data)
        ? data.data.map(mapServerAppointment)
        : [];
      return list.sort((a, b) => a.dateTime - b.dateTime);
    } catch (e) {
      if (e?.response?.status === 404) return [];
      throw e;
    }
  },

  // Convenience helper: today’s schedule for doctor
  async listDoctorToday() {
    return this.listDoctorForDate(todayISO());
  },
};
