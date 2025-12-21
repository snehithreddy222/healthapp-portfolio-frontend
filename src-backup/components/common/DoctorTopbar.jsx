// src/components/common/DoctorTopbar.jsx
import React, { useEffect, useState } from "react";
import {
  FiSearch,
  FiBell,
  FiMenu,
  FiX,
  FiAlertTriangle,
  FiClock,
  FiChevronDown,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { doctorService } from "../../services/doctorService";
import { searchService } from "../../services/searchService";
import { messageService } from "../../services/messageService";

const UNREAD_POLL_MS = 100000;

export default function DoctorTopbar({ onMenuClick }) {
  const { user: ctxUser } = useAuth();
  const user = ctxUser || authService.getCurrentUser() || {};

  const initial =
    (user.username && user.username[0]) ||
    (user.email && user.email[0]) ||
    "D";

  const navigate = useNavigate();
  const location = useLocation();

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  const isDoctor =
    user && typeof user.role === "string" && user.role.toUpperCase() === "DOCTOR";
  const onDoctorArea = location.pathname.startsWith("/doctor");
  const onDoctorOnboarding = location.pathname.startsWith("/doctor/onboarding");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({
    appointments: [],
    messages: [],
    tests: [],
  });
  const [searchTouched, setSearchTouched] = useState(false);

  // Unread notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);
  const [justNotified, setJustNotified] = useState(false);

  // Current time
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Onboarding detection
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isDoctor) {
        setNeedsOnboarding(false);
        setChecking(false);
        return;
      }

      try {
        const me = await doctorService.meOrNull();
        if (cancelled) return;

        const needs = !doctorService.isProfileComplete(me);
        setNeedsOnboarding(needs);
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
  }, [isDoctor, location.pathname]);

  // Search with debounce
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

  // Poll unread messages
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

      const count = await messageService
        .getUnreadCount()
        .catch(() => 0);

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
      // keep previous unreadCount
    }
  }

  // initial fetch when topbar mounts or user token changes
  fetchUnreadOnce();

  // poll every UNREAD_POLL_MS while component is mounted
  const id = setInterval(() => {
    fetchUnreadOnce();
  }, UNREAD_POLL_MS);

  return () => {
    cancelled = true;
    clearInterval(id);
  };
}, [user?.token]);


  const displayName =
    (user.username && user.username.replace(/_/g, " ")) ||
    (user.email && user.email.split("@")[0]) ||
    "Doctor";

  const hasAnyResults =
    searchResults.appointments.length ||
    searchResults.messages.length ||
    searchResults.tests.length;

  const showDropdown =
    searchTouched &&
    searchQuery.trim().length > 0 &&
    (searchLoading || hasAnyResults || !hasAnyResults);

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

  function handleResultClick(type) {
    if (type === "appointment") {
      navigate("/doctor/schedule");
    } else if (type === "message") {
      navigate("/doctor/messages");
    } else if (type === "test") {
      navigate("/doctor/test-results");
    }

    handleClearSearch();
  }

  const hasUnread = unreadCount > 0;
  const unreadLabel =
    unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount || "";

  const timeString = currentTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dateString = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-700/40 backdrop-blur-xl shadow-md shadow-black/15"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.98) 40%, rgba(15,23,42,0.9) 70%, rgba(30,64,87,0.9) 100%)",
      }}
    >
      {/* Main bar */}
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 sm:gap-4">
        {/* Left: mobile menu + search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile menu button */}
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Open navigation"
              className="inline-flex lg:hidden items-center justify-center rounded-lg p-2 text-slate-200 hover:bg-slate-900/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition"
            >
              <FiMenu className="text-[19px]" />
            </button>
          )}

          {/* Search */}
          <div className="relative flex-1 max-w-2xl min-w-0">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-700/45 bg-slate-900/35 hover:bg-slate-900/50 focus-within:bg-slate-900/60 focus-within:border-teal-500/50 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
              <FiSearch className="text-slate-400 text-[16px] flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="bg-transparent outline-none text-[13px] text-slate-50 placeholder-slate-500 w-full font-medium"
                placeholder="Search patients, appointments, lab results..."
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="text-slate-500 hover:text-slate-300 focus:outline-none transition flex-shrink-0"
                >
                  <FiX className="text-[15px]" />
                </button>
              )}
            </div>

            {/* Search dropdown */}
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 shadow-2xl overflow-hidden text-sm z-50">
                {searchLoading && (
                  <div className="px-4 py-3 text-xs text-slate-500 font-medium">
                    Searching clinical records...
                  </div>
                )}

                {!searchLoading && hasAnyResults && (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.appointments.length > 0 && (
                      <div className="border-b border-slate-700/50">
                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.16em] text-teal-300/80 uppercase">
                          Appointments
                        </p>
                        {searchResults.appointments.map((appt) => (
                          <button
                            key={appt.id}
                            type="button"
                            onClick={() => handleResultClick("appointment")}
                            className="w-full px-4 py-2.5 flex flex-col items-start text-left hover:bg-slate-800/50 transition"
                          >
                            <span className="text-[13px] font-medium text-slate-50 truncate w-full">
                              {appt.title || "Appointment"}
                            </span>
                            <span className="mt-0.5 text-[11px] text-slate-400 truncate w-full">
                              {[appt.clinicianName, appt.specialty, appt.date, appt.time]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.messages.length > 0 && (
                      <div className="border-b border-slate-700/50">
                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.16em] text-teal-300/80 uppercase">
                          Messages
                        </p>
                        {searchResults.messages.map((thread) => (
                          <button
                            key={thread.id}
                            type="button"
                            onClick={() => handleResultClick("message")}
                            className="w-full px-4 py-2.5 flex flex-col items-start text-left hover:bg-slate-800/50 transition"
                          >
                            <span className="text-[13px] font-medium text-slate-50 truncate w-full">
                              {thread.subject || thread.title || "Message thread"}
                            </span>
                            <span className="mt-0.5 text-[11px] text-slate-400 truncate w-full">
                              {thread.lastMessageText ||
                                thread.preview ||
                                "Patient communication"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.tests.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.16em] text-teal-300/80 uppercase">
                          Lab Results
                        </p>
                        {searchResults.tests.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleResultClick("test")}
                            className="w-full px-4 py-2.5 flex flex-col items-start text-left hover:bg-slate-800/50 transition"
                          >
                            <span className="text-[13px] font-medium text-slate-50 truncate w-full">
                              {r.name || r.title || r.testName || "Lab result"}
                            </span>
                            <span className="mt-0.5 text-[11px] text-slate-400 truncate w-full">
                              {r.status || "Result"} ·{" "}
                              {r.takenAt || r.date || r.createdAt ? "Recent" : ""}
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
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-slate-500">
                        <FiSearch className="text-[15px]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-50">
                          No results found
                        </p>
                        <p className="text-xs text-slate-500">
                          No matches for{" "}
                          <span className="font-medium text-slate-200">
                            "{searchQuery.trim()}"
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="mt-2 inline-flex items-center text-xs font-medium text-teal-300/90 hover:text-teal-200"
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

        {/* Right: Time + Status + Notifications + Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Time & Date - desktop only */}
          <div className="hidden lg:flex flex-col items-end leading-tight px-3 py-1.5 rounded-lg bg-slate-900/40 border border-slate-700/40">
            <div className="flex items-center gap-1.5">
              <FiClock className="text-[11px] text-teal-300/85" />
              <span className="text-xs font-semibold text-slate-50 tabular-nums">
                {timeString}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
              {dateString}
            </span>
          </div>

          {/* Status indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
            <span className="text-[10px] font-bold text-emerald-300/95 uppercase tracking-wider">
              Active
            </span>
          </div>

          {/* Notifications bell */}
          <button
            type="button"
            aria-label={
              hasUnread
                ? `You have ${unreadLabel} unread message${unreadCount === 1 ? "" : "s"}`
                : "Notifications"
            }
            onClick={() => navigate("/doctor/messages")}
            className="relative rounded-lg p-2.5 bg-slate-900/35 border border-slate-700/40 hover:bg-slate-800/55 hover:border-teal-500/35 focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all"
          >
            <span className="relative inline-flex items-center justify-center">
              <FiBell
                className={`text-[17px] ${
                  hasUnread ? "text-rose-400" : "text-slate-200"
                } ${justNotified ? "animate-pulse" : ""}`}
              />
              {hasUnread && (
                <>
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 px-1 text-[9px] font-bold text-white leading-none shadow-lg">
                    {unreadLabel}
                  </span>
                </>
              )}
            </span>
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => navigate("/doctor/settings")}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900/35 border border-slate-700/40 hover:bg-slate-800/55 hover:border-teal-500/35 transition-all"
          >
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs font-semibold text-slate-50">
                {displayName}
              </span>
              <span className="text-[9px] text-teal-300/85 font-medium tracking-wide">
                PROVIDER
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500/90 to-cyan-600/90 grid place-items-center text-white font-bold text-sm shadow-lg shadow-teal-500/25">
              {String(initial).toUpperCase()}
            </div>
            <FiChevronDown className="hidden sm:block text-slate-300 text-[14px]" />
          </button>
        </div>
      </div>

      {/* Onboarding banner */}
      {isDoctor &&
        onDoctorArea &&
        !onDoctorOnboarding &&
        !checking &&
        needsOnboarding && (
          <div className="border-t border-rose-900/25 bg-gradient-to-r from-rose-900/25 to-orange-900/25 backdrop-blur-sm">
            <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <FiAlertTriangle className="text-[12px]" />
                </span>
                <p className="text-rose-100/95 font-medium">
                  <span className="font-bold">Action required:</span> Complete your
                  provider profile to enable full clinical workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/doctor/onboarding")}
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-700 hover:to-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-400/50 transition shadow-lg shadow-rose-600/25"
              >
                Complete profile
              </button>
            </div>
          </div>
        )}
    </header>
  );
}
