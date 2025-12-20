// src/pages/doctor/DoctorMessages.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FiSearch,
  FiAlertCircle,
  FiSend,
  FiMail,
  FiUser,
  FiEdit,
  FiTrash2,
  FiX,
  FiMessageCircle,
  FiRefreshCw,
  FiPlus,
  FiCheckCircle,
  FiMoreVertical,
  FiSmile,
  FiStar,
  FiCheck,
  FiClock,
  FiChevronDown,
} from "react-icons/fi";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { messageService } from "../../services/messageService";
import { useAuth } from "../../context/AuthContext";

const POLL_MS = 50000;
const MAX_MESSAGE_LENGTH = 1000;

/* ========== HELPERS ========== */

function pickPatientParticipant(metaOrThread) {
  if (!metaOrThread) return null;
  const parts = metaOrThread.participants || [];
  if (!parts.length) return null;
  const pat = parts.find((p) => p.role === "PATIENT");
  if (pat) return pat;
  const withPatient = parts.find((p) => p.patient || p.user?.patient);
  if (withPatient) return withPatient;
  const meId = metaOrThread.me || metaOrThread.myUserId || metaOrThread.currentUserId;
  if (meId) {
    const other = parts.find((p) => p.userId && p.userId !== meId);
    if (other) return other;
  }
  return parts[0];
}

function formatPatientNameFromParticipant(p) {
  if (!p) return null;
  const patient = p.patient || p.user?.patient || null;
  const first = patient?.firstName?.trim();
  const last = patient?.lastName?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  if (p.user?.displayName) return p.user.displayName;
  if (p.user?.username) return p.user.username;
  return null;
}

function toPatientOption(metaOrThread) {
  if (!metaOrThread) return null;
  const participant = pickPatientParticipant(metaOrThread);
  if (!participant) return null;
  const userId = participant.userId || participant.user?.id;
  const name = formatPatientNameFromParticipant(participant) || "Patient";
  if (!userId) return null;
  return { userId, name };
}

function getThreadLastAt(thread) {
  return (
    thread.lastMessageAt ||
    thread.lastActivity ||
    thread.updatedAt ||
    (thread.lastMessage && (thread.lastMessage.createdAt || thread.lastMessage.sentAt)) ||
    null
  );
}

function getPatientKeyForThread(thread) {
  const opt = toPatientOption(thread);
  if (opt?.userId) return `user:${opt.userId}`;
  if (thread.patientName) return `name:${thread.patientName}`;
  if (thread.counterpartName) return `name:${thread.counterpartName}`;
  return `id:${thread.id}`;
}

function threadDisplayTitle(thread, otherNameByThread) {
  if (!thread) return "Conversation";
  const cached = otherNameByThread[thread.id];
  if (cached) return cached;
  if (Array.isArray(thread.participants) && thread.participants.length) {
    const pat = pickPatientParticipant(thread);
    const fromParts = formatPatientNameFromParticipant(pat);
    if (fromParts) return fromParts;
  }
  if (thread.patientName) return thread.patientName;
  if (thread.patient) {
    const first = thread.patient.firstName?.trim();
    const last = thread.patient.lastName?.trim();
    const full = [first, last].filter(Boolean).join(" ");
    if (full) return full;
  }
  return thread.counterpartName || thread.otherPartyName || thread.subject || thread.title || "Conversation";
}

function formatTimeOrDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay ? format(d, "h:mm a") : format(d, "MMM d");
}

function formatMessageDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

function areSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return false;
  return isSameDay(d1, d2);
}

/* ========== EMOJI DATA ========== */
const EMOJI_CATEGORIES = {
  recent: {
    icon: "🕐",
    label: "Recent",
    emojis: ["👍", "❤️", "😊", "🙏", "👏", "✅", "🎉", "💪"],
  },
  smileys: {
    icon: "😀",
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
      "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😋",
      "😎", "🤗", "🤔", "😐", "😴", "🤒", "😷", "🤕",
    ],
  },
  gestures: {
    icon: "👋",
    label: "Gestures",
    emojis: [
      "👋", "🤚", "✋", "🖖", "👌", "🤌", "🤏", "✌️",
      "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇",
      "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🙏",
    ],
  },
  healthcare: {
    icon: "🏥",
    label: "Healthcare",
    emojis: [
      "💊", "💉", "🩺", "🩹", "🏥", "🚑", "⚕️", "🩻",
      "🧬", "🔬", "🩸", "❤️‍🩹", "🫀", "🫁", "🧠", "🦷",
      "👁️", "👂", "🦴", "💪", "🏃", "🧘", "🥗", "💧",
    ],
  },
  symbols: {
    icon: "✅",
    label: "Symbols",
    emojis: [
      "✅", "❌", "⭐", "💫", "❗", "❓", "💯", "🔔",
      "📌", "📎", "📅", "⏰", "✨", "🎯", "💡", "📝",
      "📋", "📊", "🔒", "🔑", "💚", "💙", "💜", "🧡",
    ],
  },
};

/* ========== QUICK REPLY TEMPLATES FOR DOCTORS ========== */
const QUICK_REPLIES = [
  { id: 1, text: "Your lab results look normal. Great news!", icon: "✅" },
  { id: 2, text: "Please schedule a follow-up appointment.", icon: "📅" },
  { id: 3, text: "Take the medication as prescribed.", icon: "💊" },
  { id: 4, text: "Let me know if symptoms persist.", icon: "🩺" },
  { id: 5, text: "You're making good progress!", icon: "💪" },
  { id: 6, text: "I'll review your case and get back to you.", icon: "📋" },
];

/* ========== UI COMPONENTS ========== */

function Avatar({ name = "", size = 40, showStatus = false, isOnline = false }) {
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "P";

  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-full bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 text-white grid place-items-center font-bold shadow-lg"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
        title={name}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className={[
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm",
            isOnline ? "bg-emerald-500" : "bg-slate-300",
          ].join(" ")}
        />
      )}
    </div>
  );
}

function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center my-5">
      <div className="bg-white/90 backdrop-blur-sm text-slate-500 text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-sm border border-slate-100">
        {date}
      </div>
    </div>
  );
}

/* ========== EMOJI PICKER COMPONENT ========== */
function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState("recent");
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-[320px] sm:w-[360px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Category tabs */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
        {Object.entries(EMOJI_CATEGORIES).map(([key, { icon, label }]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={[
              "px-3 py-1.5 rounded-lg text-lg transition-all flex-shrink-0",
              activeCategory === key ? "bg-white shadow-sm scale-110" : "hover:bg-white/50",
            ].join(" ")}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-3 max-h-[200px] overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {EMOJI_CATEGORIES[activeCategory].label}
        </p>
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="h-9 w-9 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg transition-all hover:scale-125 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========== QUICK REPLIES COMPONENT ========== */
function QuickReplies({ onSelect, isVisible, onToggle }) {
  if (!isVisible) return null;

  return (
    <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Quick Replies
        </span>
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
          <FiX className="text-sm" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply.id}
            onClick={() => onSelect(reply.text)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{reply.icon}</span>
            <span>{reply.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ========== MESSAGE STATUS COMPONENT ========== */
function MessageStatus({ status = "sent", time }) {
  const statusConfig = {
    sending: { icon: FiClock, color: "text-white/50", label: "Sending" },
    sent: { icon: FiCheck, color: "text-white/60", label: "Sent" },
    delivered: { icon: FiCheckCircle, color: "text-white/70", label: "Delivered" },
    read: { icon: FiCheckCircle, color: "text-cyan-200", label: "Read" },
  };

  const config = statusConfig[status] || statusConfig.sent;
  const Icon = config.icon;

  return (
    <span
      className={["text-[10px] flex items-center gap-1 flex-shrink-0", config.color].join(" ")}
      title={config.label}
    >
      {time}
      <Icon className="text-[10px]" />
      {status === "read" && <Icon className="text-[10px] -ml-1.5" />}
    </span>
  );
}

/* ========== MESSAGE SEARCH BAR ========== */
function MessageSearchBar({ value, onChange, onClose, resultCount, currentResult, onPrev, onNext }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 animate-in slide-in-from-top-2 duration-200">
      <FiSearch className="text-slate-400 flex-shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search in conversation..."
        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
        autoFocus
      />
      {value && resultCount > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">
            {currentResult} of {resultCount}
          </span>
          <button
            onClick={onPrev}
            className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600"
          >
            <FiChevronDown className="text-sm rotate-180" />
          </button>
          <button
            onClick={onNext}
            className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600"
          >
            <FiChevronDown className="text-sm" />
          </button>
        </div>
      )}
      {value && resultCount === 0 && <span className="text-xs text-slate-400">No results</span>}
      <button
        onClick={onClose}
        className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-500"
      >
        <FiX className="text-sm" />
      </button>
    </div>
  );
}

/* ========== MESSAGE BUBBLE ========== */
function MessageBubble({
  mine,
  text,
  at,
  isDeleted,
  editedAt,
  senderName,
  onEdit,
  onDelete,
  isFirstInGroup,
  isLastInGroup,
  isStarred,
  onToggleStar,
  status = "delivered",
  searchHighlight = "",
}) {
  const [showActions, setShowActions] = useState(false);
  const hasAt = at && !Number.isNaN(new Date(at).getTime());
  const displayTime = hasAt ? format(new Date(at), "h:mm a") : "";
  const isEdited = editedAt && !Number.isNaN(new Date(editedAt).getTime());
  const isShortMessage = text && text.length < 50 && !text.includes("\n");

  const getBorderRadius = () => {
    if (mine) {
      if (isFirstInGroup && isLastInGroup) return "20px 20px 6px 20px";
      if (isFirstInGroup) return "20px 20px 6px 20px";
      if (isLastInGroup) return "20px 6px 6px 20px";
      return "20px 6px 6px 20px";
    } else {
      if (isFirstInGroup && isLastInGroup) return "20px 20px 20px 6px";
      if (isFirstInGroup) return "20px 20px 20px 6px";
      if (isLastInGroup) return "6px 20px 20px 6px";
      return "6px 20px 20px 6px";
    }
  };

  const highlightText = (content) => {
    if (!searchHighlight || !content) return content;
    const regex = new RegExp(`(${searchHighlight})`, "gi");
    const parts = content.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 text-slate-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className={[
        "flex w-full group",
        mine ? "justify-end" : "justify-start",
        isFirstInGroup ? "mt-3" : "mt-[3px]",
      ].join(" ")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={[
          "flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]",
          mine ? "flex-row-reverse" : "flex-row",
        ].join(" ")}
      >
        {/* Starred indicator */}
        {isStarred && (
          <FiStar
            className={[
              "text-amber-400 fill-amber-400 text-xs flex-shrink-0",
              mine ? "mr-1" : "ml-1",
            ].join(" ")}
          />
        )}

        {/* Message bubble */}
        <div
          className={[
            "relative px-3 py-2 shadow-sm",
            mine
              ? "bg-gradient-to-br from-sky-500 via-sky-500 to-cyan-500 text-white"
              : "bg-white text-slate-800 border border-slate-100 shadow-md shadow-slate-100/50",
            searchHighlight ? "ring-2 ring-yellow-400" : "",
            "transition-all duration-150",
          ].join(" ")}
          style={{ borderRadius: getBorderRadius(), maxWidth: "100%" }}
        >
          {!mine && senderName && isFirstInGroup && (
            <p className="text-[11px] font-semibold text-emerald-600 mb-1">{senderName}</p>
          )}

          {isDeleted ? (
            <p
              className={[
                "text-[14px] italic flex items-center gap-1.5 whitespace-nowrap",
                mine ? "text-white/70" : "text-slate-400",
              ].join(" ")}
            >
              <FiTrash2 className="text-[12px] flex-shrink-0" />
              This message was deleted
            </p>
          ) : isShortMessage ? (
            <div className="flex items-end gap-2" style={{ whiteSpace: "nowrap" }}>
              <span className="text-[15px] leading-relaxed">{highlightText(text)}</span>
              {mine ? (
                <MessageStatus
                  status={status}
                  time={isEdited ? `edited · ${displayTime}` : displayTime}
                />
              ) : (
                <span className="text-[10px] text-slate-400 flex-shrink-0 pb-0.5">
                  {displayTime}
                </span>
              )}
            </div>
          ) : (
            <div style={{ maxWidth: "320px" }}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {highlightText(text)}
              </p>
              <div
                className={[
                  "flex items-center gap-1.5 mt-1",
                  mine ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {mine ? (
                  <MessageStatus
                    status={status}
                    time={isEdited ? `edited · ${displayTime}` : displayTime}
                  />
                ) : (
                  <>
                    {isEdited && <span className="text-[10px] text-slate-400">edited</span>}
                    <span className="text-[10px] text-slate-400">{displayTime}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isDeleted && (
          <div
            className={[
              "flex-shrink-0 transition-all duration-150 relative",
              showActions ? "opacity-100 scale-100" : "opacity-0 scale-90",
            ].join(" ")}
          >
            <div className="flex items-center gap-1">
              {/* Star button */}
              <button
                type="button"
                onClick={onToggleStar}
                className={[
                  "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                  isStarred
                    ? "bg-amber-100 text-amber-500"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-500",
                ].join(" ")}
                title={isStarred ? "Unstar" : "Star"}
              >
                <FiStar className={["text-sm", isStarred ? "fill-current" : ""].join(" ")} />
              </button>

              {/* More actions */}
              {mine && (onEdit || onDelete) && (
                <div className="relative group/actions">
                  <button
                    type="button"
                    className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                  >
                    <FiMoreVertical className="text-sm" />
                  </button>
                  <div className="absolute bottom-full right-0 mb-1 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[100px] z-10 hidden group-hover/actions:block">
                    {onEdit && (
                      <button
                        onClick={onEdit}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        <FiEdit className="text-xs" />
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={onDelete}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <FiTrash2 className="text-xs" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== MAIN PAGE COMPONENT ========== */
export default function DoctorMessages() {
  const { user } = useAuth();

  // Thread states
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState("");
  const [search, setSearch] = useState("");

  // Selected thread
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  // Messages states
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);

  // Refs
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Other states
  const [otherNameByThread, setOtherNameByThread] = useState({});
  const [starredMessages, setStarredMessages] = useState(new Set());

  // Compose modal states
  const [composeOpen, setComposeOpen] = useState(false);
  const [composePatients, setComposePatients] = useState([]);
  const [composePatientId, setComposePatientId] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeError, setComposeError] = useState("");

  // Edit states
  const [editingMessageId, setEditingMessageId] = useState(null);

  // Delete states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Premium feature states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageFilter, setMessageFilter] = useState("all");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Computed values
  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const searchResults = useMemo(() => {
    if (!messageSearch.trim()) return [];
    const term = messageSearch.toLowerCase();
    return messages.filter((m) => m.body?.toLowerCase().includes(term)).map((m) => m.id);
  }, [messages, messageSearch]);

  const toggleStar = useCallback((messageId) => {
    setStarredMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const filteredMessages = useMemo(() => {
    if (messageFilter === "starred") return messages.filter((m) => starredMessages.has(m.id));
    return messages;
  }, [messages, messageFilter, starredMessages]);

  const currentPatientName = useMemo(() => {
    if (!selectedThread) return "";
    return threadDisplayTitle(selectedThread, otherNameByThread);
  }, [selectedThread, otherNameByThread]);

  const charCount = composer.length;
  const charCountColor =
    charCount > MAX_MESSAGE_LENGTH * 0.9
      ? "text-red-500"
      : charCount > MAX_MESSAGE_LENGTH * 0.7
      ? "text-amber-500"
      : "text-slate-400";

  // Helper to enrich patient names
  async function enrichPatientNames(items) {
    const map = {};
    items.forEach((t) => {
      if (Array.isArray(t.participants) && t.participants.length) {
        const pat = pickPatientParticipant(t);
        const name = formatPatientNameFromParticipant(pat);
        if (name) map[t.id] = name;
      } else if (t.patientName) {
        map[t.id] = t.patientName;
      } else if (t.patient) {
        const first = t.patient.firstName?.trim();
        const last = t.patient.lastName?.trim();
        const full = [first, last].filter(Boolean).join(" ");
        if (full) map[t.id] = full;
      }
    });

    const needsDetails = items.filter((t) => !map[t.id]).slice(0, 12);
    if (needsDetails.length) {
      const details = await Promise.all(
        needsDetails.map((t) => messageService.getThread(t.id).catch(() => null))
      );
      details.forEach((th) => {
        if (!th) return;
        const pat = pickPatientParticipant(th);
        const name = formatPatientNameFromParticipant(pat);
        if (name) map[th.id] = name;
        else if (th.patientName) map[th.id] = th.patientName;
        else if (th.patient) {
          const first = th.patient.firstName?.trim();
          const last = th.patient.lastName?.trim();
          const full = [first, last].filter(Boolean).join(" ");
          if (full) map[th.id] = full;
        }
      });
    }

    if (Object.keys(map).length) setOtherNameByThread((prev) => ({ ...prev, ...map }));
  }

  // Load threads
  async function loadThreads() {
    setThreadsLoading(true);
    setThreadsError("");
    try {
      const list = await messageService.listThreads({ includeParticipants: true }).catch(() => []);
      const items = Array.isArray(list) ? list : list?.items || [];
      setThreads(items);
      if (items.length > 0) {
        if (!selectedThreadId || !items.some((t) => t.id === selectedThreadId)) {
          setSelectedThreadId(items[0].id);
        }
      } else {
        setSelectedThreadId(null);
      }
      await enrichPatientNames(items);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Unable to load message threads";
      setThreadsError(msg);
    } finally {
      setThreadsLoading(false);
    }
  }

  // Load messages for a thread
  async function loadMessages(threadId) {
    if (!threadId) {
      setMessages([]);
      setMessagesError("");
      return;
    }
    setMessagesLoading(true);
    setMessagesError("");
    try {
      const list = await messageService.listMessages(threadId, { limit: 50 });
      const items = Array.isArray(list) ? list : list?.items || [];
      setMessages(items);
      if (messageService.markThreadRead) messageService.markThreadRead(threadId).catch(() => {});
      else if (messageService.markRead) messageService.markRead(threadId).catch(() => {});
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)));
      const fullThread = await messageService.getThread(threadId).catch(() => null);
      if (fullThread) {
        const pat = pickPatientParticipant(fullThread);
        const name = formatPatientNameFromParticipant(pat);
        if (name)
          setOtherNameByThread((prev) => (prev[fullThread.id] ? prev : { ...prev, [fullThread.id]: name }));
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Unable to load conversation";
      setMessagesError(msg);
    } finally {
      setMessagesLoading(false);
    }
  }

  // Handle selecting a thread
  function handleSelectThread(threadId) {
    setSelectedThreadId(threadId);
    setMessagesError("");
    setEditingMessageId(null);
    setComposer("");
    setShowMessageSearch(false);
    setMessageSearch("");
    setMessageFilter("all");
  }

  // Handle sending a message
  async function handleSend(e) {
    e.preventDefault();
    if (!selectedThread || !composer.trim() || sending) return;
    const text = composer.trim();
    setSending(true);
    setMessagesError("");
    try {
      if (editingMessageId) {
        const updated = await messageService.editMessage(selectedThread.id, editingMessageId, text);
        setMessages((prev) => prev.map((m) => (m.id === editingMessageId ? updated : m)));
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== selectedThread.id) return t;
            const lastAt = updated.sentAt || updated.createdAt || new Date().toISOString();
            return { ...t, lastMessageSnippet: updated.body || text, lastMessageAt: lastAt };
          })
        );
        setEditingMessageId(null);
        setComposer("");
      } else {
        const newMsg = await messageService.sendMessage(selectedThread.id, text);
        setMessages((prev) => [...prev, newMsg]);
        setComposer("");
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedThread.id
              ? { ...t, lastMessageSnippet: text, lastMessageAt: newMsg.sentAt || newMsg.createdAt }
              : t
          )
        );
      }
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    } catch (e2) {
      const msg = e2?.response?.data?.message || e2?.message || "Unable to send message";
      setMessagesError(msg);
    } finally {
      setSending(false);
    }
  }

  // Start editing a message
  function startEdit(message) {
    if (!message || message.isDeleted) return;
    setEditingMessageId(message.id);
    setComposer(message.body || "");
    setMessagesError("");
    textareaRef.current?.focus();
  }

  // Open delete confirmation
  function openDeleteConfirm(message) {
    if (!message) return;
    setDeleteTarget(message);
    setDeleteError("");
    setDeleteConfirmOpen(true);
  }

  // Close delete confirmation
  function closeDeleteConfirm() {
    if (deleteBusy) return;
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    setDeleteError("");
  }

  // Confirm delete
  async function handleDeleteConfirmed() {
    if (!selectedThread || !deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const deleted = await messageService.deleteMessage(selectedThread.id, deleteTarget.id);
      setMessages((prev) => prev.map((m) => (m.id === deleteTarget.id ? deleted : m)));
      if (editingMessageId === deleteTarget.id) {
        setEditingMessageId(null);
        setComposer("");
      }
      closeDeleteConfirm();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Unable to delete message";
      setDeleteError(msg);
    } finally {
      setDeleteBusy(false);
    }
  }

  // Filter threads
  const filteredThreads = useMemo(() => {
    const base = (() => {
      if (!search.trim()) return threads;
      const q = search.trim().toLowerCase();
      return threads.filter((t) => {
        const displayName = threadDisplayTitle(t, otherNameByThread).toLowerCase();
        const lastSnippet = (t.lastMessageSnippet || "").toLowerCase();
        const subject = (t.subject || t.title || "").toLowerCase();
        return displayName.includes(q) || lastSnippet.includes(q) || subject.includes(q);
      });
    })();

    const map = new Map();
    for (const t of base) {
      const key = getPatientKeyForThread(t);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, t);
        continue;
      }
      const prevAt = getThreadLastAt(existing);
      const currAt = getThreadLastAt(t);
      if (!prevAt && currAt) {
        map.set(key, t);
        continue;
      }
      if (prevAt && currAt && new Date(currAt).getTime() > new Date(prevAt).getTime())
        map.set(key, t);
    }

    return Array.from(map.values()).sort((a, b) => {
      const aAt = getThreadLastAt(a);
      const bAt = getThreadLastAt(b);
      if (!aAt && !bAt) return 0;
      if (!aAt) return 1;
      if (!bAt) return -1;
      return new Date(bAt).getTime() - new Date(aAt).getTime();
    });
  }, [threads, search, otherNameByThread]);

  // Process messages with date separators
  const processedMessages = useMemo(() => {
    const result = [];
    let lastDate = null;
    let lastSenderId = null;

    filteredMessages.forEach((m, index) => {
      const msgDate = m.sentAt || m.createdAt || m.timestamp || m.created_at;
      const currentSenderId = m.isMine ? "me" : "other";
      const nextMsg = filteredMessages[index + 1];
      const nextSenderId = nextMsg ? (nextMsg.isMine ? "me" : "other") : null;

      if (!areSameDay(lastDate, msgDate)) {
        result.push({
          type: "date-separator",
          date: formatMessageDate(msgDate),
          key: `date-${msgDate}`,
        });
      }

      const isFirstInGroup = currentSenderId !== lastSenderId || !areSameDay(lastDate, msgDate);
      const isLastInGroup =
        currentSenderId !== nextSenderId ||
        !areSameDay(msgDate, nextMsg?.sentAt || nextMsg?.createdAt);

      result.push({ type: "message", message: m, isFirstInGroup, isLastInGroup, key: m.id });
      lastDate = msgDate;
      lastSenderId = currentSenderId;
    });

    return result;
  }, [filteredMessages]);

  // Initial load
  useEffect(() => {
    loadThreads();
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    if (selectedThreadId) loadMessages(selectedThreadId);
  }, [selectedThreadId]);

  // Polling
  useEffect(() => {
    if (!selectedThreadId) return;
    let cancelled = false;
    async function tick() {
      try {
        const [threadsResult, messagesResult] = await Promise.all([
          messageService.listThreads({ includeParticipants: true }).catch(() => []),
          messageService.listMessages(selectedThreadId, { limit: 50 }).catch(() => []),
        ]);
        if (cancelled) return;
        const items = Array.isArray(threadsResult) ? threadsResult : threadsResult?.items || [];
        setThreads(items);
        enrichPatientNames(items).catch(() => {});
        const msgs = Array.isArray(messagesResult) ? messagesResult : messagesResult?.items || [];
        setMessages(msgs);
      } catch {}
    }
    const id = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedThreadId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !showMessageSearch)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, showMessageSearch]);

  // Open compose modal
  async function openCompose() {
    setComposeError("");
    setComposeOpen(true);
    setComposeBusy(true);
    try {
      const map = new Map();
      threads.forEach((t) => {
        const opt = toPatientOption(t);
        if (opt && !map.has(opt.userId)) map.set(opt.userId, opt);
      });
      const missing = threads.filter((t) => !toPatientOption(t));
      if (missing.length) {
        const details = await Promise.all(
          missing.map((t) => messageService.getThread(t.id).catch(() => null))
        );
        details.forEach((th) => {
          if (!th) return;
          const opt = toPatientOption(th);
          if (opt && !map.has(opt.userId)) map.set(opt.userId, opt);
        });
      }
      const arr = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      setComposePatients(arr);
      if (arr.length && !composePatientId) setComposePatientId(arr[0].userId);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Unable to load patient list";
      setComposeError(msg);
      setComposePatients([]);
    } finally {
      setComposeBusy(false);
    }
  }

  // Close compose modal
  function closeCompose() {
    if (composeBusy) return;
    setComposeOpen(false);
    setComposeError("");
    setComposeSubject("");
    setComposeBody("");
  }

  // Submit compose
  async function handleComposeSubmit(e) {
    e.preventDefault();
    if (!composePatientId || !composeSubject.trim() || !composeBody.trim()) return;
    setComposeBusy(true);
    setComposeError("");
    try {
      const targetPatientId = String(composePatientId);
      const existing = threads.find((t) => {
        if (!Array.isArray(t.participants)) return false;
        const pat = pickPatientParticipant(t);
        if (!pat) return false;
        const candidateIds = [pat.userId, pat.user?.id].filter(Boolean).map((v) => String(v));
        return candidateIds.includes(targetPatientId);
      });

      if (!existing) {
        setComposeError(
          "No existing conversation with this patient. Ask the patient to message you first."
        );
        setComposeBusy(false);
        return;
      }

      const text = composeBody.trim();
      const newMsg = await messageService.sendMessage(existing.id, text);
      setMessages((prev) => (existing.id === selectedThreadId ? [...prev, newMsg] : prev));
      setSelectedThreadId(existing.id);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === existing.id
            ? { ...t, lastMessageSnippet: text, lastMessageAt: newMsg.sentAt || newMsg.createdAt }
            : t
        )
      );
      await loadMessages(existing.id);
      closeCompose();
    } catch (e2) {
      const msg =
        e2?.response?.data?.message || e2?.message || "Unable to start or continue conversation";
      setComposeError(msg);
    } finally {
      setComposeBusy(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Inbox</h1>
          <p className="mt-1.5 text-sm text-slate-500">Secure messaging with your patients</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-sky-100 focus-within:border-sky-300 transition-all w-full md:w-auto">
            <FiSearch className="text-slate-400" />
            <input
              type="text"
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none flex-1 min-w-[180px]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <FiX className="text-sm" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={loadThreads}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <FiRefreshCw className={`text-sm ${threadsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCompose}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:from-sky-600 hover:to-cyan-600 transition-all"
          >
            <FiPlus className="text-lg" />
            New Message
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] gap-6 min-h-[600px]">
        {/* LEFT: Thread list */}
        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <FiMessageCircle className="text-white text-sm" />
                </div>
                <span className="font-bold text-slate-800">Conversations</span>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {filteredThreads.length}
              </span>
            </div>
          </div>

          {threadsLoading && (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-sky-500 border-t-transparent" />
                <p className="text-sm text-slate-500">Loading…</p>
              </div>
            </div>
          )}

          {!threadsLoading && threadsError && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-3">
                <FiAlertCircle className="text-2xl text-rose-500" />
              </div>
              <p className="font-semibold text-rose-700">Unable to load conversations</p>
              <p className="mt-1 text-sm text-rose-500 max-w-xs">{threadsError}</p>
              <button
                type="button"
                onClick={loadThreads}
                className="mt-4 inline-flex items-center rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {!threadsLoading && !threadsError && filteredThreads.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mb-4">
                <FiUser className="text-3xl text-slate-400" />
              </div>
              <p className="font-semibold text-slate-800">No conversations</p>
              <p className="mt-1 text-sm text-slate-500 max-w-xs">
                When patients send you messages, they will appear here.
              </p>
            </div>
          )}

          {!threadsLoading && !threadsError && filteredThreads.length > 0 && (
            <ul className="flex-1 overflow-y-auto">
              {filteredThreads.map((thread) => {
                const selected = thread.id === selectedThreadId;
                const unread = (thread.unreadCount || 0) > 0;
                const displayName = threadDisplayTitle(thread, otherNameByThread);
                const lastActivity = getThreadLastAt(thread);
                const isRecentlyActive =
                  lastActivity && Date.now() - new Date(lastActivity).getTime() < 5 * 60 * 1000;

                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectThread(thread.id)}
                      className={[
                        "w-full flex gap-3 px-4 py-4 text-left transition-all duration-200 relative",
                        selected
                          ? "bg-gradient-to-r from-emerald-50 via-teal-50/50 to-transparent"
                          : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {selected && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-r-full" />
                      )}
                      <Avatar
                        name={displayName}
                        size={48}
                        showStatus={true}
                        isOnline={isRecentlyActive}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={[
                              "text-[15px] truncate",
                              unread ? "font-bold text-slate-900" : "font-semibold text-slate-700",
                            ].join(" ")}
                          >
                            {displayName}
                          </p>
                          <span
                            className={[
                              "text-[11px] whitespace-nowrap font-medium",
                              unread ? "text-emerald-600" : "text-slate-400",
                            ].join(" ")}
                          >
                            {formatTimeOrDate(thread.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p
                            className={[
                              "text-[13px] truncate flex-1",
                              unread ? "text-slate-700 font-medium" : "text-slate-500",
                            ].join(" ")}
                          >
                            {thread.lastMessageSnippet || "No messages yet"}
                          </p>
                          {unread && (
                            <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                              {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">Patient</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* RIGHT: Conversation */}
        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
          {!selectedThread && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6 bg-gradient-to-b from-slate-50 to-white">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-5">
                <FiMail className="text-4xl text-slate-400" />
              </div>
              <p className="text-xl font-semibold text-slate-800">No conversation selected</p>
              <p className="mt-2 text-sm text-slate-500 max-w-xs">
                Choose a thread on the left to view and reply to messages.
              </p>
            </div>
          )}

          {selectedThread && (
            <>
              {/* Conversation header */}
              <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                  <Avatar name={currentPatientName} size={48} showStatus={false} />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{currentPatientName}</p>
                    <p className="text-xs text-slate-500">Patient</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMessageFilter(messageFilter === "all" ? "starred" : "all")}
                    className={[
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      messageFilter === "starred"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    <FiStar className={messageFilter === "starred" ? "fill-current" : ""} />
                    {messageFilter === "starred" ? "Starred" : "All"}
                  </button>

                  <button
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    className={[
                      "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                      showMessageSearch
                        ? "bg-sky-100 text-sky-600"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    <FiSearch className="text-sm" />
                  </button>

                  {editingMessageId && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700 font-medium flex items-center gap-2">
                      <FiEdit className="text-sm" />
                      Editing
                      <button
                        type="button"
                        className="text-amber-600 hover:text-amber-800 underline ml-1"
                        onClick={() => {
                          setEditingMessageId(null);
                          setComposer("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </header>

              {/* Message search bar */}
              {showMessageSearch && (
                <MessageSearchBar
                  value={messageSearch}
                  onChange={(v) => {
                    setMessageSearch(v);
                    setCurrentSearchIndex(0);
                  }}
                  onClose={() => {
                    setShowMessageSearch(false);
                    setMessageSearch("");
                  }}
                  resultCount={searchResults.length}
                  currentResult={searchResults.length > 0 ? currentSearchIndex + 1 : 0}
                  onPrev={() =>
                    setCurrentSearchIndex((i) => (i > 0 ? i - 1 : searchResults.length - 1))
                  }
                  onNext={() =>
                    setCurrentSearchIndex((i) => (i < searchResults.length - 1 ? i + 1 : 0))
                  }
                />
              )}

              {/* Messages area */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgb(226 232 240 / 0.4) 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                  minHeight: "300px",
                  maxHeight: "400px",
                }}
              >
                {messagesLoading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-sky-500 border-t-transparent" />
                      <p className="text-sm text-slate-500">Loading conversation…</p>
                    </div>
                  </div>
                )}

                {!messagesLoading && messagesError && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-3">
                      <FiAlertCircle className="text-2xl text-rose-500" />
                    </div>
                    <p className="font-semibold text-rose-700">Unable to load messages</p>
                    <p className="mt-1 text-sm text-rose-500 max-w-xs">{messagesError}</p>
                    <button
                      type="button"
                      onClick={() => loadMessages(selectedThread.id)}
                      className="mt-4 inline-flex items-center rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!messagesLoading && !messagesError && filteredMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    {messageFilter === "starred" ? (
                      <>
                        <FiStar className="text-4xl text-slate-300 mb-3" />
                        <p className="text-sm text-slate-500">No starred messages</p>
                        <button
                          onClick={() => setMessageFilter("all")}
                          className="mt-2 text-sm text-sky-600 hover:text-sky-700"
                        >
                          Show all messages
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-800">No messages yet</p>
                        <p className="mt-1 text-sm text-slate-500 max-w-xs">
                          Send the first message to start a conversation.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {!messagesLoading &&
                  !messagesError &&
                  processedMessages.map((item) => {
                    if (item.type === "date-separator")
                      return <DateSeparator key={item.key} date={item.date} />;
                    const msg = item.message;
                    const mine = Boolean(msg.isMine);
                    const at = msg.sentAt || msg.createdAt || msg.timestamp || msg.created_at;
                    const senderName = mine ? null : msg.senderName || currentPatientName;
                    const isHighlighted = searchResults.includes(msg.id);

                    return (
                      <MessageBubble
                        key={item.key}
                        mine={mine}
                        text={msg.body}
                        at={at}
                        isDeleted={msg.isDeleted}
                        editedAt={msg.editedAt}
                        senderName={senderName}
                        isFirstInGroup={item.isFirstInGroup}
                        isLastInGroup={item.isLastInGroup}
                        isStarred={starredMessages.has(msg.id)}
                        onToggleStar={() => toggleStar(msg.id)}
                        status={msg.readAt ? "read" : msg.deliveredAt ? "delivered" : "sent"}
                        searchHighlight={isHighlighted ? messageSearch : ""}
                        onEdit={mine && !msg.isDeleted ? () => startEdit(msg) : undefined}
                        onDelete={mine && !msg.isDeleted ? () => openDeleteConfirm(msg) : undefined}
                      />
                    );
                  })}
              </div>

              {/* Composer */}
              <form onSubmit={handleSend} className="border-t border-slate-100 bg-white px-4 sm:px-6 py-4">
                {/* Quick Replies */}
                <QuickReplies
                  isVisible={showQuickReplies}
                  onToggle={() => setShowQuickReplies(false)}
                  onSelect={(text) => {
                    setComposer(text);
                    setShowQuickReplies(false);
                    textareaRef.current?.focus();
                  }}
                />

                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    {showEmojiPicker && (
                      <EmojiPicker
                        onSelect={(emoji) => setComposer((prev) => prev + emoji)}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={[
                          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                          showEmojiPicker
                            ? "bg-sky-100 text-sky-600"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                        ].join(" ")}
                        title="Add emoji"
                      >
                        <FiSmile className="text-lg" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        className={[
                          "h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors",
                          showQuickReplies
                            ? "bg-sky-100 text-sky-600"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                        ].join(" ")}
                      >
                        <FiMessageCircle className="text-sm" />
                        Quick Replies
                      </button>
                    </div>

                    <textarea
                      ref={textareaRef}
                      rows={1}
                      className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-[15px] text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-slate-50 transition-all resize-none min-h-[48px] max-h-32 border border-transparent focus:border-sky-200"
                      placeholder={
                        editingMessageId ? "Edit your message…" : "Type your reply to the patient…"
                      }
                      value={composer}
                      onChange={(e) => {
                        setComposer(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
                        setMessagesError("");
                      }}
                      style={{ height: "48px" }}
                      onInput={(e) => {
                        e.target.style.height = "48px";
                        e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                        if (e.key === "Escape" && editingMessageId) {
                          e.preventDefault();
                          setEditingMessageId(null);
                          setComposer("");
                        }
                      }}
                    />

                    <div className="flex items-center justify-between mt-1.5 px-1">
                      <p className="text-[10px] text-slate-400">
                        Press{" "}
                        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-medium">
                          Enter
                        </kbd>{" "}
                        to send
                      </p>
                      <span className={["text-[10px] font-medium", charCountColor].join(" ")}>
                        {charCount}/{MAX_MESSAGE_LENGTH}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      sending || !composer.trim() || messagesLoading || charCount > MAX_MESSAGE_LENGTH
                    }
                    className={[
                      "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-200 flex-shrink-0 mb-6",
                      composer.trim() && !sending && charCount <= MAX_MESSAGE_LENGTH
                        ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/30 hover:shadow-xl active:scale-95"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {sending ? (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
                    ) : (
                      <FiSend
                        className={[
                          "text-lg transition-transform",
                          composer.trim() ? "-rotate-45" : "",
                        ].join(" ")}
                      />
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      {/* Compose Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">New Message</h2>
                <p className="text-sm text-slate-500 mt-0.5">Start a conversation with a patient</p>
              </div>
              <button
                type="button"
                onClick={closeCompose}
                disabled={composeBusy}
                className="h-10 w-10 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
              >
                <FiX className="text-slate-500" />
              </button>
            </div>

            {composeError && (
              <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {composeError}
              </div>
            )}

            <form onSubmit={handleComposeSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">To</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:bg-white transition-all"
                  value={composePatientId}
                  onChange={(e) => setComposePatientId(e.target.value)}
                  disabled={composeBusy || composePatients.length === 0}
                >
                  {composePatients.length === 0 ? (
                    <option value="">No patients available from existing conversations</option>
                  ) : (
                    <>
                      <option value="">Select a patient…</option>
                      {composePatients.map((p) => (
                        <option key={p.userId} value={p.userId}>
                          {p.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:bg-white transition-all"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Follow up, lab results, instructions…"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:bg-white transition-all resize-none"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Type your message to the patient…"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCompose}
                  disabled={composeBusy}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    composeBusy || !composePatientId || !composeSubject.trim() || !composeBody.trim()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:from-sky-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {composeBusy ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <FiSend className="text-sm" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <FiTrash2 className="text-2xl text-rose-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">Delete Message</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    This message will be marked as deleted. Patients will no longer see the original
                    content.
                  </p>
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 line-clamp-3">
                    {deleteTarget.body || "No content"}
                  </div>
                  {deleteError && <p className="mt-2 text-sm text-rose-600">{deleteError}</p>}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  disabled={deleteBusy}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirmed}
                  disabled={deleteBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600 disabled:opacity-50 transition-all"
                >
                  {deleteBusy ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="text-sm" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}