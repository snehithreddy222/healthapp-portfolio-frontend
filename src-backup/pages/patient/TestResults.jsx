// src/pages/patient/TestResults.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiSearch, FiRefreshCw } from "react-icons/fi";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { testResultsService } from "../../services/testResultsService";

function normalizeStatus(row) {
  const raw = String(row?.status || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "ordered") return "ordered";
  if (raw === "completed") return "completed";
  if (raw === "released") return "released";
  return raw;
}

function StatusPill({ status }) {
  const normalized = String(status || "").toLowerCase();

  const isAvailable =
    normalized === "released" ||
    normalized.includes("avail") ||
    normalized.includes("ready") ||
    normalized.includes("completed");

  const isOrdered = normalized === "ordered";

  let label = "Pending";
  if (isOrdered) {
    label = "Ordered";
  } else if (isAvailable) {
    label = "Available";
  }

  return (
    <span
      className={[
        "inline-flex items-center px-2.5 h-7 rounded-full text-xs font-medium border",
        isOrdered
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : isAvailable
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-sky-50 text-sky-700 border-sky-200",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function asDate(r) {
  const value =
    r.date ||
    r.performedAt ||
    r.collectedAt ||
    r.resultDate ||
    r.takenAt ||
    r.createdAt ||
    r.updatedAt;

  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function doctorLabel(row) {
  const doc = row?.doctor;
  if (!doc) return null;
  const first = doc.firstName || "";
  const last = doc.lastName || "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  if (!name) return null;

  if (doc.specialization) {
    return `Ordered by Dr. ${name} (${doc.specialization})`;
  }
  return `Ordered by Dr. ${name}`;
}

export default function TestResults() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [errorState, setErrorState] = useState(null); // null | { type: 'NETWORK' | 'UNAUTH' | 'FORBIDDEN' | 'GENERIC' }

  const navigate = useNavigate();

  const loadResults = useCallback(async () => {
    setLoading(true);
    setErrorState(null);

    try {
      const { items } = await testResultsService.list({ limit: 50 });
      const safeItems = Array.isArray(items) ? items : [];
      setResults(safeItems);
    } catch (e) {
      console.error("Failed to load test results", e);

      const status = e?.response?.status;
      const body = e?.response?.data || {};
      const code = body.code;
      const message = String(body.message || "").toLowerCase();

      if (
        status === 404 ||
        status === 204 ||
        code === "NO_RESULTS" ||
        message.includes("not a patient") ||
        (status === 500 && message.includes("failed to load test results"))
      ) {
        setResults([]);
        setErrorState(null);
      } else if (status === 401) {
        setResults([]);
        setErrorState({ type: "UNAUTH" });
      } else if (status === 403) {
        setResults([]);
        setErrorState({ type: "FORBIDDEN" });
      } else if (!status) {
        setResults([]);
        setErrorState({ type: "NETWORK" });
      } else {
        setResults([]);
        setErrorState({ type: "GENERIC" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const rows = useMemo(() => {
    if (!query.trim()) return results;
    const q = query.toLowerCase();
    return results.filter((r) =>
      (r.name || r.title || r.testName || "").toLowerCase().includes(q)
    );
  }, [results, query]);

  const orderedRows = useMemo(
    () => rows.filter((r) => normalizeStatus(r) === "ordered"),
    [rows]
  );

  const resultRows = useMemo(
    () => rows.filter((r) => normalizeStatus(r) !== "ordered"),
    [rows]
  );

  async function handleDownload(row) {
    if (!row.attachmentAvailable) {
      alert("No document is attached for this result yet.");
      return;
    }

    try {
      setDownloadingId(row.id);

      const data = await testResultsService.getOne(row.id);
      const url =
        data?.attachmentUrl ||
        data?.attachment_url ||
        data?.attachment ||
        null;

      console.log("Download URL from attachmentUrl =", url);

      if (!url) {
        alert("The file is not available yet. Please try again later.");
        return;
      }

      // Open the PDF in a new tab, leaving the main app session untouched
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("download failed", e);
      const status = e?.response?.status;

      if (status === 401) {
        alert(
          "Your session may have expired. Please sign in again and reopen the test results."
        );
      } else {
        alert("Unable to download file. Please try again.");
      }
    } finally {
      setDownloadingId(null);
    }
  }

  function renderErrorCard() {
    if (!errorState) return null;

    let title = "Unable to load test results.";
    let description =
      "There was a temporary problem connecting to the server. Your data is safe. Please try again in a moment.";
    let primaryAction = null;

    if (errorState.type === "UNAUTH") {
      title = "Your session has expired.";
      description =
        "For your security, you need to sign in again to view your lab results.";
      primaryAction = (
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
        >
          Go to sign in
        </button>
      );
    } else if (errorState.type === "FORBIDDEN") {
      title = "You do not have access to test results.";
      description =
        "This account does not have permission to view lab results. If you believe this is an error, please contact your clinic.";
    } else if (errorState.type === "NETWORK") {
      title = "We could not reach the server.";
      description =
        "Please check your internet connection and try again. Your information will not be lost.";
    }

    return (
      <div
        className="px-6 py-8 flex flex-col sm:flex-row sm:items-center gap-4"
        aria-live="polite"
      >
        <div className="w-11 h-11 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <span className="text-red-500 text-lg font-semibold">!</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>

          {primaryAction}

          {(errorState.type === "NETWORK" ||
            errorState.type === "GENERIC") && (
            <button
              type="button"
              onClick={loadResults}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
            >
              <FiRefreshCw className="text-[16px]" />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const hasAny = results.length > 0;
  const hasAnyVisible = rows.length > 0;
  const hasOrderedVisible = orderedRows.length > 0;
  const hasResultsVisible = resultRows.length > 0;

  const totalCount = results.length;
  const availableCount = results.filter(
    (r) => normalizeStatus(r) !== "ordered"
  ).length;
  const orderedCount = totalCount - availableCount;

  return (
    <div className="px-4 sm:px-6 pb-10 mx-auto max-w-7xl">
      {/* Page header */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-gray-900">
            Test results
          </h1>
          <p className="text-gray-600 max-w-2xl text-sm sm:text-[15px]">
            See the lab tests your care team has ordered and view completed
            results. For urgent medical concerns, contact your clinic directly.
          </p>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
            Total tests: {totalCount}
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
            Ordered: {orderedCount}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
            With results: {availableCount}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6">
        <div className="search-pill max-w-lg">
          <FiSearch className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search test names…"
            className="search-input"
          />
        </div>
      </div>

      {/* Card */}
      <div className="card-soft mt-6 p-0 overflow-hidden">
        {loading ? (
          <div className="px-6 py-8 space-y-3">
            <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-50 border border-dashed border-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-full bg-gray-50 border border-dashed border-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-3/4 bg-gray-50 border border-dashed border-gray-200 rounded-lg animate-pulse" />
          </div>
        ) : errorState ? (
          renderErrorCard()
        ) : !hasAny ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-gray-900">
              No test results yet.
            </p>
            <p className="mt-1 text-sm text-gray-500 max-w-xl mx-auto">
              When your care team orders lab work, you will see the ordered
              tests here. Once results are ready and reviewed, they will appear
              as completed results below.
            </p>
          </div>
        ) : !hasAnyVisible ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            No tests match your search.
          </div>
        ) : (
          <>
            {hasOrderedVisible && (
              <div className="px-6 py-5 border-b border-gray-200/70 bg-gray-50/60">
                <p className="text-sm font-semibold text-gray-900">
                  Tests ordered
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 max-w-2xl">
                  These tests have been ordered by your care team. Follow the
                  instructions from your clinic to have samples collected.
                </p>

                <div className="mt-4 space-y-3">
                  {orderedRows.map((r, idx) => {
                    const d = asDate(r);
                    const label =
                      r.name || r.title || r.testName || "Lab test";
                    const docText = doctorLabel(r);

                    return (
                      <div
                        key={r.id || `ordered-${idx}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {label}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {d
                              ? `Ordered on ${format(d, "MMM dd, yyyy")}`
                              : "Ordered"}
                          </p>
                          {docText && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {docText}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <StatusPill status={r.status || "ORDERED"} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hasResultsVisible && (
              <>
                <div className="px-6 pt-4 pb-2 border-b border-gray-200/70">
                  <p className="text-xs font-semibold text-gray-500 tracking-wider">
                    COMPLETED RESULTS
                  </p>
                  <p className="mt-1 text-xs text-gray-500 max-w-2xl">
                    Use these results as a reference. Do not change your
                    medications based only on portal results. For advice, talk
                    with your doctor.
                  </p>
                </div>

                <div className="hidden sm:grid grid-cols-12 px-6 py-3 text-xs font-semibold text-gray-500 tracking-wider border-b border-gray-200/70">
                  <div className="col-span-5">TEST NAME</div>
                  <div className="col-span-3">ORDERED BY</div>
                  <div className="col-span-2">DATE</div>
                  <div className="col-span-2 text-right">STATUS / DOCUMENT</div>
                </div>

                {resultRows.map((r, idx) => {
                  const d = asDate(r);
                  const label =
                    r.name || r.title || r.testName || "Lab result";
                  const isLast = idx === resultRows.length - 1;
                  const docText = doctorLabel(r);

                  return (
                    <div
                      key={r.id || idx}
                      className={[
                        "grid grid-cols-12 items-start px-6 py-4 text-[15px]",
                        "border-b border-gray-200/70",
                        "hover:bg-gray-50/70 transition-colors",
                        isLast ? "border-b-0" : "",
                      ].join(" ")}
                    >
                      <div className="col-span-12 sm:col-span-5 text-gray-900">
                        <p className="font-medium truncate">{label}</p>
                        <p className="mt-1 text-xs text-gray-500 sm:hidden">
                          {docText}
                        </p>
                      </div>

                      <div className="hidden sm:block col-span-3 text-gray-700 text-sm">
                        {docText || "Your care team"}
                      </div>

                      <div className="col-span-6 sm:col-span-2 text-gray-700 text-sm mt-2 sm:mt-0">
                        {d ? format(d, "MMM dd, yyyy") : "—"}
                      </div>

                      <div className="col-span-6 sm:col-span-2 mt-3 sm:mt-0 flex items-center justify-end gap-3">
                        <StatusPill status={r.status} />
                        {r.attachmentAvailable ? (
                          <button
                            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700 border border-sky-100 hover:bg-sky-100"
                            title="View PDF"
                            onClick={() => handleDownload(r)}
                            disabled={downloadingId === r.id}
                          >
                            <FiDownload className="text-[13px]" />
                            {downloadingId === r.id ? "Opening…" : "View PDF"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            No document attached
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {!hasResultsVisible && hasOrderedVisible && (
              <div className="px-6 py-6 text-center text-gray-500 text-sm border-t border-gray-100">
                No completed lab results yet. Once your care team reviews and
                releases your results, they will appear here.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
