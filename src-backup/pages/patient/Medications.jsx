// src/pages/patient/Medications.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FiSearch, FiFileText } from "react-icons/fi";
import { format } from "date-fns";
import { medicationService } from "../../services/medicationService";

function Pill({ kind = "green", children }) {
  const cls =
    kind === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 h-7 rounded-full text-xs font-medium border ${cls}`}
    >
      {children}
    </span>
  );
}

export default function Medications() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await medicationService.list();
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Unable to load medications. Please try again.";
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => {
      const hay = [
        r.medicationName,
        r.dosage,
        r.frequency,
        r.doctorName,
        r.doctorSpecialization,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const activeCount = filtered.filter((r) => r.status === "Active").length;

  function handleOpenDocument(row) {
    if (!row.downloadUrl) return;
    window.open(row.downloadUrl, "_blank", "noopener,noreferrer");
  }

  function renderRefillLabel(refillDue) {
    if (!refillDue) return "—";
    try {
      return format(new Date(refillDue), "MMM dd, yyyy");
    } catch {
      return "—";
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
      {/* Page header */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-gray-900">
            Your medications
          </h1>
          <p className="mt-1 text-sm text-gray-500 max-w-xl">
            Review your current and past prescriptions, including dosage,
            frequency, and when refills are due. You can open the original
            prescription document when your doctor has uploaded one.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
          <span className="font-medium text-gray-900">
            {activeCount}
          </span>
          <span>active medication{activeCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Card */}
      <div className="mt-6 card-soft">
        {/* Card header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="text-sm font-semibold text-gray-900">
            Medication list
          </div>
          <div className="w-full sm:w-auto">
            <div className="search-pill max-w-md w-full">
              <FiSearch className="text-gray-400" />
              <input
                className="search-input"
                placeholder="Search by name, doctor, or dosage…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Error state */}
        {!loading && error && (
          <div className="px-5 py-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="px-5 py-6 space-y-3">
            <div className="h-4 w-32 bg-gray-100 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
              <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Desktop table */}
            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white hidden md:block">
              <div className="min-w-[860px]">
                {/* Header row */}
                <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold text-gray-500 bg-gray-50 uppercase tracking-wide">
                  <div className="col-span-3">Medication</div>
                  <div className="col-span-2">Dosage</div>
                  <div className="col-span-2">Frequency</div>
                  <div className="col-span-3">Prescribing doctor</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1 text-right pr-1">
                    Refill / document
                  </div>
                </div>

                {/* Data rows */}
                {filtered.map((r, i) => (
                  <div
                    key={r.id || i}
                    className={[
                      "grid grid-cols-12 items-center px-5 py-4 text-[14px] border-t border-gray-100",
                      i === 0 ? "border-t-0" : "",
                    ].join(" ")}
                  >
                    {/* Medication */}
                    <div className="col-span-3 text-gray-900">
                      <div className="font-medium">
                        {r.medicationName || "Medication"}
                      </div>
                      {r.instructions && (
                        <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                          {r.instructions}
                        </div>
                      )}
                    </div>

                    {/* Dosage */}
                    <div className="col-span-2 text-gray-800">
                      {r.dosage || "—"}
                    </div>

                    {/* Frequency */}
                    <div className="col-span-2 text-gray-800">
                      {r.frequency || "—"}
                    </div>

                    {/* Doctor */}
                    <div className="col-span-3 text-gray-800">
                      <div className="font-medium">
                        {r.doctorName || "Care team"}
                      </div>
                      {r.doctorSpecialization && (
                        <div className="text-xs text-gray-500">
                          {r.doctorSpecialization}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <Pill kind={r.status === "Active" ? "green" : "gray"}>
                        {r.status || "Unknown"}
                      </Pill>
                    </div>

                    {/* Refill + document */}
                    <div className="col-span-1 text-right text-gray-800 pr-1 flex flex-col items-end gap-1">
                      <div className="text-xs">
                        {renderRefillLabel(r.refillDue)}
                      </div>
                      {r.downloadUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenDocument(r)}
                          className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 border border-sky-100 hover:bg-sky-100"
                        >
                          <FiFileText className="text-[12px]" />
                          View PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {filtered.length === 0 && (
                  <div className="px-5 py-10 text-center text-sm text-gray-500">
                    No medications found. When your doctor adds prescriptions to
                    your chart, they will appear here, including any attached
                    PDF prescription documents.
                  </div>
                )}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="mt-2 space-y-3 md:hidden">
              {filtered.map((r, i) => (
                <div
                  key={r.id || i}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900 truncate">
                        {r.medicationName || "Medication"}
                      </p>
                      {r.instructions && (
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                          {r.instructions}
                        </p>
                      )}
                    </div>
                    <Pill kind={r.status === "Active" ? "green" : "gray"}>
                      {r.status || "Unknown"}
                    </Pill>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                    <div>
                      <p className="uppercase text-[10px] text-gray-400 tracking-wide">
                        Dosage
                      </p>
                      <p className="mt-0.5 text-gray-800">
                        {r.dosage || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase text-[10px] text-gray-400 tracking-wide">
                        Frequency
                      </p>
                      <p className="mt-0.5 text-gray-800">
                        {r.frequency || "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="uppercase text-[10px] text-gray-400 tracking-wide">
                        Prescribing doctor
                      </p>
                      <p className="mt-0.5 text-gray-800">
                        {r.doctorName || "Care team"}
                      </p>
                      {r.doctorSpecialization && (
                        <p className="text-[11px] text-gray-500">
                          {r.doctorSpecialization}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="uppercase text-[10px] text-gray-400 tracking-wide">
                        Refill by
                      </p>
                      <p className="mt-0.5 text-gray-800">
                        {renderRefillLabel(r.refillDue)}
                      </p>
                    </div>
                  </div>

                  {r.downloadUrl && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenDocument(r)}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700 border border-sky-100 hover:bg-sky-100"
                      >
                        <FiFileText className="text-[12px]" />
                        View prescription PDF
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="px-1 py-6 text-center text-sm text-gray-500">
                  No medications found. When your doctor adds prescriptions to
                  your chart, they will appear here.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
