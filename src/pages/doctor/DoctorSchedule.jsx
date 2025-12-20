// src/pages/doctor/DoctorSchedule.jsx
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { appointmentService } from "../../services/appointmentService";
import http from "../../services/http";

// Treat "YYYY-MM-DD" as a local date (no UTC shift)
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

// Options a doctor can set
const STATUS_OPTIONS = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];

function getStatusLabel(status) {
  switch (status) {
    case "SCHEDULED":
      return "Scheduled";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    default:
      return status || "Scheduled";
  }
}

function getStatusPillClasses(status) {
  const base =
    "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium";

  switch (status) {
    case "COMPLETED":
      return `${base} bg-emerald-50 text-emerald-700 border border-emerald-100`;
    case "CANCELLED":
      return `${base} bg-rose-50 text-rose-700 border border-rose-100`;
    case "NO_SHOW":
      return `${base} bg-amber-50 text-amber-700 border border-amber-100`;
    case "SCHEDULED":
    default:
      return `${base} bg-sky-50 text-sky-700 border border-sky-100`;
  }
}

// Reusable small status control for rows
function StatusControl({ appt, onChange, disabled }) {
  const label = getStatusLabel(appt.status);
  const pillClasses = getStatusPillClasses(appt.status);

  return (
    <div className="flex items-center gap-2">
      <span className={pillClasses}>{label}</span>
      <select
        className="h-8 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-400"
        value={appt.status}
        disabled={disabled}
        onChange={(e) => onChange(appt, e.target.value)}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {getStatusLabel(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DoctorSchedule() {
  const [selectedDate, setSelectedDate] = useState(
    appointmentService.todayISO()
  );

  // Day schedule (only for selected date)
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // All upcoming appointments for doctor (independent of selectedDate)
  const [upcomingAll, setUpcomingAll] = useState([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [upcomingError, setUpcomingError] = useState("");

  // Track which appointment is being updated
  const [updatingId, setUpdatingId] = useState(null);

  const dayLabel = format(
    parseIsoDateLocal(selectedDate),
    "EEEE, d MMM yyyy"
  );

  // Load schedule for a single date
  async function loadSchedule(date) {
    setLoading(true);
    setError("");
    try {
      const list = await appointmentService.listDoctorForDate(date);
      setAppointments(list);
    } catch (e) {
      console.error(e);
      setError("Unable to load schedule. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Load ALL upcoming appointments (future)
  async function loadUpcoming() {
    setLoadingUpcoming(true);
    setUpcomingError("");

    try {
      const list = await appointmentService.listDoctorUpcoming();
      setUpcomingAll(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Unable to load upcoming appointments", e);
      setUpcomingError("Unable to load upcoming appointments.");
    } finally {
      setLoadingUpcoming(false);
    }
  }

  // Change status (including cancel) for any appointment
  async function handleStatusChange(appt, newStatus) {
    if (newStatus === appt.status) return;

    setUpdatingId(appt.id);
    try {
      if (newStatus === "CANCELLED") {
        // Use dedicated cancel endpoint
        await appointmentService.cancel(appt.id);
      } else {
        // Generic status update
        await http.put(`/appointments/${appt.id}`, {
          status: newStatus,
        });
      }

      // Refresh both views so everything stays in sync
      await Promise.all([loadSchedule(selectedDate), loadUpcoming()]);
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Could not update appointment status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadSchedule(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    loadUpcoming();
  }, []);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleRefreshDay = () => {
    loadSchedule(selectedDate);
  };

  const handleRefreshUpcoming = () => {
    loadUpcoming();
  };

  const totalForDay = appointments.length;

  // Sort upcoming by local date so there is no one-day shift
  const upcomingSorted = [...upcomingAll].sort((a, b) => {
    const da = parseIsoDateLocal(a.date);
    const db = parseIsoDateLocal(b.date);
    return da - db;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-slate-900">
            Schedule
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-xl">
            Review your appointments for a given day and manage statuses for all
            your upcoming visits in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="input h-10 w-full sm:w-auto"
          />
          <button
            type="button"
            onClick={handleRefreshDay}
            className="inline-flex items-center px-3 h-10 rounded-md border border-sky-200 bg-white text-sky-700 text-sm font-medium hover:bg-sky-50"
          >
            Refresh day
          </button>
        </div>
      </div>

      {/* Day schedule card */}
      <div className="card-soft">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Day overview
            </p>
            <p className="text-xs text-slate-500">{dayLabel}</p>
          </div>
          <p className="text-xs text-slate-500">
            {totalForDay === 0
              ? "No appointments"
              : totalForDay === 1
              ? "1 appointment"
              : `${totalForDay} appointments`}
          </p>
        </div>

        <div className="border-t border-slate-200 mt-2 pt-2">
          {loading && (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading schedule…
            </div>
          )}

          {!loading && error && (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-rose-600 mb-2">
                Unable to load schedule
              </p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={handleRefreshDay}
                className="inline-flex items-center px-4 h-9 rounded-full bg-rose-600 text-white text-sm font-medium hover:bg-rose-700"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && appointments.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              No appointments scheduled for this day.
            </div>
          )}

          {!loading && !error && appointments.length > 0 && (
            <div className="divide-y divide-slate-100">
              <div className="hidden md:grid grid-cols-[80px_minmax(0,1.5fr)_minmax(0,1.2fr)_160px] gap-4 px-2 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em]">
                <span>Time</span>
                <span>Patient</span>
                <span>Reason</span>
                <span className="text-right">Status</span>
              </div>

              {appointments.map((appt) => {
                const badge = appointmentService.toBadge(appt.date);
                const isUpdating = updatingId === appt.id;

                return (
                  <div
                    key={appt.id}
                    className="flex flex-col md:grid md:grid-cols-[80px_minmax(0,1.5fr)_minmax(0,1.2fr)_160px] gap-3 md:gap-4 px-2 py-3 items-start md:items-center hover:bg-slate-50 transition-colors"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-2">
                      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-[11px] font-semibold text-slate-700">
                        <span className="text-[10px]">{badge.mon}</span>
                        <span className="text-[15px] leading-none">
                          {badge.day}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700">
                        <div className="font-medium text-[13px]">
                          {appt.time}
                        </div>
                      </div>
                    </div>

                    {/* Patient */}
                    <div className="text-xs text-slate-800">
                      <div className="font-medium">
                        {appt.patientName || "Patient"}
                      </div>
                      {appt.patientPhone && (
                        <div className="text-slate-500 text-[11px]">
                          {appt.patientPhone}
                        </div>
                      )}
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-slate-700 truncate">
                      {appt.title}
                    </div>

                    {/* Status + control */}
                    <div className="flex md:justify-end w-full md:w-auto">
                      <StatusControl
                        appt={appt}
                        disabled={isUpdating}
                        onChange={handleStatusChange}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming appointments (all future) */}
      <div className="card-soft">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Upcoming appointments
            </p>
            <p className="text-xs text-slate-500 max-w-xl">
              This list shows all upcoming appointments for you, not limited to
              the selected day. You can update statuses or cancel directly from
              here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              {upcomingSorted.length === 0
                ? "No upcoming appointments"
                : `${upcomingSorted.length} upcoming`}
            </p>
            <button
              type="button"
              onClick={handleRefreshUpcoming}
              className="inline-flex items-center px-3 h-8 rounded-full border border-slate-200 bg-white text-slate-700 text-[11px] font-medium hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-2 pt-2">
          {loadingUpcoming && (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading upcoming appointments…
            </div>
          )}

          {!loadingUpcoming && upcomingError && (
            <div className="py-8 text-center text-sm text-rose-600">
              {upcomingError}
            </div>
          )}

          {!loadingUpcoming &&
            !upcomingError &&
            upcomingSorted.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">
                You have no upcoming appointments.
              </div>
            )}

          {!loadingUpcoming &&
            !upcomingError &&
            upcomingSorted.length > 0 && (
              <div className="space-y-3">
                {upcomingSorted.map((appt) => {
                  const d = parseIsoDateLocal(appt.date);
                  const dateLabel = format(d, "EEE, MMM d");
                  const timeLabel = appt.time || format(d, "p");
                  const isUpdating = updatingId === appt.id;

                  return (
                    <div
                      key={`upcoming-${appt.id}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center text-[11px] font-semibold text-slate-700">
                          <span className="text-[10px]">
                            {format(d, "MMM")}
                          </span>
                          <span className="text-[15px] leading-none">
                            {format(d, "d")}
                          </span>
                        </div>
                        <div className="text-xs text-slate-800">
                          <div className="font-medium text-[13px]">
                            {appt.patientName || "Patient"}
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {dateLabel} · {timeLabel}
                          </div>
                          {appt.title && (
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              {appt.title}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        <StatusControl
                          appt={appt}
                          disabled={isUpdating}
                          onChange={handleStatusChange}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
