// src/components/common/Topbar.jsx
import React, { useEffect, useState } from "react";
import {
  FiSearch,
  FiBell,
  FiMenu,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { patientService } from "../../services/patientService";
import { doctorService } from "../../services/doctorService";
import { searchService } from "../../services/searchService";
import { messageService } from "../../services/messageService";

const UNREAD_POLL_MS = 180000; // 3 minutes

// Small helper to derive a nice page title + subtitle from the route
function derivePageMeta(pathname, isDoctor, isPatient) {
  if (pathname.startsWith("/patient")) {
    if (pathname.startsWith("/patient/dashboard")) {
      return {
        title: "Patient home",
        subtitle: "Your health at a glance",
      };
    }
    if (pathname.startsWith("/patient/appointments")) {
      return {
        title: "Appointments",
        subtitle: "Manage and review upcoming visits",
      };
    }
    if (pathname.startsWith("/patient/messages")) {
      return {
        title: "Messages",
        subtitle: "Stay in touch with your care team",
      };
    }
    if (pathname.startsWith("/patient/test-results")) {
      return {
        title: "Test results",
        subtitle: "View lab work and reports in one place",
      };
    }
    if (pathname.startsWith("/patient/medications")) {
      return {
        title: "Medications",
        subtitle: "Review prescriptions and dosage details",
      };
    }
    if (pathname.startsWith("/patient/billings")) {
      return {
        title: "Billing and payments",
        subtitle: "Invoices, payments, and balances",
      };
    }
    if (pathname.startsWith("/patient/settings")) {
      return {
        title: "Account settings",
        subtitle: "Profile, security, and preferences",
      };
    }
    if (pathname.startsWith("/patient/onboarding")) {
      return {
        title: "Complete your profile",
        subtitle: "A few details to personalize your care",
      };
    }
  }

  if (pathname.startsWith("/doctor")) {
    if (pathname.startsWith("/doctor/dashboard")) {
      return {
        title: "Clinical dashboard",
        subtitle: "Today’s schedule, signals, and tasks",
      };
    }
    if (pathname.startsWith("/doctor/schedule")) {
      return {
        title: "Schedule",
        subtitle: "Visit flow for the day",
      };
    }
    if (pathname.startsWith("/doctor/patients")) {
      return {
        title: "My patients",
        subtitle: "Panel overview and clinical shortcuts",
      };
    }
    if (pathname.startsWith("/doctor/messages")) {
      return {
        title: "Inbox",
        subtitle: "Secure conversations with patients",
      };
    }
    if (pathname.startsWith("/doctor/test-results")) {
      return {
        title: "Lab reviews",
        subtitle: "Order and sign off results",
      };
    }
    if (pathname.startsWith("/doctor/settings")) {
      return {
        title: "Provider settings",
        subtitle: "Identity, credentials, and preferences",
      };
    }
    if (pathname.startsWith("/doctor/onboarding")) {
      return {
        title: "Set up provider profile",
        subtitle: "Make sure scheduling and orders are accurate",
      };
    }
  }

  // Fallbacks
  if (isDoctor) {
    return {
      title: "Doctor workspace",
      subtitle: "Clinical tools and patient context",
    };
  }
  if (isPatient) {
    return {
      title: "HealthApp",
      subtitle: "Your care, organized",
    };
  }

  return {
    title: "HealthApp",
    subtitle: "Unified patient and provider portal",
  };
}

export default function Topbar({ onMenuClick }) {
  const { user: ctxUser } = useAuth();
  const user = ctxUser || authService.getCurrentUser() || {};

  const initial =
    (user.username && user.username[0]) ||
    (user.email && user.email[0]) ||
    "A";

  const navigate = useNavigate();
  const location = useLocation();

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  const isPatient =
    user &&
    typeof user.role === "string" &&
    user.role.toUpperCase() === "PATIENT";

  const isDoctor =
    user &&
    typeof user.role === "string" &&
    user.role.toUpperCase() === "DOCTOR";

  const onPatientArea = location.pathname.startsWith("/patient");
  const onPatientOnboarding = location.pathname.startsWith(
    "/patient/onboarding"
  );

  const onDoctorArea = location.pathname.startsWith("/doctor");
  const onDoctorOnboarding = location.pathname.startsWith(
    "/doctor/onboarding"
  );

  // Top search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({
    appointments: [],
    messages: [],
    tests: [],
  });
  const [searchTouched, setSearchTouched] = useState(false);

  // Unread notifications (messages) state
  const [unreadCount, setUnreadCount] = useState(0);
  const [justNotified, setJustNotified] = useState(false);

  // Onboarding detection for both patients and doctors
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isPatient && !isDoctor) {
        setNeedsOnboarding(false);
        setChecking(false);
        return;
      }

      try {
        if (isPatient) {
          const me = await patientService.meOrNull();
          if (cancelled) return;

          const missingCore =
            !me ||
            !me.firstName ||
            !me.lastName ||
            !me.dateOfBirth ||
            !me.phoneNumber ||
            !me.gender;

          setNeedsOnboarding(missingCore);
        } else if (isDoctor) {
          const me = await doctorService.meOrNull();
          if (cancelled) return;

          const needs = !doctorService.isProfileComplete(me);
          setNeedsOnboarding(needs);
        }
      } catch {
        if (!cancelled) {
          setNeedsOnboarding(false);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isPatient, isDoctor, location.pathname]);

  // Search behavior
  useEffect(() => {
    let cancelled = false;

    const term = searchQuery.trim();
    if (!term) {
      setSearchResults({ appointments: [], messages: [], tests: [] });
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    const handle = setTimeout(async () => {
      try {
        const result = await searchService.searchAll(term);
        if (!cancelled) {
          setSearchResults(result);
        }
      } catch {
        if (!cancelled) {
          setSearchResults({ appointments: [], messages: [], tests: [] });
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery]);

  // Poll unread message count using lightweight unread-count endpoint
  useEffect(() => {
    if (!user || !user.token) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function fetchUnreadOnce() {
      try {
        if (cancelled) return;
        if (document.visibilityState !== "visible") return;

        const count = await messageService.getUnreadCount().catch(() => 0);
        if (cancelled) return;

        setUnreadCount((prev) => {
          const prevNum = typeof prev === "number" ? prev : 0;

          if (count > prevNum) {
            setJustNotified(true);
            setTimeout(() => {
              setJustNotified(false);
            }, 1500);
          }

          return count;
        });
      } catch {
        // keep previous value
      }
    }

    // initial fetch
    fetchUnreadOnce();

    // poll every UNREAD_POLL_MS
    const id = setInterval(fetchUnreadOnce, UNREAD_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.token]);

  const displayName =
    (user.username && user.username.replace(/_/g, " ")) ||
    (user.email && user.email.split("@")[0]) ||
    (isDoctor ? "Doctor" : "Patient");

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : isDoctor
    ? "Doctor"
    : "Patient";

  const idSource = user?.patientId || user?.id;
  const patientDisplayId =
    isPatient && idSource
      ? String(idSource).slice(-6).padStart(6, "0")
      : null;

  const hasAnyResults =
    searchResults.appointments.length ||
    searchResults.messages.length ||
    searchResults.tests.length;

  const showDropdown =
    searchTouched && searchQuery.trim().length > 0 && (searchLoading || true);

  function handleSearchChange(e) {
    setSearchTouched(true);
    setSearchQuery(e.target.value);
  }

  function handleSearchKeyDown(e) {
    if (e.key === "Escape") {
      handleClearSearch();
    }
  }

  function handleClearSearch() {
    setSearchQuery("");
    setSearchTouched(false);
    setSearchResults({ appointments: [], messages: [], tests: [] });
    setSearchLoading(false);
  }

  function handleResultClick(type, item) {
    if (type === "appointment") {
      if (isDoctor) {
        navigate("/doctor/schedule");
      } else {
        navigate("/patient/appointments");
      }
    } else if (type === "message") {
      if (isDoctor) {
        navigate("/doctor/messages");
      } else {
        navigate("/patient/messages");
      }
    } else if (type === "test") {
      if (isDoctor) {
        navigate("/doctor/test-results");
      } else {
        navigate("/patient/test-results");
      }
    }

    handleClearSearch();
  }

  const hasUnread = unreadCount > 0;
  const unreadLabel =
    unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount || "";

  const { title: pageTitle, subtitle: pageSubtitle } = derivePageMeta(
    location.pathname,
    isDoctor,
    isPatient
  );

  return (
    <header className="sticky top-0 z-40">
      {/* Full-width premium gradient strip behind the bar */}
      <div className="w-full bg-[radial-gradient(circle_at_0%_0%,#e0f2fe,transparent_55%),radial-gradient(circle_at_100%_0%,#e9d5ff,transparent_55%),linear-gradient(to_right,#f9fafb,#e5f4ff,#eef2ff)] border-b border-sky-100/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
        <div className="px-3 sm:px-4 lg:px-6 pt-2.5 pb-2">
          <div className="flex flex-col gap-2">
            {/* Top row: menu, page title, actions */}
            <div className="flex items-center gap-3">
              {/* Left: mobile menu + page meta */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {onMenuClick && (
                  <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Open navigation"
                    className="inline-flex lg:hidden items-center justify-center rounded-full p-2 -ml-1 text-sky-700 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:ring-offset-1 focus:ring-offset-sky-50 transition"
                  >
                    <FiMenu className="text-[18px]" />
                  </button>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold tracking-[0.18em] uppercase text-sky-600">
                      {isDoctor ? "Clinical workspace" : "Patient portal"}
                    </p>
                    <span className="hidden sm:inline-flex items-center rounded-full border border-sky-100 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                      {roleLabel}
                      {patientDisplayId ? ` · ID ${patientDisplayId}` : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm sm:text-[15px] font-semibold tracking-tight text-slate-900 truncate">
                    {pageTitle}
                  </p>
                  <p className="hidden sm:block text-[11px] text-slate-500 truncate">
                    {pageSubtitle}
                  </p>
                </div>
              </div>

              {/* Right: notifications + user */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  aria-label={
                    hasUnread
                      ? `You have ${unreadLabel} unread messages`
                      : "Notifications"
                  }
                  onClick={() => {
                    if (isDoctor) {
                      navigate("/doctor/messages");
                    } else if (isPatient) {
                      navigate("/patient/messages");
                    }
                  }}
                  className="relative rounded-full p-2 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:ring-offset-1 focus:ring-offset-sky-50 transition"
                >
                  <span className="relative inline-flex items-center justify-center">
                    <FiBell
                      className={`text-[18px] ${
                        hasUnread ? "text-rose-500" : "text-gray-600"
                      } ${justNotified ? "animate-pulse" : ""}`}
                    />
                    {hasUnread && (
                      <>
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-600 px-0.5 text-[10px] font-semibold text-white leading-none">
                          {unreadLabel}
                        </span>
                      </>
                    )}
                  </span>
                </button>

                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-medium text-gray-900 max-w-[160px] truncate">
                    {displayName}
                  </span>
                  <span className="text-xs text-gray-600">
                    {roleLabel}
                    {patientDisplayId ? ` · ID ${patientDisplayId}` : ""}
                  </span>
                </div>

                <div
                  className="w-9 h-9 rounded-full bg-[conic-gradient(from_160deg_at_30%_20%,#0ea5e9,#6366f1,#22c55e,#0ea5e9)] p-[1px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
                  title={user?.username || user?.email || "User"}
                >
                  <div className="w-full h-full rounded-full bg-white grid place-items-center text-[13px] font-semibold text-slate-900">
                    {String(initial).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Second row: search bar with dropdown */}
            <div>
              <div className="relative">
                <label className="search-pill max-w-full sm:max-w-[640px] w-full bg-white/90 border border-slate-200/80 shadow-[0_0_0_1px_rgba(15,23,42,0.04)]">
                  <FiSearch className="text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    className="search-input"
                    placeholder="Search appointments, messages, or test results"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                      className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <FiX className="text-[14px]" />
                    </button>
                  )}
                </label>

                {/* Search dropdown */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.15)] border border-gray-200/80 overflow-hidden text-sm z-20">
                    {searchLoading && (
                      <div className="px-4 py-3 text-xs text-gray-500">
                        Searching your appointments, messages, and test
                        results…
                      </div>
                    )}

                    {!searchLoading && hasAnyResults && (
                      <div className="max-h-80 overflow-y-auto">
                        {searchResults.appointments.length > 0 && (
                          <div className="border-b border-gray-100">
                            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                              Appointments
                            </p>
                            {searchResults.appointments.map((appt) => (
                              <button
                                key={appt.id}
                                type="button"
                                onClick={() =>
                                  handleResultClick("appointment", appt)
                                }
                                className="w-full px-4 py-2 flex flex-col items-start text-left hover:bg-sky-50/70 transition"
                              >
                                <span className="text-[13px] font-medium text-gray-900 truncate w-full">
                                  {appt.title || "Appointment"}
                                </span>
                                <span className="mt-0.5 text-[11px] text-gray-500 truncate w-full">
                                  {[
                                    appt.clinicianName,
                                    appt.specialty,
                                    appt.date,
                                    appt.time,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchResults.messages.length > 0 && (
                          <div className="border-b border-gray-100">
                            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                              Messages
                            </p>
                            {searchResults.messages.map((thread) => (
                              <button
                                key={thread.id}
                                type="button"
                                onClick={() =>
                                  handleResultClick("message", thread)
                                }
                                className="w-full px-4 py-2 flex flex-col items-start text-left hover:bg-sky-50/70 transition"
                              >
                                <span className="text-[13px] font-medium text-gray-900 truncate w-full">
                                  {thread.subject ||
                                    thread.title ||
                                    "Message thread"}
                                </span>
                                <span className="mt-0.5 text-[11px] text-gray-500 truncate w-full">
                                  {thread.lastMessageText ||
                                    thread.preview ||
                                    "Conversation with your care team"}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchResults.tests.length > 0 && (
                          <div>
                            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                              Test results
                            </p>
                            {searchResults.tests.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => handleResultClick("test", r)}
                                className="w-full px-4 py-2 flex flex-col items-start text-left hover:bg-sky-50/70 transition"
                              >
                                <span className="text-[13px] font-medium text-gray-900 truncate w-full">
                                  {r.name || r.title || r.testName || "Lab result"}
                                </span>
                                <span className="mt-0.5 text-[11px] text-gray-500 truncate w-full">
                                  {r.status ? r.status : "Result"}{" "}
                                  {r.takenAt || r.date || r.createdAt
                                    ? "· recent"
                                    : ""}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!searchLoading && !hasAnyResults && (
                      <div className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                            <FiSearch className="text-[16px]" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-900">
                              No matches found
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              We could not find any appointments, messages, or
                              test results for{" "}
                              <span className="font-medium text-gray-900">
                                “{searchQuery.trim()}”
                              </span>
                              .
                            </p>
                            <ul className="mt-2 text-xs text-gray-500 list-disc list-inside space-y-0.5">
                              <li>
                                Try a shorter keyword or a different term.
                              </li>
                              <li>
                                Check the spelling of names or test names.
                              </li>
                            </ul>
                            <button
                              type="button"
                              onClick={handleClearSearch}
                              className="mt-3 inline-flex items-center text-xs font-medium text-sky-700 hover:text-sky-800"
                            >
                              Clear search
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient onboarding reminder banner */}
      {isPatient &&
        onPatientArea &&
        !onPatientOnboarding &&
        !checking &&
        needsOnboarding && (
          <div className="border-t border-amber-200 bg-amber-50/95">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-amber-900">
                Your profile is not complete yet. Please finish onboarding so
                your care team has the right information.
              </p>
              <button
                type="button"
                onClick={() => navigate("/patient/onboarding")}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 focus:ring-offset-amber-50 transition"
              >
                Complete profile
              </button>
            </div>
          </div>
        )}

      {/* Doctor onboarding reminder banner */}
      {isDoctor &&
        onDoctorArea &&
        !onDoctorOnboarding &&
        !checking &&
        needsOnboarding && (
          <div className="border-t border-indigo-200 bg-indigo-50/95">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-indigo-900">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <FiAlertTriangle className="text-[14px]" />
                </span>
                <p>
                  Your provider profile is not complete yet. Please finish
                  onboarding so scheduling, messaging, and test workflows use
                  the correct information.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/doctor/onboarding")}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-indigo-50 transition"
              >
                Complete provider profile
              </button>
            </div>
          </div>
        )}
    </header>
  );
}
