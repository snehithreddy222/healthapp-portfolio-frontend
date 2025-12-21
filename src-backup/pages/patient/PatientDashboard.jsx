// src/pages/patient/PatientDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCalendar,
  FiMessageSquare,
  FiDroplet,
  FiHeart,
  FiCreditCard,
  FiInfo,
} from "react-icons/fi";

import { appointmentService } from "../../services/appointmentService";
import { billingService } from "../../services/billingService";
import { messageService } from "../../services/messageService";
import { patientService } from "../../services/patientService";
import { testResultsService } from "../../services/testResultsService";
import { authService } from "../../services/authService";
import { medicationService } from "../../services/medicationService";

function dollars(cents) {
  if (typeof cents !== "number") return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
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

function formatDate(dateLike) {
  const d = toLocalDate(dateLike);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function PatientDashboard() {
  const [displayName, setDisplayName] = useState("");
  const [upcoming, setUpcoming] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [
          meRes,
          upcomingRes,
          unreadRes,
          invoicesRes,
          testResultsRes,
          medsRes,
        ] = await Promise.allSettled([
          patientService.me(),
          appointmentService.listUpcoming(),
          messageService.getUnreadCount(),
          billingService.list(),
          testResultsService.list({ limit: 5 }).catch(() => ({ items: [] })),
          medicationService.list(),
        ]);

        if (cancelled) return;

        // Name
        let name = "";
        if (meRes.status === "fulfilled" && meRes.value) {
          const me = meRes.value;
          if (me.firstName) {
            name = me.lastName ? `${me.firstName} ${me.lastName}` : me.firstName;
          } else if (me.username) {
            name = me.username;
          }
        }
        if (!name) {
          const u = authService.getCurrentUser();
          if (u?.username) name = u.username;
        }
        setDisplayName(name || "there");

        // Upcoming appointments
        if (upcomingRes.status === "fulfilled") {
          const list = Array.isArray(upcomingRes.value)
            ? upcomingRes.value
            : [];
          setUpcoming(list.length ? list[0] : null);
        }

        // Unread messages
        if (unreadRes.status === "fulfilled") {
          setUnreadCount(
            typeof unreadRes.value === "number" ? unreadRes.value : 0
          );
        }

        // Invoices
        if (invoicesRes.status === "fulfilled") {
          const inv = Array.isArray(invoicesRes.value)
            ? invoicesRes.value
            : [];
          setInvoices(inv);
        }

        // Latest test result
        if (testResultsRes.status === "fulfilled") {
          const items = testResultsRes.value?.items || [];
          if (items.length) {
            const withDate = items.filter(
              (r) => r.date || r.performedAt || r.createdAt || r.updatedAt
            );
            let latest = null;
            if (withDate.length) {
              latest = withDate.reduce((best, r) => {
                const dStr =
                  r.date || r.performedAt || r.createdAt || r.updatedAt;
                const d = toLocalDate(dStr);
                if (!d) return best || r;
                if (!best) return r;
                const bestStr =
                  best.date ||
                  best.performedAt ||
                  best.createdAt ||
                  best.updatedAt;
                const bestD = toLocalDate(bestStr);
                if (!bestD) return r;
                return d > bestD ? r : best;
              }, null);
            } else {
              latest = items[0];
            }
            setLatestResult(latest);
          } else {
            setLatestResult(null);
          }
        }

        // Medications
        if (medsRes.status === "fulfilled") {
          const meds = Array.isArray(medsRes.value) ? medsRes.value : [];
          setMedications(meds);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(
    () => `Welcome back, ${displayName || "there"}!`,
    [displayName]
  );

  // Billing derived state
  const dueInvoices = useMemo(
    () => invoices.filter((i) => i.status === "DUE"),
    [invoices]
  );

  const outstandingCents = useMemo(
    () => dueInvoices.reduce((sum, inv) => sum + (inv.amountCents || 0), 0),
    [dueInvoices]
  );

  const nextDueInvoice = useMemo(() => {
    if (!dueInvoices.length) return null;
    let best = null;
    for (const inv of dueInvoices) {
      if (!inv.dueDate) continue;
      if (!best) {
        best = inv;
      } else if (toLocalDate(inv.dueDate) < toLocalDate(best.dueDate)) {
        best = inv;
      }
    }
    return best || dueInvoices[0];
  }, [dueInvoices]);

  const nextDueText = nextDueInvoice?.dueDate
    ? `Due by ${formatDate(nextDueInvoice.dueDate)}`
    : outstandingCents > 0
    ? "Payment due soon"
    : "You are all caught up";

  const hasUpcoming = !!upcoming;

  const upcomingBadge = hasUpcoming
    ? appointmentService.toBadge(upcoming.date)
    : null;

  // Medications derived state
  const activeMedications = useMemo(
    () =>
      medications.filter(
        (m) => String(m.status || "").toLowerCase() === "active"
      ),
    [medications]
  );

  const activeMedCount = activeMedications.length;
  const totalMedCount = medications.length;
  const topActiveMedication =
    activeMedications.length > 0 ? activeMedications[0] : null;

  const topActiveSubtitle = useMemo(() => {
    if (!topActiveMedication) return "";
    const parts = [];
    if (topActiveMedication.dosage) {
      parts.push(topActiveMedication.dosage);
    }
    if (topActiveMedication.frequency) {
      parts.push(topActiveMedication.frequency);
    }
    return parts.join(" • ");
  }, [topActiveMedication]);

  const refillText = useMemo(() => {
    if (!topActiveMedication) return "";
    if (topActiveMedication.refillDue) {
      return `Refill by ${formatDate(topActiveMedication.refillDue)}`;
    }
    return "";
  }, [topActiveMedication]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 py-2 sm:py-3 lg:py-4">
      {/* Hero / welcome banner – premium version like the reference image */}
      <div className="rounded-[32px] border border-sky-100/80 bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_52%),radial-gradient(circle_at_bottom_right,#e0e7ff,transparent_55%)] px-5 sm:px-7 py-4 sm:py-5 lg:py-6 shadow-[0_22px_60px_rgba(15,23,42,0.20)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          {/* Left: title, subtitle */}
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full bg-white/85 border border-sky-100 px-3 py-1 shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
              <span className="mr-2 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.30)]" />
              <span className="text-[11px] font-semibold tracking-[0.20em] uppercase text-sky-600">
                Today at a glance
              </span>
            </div>

            <h1 className="mt-3 text-[22px] sm:text-[26px] lg:text-[28px] font-extrabold tracking-tight text-slate-900">
              {greeting}
            </h1>
            <p className="mt-1 text-xs sm:text-sm lg:text-[14px] text-slate-600 max-w-2xl">
              Your appointments, messages, lab results, medications, and billing
              are synced in one calm, organized view so you can focus on your
              health.
            </p>
          </div>

          {/* Right: actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Link
              to="/patient/appointments/new"
              className="w-full sm:w-auto relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400 p-[1px] shadow-[0_16px_40px_rgba(56,189,248,0.55)] hover:from-sky-500 hover:to-cyan-500 transition"
            >
              <span className="px-5 py-2 text-sm font-semibold text-sky-950 rounded-full bg-white/95">
                Schedule visit
              </span>
            </Link>
            <Link
              to="/patient/messages"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-sky-200 bg-white/90 px-5 py-2 text-sm font-medium text-sky-700 shadow-[0_10px_26px_rgba(15,23,42,0.10)] hover:bg-sky-50/80 transition"
            >
              Message doctor
            </Link>
          </div>
        </div>

        {/* Info strip at the bottom of the hero */}
        <div className="mt-3 flex items-center gap-2 text-[11px] sm:text-xs text-sky-700/80">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
            <FiInfo className="text-[12px]" />
          </span>
          <span>
            Data updates automatically as appointments, messages, test results,
            and prescriptions change.
          </span>
        </div>
      </div>

      {/* Top stats strip – ultra premium cards */}
      <div className="mt-5">
        <div className="relative">
          {/* Soft halo behind cards */}
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-[32px] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.25),_transparent_55%),_radial-gradient(circle_at_top_right,_rgba(129,140,248,0.25),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(16,185,129,0.18),_transparent_55%)] blur-xl" />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Next appointment */}
            <Link
              to={
                hasUpcoming
                  ? "/patient/appointments"
                  : "/patient/appointments/new"
              }
              className="group relative overflow-hidden rounded-[26px] bg-white/95 border border-sky-100/80 shadow-[0_18px_45px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:ring-offset-2 focus:ring-offset-sky-50"
            >
              <div className="absolute left-4 right-4 top-0 h-[3px] rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-400" />
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 pt-1">
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                    Next appointment
                  </p>
                  {loading && !hasUpcoming ? (
                    <>
                      <p className="mt-2 text-sm text-slate-400">Loading…</p>
                      <p className="text-[11px] text-slate-400">
                        We are fetching your schedule.
                      </p>
                    </>
                  ) : hasUpcoming ? (
                    <>
                      <p className="mt-2 text-[15px] font-semibold text-slate-900 truncate">
                        {upcoming.title || "Upcoming visit"}
                      </p>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {formatDate(upcoming.date)} at {upcoming.time}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-[15px] font-semibold text-slate-900">
                        No visit scheduled
                      </p>
                      <p className="mt-1 text-[12px] text-slate-500">
                        Book your next appointment in a few taps.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-50 to-sky-100 flex items-center justify-center shadow-[0_14px_30px_rgba(56,189,248,0.45)]">
                    <div className="w-9 h-9 rounded-[20px] bg-white grid place-items-center text-sky-600 text-[19px] shadow-[0_0_0_1px_rgba(56,189,248,0.30)]">
                      <FiCalendar />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Inbox / unread messages */}
            <Link
              to="/patient/messages"
              className="group relative overflow-hidden rounded-[26px] bg-white/95 border border-indigo-100/80 shadow-[0_18px_45px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:ring-offset-2 focus:ring-offset-sky-50"
            >
              <div className="absolute left-4 right-4 top-0 h-[3px] rounded-full bg-gradient-to-r from-indigo-400 via-sky-500 to-fuchsia-400" />
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 pt-1">
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                    Inbox
                  </p>
                  <p className="mt-2 text-[26px] leading-none font-extrabold text-slate-900">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {unreadCount > 0
                      ? "New messages waiting in your inbox."
                      : "You are all caught up."}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-100 flex items-center justify-center shadow-[0_14px_30px_rgba(129,140,248,0.40)]">
                    <div className="w-9 h-9 rounded-[20px] bg-white grid place-items-center text-indigo-500 text-[19px] shadow-[0_0_0_1px_rgba(129,140,248,0.30)]">
                      <FiMessageSquare />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Balance */}
            <Link
              to="/patient/billings"
              className="group relative overflow-hidden rounded-[26px] bg-white/95 border border-amber-100/80 shadow-[0_18px_45px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:ring-offset-2 focus:ring-offset-sky-50"
            >
              <div className="absolute left-4 right-4 top-0 h-[3px] rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 pt-1">
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                    Balance
                  </p>
                  <p className="mt-2 text-[24px] sm:text-[26px] font-extrabold text-slate-900">
                    {dollars(outstandingCents)}
                  </p>
                  <p className="mt-1 text-[12px] text-amber-700">
                    {nextDueText}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center shadow-[0_14px_30px_rgba(245,158,11,0.40)]">
                    <div className="w-9 h-9 rounded-[20px] bg-white grid place-items-center text-amber-600 text-[19px] shadow-[0_0_0_1px_rgba(245,158,11,0.35)]">
                      <FiCreditCard />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Latest lab result */}
            <Link
              to="/patient/test-results"
              className="group relative overflow-hidden rounded-[26px] bg-white/95 border border-emerald-100/80 shadow-[0_18px_45px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:ring-offset-2 focus:ring-offset-sky-50"
            >
              <div className="absolute left-4 right-4 top-0 h-[3px] rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400" />
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0 pt-1">
                  <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400">
                    Latest lab result
                  </p>
                  {latestResult ? (
                    <>
                      <p className="mt-2 text-[15px] font-semibold text-slate-900 truncate">
                        {latestResult.name ||
                          latestResult.title ||
                          latestResult.testName ||
                          "Lab result"}
                      </p>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {formatDate(
                          latestResult.date ||
                            latestResult.performedAt ||
                            latestResult.createdAt ||
                            latestResult.updatedAt
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-[15px] font-semibold text-slate-900">
                        No recent results
                      </p>
                      <p className="mt-1 text-[12px] text-slate-500">
                        New lab work will appear here automatically.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center shadow-[0_14px_30px_rgba(16,185,129,0.40)]">
                    <div className="w-9 h-9 rounded-[20px] bg-white grid place-items-center text-emerald-600 text-[19px] shadow-[0_0_0_1px_rgba(16,185,129,0.35)]">
                      <FiDroplet />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Main cards grid – five cards packed into two rows on desktop */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {/* Upcoming Appointments */}
        <section className="card-soft">
          <div className="flex items-center gap-2">
            <div className="tile tile-blue">
              <FiCalendar />
            </div>
            <h2 className="text-[15px] font-semibold">
              Upcoming Appointments
            </h2>
          </div>

          <div className="mt-3 rounded-xl border border-gray-200 bg-white">
            {loading && !hasUpcoming ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : hasUpcoming ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
                <div className="date-tile">
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[11px] font-semibold text-sky-700 tracking-wide">
                      {upcomingBadge?.mon}
                    </span>
                    <span className="text-2xl font-extrabold text-sky-800">
                      {upcomingBadge?.day}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {upcoming.title || "Upcoming visit"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {upcoming.time}{" "}
                    {upcoming.clinicianName
                      ? `with ${upcoming.clinicianName}`
                      : ""}
                    {upcoming.specialty ? ` (${upcoming.specialty})` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-500">
                You have no upcoming appointments.
              </div>
            )}
          </div>

          <Link
            to="/patient/appointments"
            className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline"
          >
            View all appointments
          </Link>
        </section>

        {/* Unread Messages */}
        <section className="card-soft">
          <div className="flex items-center gap-2">
            <div className="tile tile-blue">
              <FiMessageSquare />
            </div>
            <h2 className="text-[15px] font-semibold">Unread Messages</h2>
            {unreadCount > 0 ? (
              <span className="pill-red ml-auto">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : (
              <span className="ml-auto text-xs font-medium text-gray-400">
                0
              </span>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
            {unreadCount > 0 ? (
              <>
                <p className="font-medium text-gray-900">
                  You have {unreadCount} unread message
                  {unreadCount > 1 ? "s" : ""}.
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Review messages from your care team.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-900">
                  You are all caught up.
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  There are no new messages from your providers.
                </p>
              </>
            )}

            <Link
              to="/patient/messages"
              className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline"
            >
              Go to inbox
            </Link>
          </div>
        </section>

        {/* Recent Test Results */}
        <section className="card-soft">
          <div className="flex items-center gap-2">
            <div className="tile tile-blue">
              <FiDroplet />
            </div>
            <h2 className="text-[15px] font-semibold">Recent Test Results</h2>
          </div>

          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
            {latestResult ? (
              <>
                <p className="font-medium text-gray-900">
                  {latestResult.name ||
                    latestResult.title ||
                    latestResult.testName ||
                    "Lab result"}
                </p>
                <span className="pill-green mt-2">Available</span>
                <p className="text-sm text-gray-600 mt-2">
                  Results from{" "}
                  {formatDate(
                    latestResult.date ||
                      latestResult.performedAt ||
                      latestResult.createdAt ||
                      latestResult.updatedAt
                  )}{" "}
                  are ready for review.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-900">
                  No recent test results.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  When your provider orders lab work, it will appear here.
                </p>
              </>
            )}

            <Link
              to="/patient/test-results"
              className="mt-3 inline-block text-sm font-medium text-sky-700 hover:underline"
            >
              View details
            </Link>
          </div>
        </section>

        {/* Active Medications */}
        <section className="card-soft">
          <div className="flex items-center gap-2">
            <div className="tile tile-blue">
              <FiHeart />
            </div>
            <h2 className="text-[15px] font-semibold">Active Medications</h2>
            <Link
              to="/patient/medications"
              className="ml-auto text-sm font-medium text-sky-700 hover:underline"
            >
              View full list
            </Link>
          </div>

          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
            {loading && totalMedCount === 0 ? (
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-56 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
              </div>
            ) : activeMedCount > 0 && topActiveMedication ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">
                    You have {activeMedCount} active medication
                    {activeMedCount > 1 ? "s" : ""}.
                  </p>
                  <span className="pill-green">Active</span>
                </div>
                <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">
                    {topActiveMedication.medicationName ||
                      topActiveMedication.name ||
                      "Medication"}
                  </p>
                  {topActiveSubtitle && (
                    <p className="mt-1 text-xs text-slate-600">
                      {topActiveSubtitle}
                    </p>
                  )}
                  {refillText && (
                    <p className="mt-1 text-[11px] font-medium text-emerald-700">
                      {refillText}
                    </p>
                  )}
                </div>
                {activeMedCount > 1 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Plus {activeMedCount - 1} more active medication
                    {activeMedCount - 1 > 1 ? "s" : ""} in your chart.
                  </p>
                )}
              </>
            ) : totalMedCount > 0 ? (
              <>
                <p className="font-medium text-gray-900">
                  No medications currently marked as active.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  All medications in your chart are either completed or
                  expired. Your care team will mark new prescriptions as active
                  when needed.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-900">
                  No medications recorded yet.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  When your doctor adds prescriptions to your chart, they will
                  appear here and in the Medications page.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Outstanding Bills */}
        <section className="card-soft">
          <div className="flex items-center gap-2">
            <div className="tile tile-amber">
              <span className="font-semibold">≡</span>
            </div>
            <h2 className="text-[15px] font-semibold">Outstanding Bills</h2>
            <Link
              to="/patient/billings"
              className="ml-auto text-sm font-medium text-sky-700 hover:underline"
            >
              View billing details
            </Link>
          </div>

          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              You have an outstanding balance:
            </p>
            <p className="mt-1 text-3xl font-extrabold text-amber-900">
              {dollars(outstandingCents)}
            </p>
            <p className="text-sm text-amber-900 mt-1">{nextDueText}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
