// src/pages/doctor/DoctorTestResults.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiAlertCircle,
  FiWifiOff,
  FiLock,
  FiPaperclip,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiDollarSign,
  FiCalendar,
  FiX,
  FiGrid,
  FiList,
  FiChevronDown,
  FiActivity,
  FiTrendingUp,
  FiUser,
  FiZap,
  FiEye,
  FiMoreVertical,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import { testResultsService } from "../../services/testResultsService";

/* ========== CONSTANTS ========== */

const VIEW_MODE = { LIST: "list", GRID: "grid" };

const SORT_OPTIONS = [
  { id: "date_desc", label: "Newest First", icon: FiArrowDown },
  { id: "date_asc", label: "Oldest First", icon: FiArrowUp },
  { id: "patient_asc", label: "Patient A-Z", icon: FiUser },
  { id: "patient_desc", label: "Patient Z-A", icon: FiUser },
];

const FILTER_OPTIONS = [
  { id: "all", label: "All Results", color: "slate" },
  { id: "completed", label: "Completed", color: "emerald" },
  { id: "pending", label: "Pending", color: "amber" },
  { id: "in_progress", label: "In Progress", color: "sky" },
];

/* ========== HELPER FUNCTIONS ========== */

function getPatientName(row) {
  if (!row) return "Patient";
  if (row.patientName) return row.patientName;
  if (row.patientFullName) return row.patientFullName;
  if (row.patient?.fullName) return row.patient.fullName;

  const first =
    row.patientFirstName || row.patient?.firstName || row.firstName || "";
  const last =
    row.patientLastName || row.patient?.lastName || row.lastName || "";
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || "Patient";
}

function getTestName(row) {
  if (!row) return "Lab result";
  return row.testName || row.name || row.title || row.panelName || "Lab result";
}

function getResultDate(row) {
  const value =
    row.resultDate ||
    row.date ||
    row.performedAt ||
    row.collectedAt ||
    row.takenAt ||
    row.createdAt ||
    row.updatedAt;
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dollarsFromCents(cents) {
  if (typeof cents !== "number" || !Number.isFinite(cents) || cents <= 0) {
    return null;
  }
  return `$${(cents / 100).toFixed(2)}`;
}

function parseUsdToCents(input) {
  if (!input) return null;
  const cleaned = String(input).replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function getStatusInfo(row) {
  const normalized = String(row?.status || "").toLowerCase();
  const hasAttachment = !!row?.attachmentAvailable;

  const isFinal =
    normalized.includes("final") ||
    normalized.includes("ready") ||
    normalized.includes("completed") ||
    normalized.includes("avail") ||
    (hasAttachment && !normalized.includes("pending"));

  const isPending =
    !isFinal &&
    (normalized.includes("pending") ||
      normalized.includes("ordered") ||
      !normalized);

  if (isFinal && hasAttachment) {
    return {
      status: "completed",
      label: "Completed",
      color: "emerald",
      icon: FiCheckCircle,
    };
  } else if (isFinal) {
    return {
      status: "ready",
      label: "Ready",
      color: "sky",
      icon: FiCheckCircle,
    };
  } else if (isPending) {
    return {
      status: "pending",
      label: "Pending",
      color: "amber",
      icon: FiClock,
    };
  }
  return {
    status: "in_progress",
    label: "In Progress",
    color: "violet",
    icon: FiActivity,
  };
}

function formatSmartDate(date) {
  if (!date) return "Not recorded";
  if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return `Yesterday at ${format(date, "h:mm a")}`;
  if (isThisWeek(date)) return format(date, "EEEE, h:mm a");
  return format(date, "MMM dd, yyyy");
}


function getPatientInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ========== UI COMPONENTS ========== */

function AnimatedNumber({ value, duration = 400 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = displayValue;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + (value - startValue) * easeOut));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

function StatusBadge({ status, hasAttachment, size = "default" }) {
  const info = getStatusInfo({ status, attachmentAvailable: hasAttachment });
  const Icon = info.icon;

  const colorClasses = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    sky: "bg-sky-50 border-sky-200 text-sky-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  };

  const sizeClasses = {
    small: "px-2 py-1 text-[10px] gap-1",
    default: "px-3 py-1.5 text-xs gap-1.5",
    large: "px-4 py-2 text-sm gap-2",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-semibold",
        "transition-colors duration-150",
        colorClasses[info.color],
        sizeClasses[size],
      ].join(" ")}
    >
      <Icon className="text-current" />
      <span>{info.label}</span>
    </span>
  );
}

function StatCard({ icon: Icon, label, value, subtext, tone }) {
  const toneClasses = {
    neutral: "bg-white border-slate-200 text-slate-900",
    positive: "bg-emerald-50 border-emerald-200 text-emerald-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-sky-50 border-sky-200 text-sky-900",
  };

  const chipClasses = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    positive: "bg-emerald-100 text-emerald-700 border-emerald-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-sky-100 text-sky-700 border-sky-200",
  };

  const toneKey = tone || "neutral";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border px-5 py-4",
        "transition-shadow duration-150",
        "hover:shadow-md hover:bg-white",
        toneClasses[toneKey],
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={[
            "w-11 h-11 rounded-xl border flex items-center justify-center",
            "bg-white shadow-sm",
          ].join(" ")}
        >
          <Icon className="text-lg text-slate-700" />
        </div>
        <span
          className={[
            "px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide",
            chipClasses[toneKey],
          ].join(" ")}
        >
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </p>
      <p className="text-xs mt-1 text-slate-600">{subtext}</p>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full">
      <FiSearch
        className={[
          "absolute left-3 top-1/2 -translate-y-1/2 text-sm",
          isFocused ? "text-sky-500" : "text-slate-400",
        ].join(" ")}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={[
          "w-full h-11 pl-9 pr-9 rounded-xl border text-sm",
          "bg-white text-slate-900 placeholder:text-slate-400",
          "transition-colors duration-150",
          isFocused
            ? "border-sky-500 ring-1 ring-sky-200"
            : "border-slate-200 hover:border-slate-300",
        ].join(" ")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
        >
          <FiX className="text-xs text-slate-500" />
        </button>
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-xl p-1">
      <button
        type="button"
        onClick={() => onChange(VIEW_MODE.LIST)}
        className={[
          "flex items-center justify-center w-9 h-9 rounded-lg text-xs font-medium",
          "transition-colors duration-150",
          view === VIEW_MODE.LIST
            ? "bg-white text-sky-600 shadow-sm"
            : "text-slate-500 hover:text-slate-700",
        ].join(" ")}
      >
        <FiList className="text-base" />
      </button>
      <button
        type="button"
        onClick={() => onChange(VIEW_MODE.GRID)}
        className={[
          "flex items-center justify-center w-9 h-9 rounded-lg text-xs font-medium",
          "transition-colors duration-150",
          view === VIEW_MODE.GRID
            ? "bg-white text-sky-600 shadow-sm"
            : "text-slate-500 hover:text-slate-700",
        ].join(" ")}
      >
        <FiGrid className="text-base" />
      </button>
    </div>
  );
}

function FilterPills({ selected, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {FILTER_OPTIONS.map((filter) => {
        const isSelected = selected === filter.id;
        const base =
          "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors duration-150";
        const tone = {
          slate: isSelected
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
          emerald: isSelected
            ? "bg-emerald-600 text-white border-emerald-600"
            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300",
          amber: isSelected
            ? "bg-amber-500 text-white border-amber-500"
            : "bg-white text-slate-700 border-slate-200 hover:border-amber-300",
          sky: isSelected
            ? "bg-sky-600 text-white border-sky-600"
            : "bg-white text-slate-700 border-slate-200 hover:border-sky-300",
        };

        return (
          <button
            type="button"
            key={filter.id}
            onClick={() => onChange(filter.id)}
            className={[base, tone[filter.color]].join(" ")}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

function SortDropdown({ selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const current = SORT_OPTIONS.find((o) => o.id === selected) || SORT_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={[
          "flex items-center gap-2 px-4 h-11 rounded-xl border text-sm font-medium bg-white",
          "transition-colors duration-150",
          isOpen
            ? "border-sky-500 ring-1 ring-sky-200"
            : "border-slate-200 hover:border-slate-300",
        ].join(" ")}
      >
        <current.icon className="text-slate-500 text-sm" />
        <span className="text-slate-700">{current.label}</span>
        <FiChevronDown
          className={[
            "text-slate-400 text-sm transition-transform duration-150",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl border border-slate-100 shadow-lg z-20 overflow-hidden">
          {SORT_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className={[
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm",
                "transition-colors duration-100",
                selected === option.id
                  ? "bg-sky-50 text-sky-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <option.icon className="text-xs" />
              <span>{option.label}</span>
              {selected === option.id && (
                <FiCheckCircle className="ml-auto text-sky-500 text-xs" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ row, onDownload, onAttach, isDownloading, isUploading }) {
  const patientName = getPatientName(row);
  const testName = getTestName(row);
  const date = getResultDate(row);
  const statusInfo = getStatusInfo(row);
  const hasAttachment = !!row.attachmentAvailable;
  const billedText = dollarsFromCents(row.billingAmountCents);

  const stripeColor =
    statusInfo.color === "emerald"
      ? "bg-emerald-500"
      : statusInfo.color === "sky"
      ? "bg-sky-500"
      : statusInfo.color === "amber"
      ? "bg-amber-500"
      : "bg-violet-500";

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-150">
      <div className={["absolute top-0 left-0 right-0 h-1", stripeColor].join(" ")} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={[
                "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-semibold text-white",
                stripeColor,
              ].join(" ")}
            >
              {getPatientInitials(patientName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {patientName}
              </p>
              <p className="text-xs text-slate-500 truncate">{testName}</p>
            </div>
          </div>
          <StatusBadge
            status={row.status}
            hasAttachment={hasAttachment}
            size="small"
          />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <FiCalendar className="text-slate-400 text-sm" />
            <span>{formatSmartDate(date)}</span>
          </div>
          {billedText && (
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <FiDollarSign className="text-xs" />
              <span>{billedText}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasAttachment ? (
            <button
              type="button"
              onClick={() => onDownload(row)}
              disabled={isDownloading}
              className={[
                "flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
                "bg-sky-600 text-white hover:bg-sky-700",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <FiDownload className="text-xs" />
              <span>{isDownloading ? "Opening" : "Download"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAttach(row)}
              disabled={isUploading}
              className={[
                "flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
                "bg-emerald-600 text-white hover:bg-emerald-700",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <FiPaperclip className="text-xs" />
              <span>{isUploading ? "Uploading" : "Attach PDF"}</span>
            </button>
          )}
          <button
            type="button"
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
            title="More options"
          >
            <FiMoreVertical className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  row,
  onDownload,
  onAttach,
  isDownloading,
  isUploading,
  index,
}) {
  const patientName = getPatientName(row);
  const testName = getTestName(row);
  const date = getResultDate(row);
  const statusInfo = getStatusInfo(row);
  const hasAttachment = !!row.attachmentAvailable;
  const billedText = dollarsFromCents(row.billingAmountCents);

  const avatarTone =
    statusInfo.color === "emerald"
      ? "bg-emerald-500"
      : statusInfo.color === "sky"
      ? "bg-sky-500"
      : statusInfo.color === "amber"
      ? "bg-amber-500"
      : "bg-violet-500";

  return (
    <div
      className={[
        "grid grid-cols-1 lg:grid-cols-12 gap-4 px-5 py-4 border-b border-slate-100 last:border-b-0",
        "hover:bg-slate-50/60 transition-colors duration-100",
      ].join(" ")}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="lg:col-span-3 flex items-center gap-3">
        <div
          className={[
            "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold text-white",
            avatarTone,
          ].join(" ")}
        >
          {getPatientInitials(patientName)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {patientName}
          </p>
          <p className="text-xs text-slate-500 truncate lg:hidden">{testName}</p>
        </div>
      </div>

      <div className="hidden lg:flex lg:col-span-3 items-center">
        <p className="text-sm text-slate-700 line-clamp-2">{testName}</p>
      </div>

      <div className="lg:col-span-2 flex items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <FiCalendar className="text-slate-500 text-xs" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {date ? format(date, "MMM dd") : "Not recorded"}
            </p>
            <p className="text-[11px] text-slate-400">
              {date ? format(date, "yyyy") : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-1">
        <StatusBadge status={row.status} hasAttachment={hasAttachment} />
        {billedText && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold w-fit">
            <FiDollarSign className="text-[10px]" />
            {billedText}
          </span>
        )}
      </div>

      <div className="lg:col-span-2 flex items-center justify-start lg:justify-end gap-2">
        {hasAttachment ? (
          <button
            type="button"
            onClick={() => onDownload(row)}
            disabled={isDownloading}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
              "bg-sky-600 text-white hover:bg-sky-700",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <FiDownload className="text-xs" />
            <span>{isDownloading ? "Opening" : "Download"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAttach(row)}
            disabled={isUploading}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
              "bg-emerald-600 text-white hover:bg-emerald-700",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <FiPaperclip className="text-xs" />
            <span>{isUploading ? "Uploading" : "Attach PDF"}</span>
          </button>
        )}
        <button
          type="button"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="View details"
        >
          <FiEye className="text-xs" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onReset }) {
  return (
    <div className="px-8 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
        <FiFileText className="text-2xl text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {hasFilters ? "No matching results" : "No laboratory results"}
      </h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
        {hasFilters
          ? "Try adjusting your search, filters, or clearing them to see all results."
          : "Laboratory results will appear here once tests are ordered and results are available."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <FiRefreshCw className="text-xs" />
          Clear filters
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="px-8 py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Loading results</p>
          <p className="text-xs text-slate-500">
            Fetching laboratory data from the server
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 rounded-2xl bg-slate-100 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

/* ========== MAIN COMPONENT ========== */

export default function DoctorTestResults() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [activeForUpload, setActiveForUpload] = useState(null);
  const [errorState, setErrorState] = useState(null);

  const [viewMode, setViewMode] = useState(VIEW_MODE.LIST);
  const [sortBy, setSortBy] = useState("date_desc");
  const [filterStatus, setFilterStatus] = useState("all");

  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [billingAmountInput, setBillingAmountInput] = useState("");
  const [billingError, setBillingError] = useState("");
  const [pendingBillingCents, setPendingBillingCents] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const loadResults = useCallback(async () => {
    setLoading(true);
    setErrorState(null);

    try {
      const { items } = await testResultsService.list({ limit: 75 });
      const safeItems = Array.isArray(items) ? items : [];
      setResults(safeItems);
    } catch (e) {
      console.error("Failed to load doctor test results", e);
      const status = e?.response?.status;
      const body = e?.response?.data || {};
      const message = String(body.message || "").toLowerCase();

      const looksLikeEmpty =
        status === 404 ||
        status === 204 ||
        message.includes("no results") ||
        message.includes("no lab results") ||
        message.includes("no test results");

      if (looksLikeEmpty) {
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
      } else if (status >= 500) {
        setResults([]);
        setErrorState(null);
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
    let candidate = results;

    if (query.trim()) {
      const q = query.toLowerCase();
      candidate = candidate.filter((r) => {
        const test = getTestName(r).toLowerCase();
        const patient = getPatientName(r).toLowerCase();
        const status = String(r.status || "").toLowerCase();
        return test.includes(q) || patient.includes(q) || status.includes(q);
      });
    }

    if (filterStatus !== "all") {
      candidate = candidate.filter((r) => {
        const info = getStatusInfo(r);
        if (filterStatus === "completed") return info.status === "completed";
        if (filterStatus === "pending") return info.status === "pending";
        if (filterStatus === "in_progress") {
          return info.status === "in_progress" || info.status === "ready";
        }
        return true;
      });
    }

    return [...candidate].sort((a, b) => {
      if (sortBy === "date_desc" || sortBy === "date_asc") {
        const da = getResultDate(a);
        const db = getResultDate(b);
        if (da && db) {
          return sortBy === "date_desc"
            ? db.getTime() - da.getTime()
            : da.getTime() - db.getTime();
        }
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      }
      if (sortBy === "patient_asc" || sortBy === "patient_desc") {
        const pa = getPatientName(a).toLowerCase();
        const pb = getPatientName(b).toLowerCase();
        return sortBy === "patient_asc"
          ? pa.localeCompare(pb)
          : pb.localeCompare(pa);
      }
      return 0;
    });
  }, [results, query, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const total = results.length;
    const completed = results.filter((r) => r.attachmentAvailable).length;
    const pending = total - completed;
    const lastUpdated = results
      .map((r) => getResultDate(r))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return { total, completed, pending, lastUpdated };
  }, [results]);

  async function handleDownload(row) {
    if (!row.attachmentAvailable) {
      alert("No document is attached for this result yet.");
      return;
    }

    try {
      setDownloadingId(row.id);
      const data = await testResultsService.getOne(row.id);
      const url =
        data?.attachmentUrl || data?.attachment_url || data?.attachment || null;

      if (!url) {
        alert("The file is not available yet. Please try again later.");
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("download failed", e);
      const status = e?.response?.status;

      if (status === 401) {
        alert("Your session may have expired. Please sign in again.");
      } else if (status === 403) {
        alert("You do not have permission to view this result.");
      } else {
        alert("Unable to download file. Please try again.");
      }
    } finally {
      setDownloadingId(null);
    }
  }

  function openFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function handleAttachClick(row) {
    setActiveForUpload(row);
    setBillingAmountInput("");
    setBillingError("");
    setPendingBillingCents(null);
    setBillingDialogOpen(true);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !activeForUpload) return;

    try {
      setUploadingId(activeForUpload.id);

      const todayIso = new Date().toISOString();
      const fields = { takenAt: todayIso, status: "Completed" };

      if (
        typeof pendingBillingCents === "number" &&
        Number.isFinite(pendingBillingCents) &&
        pendingBillingCents > 0
      ) {
        fields.billingAmountCents = pendingBillingCents;
      }

      await testResultsService.complete(activeForUpload.id, fields, file);
      setActiveForUpload(null);
      setPendingBillingCents(null);
      await loadResults();
    } catch (err) {
      console.error("Failed to upload lab result", err);
      alert("Unable to attach result file. Please try again.");
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleBillingCancel() {
    setBillingDialogOpen(false);
    setActiveForUpload(null);
    setBillingAmountInput("");
    setBillingError("");
    setPendingBillingCents(null);
  }

  function handleBillingNoCharge() {
    setPendingBillingCents(null);
    setBillingDialogOpen(false);
    setBillingError("");
    openFilePicker();
  }

  function handleBillingConfirm() {
    if (!billingAmountInput.trim()) {
      setPendingBillingCents(null);
      setBillingDialogOpen(false);
      setBillingError("");
      openFilePicker();
      return;
    }

    const cents = parseUsdToCents(billingAmountInput);
    if (!cents) {
      setBillingError("Enter a valid amount (for example 75 or 120.50).");
      return;
    }

    setPendingBillingCents(cents);
    setBillingDialogOpen(false);
    setBillingError("");
    openFilePicker();
  }

  function resetFilters() {
    setQuery("");
    setFilterStatus("all");
    setSortBy("date_desc");
  }

  function renderErrorCard() {
    if (!errorState) return null;

    const configs = {
      UNAUTH: {
        title: "Session expired",
        description: "Please sign in again to view laboratory results.",
        icon: FiLock,
        tone: "warning",
        action: { label: "Go to sign in", onClick: () => navigate("/login") },
      },
      FORBIDDEN: {
        title: "Access restricted",
        description:
          "This account does not have permission to view laboratory results.",
        icon: FiLock,
        tone: "error",
      },
      NETWORK: {
        title: "Connection issue",
        description: "Unable to reach the server. Check your connection.",
        icon: FiWifiOff,
        tone: "info",
        action: { label: "Retry", onClick: loadResults },
      },
      GENERIC: {
        title: "Unable to load results",
        description:
          "We encountered an error while loading laboratory results. Try again.",
        icon: FiAlertCircle,
        tone: "neutral",
        action: { label: "Retry", onClick: loadResults },
      },
    };

    const config = configs[errorState.type] || configs.GENERIC;
    const Icon = config.icon;

    const bgTone =
      config.tone === "warning"
        ? "bg-amber-50 border-amber-200"
        : config.tone === "error"
        ? "bg-rose-50 border-rose-200"
        : config.tone === "info"
        ? "bg-sky-50 border-sky-200"
        : "bg-slate-50 border-slate-200";

    const iconTone =
      config.tone === "warning"
        ? "text-amber-600"
        : config.tone === "error"
        ? "text-rose-600"
        : config.tone === "info"
        ? "text-sky-600"
        : "text-slate-600";

    return (
      <div className="px-8 py-14">
        <div
          className={[
            "max-w-xl mx-auto rounded-2xl border px-6 py-6 text-center",
            bgTone,
          ].join(" ")}
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Icon className={["text-xl", iconTone].join(" ")} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {config.title}
          </h3>
          <p className="text-sm text-slate-600 mb-6">
            {config.description}
          </p>
          <div className="flex items-center justify-center gap-3">
            {config.action && (
              <button
                type="button"
                onClick={config.action.onClick}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                {config.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/doctor/dashboard")}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const patientNameForDialog = activeForUpload
    ? getPatientName(activeForUpload)
    : "";
  const testNameForDialog = activeForUpload
    ? getTestName(activeForUpload)
    : "";
  const hasActiveFilters = query.trim() || filterStatus !== "all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/40">
      <div className="px-4 sm:px-6 lg:px-8 pb-12 mx-auto max-w-[1600px]">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {billingDialogOpen && activeForUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-sky-600 to-emerald-600 px-7 py-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                    <FiDollarSign className="text-lg" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Billing setup</h2>
                    <p className="text-xs text-sky-50/80">
                      Configure billing for this laboratory result
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-7 py-5">
                <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center text-xs font-semibold">
                      {getPatientInitials(patientNameForDialog)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {patientNameForDialog}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {testNameForDialog}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-2">
                    Billing amount in USD
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                      $
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={billingAmountInput}
                      onChange={(e) => {
                        setBillingAmountInput(e.target.value);
                        setBillingError("");
                      }}
                      placeholder="75.00"
                      className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Leave blank for tests covered by existing billing or when no
                    additional charge is needed.
                  </p>
                  {billingError && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      <FiAlertCircle className="text-xs" />
                      <span>{billingError}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 px-7 py-4 flex flex-col sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleBillingConfirm}
                  className="inline-flex justify-center items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  <FiPaperclip className="text-xs" />
                  Continue to upload
                </button>
                <button
                  type="button"
                  onClick={handleBillingNoCharge}
                  className="inline-flex justify-center items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Skip billing
                </button>
                <button
                  type="button"
                  onClick={handleBillingCancel}
                  className="inline-flex justify-center items-center text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-8 pb-7">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                  <FiActivity className="text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    Laboratory results
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <FiZap className="text-amber-500" />
                    <span>Clinical lab workspace for doctors</span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 max-w-2xl">
                Review diagnostic tests, attach PDF reports, and configure
                billing for completed results in a focused, clinician friendly
                view.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 xl:w-auto">
              <div className="w-full sm:w-72">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by patient, test, or status"
                />
              </div>
              <button
                type="button"
                onClick={loadResults}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 h-11 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <FiRefreshCw className={loading ? "text-sm animate-spin" : "text-sm"} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatCard
            icon={FiFileText}
            label="Total"
            value={stats.total}
            subtext="Laboratory results"
            tone="neutral"
          />
          <StatCard
            icon={FiCheckCircle}
            label="Completed"
            value={stats.completed}
            subtext="Reports attached"
            tone="positive"
          />
          <StatCard
            icon={FiClock}
            label="Pending"
            value={stats.pending}
            subtext="Awaiting completion"
            tone="warning"
          />
          <StatCard
            icon={FiTrendingUp}
            label="Updated"
            value={
              stats.lastUpdated ? format(stats.lastUpdated, "MMM dd") : "No data"
            }
            subtext={
              stats.lastUpdated
                ? formatDistanceToNow(stats.lastUpdated, { addSuffix: true })
                : "No recent updates"
            }
            tone="info"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <FilterPills selected={filterStatus} onChange={setFilterStatus} />
            <div className="flex items-center gap-3 justify-between lg:justify-end">
              <SortDropdown selected={sortBy} onChange={setSortBy} />
              <ViewToggle view={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingState />
          ) : errorState ? (
            renderErrorCard()
          ) : rows.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
          ) : viewMode === VIEW_MODE.GRID ? (
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rows.map((r, idx) => (
                  <ResultCard
                    key={r.id || idx}
                    row={r}
                    onDownload={handleDownload}
                    onAttach={handleAttachClick}
                    isDownloading={downloadingId === r.id}
                    isUploading={uploadingId === r.id}
                  />
                ))}
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-600 px-1">
                Showing {rows.length} of {results.length} results
              </div>
            </div>
          ) : (
            <>
              <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                <div className="col-span-3 flex items-center gap-2">
                  <FiUser className="text-slate-400 text-xs" />
                  <span>Patient</span>
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <FiFileText className="text-slate-400 text-xs" />
                  <span>Laboratory test</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <FiCalendar className="text-slate-400 text-xs" />
                  <span>Date</span>
                </div>
                <div className="col-span-2">
                  <span>Status</span>
                </div>
                <div className="col-span-2 text-right">
                  <span>Actions</span>
                </div>
              </div>

              <div>
                {rows.map((r, idx) => (
                  <ResultRow
                    key={r.id || idx}
                    row={r}
                    index={idx}
                    onDownload={handleDownload}
                    onAttach={handleAttachClick}
                    isDownloading={downloadingId === r.id}
                    isUploading={uploadingId === r.id}
                  />
                ))}
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {rows.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {results.length}
                  </span>{" "}
                  results
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
