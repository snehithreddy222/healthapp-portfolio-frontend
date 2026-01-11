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
    dateTime: d, // Date object
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

function viewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function isIsoDateTimeString(v) {
  return typeof v === "string" && v.includes("T") && (v.endsWith("Z") || v.includes("+"));
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

  async listUpcoming() {
    await this.ensureLoggedIn();
    try {
      const { data } = await http.get("/appointments/mine");
      const list = Array.isArray(data?.data)
        ? data.data.map(mapServerAppointment)
        : [];
      return list
        .filter((a) => a.status === "SCHEDULED" && isFuture(a.dateTime))
        .sort((a, b) => a.dateTime - b.dateTime);
    } catch (e) {
      if (e?.response?.status === 404) return [];
      throw e;
    }
  },

  async listPast() {
    await this.ensureLoggedIn();
    try {
      const { data } = await http.get("/appointments/mine");
      const list = Array.isArray(data?.data)
        ? data.data.map(mapServerAppointment)
        : [];
      return list
        .filter((a) => a.status && a.status !== "SCHEDULED")
        .sort((a, b) => b.dateTime - a.dateTime);
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

  // Create appointment
  // IMPORTANT: time can be either:
  // - slot.utc (ISO string) from availability (recommended)
  // - old "HH:MM" string (legacy)
  async create({ clinicianId, date, time, reason, notes }) {
    await this.ensureLoggedIn();

    if (!clinicianId || !time) {
      throw new Error("Missing clinicianId or time");
    }

    let iso;

    if (isIsoDateTimeString(time)) {
      iso = new Date(time).toISOString();
    } else {
      // legacy HH:MM path
      const [hh, mm] = String(time).split(":");
      iso = new Date(
        `${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(
          2,
          "0"
        )}:00`
      ).toISOString();
    }

    const { data } = await http.post("/appointments", {
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

    if (!clinicianId || !time) {
      throw new Error("Missing clinicianId or time");
    }

    let iso;

    if (isIsoDateTimeString(time)) {
      iso = new Date(time).toISOString();
    } else {
      // legacy HH:MM path
      const [hh, mm] = String(time).split(":");
      iso = new Date(
        `${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(
          2,
          "0"
        )}:00`
      ).toISOString();
    }

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

  // Returns normalized slots: [{ utc, label }]
  async getAvailability(date, clinicianId) {
    try {
      const tz = viewerTimeZone();

      const { data } = await http.get("/appointments/availability", {
        params: { date, doctorId: clinicianId, viewerTz: tz },
      });

      const raw = data?.data?.slots || data?.slots || [];
      if (!Array.isArray(raw)) return [];

      return raw
        .map((s) => {
          if (typeof s === "string") {
            return { utc: null, label: s };
          }
          if (s && typeof s === "object") {
            return {
              utc: s.utc,
              label: s.viewerTime || s.clinicTime || s.utc,
            };
          }
          return null;
        })
        .filter(Boolean)
        .filter((x) => typeof x.utc === "string" && x.utc.length > 0);
    } catch {
      // keep empty instead of fake times in production
      return [];
    }
  },

  async listDoctorUpcoming() {
    await this.ensureLoggedIn();
    try {
      const { data } = await http.get("/appointments/doctor/upcoming");
      const list = Array.isArray(data?.data)
        ? data.data.map(mapServerAppointment)
        : [];
      return list
        .filter((a) => a.status === "SCHEDULED" && isFuture(a.dateTime))
        .sort((a, b) => a.dateTime - b.dateTime);
    } catch (e) {
      if (e?.response?.status === 404) return [];
      throw e;
    }
  },

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

  async listDoctorToday() {
    return this.listDoctorForDate(todayISO());
  },
};
