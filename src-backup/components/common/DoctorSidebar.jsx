// src/components/common/DoctorSidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiCalendar,
  FiUsers,
  FiMessageSquare,
  FiDroplet,
  FiPackage,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import { authService } from "../../services/authService";

const DoctorItem = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      [
        "group relative block w-full px-4 py-2.5 transition-all duration-200",
        isActive
          ? "bg-teal-500/10 text-teal-300 border-l-3 border-teal-400"
          : "text-slate-300 hover:bg-slate-900/30 hover:text-slate-50 border-l-3 border-transparent",
      ].join(" ")
    }
  >
    {({ isActive }) => (
      <div className="relative flex items-center gap-3">
        <div
          className={[
            "w-9 h-9 rounded-lg grid place-items-center text-[17px] shrink-0 transition-all duration-200",
            isActive
              ? "bg-teal-500/15 text-teal-300"
              : "bg-slate-900/30 text-slate-400 group-hover:bg-slate-900/45 group-hover:text-slate-100",
          ].join(" ")}
        >
          <Icon />
        </div>
        <span className="text-[14px] font-medium truncate">{label}</span>
      </div>
    )}
  </NavLink>
);

export default function DoctorSidebar({ onItemClick }) {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const openLogout = () => setShowLogoutConfirm(true);
  const closeLogout = () => setShowLogoutConfirm(false);

  const handleLogoutConfirmed = () => {
    authService.logout();
    setShowLogoutConfirm(false);
    navigate("/login");
  };

  return (
    <>
      {/* Fixed sidebar that stays in place during scrolling */}
      <aside
        className="fixed top-0 left-0 h-screen w-[260px] border-r border-slate-700/40 shadow-lg shadow-slate-900/20 overflow-hidden z-40"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.98) 40%, rgba(15,23,42,0.9) 70%, rgba(30,64,87,0.9) 100%)",
        }}
      >
        {/* Scrollable content container */}
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="h-16 flex items-center px-5 border-b border-slate-700/35 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/85 to-cyan-500/85 grid place-items-center mr-3 shadow-md shadow-teal-500/30">
              <div className="w-4 h-4 rounded-md bg-white/95" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold tracking-tight text-slate-50">
                HealthApp
              </span>
              <span className="text-[9px] text-teal-300/85 font-medium tracking-wide">
                CLINICAL WORKSPACE
              </span>
            </div>
          </div>

          {/* Section label */}
          <p className="mt-5 px-4 text-[9px] font-bold tracking-[0.14em] text-teal-200/80 uppercase flex-shrink-0">
            Provider Tools
          </p>

          {/* Main nav */}
          <nav className="mt-2 flex-1 overflow-y-auto space-y-1 px-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <DoctorItem
              to="/doctor/dashboard"
              icon={FiGrid}
              label="Dashboard"
              onClick={onItemClick}
            />
            <DoctorItem
              to="/doctor/schedule"
              icon={FiCalendar}
              label="Today's schedule"
              onClick={onItemClick}
            />
            <DoctorItem
              to="/doctor/patients"
              icon={FiUsers}
              label="My patients"
              onClick={onItemClick}
            />
            <DoctorItem
              to="/doctor/messages"
              icon={FiMessageSquare}
              label="Inbox"
              onClick={onItemClick}
            />
            <DoctorItem
              to="/doctor/test-results"
              icon={FiDroplet}
              label="Lab reviews"
              onClick={onItemClick}
            />
            <DoctorItem
              to="/doctor/medications"
              icon={FiPackage}
              label="Medications"
              onClick={onItemClick}
            />
          </nav>

          {/* Footer actions */}
          <div className="px-2 pb-4 pt-3 border-t border-slate-700/35 space-y-1 flex-shrink-0">
            <DoctorItem
              to="/doctor/settings"
              icon={FiSettings}
              label="Settings"
              onClick={onItemClick}
            />

            <button
              type="button"
              onClick={openLogout}
              className="w-full inline-flex items-center gap-3 px-4 py-2.5 text-rose-300/95 hover:bg-rose-900/15 hover:text-rose-100 font-medium transition-all duration-200 border-l-3 border-transparent hover:border-rose-400/45 rounded-r-lg"
            >
              <div className="w-9 h-9 rounded-lg grid place-items-center bg-slate-900/30 text-rose-300/95 text-[17px] shrink-0">
                <FiLogOut />
              </div>
              <span className="truncate text-[14px]">Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/65 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-slate-800/96 border border-slate-700/60 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-slate-50">
              Sign out of clinical workspace?
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              You will be logged out on this device. You can sign in again at
              any time to manage your patients and schedule.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeLogout}
                className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-900/90 hover:bg-slate-700"
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
        </div>
      )}
    </>
  );
}