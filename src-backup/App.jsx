// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

// Layouts
import PatientLayout from "./layouts/PatientLayout";
import DoctorLayout from "./layouts/DoctorLayout";

// Auth pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Patient pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientAppointments from "./pages/patient/Appointments";
import PatientMessages from "./pages/patient/PatientMessages";
import TestResults from "./pages/patient/TestResults";
import Medications from "./pages/patient/Medications";
import Billings from "./pages/patient/Billings";
import ScheduleAppointment from "./pages/patient/ScheduleAppointment";
import AccountSettings from "./pages/patient/AccountSettings";
import PatientOnboarding from "./pages/patient/PatientOnboarding";

// Doctor pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorSchedule from "./pages/doctor/DoctorSchedule";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorMessages from "./pages/doctor/DoctorMessages";
import DoctorTestResults from "./pages/doctor/DoctorTestResults";
import DoctorMedications from "./pages/doctor/DoctorMedications";
import DoctorAccountSettings from "./pages/doctor/DoctorAccountSettings";
import DoctorOnboarding from "./pages/doctor/DoctorOnboarding";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Patient onboarding */}
          <Route
            path="/patient/onboarding"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <PatientOnboarding />
                </PatientLayout>
              </ProtectedRoute>
            }
          />

          {/* Patient routes */}
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <PatientDashboard />
                </PatientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <PatientAppointments />
                </PatientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments/new"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <ScheduleAppointment />
                </PatientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/messages"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <PatientMessages />
                </PatientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/test-results"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <TestResults />
                </PatientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/medications"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <Medications />
                </PatientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/billings"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <Billings />
                </PatientLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/settings"
            element={
              <ProtectedRoute allowedRoles={["PATIENT"]}>
                <PatientLayout>
                  <AccountSettings />
                </PatientLayout>
              </ProtectedRoute>
            }
          />

          {/* Doctor onboarding */}
          <Route
            path="/doctor/onboarding"
            element={
              <ProtectedRoute allowedRoles={["DOCTOR"]}>
                <DoctorLayout>
                  <DoctorOnboarding />
                </DoctorLayout>
              </ProtectedRoute>
            }
          />

          {/* Doctor routes */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={["DOCTOR"]}>
                <DoctorLayout>
                  <DoctorDashboard />
                </DoctorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/schedule"
            element={
              <ProtectedRoute allowedRoles={["DOCTOR"]}>
                <DoctorLayout>
                  <DoctorSchedule />
                </DoctorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patients"
            element={
              <ProtectedRoute allowedRoles={["DOCTOR"]}>
                <DoctorLayout>
                  <DoctorPatients />
                </DoctorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/messages"
            element={
              <ProtectedRoute allowedRoles={["DOCTOR"]}>
                <DoctorLayout>
                  <DoctorMessages />
                </DoctorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/test-results"
            element={
              <ProtectedRoute allowedRoles={["DOCTOR"]}>
                <DoctorLayout>
                  <DoctorTestResults />
                </DoctorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/medications"
            element={
              <ProtectedRoute allowedRoles={["DOCTOR"]}>
                <DoctorLayout>
                  <DoctorMedications />
                </DoctorLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/settings"
            element={
              <ProtectedRoute allowedRoles={["DOCTOR"]}>
                <DoctorLayout>
                  <DoctorAccountSettings />
                </DoctorLayout>
              </ProtectedRoute>
            }
          />

          {/* Defaults */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}