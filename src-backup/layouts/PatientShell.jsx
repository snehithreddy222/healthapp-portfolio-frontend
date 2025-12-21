import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";

export default function PatientShell() {
  return (
    <div className="shell">
      <Sidebar />
      <main className="shell-main">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
