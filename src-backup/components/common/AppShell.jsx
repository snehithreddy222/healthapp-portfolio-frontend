// src/components/layout/AppShell.jsx
import React from "react";
import Sidebar from "../common/Sidebar";
import Topbar from "../common/Topbar";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Topbar />
      <div className="flex">
        <Sidebar />
        {/* content pane – give it the subtle left divider that aligns with top bar */}
        <main className="flex-1 border-l border-gray-200/60">
          {children}
        </main>
      </div>
    </div>
  );
}
