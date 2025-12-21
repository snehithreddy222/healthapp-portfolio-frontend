// src/layouts/PatientLayout.jsx
import React, { useState } from "react";
import Sidebar from "../components/common/Sidebar";
import Topbar from "../components/common/Topbar";

export default function PatientLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Soft wellness gradient, like the doctor layout
    <div className="min-h-screen bg-[linear-gradient(to_bottom,_#f3f7fb_0%,_#e8f1fb_28%,_#ddeaf7_55%,_#cad8eb_80%,_#b7c7df_100%)] text-slate-900">
      {/* Fixed desktop sidebar (same idea as before, just on a gradient) */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:w-[260px]">
        <Sidebar />
      </div>

      {/* Main column, shifted to the right of the fixed sidebar on large screens */}
      <div className="min-h-screen flex flex-col lg:ml-[260px]">
        {/* Top bar with mobile menu button */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content – padded and centered, but still using main-inner so existing pages keep their spacing */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-4 lg:py-6">
          <div className="max-w-7xl mx-auto main-inner">{children}</div>
        </main>
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full w-72 max-w-[80%] bg-white/95 shadow-2xl">
            <Sidebar onItemClick={() => setSidebarOpen(false)} />
          </div>
          <button
            type="button"
            className="flex-1 h-full bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        </div>
      )}
    </div>
  );
}
