// src/components/common/Sidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiCalendar,
  FiMessageSquare,
  FiDroplet,
  FiHeart,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiHelpCircle,
  FiActivity,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { authService } from "../../services/authService";

const Item = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      [
        "group relative block w-full rounded-xl px-3 py-2 transition-all duration-200",
        isActive
          ? "bg-white/90 text-sky-900 shadow-[0_10px_30px_rgba(15,23,42,0.10)]"
          : "text-slate-700 hover:bg-white/70 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
      ].join(" ")
    }
  >
    {({ isActive }) => (
      <>
        <div
          className={[
            "pointer-events-none absolute inset-y-1 left-1 rounded-full transition-all duration-200 w-1",
            isActive
              ? "opacity-100 bg-gradient-to-b from-sky-400 via-cyan-400 to-indigo-500 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
              : "opacity-0",
          ].join(" ")}
        />

        <div className="relative flex items-center gap-3">
          <div
            className={[
              "w-8 h-8 rounded-xl grid place-items-center text-[18px] shrink-0 transition-all duration-200",
              isActive
                ? "bg-sky-100 text-sky-700"
                : "bg-slate-50/80 text-sky-600 group-hover:bg-white",
            ].join(" ")}
          >
            <Icon />
          </div>
          <span className="text-[15px] font-medium truncate">{label}</span>
        </div>
      </>
    )}
  </NavLink>
);

export default function Sidebar({ onLogoutRequest, onItemClick }) {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const openLogout = () => setShowLogoutConfirm(true);
  const closeLogout = () => setShowLogoutConfirm(false);

  const handleLogoutConfirmed = () => {
    if (onLogoutRequest) {
      onLogoutRequest();
    } else {
      authService.logout();
      navigate("/login");
    }
    setShowLogoutConfirm(false);
  };

  const logoutModal =
    showLogoutConfirm && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-[0_22px_60px_rgba(15,23,42,0.40)] max-w-md w-full p-6 border border-slate-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Sign out of HealthApp?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                You will be logged out on this device. You can sign in again at
                any time to view your records and appointments.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeLogout}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogoutConfirmed}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {/* Fixed full-height sidebar for desktop */}
      <aside className="fixed top-0 left-0 h-screen w-[260px] shell-sidebar relative z-40 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.18),transparent_55%),linear-gradient(to_bottom,#e5f0ff_0%,#dde7fa_40%,#d3deef_70%,#c4cfdf_100%)]" />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-2xl" />

        {/* Content */}
        <div className="relative flex h-full flex-col text-slate-800 px-3 py-4">
          {/* Brand block */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-[conic-gradient(from_160deg_at_30%_20%,#0ea5e9,#6366f1,#22c55e,#0ea5e9)] p-[2px] shadow-[0_12px_30px_rgba(15,23,42,0.35)]">
                <div className="w-full h-full rounded-2xl bg-white/90 grid place-items-center">
                  <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-sky-500 via-cyan-400 to-indigo-500" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 px-2 py-[2px] rounded-full bg-sky-600 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.7)]">
                Patient
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[18px] font-semibold tracking-tight text-slate-900">
                HealthApp
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                Personal health, in one place.
              </span>
            </div>
          </div>

          {/* Mini status card */}
          <div className="mb-4 rounded-2xl border border-white/70 bg-white/65 shadow-[0_16px_35px_rgba(15,23,42,0.15)] px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-500 uppercase">
                  Wellness snapshot
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-slate-900">
                  Good standing
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Keep appointments and test results on track.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-9 w-9 rounded-full bg-sky-50 grid place-items-center text-sky-600">
                  <FiActivity className="text-[18px]" />
                </div>
                <span className="mt-1 text-[10px] font-semibold text-slate-500">
                  Today
                </span>
              </div>
            </div>
          </div>

          {/* Section label */}
          <p className="px-1 text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Overview
          </p>

          {/* Navigation group in a glass card */}
          <div className="mt-2 rounded-2xl border border-white/70 bg-white/70 shadow-[0_16px_35px_rgba(15,23,42,0.16)]">
            <nav className="py-2 px-1.5 space-y-1">
              <Item
                to="/patient/dashboard"
                icon={FiGrid}
                label="Dashboard"
                onClick={onItemClick}
              />
              <Item
                to="/patient/appointments"
                icon={FiCalendar}
                label="Appointments"
                onClick={onItemClick}
              />
              <Item
                to="/patient/messages"
                icon={FiMessageSquare}
                label="Messages"
                onClick={onItemClick}
              />
              <Item
                to="/patient/test-results"
                icon={FiDroplet}
                label="Test results"
                onClick={onItemClick}
              />
              <Item
                to="/patient/medications"
                icon={FiHeart}
                label="Medications"
                onClick={onItemClick}
              />
              <Item
                to="/patient/billings"
                icon={FiCreditCard}
                label="Billing"
                onClick={onItemClick}
              />
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Help card */}
          <div className="mt-3 rounded-2xl border border-sky-100/80 bg-sky-50/80 px-3 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.18)]">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 h-8 w-8 rounded-full bg-white grid place-items-center text-sky-600">
                <FiHelpCircle className="text-[17px]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[13px] font-semibold text-slate-900">
                  Need help?
                </p>
                <p className="text-[11px] text-slate-600">
                  Visit Messages to reach your care team securely.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onItemClick) onItemClick();
                    navigate("/patient/messages");
                  }}
                  className="mt-1 inline-flex items-center rounded-full bg-sky-600 px-3 py-[5px] text-[11px] font-medium text-white hover:bg-sky-700 transition-colors"
                >
                  Open messages
                </button>
              </div>
            </div>
          </div>

          {/* Footer: settings + logout */}
          <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2">
            <Item
              to="/patient/settings"
              icon={FiSettings}
              label="Account settings"
              onClick={onItemClick}
            />

            <button
              type="button"
              onClick={openLogout}
              className="w-full inline-flex items-center gap-3 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50/90 font-medium transition-colors"
            >
              <div className="w-8 h-8 rounded-xl grid place-items-center bg-rose-50 text-rose-500 text-[18px] shrink-0">
                <FiLogOut />
              </div>
              <span className="truncate">Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {logoutModal}
    </>
  );
}
