// src/pages/doctor/DoctorMedications.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  FiPackage,
  FiDownload,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiFilter,
  FiCalendar,
  FiUser,
  FiRefreshCw,
  FiFileText,
  FiInfo,
  FiPlus,
  FiX,
  FiUpload,
  FiTrendingUp,
  FiActivity,
} from "react-icons/fi";
import { format, parseISO, differenceInDays } from "date-fns";
import { medicationService } from "../../services/medicationService";
import { doctorPatientService } from "../../services/doctorPatientService";
import toast from "react-hot-toast";

// Common medication suggestions
const MED_NAME_SUGGESTIONS = [
  "Amoxicillin",
  "Metformin",
  "Atorvastatin",
  "Lisinopril",
  "Omeprazole",
  "Levothyroxine",
  "Amlodipine",
  "Metoprolol",
];

const MED_FREQ_SUGGESTIONS = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 12 hours",
  "As needed",
];

const MED_DURATION_SUGGESTIONS = [
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "30 days",
  "90 days",
  "Ongoing",
];

function StatusBadge({ status, refillDue }) {
  const now = new Date();
  const isExpired = status === "Expired";
  const isActive = status === "Active";

  const refillSoon =
    isActive &&
    refillDue &&
    differenceInDays(parseISO(refillDue), now) <= 7 &&
    differenceInDays(parseISO(refillDue), now) >= 0;

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
        <FiClock className="text-sm" />
        Expired
      </span>
    );
  }

  if (refillSoon) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
        <FiAlertCircle className="text-sm" />
        Refill Due
      </span>
    );
  }

  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
        <FiCheckCircle className="text-sm" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
      <FiClock className="text-sm" />
      {status || "Unknown"}
    </span>
  );
}

function PrescriptionRow({ prescription, onDownload }) {
  const prescribedDate = prescription.prescribedDate
    ? parseISO(prescription.prescribedDate)
    : null;
  const refillDate = prescription.refillDue
    ? parseISO(prescription.refillDue)
    : null;
  const now = new Date();
  const daysUntilRefill = refillDate ? differenceInDays(refillDate, now) : null;

  return (
    <div className="group bg-white border-2 border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-sky-300 transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <FiPackage className="text-white text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-bold text-slate-900 truncate">
              {prescription.medicationName}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge
                status={prescription.status}
                refillDue={prescription.refillDue}
              />
              {prescription.patientName && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium">
                  <FiUser className="text-xs" />
                  {prescription.patientName}
                </span>
              )}
            </div>
          </div>
        </div>

        {prescription.attachmentAvailable && prescription.downloadUrl && (
          <button
            type="button"
            onClick={() => onDownload(prescription)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-700 shadow-sm transition-all flex-shrink-0"
            title="Download Prescription"
          >
            <FiDownload className="text-sm" />
            View
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
            Dosage
          </p>
          <p className="text-sm font-bold text-slate-900">
            {prescription.dosage || "—"}
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
            Frequency
          </p>
          <p className="text-sm font-bold text-slate-900">
            {prescription.frequency || "—"}
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
            Duration
          </p>
          <p className="text-sm font-bold text-slate-900">
            {prescription.duration || "—"}
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
            Prescribed
          </p>
          <p className="text-xs font-bold text-slate-900">
            {prescribedDate ? format(prescribedDate, "MMM dd, yyyy") : "—"}
          </p>
        </div>
      </div>

      {prescription.instructions && (
        <div className="mt-4 bg-sky-50 rounded-lg border border-sky-200 p-3">
          <p className="text-xs font-bold text-sky-900 mb-1 uppercase tracking-wide">
            Instructions
          </p>
          <p className="text-sm text-slate-700">{prescription.instructions}</p>
        </div>
      )}

      {daysUntilRefill !== null &&
        daysUntilRefill >= 0 &&
        daysUntilRefill <= 7 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <FiAlertCircle className="text-sm flex-shrink-0" />
            <span>
              Refill needed in {daysUntilRefill}{" "}
              {daysUntilRefill === 1 ? "day" : "days"}
            </span>
          </div>
        )}
    </div>
  );
}

export default function DoctorMedications() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // New prescription modal
  const [showNewRxModal, setShowNewRxModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rxForm, setRxForm] = useState({
    medicationName: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });
  const [rxFile, setRxFile] = useState(null);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadMedications(selectedPatient.id);
    } else {
      setMedications([]);
    }
  }, [selectedPatient]);

  async function loadPatients() {
    try {
      const list = await doctorPatientService.listMyPatients("");
      setPatients(list);
      if (list.length > 0 && !selectedPatient) {
        setSelectedPatient(list[0]);
      }
    } catch (err) {
      console.error("Failed to load patients", err);
      toast.error("Unable to load patients");
    }
  }

  async function loadMedications(patientId) {
    if (!patientId) {
      setMedications([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await medicationService.listForPatient(patientId);
      // Add patient name to each medication for display
      const withPatientName = (Array.isArray(data) ? data : []).map((med) => ({
        ...med,
        patientName: selectedPatient?.fullName || "Patient",
      }));
      setMedications(withPatientName);
    } catch (err) {
      console.error("Failed to load medications", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load medications";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(prescription) {
    if (!prescription.downloadUrl) return;
    window.open(prescription.downloadUrl, "_blank", "noopener,noreferrer");
  }

  function openNewRxModal() {
    if (!selectedPatient) {
      toast.error("Please select a patient first");
      return;
    }
    setRxForm({
      medicationName: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
    setRxFile(null);
    setShowNewRxModal(true);
  }

  function closeNewRxModal() {
    setShowNewRxModal(false);
    setRxForm({
      medicationName: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
    setRxFile(null);
  }

  async function handleSubmitPrescription(e) {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error("No patient selected");
      return;
    }

    if (
      !rxForm.medicationName.trim() ||
      !rxForm.dosage.trim() ||
      !rxForm.frequency.trim() ||
      !rxForm.duration.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      await medicationService.createForPatient(
        selectedPatient.id,
        {
          medicationName: rxForm.medicationName.trim(),
          dosage: rxForm.dosage.trim(),
          frequency: rxForm.frequency.trim(),
          duration: rxForm.duration.trim(),
          instructions: rxForm.instructions.trim(),
        },
        rxFile
      );

      toast.success(
        `Prescription for ${rxForm.medicationName} added successfully`
      );
      closeNewRxModal();
      await loadMedications(selectedPatient.id);
    } catch (err) {
      console.error("Failed to create prescription", err);
      toast.error("Unable to create prescription");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredMedications = useMemo(() => {
    let result = medications;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.medicationName?.toLowerCase().includes(q) ||
          m.dosage?.toLowerCase().includes(q) ||
          m.frequency?.toLowerCase().includes(q) ||
          m.patientName?.toLowerCase().includes(q)
      );
    }

    if (filterStatus === "active") {
      result = result.filter((m) => m.status === "Active");
    } else if (filterStatus === "expired") {
      result = result.filter((m) => m.status === "Expired");
    }

    return [...result].sort((a, b) => {
      const dateA = a.prescribedDate ? new Date(a.prescribedDate) : new Date(0);
      const dateB = b.prescribedDate ? new Date(b.prescribedDate) : new Date(0);
      return dateB - dateA;
    });
  }, [medications, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = medications.length;
    const active = medications.filter((m) => m.status === "Active").length;
    const expired = medications.filter((m) => m.status === "Expired").length;
    const refillSoon = medications.filter((m) => {
      if (m.status !== "Active" || !m.refillDue) return false;
      const days = differenceInDays(parseISO(m.refillDue), new Date());
      return days >= 0 && days <= 7;
    }).length;

    return { total, active, expired, refillSoon };
  }, [medications]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="px-4 sm:px-6 lg:px-8 pb-12 mx-auto max-w-[1600px]">
        {/* Header Section */}
        <div className="pt-8 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <FiPackage className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                    Medication Management
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Prescription Portal for Healthcare Providers
                  </p>
                </div>
              </div>
              <p className="text-slate-600 text-base max-w-2xl leading-relaxed">
                Create new prescriptions, track active medications, and manage
                refills for your patients from a unified clinical workspace.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={openNewRxModal}
                disabled={!selectedPatient}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-xl px-6 h-12 text-sm font-bold text-white shadow-lg transition-all",
                  selectedPatient
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-600/20"
                    : "bg-slate-300 cursor-not-allowed",
                ].join(" ")}
              >
                <FiPlus className="text-base" />
                New Prescription
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedPatient && loadMedications(selectedPatient.id)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 h-12 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-all"
              >
                <FiRefreshCw className="text-base" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Patient Selector + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 mb-6">
          {/* Patient List */}
          <div className="bg-white rounded-2xl border-2 border-slate-200/50 shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Select Patient
              </h2>
              <span className="text-xs text-slate-500">
                {patients.length} total
              </span>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {patients.length === 0 ? (
                <div className="text-center py-8">
                  <FiUser className="mx-auto text-3xl text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No patients found</p>
                </div>
              ) : (
                patients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatient(patient)}
                    className={[
                      "w-full flex items-center gap-3 rounded-xl p-3 transition-all text-left",
                      selectedPatient?.id === patient.id
                        ? "bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-300 shadow-sm"
                        : "bg-slate-50 border-2 border-slate-200 hover:border-slate-300",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0",
                        selectedPatient?.id === patient.id
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600",
                      ].join(" ")}
                    >
                      {patient.initials || patient.fullName?.charAt(0) || "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={[
                          "text-sm font-semibold truncate",
                          selectedPatient?.id === patient.id
                            ? "text-emerald-900"
                            : "text-slate-900",
                        ].join(" ")}
                      >
                        {patient.fullName}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {patient.phone || "No phone"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border-2 border-slate-200/50 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <FiPackage className="text-slate-600 text-lg" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-600 mt-1">Prescriptions</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border-2 border-emerald-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shadow-sm">
                  <FiCheckCircle className="text-emerald-600 text-lg" />
                </div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-3xl font-bold text-emerald-900">
                {stats.active}
              </p>
              <p className="text-sm text-emerald-700 mt-1">Currently active</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl border-2 border-amber-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-amber-200 flex items-center justify-center shadow-sm">
                  <FiAlertCircle className="text-amber-600 text-lg" />
                </div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  Refill Due
                </span>
              </div>
              <p className="text-3xl font-bold text-amber-900">
                {stats.refillSoon}
              </p>
              <p className="text-sm text-amber-700 mt-1">Need attention</p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border-2 border-slate-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <FiClock className="text-slate-600 text-lg" />
                </div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Expired
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {stats.expired}
              </p>
              <p className="text-sm text-slate-600 mt-1">Past medications</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medications, dosage, frequency..."
              className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="inline-flex rounded-2xl bg-white border-2 border-slate-200 p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                filterStatus === "all"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                filterStatus === "active"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("expired")}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                filterStatus === "expired"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              Expired
            </button>
          </div>
        </div>

        {/* Main Content */}
        {!selectedPatient ? (
          <div className="bg-white rounded-3xl border-2 border-slate-200/50 shadow-xl px-8 py-16">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center mb-5">
                <FiUser className="text-3xl text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Patient Selected
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Select a patient from the list on the left to view their
                medications and create new prescriptions.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-3xl border-2 border-slate-200/50 shadow-xl px-8 py-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-600">
                Loading medications for {selectedPatient.fullName}...
              </span>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border-2 border-slate-200/50 shadow-xl px-8 py-16">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-rose-100 border-2 border-rose-200 flex items-center justify-center mb-5">
                <FiAlertCircle className="text-3xl text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Unable to Load Medications
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                {error}
              </p>
              <button
                type="button"
                onClick={() => loadMedications(selectedPatient.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-lg transition-all"
              >
                <FiRefreshCw className="text-base" />
                Try Again
              </button>
            </div>
          </div>
        ) : filteredMedications.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-slate-200/50 shadow-xl px-8 py-16">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center mb-5">
                <FiPackage className="text-3xl text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchQuery || filterStatus !== "all"
                  ? "No Matching Medications"
                  : "No Medications Yet"}
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                {searchQuery || filterStatus !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : `No prescriptions have been created for ${selectedPatient.fullName} yet.`}
              </p>
              {!searchQuery && filterStatus === "all" && (
                <button
                  type="button"
                  onClick={openNewRxModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg transition-all"
                >
                  <FiPlus className="text-base" />
                  Create First Prescription
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredMedications.map((med) => (
              <PrescriptionRow
                key={med.id}
                prescription={med}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Prescription Modal */}
      {showNewRxModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl border-2 border-slate-200/50 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-50 to-sky-50 px-8 py-6 border-b-2 border-slate-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">
                    <FiPackage className="text-emerald-600 text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      New Prescription
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Patient: {selectedPatient.fullName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeNewRxModal}
                  disabled={submitting}
                  className="w-10 h-10 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-all"
                >
                  <FiX className="text-slate-600 text-xl" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPrescription} className="px-8 py-6">
              <div className="space-y-5">
                {/* Medication Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    value={rxForm.medicationName}
                    onChange={(e) =>
                      setRxForm({ ...rxForm, medicationName: e.target.value })
                    }
                    placeholder="e.g. Amoxicillin"
                    required
                    className="w-full h-12 rounded-xl border-2 border-slate-200 px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MED_NAME_SUGGESTIONS.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          setRxForm({ ...rxForm, medicationName: name })
                        }
                        className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dosage and Frequency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Dosage *
                    </label>
                    <input
                      type="text"
                      value={rxForm.dosage}
                      onChange={(e) =>
                        setRxForm({ ...rxForm, dosage: e.target.value })
                      }
                      placeholder="e.g. 500 mg"
                      required
                      className="w-full h-12 rounded-xl border-2 border-slate-200 px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Frequency *
                    </label>
                    <input
                      type="text"
                      value={rxForm.frequency}
                      onChange={(e) =>
                        setRxForm({ ...rxForm, frequency: e.target.value })
                      }
                      placeholder="e.g. Twice daily"
                      required
                      className="w-full h-12 rounded-xl border-2 border-slate-200 px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Quick Frequency Buttons */}
                <div className="flex flex-wrap gap-2">
                  {MED_FREQ_SUGGESTIONS.map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setRxForm({ ...rxForm, frequency: freq })}
                      className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                    >
                      {freq}
                    </button>
                  ))}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={rxForm.duration}
                    onChange={(e) =>
                      setRxForm({ ...rxForm, duration: e.target.value })
                    }
                    placeholder="e.g. 7 days"
                    required
                    className="w-full h-12 rounded-xl border-2 border-slate-200 px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MED_DURATION_SUGGESTIONS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setRxForm({ ...rxForm, duration: dur })}
                        className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Instructions (Optional)
                  </label>
                  <textarea
                    value={rxForm.instructions}
                    onChange={(e) =>
                      setRxForm({ ...rxForm, instructions: e.target.value })
                    }
                    rows={3}
                    placeholder="e.g. Take with food, avoid alcohol, drink plenty of water"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Prescription Document (PDF, Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setRxFile(e.target.files?.[0] || null)}
                      className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 px-4 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer hover:border-emerald-300 transition-all"
                    />
                  </div>
                  {rxFile && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <FiUpload className="flex-shrink-0" />
                      <span className="truncate">{rxFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setRxFile(null)}
                        className="ml-auto text-emerald-600 hover:text-emerald-800"
                      >
                        <FiX />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={[
                    "inline-flex justify-center items-center rounded-xl px-8 py-3 text-base font-bold text-white shadow-lg transition-all",
                    submitting
                      ? "bg-emerald-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-600/20",
                  ].join(" ")}
                >
                  {submitting ? "Creating Prescription..." : "Create Prescription"}
                </button>
                <button
                  type="button"
                  onClick={closeNewRxModal}
                  disabled={submitting}
                  className="inline-flex justify-center items-center rounded-xl border-2 border-slate-200 bg-white px-8 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}