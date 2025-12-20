// src/layouts/DoctorLayout.jsx
import React, { useState } from "react";
import DoctorTopbar from "../components/common/DoctorTopbar";
import DoctorSidebar from "../components/common/DoctorSidebar";

export default function DoctorLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Smooth vertical gradient: very light at top, gently darker at bottom
    <div className="min-h-screen bg-[linear-gradient(to_bottom,_#e6edf7_0%,_#dee5f2_30%,_#d4dde9_55%,_#c0cad9_80%,_#adb9cf_100%)]">
      {/* Fixed desktop sidebar */}
      <div className="hidden lg:block">
        <DoctorSidebar />
      </div>

      {/* Main content area with left margin for fixed sidebar */}
      <div className="min-h-screen lg:ml-[260px] flex flex-col">
        {/* Fixed top bar */}
        <DoctorTopbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Scrollable page content with spacing from sidebar and topbar */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-4 lg:py-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="h-full w-72 max-w-[80%] shadow-2xl">
            <DoctorSidebar onItemClick={() => setSidebarOpen(false)} />
          </div>
          <button
            type="button"
            className="flex-1 h-full bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        </div>
      )}
    </div>
  );
}
