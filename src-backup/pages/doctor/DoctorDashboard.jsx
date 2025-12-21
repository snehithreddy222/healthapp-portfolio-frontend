// src/pages/doctor/DoctorDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiCalendar,
  FiUsers,
  FiMail,
  FiActivity,
  FiDroplet,
  FiClock,
  FiTrendingUp,
  FiSettings,
} from "react-icons/fi";

import { doctorService } from "../../services/doctorService";
import { messageService } from "../../services/messageService";
import { appointmentService } from "../../services/appointmentService";
import { doctorPatientService } from "../../services/doctorPatientService";
import { testResultsService } from "../../services/testResultsService";
import { useAuth } from "../../context/AuthContext";

function isProfileComplete(doc) {
  if (!doc) return false;
  const required = [
    doc.firstName,
    doc.lastName,
    doc.specialization,
    doc.licenseNumber,
    doc.phoneNumber,
  ];
  return required.every((v) => typeof v === "string" && v.trim().length > 0);
}

function formatCount(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value > 999) return "999+";
  return value;
}

// Helper to parse date as a plain local calendar day
function toLocalDate(dateLike) {
  if (!dateLike) return null;
  const raw = String(dateLike).trim();

  // If it has a time part, strip it to just YYYY-MM-DD
  const datePart = raw.split("T")[0];

  // Expect "YYYY-MM-DD"
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      const dt = new Date(y, m - 1, d);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }

  // Fallback
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function formatDate(iso) {
  const d = toLocalDate(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Shared helper for lab status
function isLabFinalLike(row) {
  const normalized = String(row?.status || "").toLowerCase();
  const hasAttachment = !!row?.attachmentAvailable;

  const statusLooksFinal =
    normalized.includes("final") ||
    normalized.includes("ready") ||
    normalized.includes("completed") ||
    normalized.includes("avail");

  return statusLooksFinal && hasAttachment;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user: ctxUser } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);

  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  // New: active panel metrics
  const [panelCount, setPanelCount] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  // New: pending labs metrics
  const [pendingLabsCount, setPendingLabsCount] = useState(null);
  const [labsLoading, setLabsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await doctorService.meOrNull();
        if (!mounted) return;

        if (!isProfileComplete(me)) {
          navigate("/doctor/onboarding", { replace: true });
          return;
        }

        setDoctor(me);
      } catch (err) {
        console.error("Doctor dashboard: unable to load doctor profile", err);
        navigate("/doctor/onboarding", { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      try {
        setUnreadLoading(true);
        const count = await messageService.getUnreadCount();
        if (!cancelled && typeof count === "number") {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Doctor dashboard: failed to load unread count", err);
      } finally {
        if (!cancelled) setUnreadLoading(false);
      }
    }

    loadUnread();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!doctor) return;

    let cancelled = false;

    async function loadAppointments() {
      try {
        setAppointmentsLoading(true);

        const [todayList, upcomingList] = await Promise.all([
          appointmentService.listDoctorToday(),
          appointmentService.listDoctorUpcoming(),
        ]);

        if (cancelled) return;

        const todayCount = Array.isArray(todayList) ? todayList.length : 0;
        setTodayAppointmentsCount(todayCount);

        const upcoming =
          Array.isArray(upcomingList) && upcomingList.length > 0
            ? upcomingList[0]
            : null;
        setNextAppointment(upcoming);
      } catch (err) {
        console.error("Doctor dashboard: failed to load appointments", err);
        if (!cancelled) {
          setTodayAppointmentsCount(0);
          setNextAppointment(null);
        }
      } finally {
        if (!cancelled) setAppointmentsLoading(false);
      }
    }

    loadAppointments();
    return () => {
      cancelled = true;
    };
  }, [doctor]);

  // New: load active panel size from doctorPatientService
  useEffect(() => {
    if (!doctor) return;

    let cancelled = false;

    async function loadPanel() {
      try {
        setPanelLoading(true);
        const list = await doctorPatientService.listMyPatients("");
        if (!cancelled && Array.isArray(list)) {
          setPanelCount(list.length);
        }
      } catch (err) {
        console.error("Doctor dashboard: failed to load panel size", err);
        if (!cancelled) setPanelCount(null);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    }

    loadPanel();
    return () => {
      cancelled = false;
    };
  }, [doctor]);

  // New: load pending lab count from testResultsService
  useEffect(() => {
    if (!doctor) return;

    let cancelled = false;

    async function loadLabs() {
      try {
        setLabsLoading(true);
        const { items } = await testResultsService.list({ limit: 200 });
        if (cancelled) return;

        const safeItems = Array.isArray(items) ? items : [];

        const pending = safeItems.filter((r) => !isLabFinalLike(r));
        setPendingLabsCount(pending.length);
      } catch (err) {
        console.error("Doctor dashboard: failed to load lab metrics", err);
        if (!cancelled) setPendingLabsCount(null);
      } finally {
        if (!cancelled) setLabsLoading(false);
      }
    }

    loadLabs();
    return () => {
      cancelled = true;
    };
  }, [doctor]);

  const displayName = useMemo(() => {
    if (doctor?.firstName && doctor?.lastName) {
      return `Dr. ${doctor.firstName} ${doctor.lastName}`;
    }
    return ctxUser?.username || "Doctor";
  }, [doctor, ctxUser]);

  const yearsExperience =
    typeof doctor?.yearsExperience === "number" &&
    !Number.isNaN(doctor.yearsExperience)
      ? doctor.yearsExperience
      : null;

  const todayAppointmentsDisplay = formatCount(todayAppointmentsCount);

  const activePatientsRaw =
    typeof panelCount === "number"
      ? panelCount
      : typeof doctor?.activePatientsCount === "number"
      ? doctor.activePatientsCount
      : 0;

  const activePatientsDisplay = formatCount(activePatientsRaw);

  const pendingLabsRaw =
    typeof pendingLabsCount === "number"
      ? pendingLabsCount
      : typeof doctor?.pendingLabResultsCount === "number"
      ? doctor.pendingLabResultsCount
      : 0;

  const pendingLabsDisplay = formatCount(pendingLabsRaw);

  const unreadDisplay = formatCount(unreadCount);

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-5 lg:px-8 py-4 lg:py-6 space-y-5">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-900 px-6 py-6 border border-slate-700/80">
          <div className="h-8 w-64 rounded-lg bg-slate-700/70 animate-pulse mb-3" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-slate-800/70 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-white/95 border border-slate-200/80 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!doctor) {
    return null;
  }

  const nextDateLabel = nextAppointment ? formatDate(nextAppointment.date) : "";
  const nextTimeLabel = nextAppointment?.time || "";
  const nextPatientName = nextAppointment?.patientName || "Patient";

  return (
    <div className="w-full px-4 sm:px-5 lg:px-8 py-4 lg:py-6 space-y-5">
      {/* HERO: Dark Clinical Command Center */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-900 border border-slate-700/80 px-6 sm:px-8 py-6 lg:py-8">
        {/* Ambient glow effects */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-cyan-400/5 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Greeting and key metrics */}
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/50 border border-teal-600/40 px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-teal-300 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Clinical Dashboard · Live
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight text-white">
              {displayName}
            </h1>
            <p className="mt-2 text-sm sm:text-[15px] text-slate-300 max-w-2xl">
              Your clinical command center. Monitor today's schedule, patient
              messages, and lab reviews from a unified workspace.
            </p>

            {/* Inline metrics grid in hero */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-900/55 border border-slate-700/60 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-teal-400 font-bold">
                  Today
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {appointmentsLoading ? "..." : todayAppointmentsDisplay}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Appointments</p>
              </div>

              <div className="rounded-xl bg-slate-900/55 border border-slate-700/60 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                  Patients
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {panelLoading ? "..." : activePatientsDisplay}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Active panel</p>
              </div>

              <div className="rounded-xl bg-slate-900/55 border border-slate-700/60 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">
                  Inbox
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {unreadLoading ? "..." : unreadDisplay}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Unread</p>
              </div>

              <div className="rounded-xl bg-slate-900/55 border border-slate-700/60 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                  Labs
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {labsLoading ? "..." : pendingLabsDisplay}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {pendingLabsRaw > 0 ? "Pending review" : "No pending labs"}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Provider card */}
          <div className="relative flex flex-col gap-3 min-w-[260px]">
            <div className="rounded-2xl bg-gradient-to-br from-teal-800/40 to-slate-900/70 border border-teal-500/50 px-5 py-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 grid place-items-center text-white font-bold text-lg shadow-lg">
                  {doctor.firstName?.[0] || "D"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-teal-300 uppercase">
                    Provider
                  </p>
                  <p className="text-sm font-bold text-white truncate">
                    {doctor.specialization}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">License</span>
                  <span className="text-slate-200 font-medium">
                    {doctor.licenseNumber}
                  </span>
                </div>
                {yearsExperience !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Experience</span>
                    <span className="text-slate-200 font-medium">
                      {yearsExperience} years
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Link
              to="/doctor/settings"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-600/40 bg-slate-900/40 px-4 py-2 text-[13px] font-medium text-teal-300 hover:bg-teal-900/30 hover:border-teal-500 transition-all"
            >
              <FiSettings className="text-[14px]" />
              Manage profile
            </Link>
          </div>
        </div>
      </section>

      {/* CLINICAL METRICS: Data-dense cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          to="/doctor/schedule"
          className="group relative overflow-hidden rounded-xl bg-white border-2 border-slate-200 hover:border-teal-500 px-5 py-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(20,184,166,0.2)]"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-cyan-500" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 grid place-items-center">
                  <FiCalendar className="text-[18px]" />
                </div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Schedule
                </p>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">
                {appointmentsLoading ? "..." : todayAppointmentsDisplay}
              </p>
              <p className="text-xs text-slate-600">
                {appointmentsLoading
                  ? "Loading..."
                  : todayAppointmentsCount > 0
                  ? "appointments today"
                  : "No appointments today"}
              </p>
            </div>
            <FiTrendingUp className="text-teal-500 text-[20px] opacity-30 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        <Link
          to="/doctor/patients"
          className="group relative overflow-hidden rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-500 px-5 py-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.2)]"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-green-500" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center">
                  <FiUsers className="text-[18px]" />
                </div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Panel
                </p>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">
                {panelLoading ? "..." : activePatientsDisplay}
              </p>
              <p className="text-xs text-slate-600">active patients</p>
            </div>
            <FiTrendingUp className="text-emerald-500 text-[20px] opacity-30 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        <Link
          to="/doctor/messages"
          className="group relative overflow-hidden rounded-xl bg-white border-2 border-slate-200 hover:border-indigo-500 px-5 py-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(99,102,241,0.2)]"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center">
                  <FiMail className="text-[18px]" />
                </div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Messages
                </p>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">
                {unreadLoading ? "..." : unreadDisplay}
              </p>
              <p className="text-xs text-slate-600">
                {unreadCount > 0 ? "unread messages" : "all caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold animate-pulse">
                !
              </span>
            )}
          </div>
        </Link>

        <Link
          to="/doctor/test-results"
          className="group relative overflow-hidden rounded-xl bg-white border-2 border-slate-200 hover:border-amber-500 px-5 py-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(245,158,11,0.2)]"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-orange-500" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 grid place-items-center">
                  <FiDroplet className="text-[18px]" />
                </div>
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Lab reviews
                </p>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">
                {labsLoading ? "..." : pendingLabsDisplay}
              </p>
              <p className="text-xs text-slate-600">
                {pendingLabsRaw > 0 ? "pending review" : "no pending labs"}
              </p>
            </div>
            <FiTrendingUp className="text-amber-500 text-[20px] opacity-30 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      </section>

      {/* WORKFLOW SECTION: Structured layout */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Workflow shortcuts - spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[17px] font-bold text-slate-900">
                Clinical workflow
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Quick access to high-priority tasks
              </p>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Priority
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              to="/doctor/schedule"
              className="rounded-xl border-2 border-slate-200 hover:border-teal-400 bg-gradient-to-br from-slate-50 to-white px-4 py-4 transition-all hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 grid place-items-center mb-3">
                <FiCalendar className="text-[20px]" />
              </div>
              <p className="font-bold text-slate-900 text-sm mb-2">
                Review schedule
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirm visits and document outcomes for today's appointments.
              </p>
            </Link>

            <Link
              to="/doctor/test-results"
              className="rounded-xl border-2 border-slate-200 hover:border-amber-400 bg-gradient-to-br from-slate-50 to-white px-4 py-4 transition-all hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 grid place-items-center mb-3">
                <FiDroplet className="text-[20px]" />
              </div>
              <p className="font-bold text-slate-900 text-sm mb-2">
                Review labs
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Check new results and release them to patients when appropriate.
              </p>
            </Link>

            <Link
              to="/doctor/messages"
              className="rounded-xl border-2 border-slate-200 hover:border-indigo-400 bg-gradient-to-br from-slate-50 to-white px-4 py-4 transition-all hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 grid place-items-center mb-3">
                <FiMail className="text-[20px]" />
              </div>
              <p className="font-bold text-slate-900 text-sm mb-2">
                Respond to messages
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reply to patient questions and clinical follow-ups.
              </p>
            </Link>
          </div>
        </div>

        {/* Account health */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center shadow-lg">
              <FiActivity className="text-[18px]" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">System status</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-700">
                Profile complete and verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-700">Messaging enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-700">Lab reviews active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-700">Schedule synchronized</span>
            </div>
          </div>

          <Link
            to="/doctor/settings"
            className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            <FiSettings />
            Manage settings
          </Link>
        </div>
      </section>

      {/* NEXT APPOINTMENT: Table-style */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 grid place-items-center">
              <FiClock className="text-[18px]" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">
                Next appointment
              </h2>
              <p className="text-xs text-slate-500">Upcoming visit details</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {appointmentsLoading ? (
            <p className="text-sm text-slate-500">Loading schedule...</p>
          ) : nextAppointment ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="flex-shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 border-2 border-sky-200 flex flex-col items-center justify-center shadow-md">
                <span className="text-[11px] font-bold text-sky-700 tracking-wide uppercase">
                  {nextDateLabel.split(" ")[0]}
                </span>
                <span className="text-2xl font-extrabold text-sky-900 mt-1">
                  {nextDateLabel.split(" ")[1]?.replace(",", "")}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-slate-900 mb-1">
                  {nextPatientName}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <FiClock className="text-sky-600" />
                    {nextTimeLabel || "Time TBD"}
                  </span>
                  {nextAppointment.location && (
                    <span>· {nextAppointment.location}</span>
                  )}
                  {nextAppointment.reason && (
                    <span>· {nextAppointment.reason}</span>
                  )}
                </div>

                <Link
                  to="/doctor/schedule"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
                >
                  View full schedule →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-slate-900 mb-1">
                No upcoming appointments
              </p>
              <p className="text-xs text-slate-500">
                Your schedule is clear. New appointments will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
