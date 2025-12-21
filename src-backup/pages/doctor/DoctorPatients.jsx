// src/pages/doctor/DoctorPatients.jsx
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  FiSearch,
  FiUser,
  FiAlertCircle,
  FiChevronRight,
  FiDownload,
  FiActivity,
  FiDroplet,
  FiClipboard,
  FiClock,
} from "react-icons/fi";
import toast from "react-hot-toast";

import { doctorPatientService } from "../../services/doctorPatientService";
import { doctorScheduleService } from "../../services/doctorScheduleService";
import { testResultsService } from "../../services/testResultsService";
import { medicationService } from "../../services/medicationService";

// Simple suggestion sets for a nicer, guided experience
const LAB_SUGGESTIONS = [
  "CBC",
  "Fasting blood sugar",
  "Lipid profile",
  "Liver function test",
];

const MED_NAME_SUGGESTIONS = [
  "Amoxicillin",
  "Metformin",
  "Atorvastatin",
  "Omeprazole",
];

const MED_FREQ_SUGGESTIONS = ["Once daily", "Twice daily", "Thrice daily"];

const MED_DURATION_SUGGESTIONS = ["5 days", "7 days", "14 days"];

export default function DoctorPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [selectedPatient, setSelectedPatient] = useState(null);

  // Visit history state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Lab order form state
  const [orderName, setOrderName] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");

  // Medications state (for selected patient)
  const [medications, setMedications] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medError, setMedError] = useState("");

  // New prescription form state
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medDuration, setMedDuration] = useState("");
  const [medInstructions, setMedInstructions] = useState("");
  const [medFile, setMedFile] = useState(null);
  const [medSubmitting, setMedSubmitting] = useState(false);

  // Right panel tab: overview | labs | meds | history
  const [activeTab, setActiveTab] = useState("overview");

  // Confirmation modals
  const [showLabConfirm, setShowLabConfirm] = useState(false);
  const [showRxConfirm, setShowRxConfirm] = useState(false);

  async function loadPatients(query) {
    setLoading(true);
    setError("");

    try {
      const list = await doctorPatientService.listMyPatients(query);
      setPatients(list);

      let nextSelected = null;
      if (selectedPatient) {
        nextSelected = list.find((p) => p.id === selectedPatient.id) || null;
      }
      if (!nextSelected && list.length > 0) {
        nextSelected = list[0];
      }
      setSelectedPatient(nextSelected);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Unable to load patients";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(patientId) {
    if (!patientId) {
      setHistory([]);
      setHistoryError("");
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const list = await doctorScheduleService.listPatientHistory(patientId);
      setHistory(list);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Unable to load visit history";
      setHistoryError(msg);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadMedications(patientId) {
    if (!patientId) {
      setMedications([]);
      setMedError("");
      return;
    }

    setMedLoading(true);
    setMedError("");

    try {
      const list = await medicationService.listForPatient(patientId);
      setMedications(Array.isArray(list) ? list : []);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Unable to load medications";
      setMedError(msg);
    } finally {
      setMedLoading(false);
    }
  }

  useEffect(() => {
    loadPatients("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadHistory(selectedPatient.id);
      loadMedications(selectedPatient.id);
      setActiveTab("overview");
    } else {
      setHistory([]);
      setHistoryError("");
      setMedications([]);
      setMedError("");

      // Reset lab order form
      setOrderName("");
      setOrderDate("");
      setOrderError("");

      // Reset new prescription form
      setMedName("");
      setMedDosage("");
      setMedFrequency("");
      setMedDuration("");
      setMedInstructions("");
      setMedFile(null);
      setActiveTab("overview");
    }
  }, [selectedPatient]);

  const hasPatients = patients.length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    loadPatients(search);
  }

  function renderStatusPill(status) {
    const s = String(status || "").toUpperCase();
    let label = s;
    let base = "bg-slate-100 text-slate-700";

    if (s === "SCHEDULED") {
      label = "Scheduled";
      base = "bg-sky-50 text-sky-700 border border-sky-100";
    } else if (s === "COMPLETED") {
      label = "Completed";
      base = "bg-emerald-50 text-emerald-700 border border-emerald-100";
    } else if (s === "CANCELLED") {
      label = "Cancelled";
      base = "bg-rose-50 text-rose-700 border border-rose-100";
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium ${base}`}
      >
        {label}
      </span>
    );
  }

  function formatLastVisitDate(d) {
    if (!d) return "No visits yet";
    try {
      return format(d, "dd MMM yyyy");
    } catch {
      return "No visits yet";
    }
  }

  // Lab order submit: open confirmation modal
  function handleOrderSubmit(e) {
    e.preventDefault();
    if (!selectedPatient) return;

    const trimmedName = orderName.trim();
    if (!trimmedName) {
      setOrderError("Please enter a test name.");
      return;
    }

    setOrderError("");
    setShowLabConfirm(true);
  }

  // Confirm and actually place lab order
  async function confirmOrderSubmit() {
    if (!selectedPatient) return;

    setOrdering(true);
    setOrderError("");

    try {
      let takenAtIso;
      if (orderDate) {
        const d = new Date(orderDate);
        if (!Number.isNaN(d.getTime())) {
          takenAtIso = d.toISOString();
        }
      }

      await testResultsService.create({
        patientId: selectedPatient.id,
        name: orderName.trim(),
        takenAt: takenAtIso,
      });

      toast.success("Lab test ordered for this patient.");

      setOrderName("");
      setOrderDate("");
      setShowLabConfirm(false);
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2?.message ||
        "Unable to order lab test. Please try again.";
      setOrderError(msg);
      toast.error("Unable to order lab test.");
    } finally {
      setOrdering(false);
    }
  }

  // New prescription submit: open confirmation modal
  async function handlePrescriptionSubmit(e) {
    e.preventDefault();
    if (!selectedPatient) return;

    const payload = {
      medicationName: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFrequency.trim(),
      duration: medDuration.trim(),
      instructions: medInstructions.trim(),
    };

    if (
      !payload.medicationName ||
      !payload.dosage ||
      !payload.frequency ||
      !payload.duration
    ) {
      toast.error("Please fill all required fields for the prescription.");
      return;
    }

    setShowRxConfirm(true);
  }

  // Confirm and actually create prescription
  async function confirmPrescriptionSubmit() {
    if (!selectedPatient) return;

    const payload = {
      medicationName: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFrequency.trim(),
      duration: medDuration.trim(),
      instructions: medInstructions.trim(),
    };

    setMedSubmitting(true);
    try {
      await medicationService.createForPatient(
        selectedPatient.id,
        payload,
        medFile
      );

      toast.success("Prescription added for this patient.");

      // Reset form
      setMedName("");
      setMedDosage("");
      setMedFrequency("");
      setMedDuration("");
      setMedInstructions("");
      setMedFile(null);

      setShowRxConfirm(false);

      // Reload medications list
      await loadMedications(selectedPatient.id);
    } catch (e2) {
      const msg =
        e2?.response?.data?.message ||
        e2?.message ||
        "Unable to create prescription. Please try again.";
      setMedError(msg);
      toast.error("Unable to create prescription.");
    } finally {
      setMedSubmitting(false);
    }
  }

  function handlePrescriptionFileChange(e) {
    const file = e.target.files?.[0];
    setMedFile(file || null);
  }

  function handleDownloadPrescription(row) {
    if (!row.downloadUrl) return;
    window.open(row.downloadUrl, "_blank", "noopener,noreferrer");
  }

  const recentMedications = medications.slice(0, 5);
  const hasMedications = recentMedications.length > 0;

  function renderTabButton(id, label, Icon) {
    const active = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        className={[
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-medium transition",
          active
            ? "bg-white text-sky-700 shadow-sm"
            : "text-slate-600 hover:text-slate-900",
        ].join(" ")}
      >
        <Icon className="text-xs" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <>
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              My patients
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl">
              Browse the panel of patients you are actively treating. Select a
              patient to review key details, place lab orders, and manage
              prescriptions from a single workspace.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
          >
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm w-full">
              <FiSearch className="text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 flex-1"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100 transition w-full sm:w-auto"
            >
              Search
            </button>
          </form>
        </div>

        {/* Main content: patients list + right panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,2.2fr)] gap-4 sm:gap-6 items-start">
          {/* Patients list */}
          <div className="card-soft">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Assigned patients
                </h2>
                <p className="text-xs text-slate-500">
                  Patients with at least one appointment with you.
                </p>
              </div>
              <p className="text-[11px] text-slate-500">
                {patients.length}{" "}
                {patients.length === 1 ? "patient" : "patients"}
              </p>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12 sm:py-16">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                  <p className="text-xs text-slate-500">
                    Loading your patients…
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center px-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-2">
                  <FiAlertCircle className="text-lg" />
                </div>
                <p className="text-sm font-medium text-rose-700">
                  Unable to load patients
                </p>
                <p className="mt-1 text-xs text-rose-500 max-w-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => loadPatients(search)}
                  className="mt-4 inline-flex items-center rounded-full bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && !hasPatients && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-14 text-center px-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-500 mb-2">
                  <FiUser className="text-lg" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  You have no patients yet
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  Once patients start booking appointments with you, they will
                  appear here.
                </p>
              </div>
            )}

            {/* Patients list */}
            {!loading && !error && hasPatients && (
              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[420px] md:max-h-none md:overflow-visible">
                <div className="hidden md:grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_40px] bg-slate-50/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span>Patient</span>
                  <span>Contact</span>
                  <span>Last visit</span>
                  <span />
                </div>

                <ul className="divide-y divide-slate-100 overflow-y-auto md:overflow-visible">
                  {patients.map((p) => {
                    const selected = selectedPatient?.id === p.id;
                    const lastVisitLabel = formatLastVisitDate(
                      p.lastVisitDate
                    );

                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(p)}
                          className={[
                            "w-full flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_40px] gap-2 md:gap-3 px-4 py-3 text-left transition",
                            selected
                              ? "bg-sky-50/80"
                              : "hover:bg-slate-50/80",
                          ].join(" ")}
                        >
                          {/* Patient */}
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-semibold">
                              {p.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {p.fullName}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {p.gender && p.age != null
                                  ? `${p.gender}, ${p.age} yrs`
                                  : p.gender ||
                                    (p.age != null
                                      ? `${p.age} yrs`
                                      : "Demographics not provided")}
                              </p>
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="flex items-center">
                            <p className="text-xs md:text-sm text-slate-700 truncate">
                              {p.phone || "Phone not provided"}
                            </p>
                          </div>

                          {/* Last visit */}
                          <div className="flex flex-col gap-1">
                            <p className="text-xs md:text-sm text-slate-900">
                              {lastVisitLabel}
                            </p>
                            {p.lastVisitReason && (
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {p.lastVisitReason}
                              </p>
                            )}
                          </div>

                          {/* Chevron */}
                          <div className="flex items-center justify-end">
                            <FiChevronRight className="text-slate-400" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Patient details + tabs */}
          <div className="card-soft min-h-[260px]">
            {!selectedPatient && (
              <div className="flex flex-col items-center justify-center py-10 sm:py-14 text-center px-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-500 mb-2">
                  <FiUser className="text-lg" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  No patient selected
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  Select a patient from the list to see their summary, orders,
                  medications, and visit history.
                </p>
              </div>
            )}

            {selectedPatient && (
              <>
                {/* Patient header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-semibold">
                      {selectedPatient.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        {selectedPatient.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedPatient.phone || "Phone not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-right text-[11px] sm:text-xs">
                    <div>
                      <p className="font-medium text-slate-500">
                        Total visits
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedPatient.visitCount || 0}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="font-medium text-slate-500">Last visit</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatLastVisitDate(selectedPatient.lastVisitDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="mb-4">
                  <div className="inline-flex rounded-full bg-slate-100 p-1 text-[11px] sm:text-xs overflow-x-auto max-w-full">
                    {renderTabButton("overview", "Overview", FiActivity)}
                    {renderTabButton("labs", "Lab orders", FiDroplet)}
                    {renderTabButton("meds", "Medications", FiClipboard)}
                    {renderTabButton("history", "Visit history", FiClock)}
                  </div>
                </div>

                {/* Tab content */}
                <div className="space-y-4">
                  {/* Overview tab */}
                  {activeTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-900 mb-1">
                          Quick snapshot
                        </p>
                        <p className="text-[11px] text-slate-500 mb-3">
                          High level view of how often you see this patient and
                          when they were last in clinic.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
                            <p className="text-[11px] text-slate-500">
                              Total visits
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                              {selectedPatient.visitCount || 0}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white border border-slate-100 px-3 py-2">
                            <p className="text-[11px] text-slate-500">
                              Last visit
                            </p>
                            <p className="text-xs font-semibold text-slate-900">
                              {formatLastVisitDate(
                                selectedPatient.lastVisitDate
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-900 mb-1">
                          Recent medications
                        </p>
                        <p className="text-[11px] text-slate-500 mb-2">
                          A quick peek at the most recent prescriptions on file
                          for this patient.
                        </p>
                        {medLoading && (
                          <p className="text-[11px] text-slate-500">
                            Loading medications…
                          </p>
                        )}
                        {!medLoading && medError && (
                          <p className="text-[11px] text-rose-600">
                            {medError}
                          </p>
                        )}
                        {!medLoading && !medError && !hasMedications && (
                          <p className="text-[11px] text-slate-500">
                            No prescriptions recorded yet.
                          </p>
                        )}
                        {!medLoading && !medError && hasMedications && (
                          <ul className="mt-1 space-y-1.5 max-h-32 overflow-y-auto">
                            {recentMedications.map((m) => (
                              <li
                                key={m.id}
                                className="flex items-start justify-between gap-2 rounded-lg bg-white border border-slate-100 px-2.5 py-1.5"
                              >
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-slate-900 truncate">
                                    {m.medicationName || "Medication"}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {m.dosage || "—"} •{" "}
                                    {m.frequency || "Frequency not set"}
                                  </p>
                                </div>
                                {m.attachmentAvailable && m.downloadUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadPrescription(m)
                                    }
                                    className="flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full border border-slate-200 hover:bg-slate-50"
                                    title="View prescription"
                                  >
                                    <FiDownload className="text-slate-600 text-xs" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lab orders tab */}
                  {activeTab === "labs" && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-1">
                        <p className="text-xs font-semibold text-slate-900">
                          Order lab tests
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Patient: {selectedPatient.initials}
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-500 mb-2">
                        Add a basic lab order for this patient. Choose from
                        common tests below or type a custom test name.
                      </p>

                      <form
                        onSubmit={handleOrderSubmit}
                        className="flex flex-col sm:flex-row sm:items-end gap-2"
                      >
                        <div className="flex-1">
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">
                            Test name
                          </label>
                          <input
                            type="text"
                            value={orderName}
                            onChange={(e) => setOrderName(e.target.value)}
                            placeholder="e.g. CBC, Fasting blood sugar"
                            className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                          />
                          <div className="mt-1 flex flex-wrap gap-1">
                            {LAB_SUGGESTIONS.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => setOrderName(name)}
                                className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 hover:bg-sky-50"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="w-full sm:w-40">
                          <label className="block text-[11px] font-medium text-slate-700 mb-1">
                            Date (optional)
                          </label>
                          <input
                            type="date"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                          />
                        </div>

                        <div className="flex-shrink-0 mt-1 sm:mt-0">
                          <button
                            type="submit"
                            disabled={ordering || !orderName.trim()}
                            className={[
                              "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium text-white shadow-sm w-full sm:w-auto",
                              ordering || !orderName.trim()
                                ? "bg-sky-300 cursor-not-allowed"
                                : "bg-sky-600 hover:bg-sky-700",
                            ].join(" ")}
                          >
                            {ordering ? "Ordering…" : "Order test"}
                          </button>
                        </div>
                      </form>

                      {orderError && (
                        <p className="mt-1 text-[11px] text-rose-600">
                          {orderError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Medications tab */}
                  {activeTab === "meds" && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-900">
                          Medications and prescriptions
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Record and review prescriptions for this patient
                        </p>
                      </div>

                      {/* New prescription form */}
                      <form
                        onSubmit={handlePrescriptionSubmit}
                        className="space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              Medication name
                            </label>
                            <input
                              type="text"
                              value={medName}
                              onChange={(e) => setMedName(e.target.value)}
                              placeholder="e.g. Amoxicillin"
                              className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                              required
                            />
                            <div className="mt-1 flex flex-wrap gap-1">
                              {MED_NAME_SUGGESTIONS.map((name) => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => setMedName(name)}
                                  className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 hover:bg-emerald-50"
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              Dosage
                            </label>
                            <input
                              type="text"
                              value={medDosage}
                              onChange={(e) => setMedDosage(e.target.value)}
                              placeholder="e.g. 500 mg"
                              className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              Frequency
                            </label>
                            <input
                              type="text"
                              value={medFrequency}
                              onChange={(e) => setMedFrequency(e.target.value)}
                              placeholder="e.g. Twice daily"
                              className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                              required
                            />
                            <div className="mt-1 flex flex-wrap gap-1">
                              {MED_FREQ_SUGGESTIONS.map((freq) => (
                                <button
                                  key={freq}
                                  type="button"
                                  onClick={() => setMedFrequency(freq)}
                                  className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 hover:bg-emerald-50"
                                >
                                  {freq}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              Duration
                            </label>
                            <input
                              type="text"
                              value={medDuration}
                              onChange={(e) => setMedDuration(e.target.value)}
                              placeholder="e.g. 7 days"
                              className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                              required
                            />
                            <div className="mt-1 flex flex-wrap gap-1">
                              {MED_DURATION_SUGGESTIONS.map((dur) => (
                                <button
                                  key={dur}
                                  type="button"
                                  onClick={() => setMedDuration(dur)}
                                  className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-700 hover:bg-emerald-50"
                                >
                                  {dur}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)] gap-2 items-end">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              Instructions (optional)
                            </label>
                            <textarea
                              value={medInstructions}
                              onChange={(e) =>
                                setMedInstructions(e.target.value)
                              }
                              rows={2}
                              placeholder="e.g. Take after food, drink plenty of water"
                              className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[11px] font-medium text-slate-700">
                              Prescription document (PDF, optional)
                            </label>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={handlePrescriptionFileChange}
                              className="block w-full text-[11px] text-slate-700 file:mr-2 file:rounded-md file:border file:border-slate-200 file:bg-slate-50 file:px-2 file:py-1 file:text-[11px] file:font-medium hover:file:bg-slate-100"
                            />
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                disabled={medSubmitting}
                                className={[
                                  "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium text-white shadow-sm w-full sm:w-auto",
                                  medSubmitting
                                    ? "bg-emerald-300 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-700",
                                ].join(" ")}
                              >
                                {medSubmitting
                                  ? "Saving…"
                                  : "Save prescription"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>

                      {/* Medications list */}
                      <div className="mt-2">
                        {medLoading && (
                          <p className="text-[11px] text-slate-500">
                            Loading medications…
                          </p>
                        )}
                        {!medLoading && medError && (
                          <p className="text-[11px] text-rose-600">
                            {medError}
                          </p>
                        )}
                        {!medLoading && !medError && !hasMedications && (
                          <p className="text-[11px] text-slate-500">
                            No prescriptions recorded yet for this patient.
                          </p>
                        )}
                        {!medLoading && !medError && hasMedications && (
                          <div className="mt-2 max-h-48 sm:max-h-40 overflow-y-auto rounded-lg border border-slate-100 bg-white">
                            <div className="grid grid-cols-12 px-3 py-2 text-[10px] font-semibold text-slate-500 bg-slate-50/80 uppercase tracking-wide">
                              <div className="col-span-5 sm:col-span-4">
                                Medication
                              </div>
                              <div className="col-span-4 sm:col-span-3">
                                Dosage / Frequency
                              </div>
                              <div className="col-span-3 sm:col-span-3">
                                Duration
                              </div>
                              <div className="hidden sm:block col-span-2 text-right pr-1">
                                Document
                              </div>
                            </div>
                            {recentMedications.map((m, idx) => (
                              <div
                                key={m.id || idx}
                                className="grid grid-cols-12 items-center px-3 py-2 text-[12px] border-t border-slate-100 gap-y-1"
                              >
                                <div className="col-span-7 sm:col-span-4">
                                  <p className="font-medium text-slate-900 truncate">
                                    {m.medicationName || "Medication"}
                                  </p>
                                  {m.instructions && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1">
                                      {m.instructions}
                                    </p>
                                  )}
                                </div>
                                <div className="col-span-5 sm:col-span-3 text-slate-800">
                                  <p className="text-[11px] sm:text-[12px]">
                                    {m.dosage || "—"}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {m.frequency || ""}
                                  </p>
                                </div>
                                <div className="col-span-6 sm:col-span-3 text-slate-800 text-[11px] mt-1 sm:mt-0">
                                  {m.duration || "—"}
                                </div>
                                <div className="col-span-6 sm:col-span-2 text-right pr-1 mt-1 sm:mt-0">
                                  {m.attachmentAvailable && m.downloadUrl ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadPrescription(m)
                                      }
                                      className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-slate-200 hover:bg-slate-50"
                                      title="View prescription document"
                                    >
                                      <FiDownload className="text-slate-600 text-xs" />
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      No file
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Visit history tab */}
                  {activeTab === "history" && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                      {historyLoading && (
                        <div className="flex items-center justify-center py-8 sm:py-10">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                            <p className="text-xs text-slate-500">
                              Loading visit history…
                            </p>
                          </div>
                        </div>
                      )}

                      {!historyLoading && historyError && (
                        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-2">
                            <FiAlertCircle className="text-base" />
                          </div>
                          <p className="text-sm font-medium text-rose-700">
                            Unable to load visit history
                          </p>
                          <p className="mt-1 text-xs text-rose-500 max-w-xs">
                            {historyError}
                          </p>
                          <button
                            type="button"
                            onClick={() => loadHistory(selectedPatient.id)}
                            className="mt-3 inline-flex items-center rounded-full bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {!historyLoading &&
                        !historyError &&
                        history.length === 0 && (
                          <div className="py-8 text-center px-4">
                            <p className="text-sm font-semibold text-slate-900">
                              No previous visits found
                            </p>
                            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                              Once you have more visits with this patient, they
                              will show up here.
                            </p>
                          </div>
                        )}

                      {!historyLoading &&
                        !historyError &&
                        history.length > 0 && (
                          <div className="mt-2 max-h-[360px] overflow-y-auto space-y-2">
                            {history.map((appt) => (
                              <div
                                key={appt.id}
                                className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-slate-900">
                                    {format(appt.dateTime, "dd MMM yyyy")}
                                  </p>
                                  <span className="text-[11px] text-slate-500">
                                    {format(appt.dateTime, "HH:mm")}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-700 line-clamp-2">
                                  {appt.reason || "Consultation"}
                                </p>
                                <div className="mt-2">
                                  {renderStatusPill(appt.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm lab order modal */}
      {showLabConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <FiDroplet className="text-lg" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  Confirm lab order
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  You are about to place the following lab test for{" "}
                  <span className="font-semibold">
                    {selectedPatient?.fullName}
                  </span>
                  .
                </p>
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-800 space-y-1">
                  <p>
                    <span className="font-medium">Test:&nbsp;</span>
                    {orderName.trim() || "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium">Date:&nbsp;</span>
                    {orderDate || "Will be set when results are added"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLabConfirm(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={ordering}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmOrderSubmit}
                disabled={ordering}
                className={[
                  "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium text-white shadow-sm",
                  ordering
                    ? "bg-sky-300 cursor-not-allowed"
                    : "bg-sky-600 hover:bg-sky-700",
                ].join(" ")}
              >
                {ordering ? "Placing order…" : "Confirm order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm prescription modal */}
      {showRxConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <FiClipboard className="text-lg" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  Confirm prescription
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Please confirm the prescription details for{" "}
                  <span className="font-semibold">
                    {selectedPatient?.fullName}
                  </span>
                  .
                </p>
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-800 space-y-1">
                  <p>
                    <span className="font-medium">Medication:&nbsp;</span>
                    {medName.trim()}
                  </p>
                  <p>
                    <span className="font-medium">Dosage:&nbsp;</span>
                    {medDosage.trim()}
                  </p>
                  <p>
                    <span className="font-medium">Frequency:&nbsp;</span>
                    {medFrequency.trim()}
                  </p>
                  <p>
                    <span className="font-medium">Duration:&nbsp;</span>
                    {medDuration.trim()}
                  </p>
                  {medInstructions.trim() && (
                    <p>
                      <span className="font-medium">Instructions:&nbsp;</span>
                      {medInstructions.trim()}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Document:&nbsp;</span>
                    {medFile ? medFile.name : "No file attached"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRxConfirm(false)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={medSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPrescriptionSubmit}
                disabled={medSubmitting}
                className={[
                  "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium text-white shadow-sm",
                  medSubmitting
                    ? "bg-emerald-300 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700",
                ].join(" ")}
              >
                {medSubmitting ? "Saving…" : "Confirm prescription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
