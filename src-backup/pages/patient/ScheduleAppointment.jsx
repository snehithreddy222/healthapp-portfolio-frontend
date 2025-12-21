// src/pages/patient/ScheduleAppointment.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiCalendar, FiClock, FiAlertCircle } from "react-icons/fi";
import { appointmentService } from "../../services/appointmentService";
import { doctorService } from "../../services/doctorService";

export default function ScheduleAppointment() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const isReschedule = state?.mode === "reschedule";
  const rescheduleId = state?.appointmentId || null;

  const [clinicians, setClinicians] = useState([]);
  const [form, setForm] = useState({
    clinicianId: "",
    date: "",
    time: "",
    reason: "",
    notes: "",
  });
  const [slots, setSlots] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedClinician = useMemo(
    () => clinicians.find((c) => c.id === form.clinicianId),
    [clinicians, form.clinicianId]
  );

  const selectedClinicianMeta = useMemo(() => {
    if (!selectedClinician) return "";
    const parts = [];
    if (selectedClinician.specialization) {
      parts.push(selectedClinician.specialization);
    }
    if (
      typeof selectedClinician.yearsExperience === "number" &&
      selectedClinician.yearsExperience > 0
    ) {
      parts.push(`${selectedClinician.yearsExperience}+ years experience`);
    }
    return parts.join(" · ");
  }, [selectedClinician]);

  // Group available slots into morning / afternoon / evening for nicer layout
  const groupedSlots = useMemo(() => {
    const morning = [];
    const afternoon = [];
    const evening = [];

    slots.forEach((t) => {
      const hour = parseInt(String(t).split(":")[0], 10);
      if (Number.isNaN(hour)) {
        afternoon.push(t);
      } else if (hour < 12) {
        morning.push(t);
      } else if (hour < 17) {
        afternoon.push(t);
      } else {
        evening.push(t);
      }
    });

    return { morning, afternoon, evening };
  }, [slots]);

  // Load clinicians and (if rescheduling) the original appointment
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [docs, existing] = await Promise.all([
          doctorService.list(),
          isReschedule && rescheduleId
            ? appointmentService.getById(rescheduleId)
            : null,
        ]);

        if (!mounted) return;

        setClinicians(docs || []);

        if (existing) {
          setForm({
            clinicianId: existing.clinicianId,
            date: existing.date,
            time: existing.time,
            reason: existing.title || "",
            notes: existing.notes || "",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isReschedule, rescheduleId]);

  // Load availability each time clinician/date changes
  useEffect(() => {
    if (!form.date || !form.clinicianId) {
      setSlots([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoadingSlots(true);
        const s = await appointmentService.getAvailability(
          form.date,
          form.clinicianId
        );

        if (!mounted) return;

        let next = Array.isArray(s) ? s : [];

        // If we are rescheduling and the current time is not in the returned list,
        // include it so the pill still appears selected.
        if (form.time && !next.includes(form.time)) {
          next = [form.time, ...next];
        }

        setSlots(next);
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [form.date, form.clinicianId, form.time]);

  const onChangeField = (e) => {
    const { name, value } = e.target;

    setForm((f) => ({
      ...f,
      [name]: value,
      // When date or clinician changes, clear the previously selected time
      ...(name === "date" || name === "clinicianId" ? { time: "" } : {}),
    }));
  };

  const onSelectSlot = (time) => {
    setForm((f) => ({ ...f, time }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.clinicianId || !form.date || !form.time || !form.reason) {
      alert("Please select a clinician, date, time, and enter a reason.");
      return;
    }

    try {
      setSubmitting(true);

      if (isReschedule && rescheduleId) {
        await appointmentService.update(rescheduleId, {
          clinicianId: form.clinicianId,
          date: form.date,
          time: form.time,
          reason: form.reason,
          notes: form.notes,
        });
      } else {
        await appointmentService.create(form);
      }

      navigate("/patient/appointments");
    } catch (err) {
      alert(err.message || "Failed to submit appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const slotBaseClasses =
    "inline-flex items-center justify-center px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-medium cursor-pointer transition-all duration-150";
  const slotSelectedClasses =
    "bg-gradient-to-r from-sky-500 to-cyan-500 border-transparent text-white shadow-[0_10px_25px_rgba(56,189,248,0.45)] scale-[1.02]";
  const slotIdleClasses =
    "bg-white/90 border-sky-100 text-sky-700 hover:border-sky-300 hover:bg-sky-50";

  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4 py-6">
      {/* Hero header for scheduling */}
      <div className="rounded-[28px] border border-sky-100/80 bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_55%),radial-gradient(circle_at_bottom_right,#e0e7ff,transparent_55%)] px-4 sm:px-6 py-4 sm:py-5 shadow-[0_22px_60px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full bg-white/90 border border-sky-100 px-3 py-1 shadow-[0_10px_26px_rgba(15,23,42,0.10)]">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-600 mr-2">
                <FiCalendar className="text-[12px]" />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-sky-700">
                {isReschedule ? "Reschedule visit" : "Book a new visit"}
              </span>
            </div>
            <h1 className="mt-3 text-[24px] sm:text-[26px] font-extrabold tracking-tight text-slate-900">
              {isReschedule
                ? "Choose a new time that works for you"
                : "Schedule a new appointment"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
              Pick your clinician, choose a day, and then tap a time slot. Your
              visit details will sync automatically with your dashboard.
            </p>
          </div>
          <div className="flex items-start gap-2 text-[11px] sm:text-xs text-sky-800/80">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
              <FiAlertCircle className="text-[14px]" />
            </span>
            <p className="max-w-xs">
              If you do not see a time that fits, you can always call the office
              to check for additional availability.
            </p>
          </div>
        </div>
      </div>

      {/* Main layout: form + summary */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Left: form */}
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Clinician */}
          <div className="rounded-2xl border border-slate-100 bg-white/95 shadow-sm p-4 sm:p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold tracking-[0.16em] uppercase text-slate-500">
                Clinician
              </label>
              <p className="mt-1 text-[13px] text-slate-500">
                Start by choosing who you would like to see. We will show their
                specialty and experience to help you decide.
              </p>
              <select
                name="clinicianId"
                value={form.clinicianId}
                onChange={onChangeField}
                className="input mt-3 w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                required
                disabled={loading}
              >
                <option value="">
                  {loading ? "Loading clinicians…" : "Select a clinician…"}
                </option>
                {clinicians.map((c) => {
                  const label = c.label || [
                    c.name,
                    c.specialty && `(${c.specialty})`,
                    c.yearsExperience
                      ? `${c.yearsExperience}+ years experience`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <option key={c.id} value={c.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected clinician highlight card */}
            {selectedClinician && (
              <div className="mt-2 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/90 via-white to-emerald-50/80 px-3.5 py-3 flex items-start gap-3">
                <div className="mt-0.5 hidden sm:flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 font-semibold">
                  {selectedClinician.name
                    .replace("Dr. ", "")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedClinician.name}
                  </p>
                  {selectedClinicianMeta && (
                    <p className="text-[11px] text-slate-600">
                      {selectedClinicianMeta}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    This visit will be scheduled directly with{" "}
                    <span className="font-medium text-slate-800">
                      {selectedClinician.name}
                    </span>
                    . You will see them listed on your appointment card.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Date and time picker */}
          <div className="rounded-2xl border border-slate-100 bg-white/95 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <FiClock className="text-[14px]" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-500">
                  Date and time
                </p>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Pick a day, then tap one of the available time slots.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={onChangeField}
                  className="input mt-1 w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                  min={appointmentService.todayISO()}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <div className="mt-1 text-xs text-slate-500">
                  {form.date && form.clinicianId
                    ? "Select one of the available slots below."
                    : "Choose a clinician and date first."}
                </div>
              </div>
            </div>

            {/* Slot pills */}
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              {!form.date || !form.clinicianId ? (
                <p className="text-xs sm:text-sm text-slate-500">
                  Once you select a clinician and date, available times will
                  appear here.
                </p>
              ) : loadingSlots ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-20 rounded-full bg-slate-200 animate-pulse"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-600">
                  No online slots are available for this day. Try a different
                  date or contact the clinic for more options.
                </p>
              ) : (
                <div className="space-y-3">
                  {groupedSlots.morning.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
                        Morning
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {groupedSlots.morning.map((t) => (
                          <button
                            key={`m-${t}`}
                            type="button"
                            onClick={() => onSelectSlot(t)}
                            className={`${slotBaseClasses} ${
                              form.time === t
                                ? slotSelectedClasses
                                : slotIdleClasses
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedSlots.afternoon.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
                        Afternoon
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {groupedSlots.afternoon.map((t) => (
                          <button
                            key={`a-${t}`}
                            type="button"
                            onClick={() => onSelectSlot(t)}
                            className={`${slotBaseClasses} ${
                              form.time === t
                                ? slotSelectedClasses
                                : slotIdleClasses
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedSlots.evening.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
                        Evening
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {groupedSlots.evening.map((t) => (
                          <button
                            key={`e-${t}`}
                            type="button"
                            onClick={() => onSelectSlot(t)}
                            className={`${slotBaseClasses} ${
                              form.time === t
                                ? slotSelectedClasses
                                : slotIdleClasses
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hidden field for JS validation / debugging */}
            <input type="hidden" name="time" value={form.time} readOnly />
          </div>

          {/* Reason and notes */}
          <div className="rounded-2xl border border-slate-100 bg-white/95 shadow-sm p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reason for visit
              </label>
            <input
                type="text"
                name="reason"
                value={form.reason}
                onChange={onChangeField}
                placeholder="Annual physical, follow-up, lab review, etc."
                className="input mt-1 w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes for your clinician (optional)
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChangeField}
                rows={4}
                className="input mt-1 w-full focus:ring-[var(--ring-soft)] focus:border-sky-400"
                placeholder="Share any symptoms, questions, or context that would be helpful before your visit."
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting || loading}
              className="btn-primary h-11 px-6 rounded-full disabled:opacity-60"
            >
              {submitting
                ? isReschedule
                  ? "Rescheduling..."
                  : "Scheduling..."
                : isReschedule
                ? "Confirm new time"
                : "Schedule appointment"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center h-11 px-4 rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Right: live summary card */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 backdrop-blur-sm p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-sky-700">
              Visit overview
            </p>
            <h2 className="mt-2 text-[15px] font-semibold text-slate-900">
              {selectedClinician
                ? selectedClinician.name
                : "Select your clinician"}
            </h2>
            {selectedClinicianMeta && (
              <p className="text-xs text-sky-800 mt-0.5">
                {selectedClinicianMeta}
              </p>
            )}

            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium">Date:</span>{" "}
                {form.date || "Not selected"}
              </p>
              <p>
                <span className="font-medium">Time:</span>{" "}
                {form.time || "Not selected"}
              </p>
              <p>
                <span className="font-medium">Reason:</span>{" "}
                {form.reason || "Add a reason for your visit"}
              </p>
            </div>

            <div className="mt-4 rounded-xl bg-white/70 border border-sky-100 px-3 py-2 text-[11px] text-sky-700">
              <p>
                You will receive this appointment in your dashboard as soon as
                it is scheduled. You can cancel or reschedule from the
                Appointments page at any time.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
