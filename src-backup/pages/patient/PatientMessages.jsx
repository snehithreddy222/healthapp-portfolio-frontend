// src/pages/patient/PatientMessages.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FiEdit,
  FiSearch,
  FiChevronRight,
  FiSend,
  FiTrash2,
  FiX,
  FiCheckCircle,
  FiMessageCircle,
  FiPlus,
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

/* ---------- helpers ---------- */

function pickOtherParticipant(metaOrThread) {
  if (!metaOrThread) return null;
  const parts = metaOrThread.participants || [];
  if (!parts.length) return null;
  const doctor = parts.find((p) => p.role === "DOCTOR");
  if (doctor) return doctor;
  const meId = metaOrThread.me || metaOrThread.myUserId || metaOrThread.currentUserId;
  if (meId) return parts.find((p) => p.userId !== meId) || parts[0];
  return parts[0];
}

function formatParticipantName(p) {
  if (!p) return null;
  const doc = p.doctor || p.user?.doctor || null;
  const first = doc?.firstName?.trim();
  const last = doc?.lastName?.trim();
  if (first || last) return `Dr. ${[first, last].filter(Boolean).join(" ")}`.trim();
  if (p.user?.displayName) return p.user.displayName;
  if (p.user?.username) return p.user.username;
  return null;
}

function formatParticipantRole(p) {
  if (!p) return "";
  if (p.role === "DOCTOR") {
    const spec = p.doctor?.specialization || p.user?.doctor?.specialization;
    return spec ? spec : "Doctor";
  }
  return p.role || "";
}

function isMine(message, authUserId) {
  if (!message) return false;
  if (typeof message.isMine === "boolean") return message.isMine;
  if (authUserId) {
    if (message.senderUserId && message.senderUserId === authUserId) return true;
    if (message.sender?.id && message.sender.id === authUserId) return true;
  }
  if (message.sender?.role === "PATIENT") return true;
  return false;
}

function getThreadLastAt(t) {
  return t.lastMessageAt || t.lastActivity || t.updatedAt || (t.lastMessage && (t.lastMessage.createdAt || t.lastMessage.sentAt)) || null;
}

function getDoctorKeyForThread(t) {
  if (Array.isArray(t.participants) && t.participants.length) {
    const doctorPart = t.participants.find((p) => p.role === "DOCTOR") || t.participants.find((p) => p.doctor || p.user?.doctor);
    if (doctorPart) {
      const doc = doctorPart.doctor || doctorPart.user?.doctor || null;
      const userId = doctorPart.userId || doc?.userId || doctorPart.user?.id || null;
      if (userId) return `user:${userId}`;
      const name = formatParticipantName(doctorPart);
      if (name) return `name:${name}`;
    }
  }
  if (t.counterpartName) return `name:${t.counterpartName}`;
  if (t.subject || t.title) return `subj:${t.subject || t.title}`;
  return `id:${t.id}`;
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

/* ---------- Emoji Data ---------- */
const EMOJI_CATEGORIES = {
  recent: { icon: "🕐", label: "Recent", emojis: ["👍", "❤️", "😊", "🙏", "👏", "✅", "🎉", "💪"] },
  smileys: { icon: "😀", label: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😋", "😎", "🤗", "🤔", "😐", "😴", "🤒", "😷", "🤕"] },
  gestures: { icon: "👋", label: "Gestures", emojis: ["👋", "🤚", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🙏"] },
  healthcare: { icon: "🏥", label: "Healthcare", emojis: ["💊", "💉", "🩺", "🩹", "🏥", "🚑", "⚕️", "🩻", "🧬", "🔬", "🩸", "❤️‍🩹", "🫀", "🫁", "🧠", "🦷", "👁️", "👂", "🦴", "💪", "🏃", "🧘", "🥗", "💧"] },
  symbols: { icon: "✅", label: "Symbols", emojis: ["✅", "❌", "⭐", "💫", "❗", "❓", "💯", "🔔", "📌", "📎", "📅", "⏰", "✨", "🎯", "💡", "📝", "📋", "📊", "🔒", "🔑", "💚", "💙", "💜", "🧡"] },
};

/* ---------- Quick Reply Templates ---------- */
const QUICK_REPLIES = [
  { id: 1, text: "Thank you, Doctor!", icon: "🙏" },
  { id: 2, text: "I understand, thanks for explaining.", icon: "👍" },
  { id: 3, text: "When should I schedule a follow-up?", icon: "📅" },
  { id: 4, text: "I have a question about my medication.", icon: "💊" },
  { id: 5, text: "The symptoms have improved.", icon: "💪" },
  { id: 6, text: "I'm still experiencing issues.", icon: "😟" },
];

/* ---------- UI Components ---------- */

function Avatar({ name = "", size = 40, showStatus = false, isOnline = false }) {
  const initial = name?.charAt(0)?.toUpperCase() || "U";
  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-full bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400 text-white grid place-items-center font-bold shadow-lg"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        title={name}
      >
        {initial}
      </div>
      {showStatus && (
        <span className={["absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm", isOnline ? "bg-emerald-500" : "bg-slate-300"].join(" ")} />
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

function InboxItem({ active, title, preview, when, unread, onClick, lastActivity }) {
  const isRecentlyActive = lastActivity && (Date.now() - new Date(lastActivity).getTime()) < 5 * 60 * 1000;
  return (
    <button
      onClick={onClick}
      className={["w-full text-left px-4 py-4 transition-all duration-200 relative", active ? "bg-gradient-to-r from-sky-50 via-cyan-50/50 to-transparent" : "bg-white hover:bg-slate-50/80"].join(" ")}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-sky-500 to-cyan-500 rounded-r-full" />}
      <div className="flex items-center gap-3">
        <Avatar name={title || "T"} size={48} showStatus={true} isOnline={isRecentlyActive} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={["text-[15px] truncate", unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"].join(" ")}>{title || "Conversation"}</p>
            <span className={["text-[11px] font-medium flex-shrink-0", unread ? "text-sky-600" : "text-slate-400"].join(" ")}>{when}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className={["text-[13px] truncate flex-1", unread ? "text-slate-700 font-medium" : "text-slate-500"].join(" ")}>{preview || "No messages yet"}</p>
            {unread > 0 && (
              <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ---------- Emoji Picker Component ---------- */
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
    <div ref={pickerRef} className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-[320px] sm:w-[360px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Category tabs */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
        {Object.entries(EMOJI_CATEGORIES).map(([key, { icon, label }]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={["px-3 py-1.5 rounded-lg text-lg transition-all flex-shrink-0", activeCategory === key ? "bg-white shadow-sm scale-110" : "hover:bg-white/50"].join(" ")}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>
      
      {/* Emoji grid */}
      <div className="p-3 max-h-[200px] overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{EMOJI_CATEGORIES[activeCategory].label}</p>
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => { onSelect(emoji); onClose(); }}
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

/* ---------- Quick Replies Component ---------- */
function QuickReplies({ onSelect, isVisible, onToggle }) {
  if (!isVisible) return null;
  
  return (
    <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quick Replies</span>
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

/* ---------- Message Status Component ---------- */
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
    <span className={["text-[10px] flex items-center gap-1 flex-shrink-0", config.color].join(" ")} title={config.label}>
      {time}
      <Icon className="text-[10px]" />
      {status === "read" && <Icon className="text-[10px] -ml-1.5" />}
    </span>
  );
}

/* ---------- Message Bubble Component ---------- */
function MessageBubble({
  mine,
  text,
  at,
  isDeleted,
  editedAt,
  isEditing,
  onEdit,
  onDelete,
  isFirstInGroup,
  isLastInGroup,
  senderName,
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

  // Highlight search matches
  const highlightText = (content) => {
    if (!searchHighlight || !content) return content;
    const regex = new RegExp(`(${searchHighlight})`, "gi");
    const parts = content.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 text-slate-900 rounded px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className={["flex w-full group", mine ? "justify-end" : "justify-start", isFirstInGroup ? "mt-3" : "mt-[3px]"].join(" ")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={["flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]", mine ? "flex-row-reverse" : "flex-row"].join(" ")}>
        {/* Starred indicator */}
        {isStarred && (
          <FiStar className={["text-amber-400 fill-amber-400 text-xs flex-shrink-0", mine ? "mr-1" : "ml-1"].join(" ")} />
        )}
        
        {/* Message bubble */}
        <div
          className={[
            "relative px-3 py-2 shadow-sm",
            mine ? "bg-gradient-to-br from-sky-500 via-sky-500 to-cyan-500 text-white" : "bg-white text-slate-800 border border-slate-100 shadow-md shadow-slate-100/50",
            isEditing ? "ring-2 ring-sky-400 ring-offset-2" : "",
            searchHighlight ? "ring-2 ring-yellow-400" : "",
            "transition-all duration-150",
          ].join(" ")}
          style={{ borderRadius: getBorderRadius(), maxWidth: "100%" }}
        >
          {!mine && senderName && isFirstInGroup && (
            <p className="text-[11px] font-semibold text-sky-600 mb-1">{senderName}</p>
          )}

          {isDeleted ? (
            <p className={["text-[14px] italic flex items-center gap-1.5 whitespace-nowrap", mine ? "text-white/70" : "text-slate-400"].join(" ")}>
              <FiTrash2 className="text-[12px] flex-shrink-0" />
              This message was deleted
            </p>
          ) : isShortMessage ? (
            <div className="flex items-end gap-2" style={{ whiteSpace: "nowrap" }}>
              <span className="text-[15px] leading-relaxed">{highlightText(text)}</span>
              {mine ? (
                <MessageStatus status={status} time={isEdited ? `edited · ${displayTime}` : displayTime} />
              ) : (
                <span className="text-[10px] text-slate-400 flex-shrink-0 pb-0.5">{displayTime}</span>
              )}
            </div>
          ) : (
            <div style={{ maxWidth: "320px" }}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{highlightText(text)}</p>
              <div className={["flex items-center gap-1.5 mt-1", mine ? "justify-end" : "justify-start"].join(" ")}>
                {mine ? (
                  <MessageStatus status={status} time={isEdited ? `edited · ${displayTime}` : displayTime} />
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
          <div className={["flex-shrink-0 transition-all duration-150 relative", showActions ? "opacity-100 scale-100" : "opacity-0 scale-90"].join(" ")}>
            <div className="flex items-center gap-1">
              {/* Star button */}
              <button
                type="button"
                onClick={onToggleStar}
                className={["h-7 w-7 rounded-full flex items-center justify-center transition-colors", isStarred ? "bg-amber-100 text-amber-500" : "bg-slate-100 hover:bg-slate-200 text-slate-500"].join(" ")}
                title={isStarred ? "Unstar" : "Star"}
              >
                <FiStar className={["text-sm", isStarred ? "fill-current" : ""].join(" ")} />
              </button>
              
              {/* More actions */}
              {mine && (onEdit || onDelete) && (
                <div className="relative group/actions">
                  <button type="button" className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                    <FiMoreVertical className="text-sm" />
                  </button>
                  <div className="absolute bottom-full right-0 mb-1 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[100px] z-10 hidden group-hover/actions:block">
                    {onEdit && (
                      <button onClick={onEdit} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <FiEdit className="text-xs" />
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={onDelete} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
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

/* ---------- Message Search Bar ---------- */
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
          <span className="text-xs text-slate-500">{currentResult} of {resultCount}</span>
          <button onClick={onPrev} className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600">
            <FiChevronDown className="text-sm rotate-180" />
          </button>
          <button onClick={onNext} className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600">
            <FiChevronDown className="text-sm" />
          </button>
        </div>
      )}
      {value && resultCount === 0 && (
        <span className="text-xs text-slate-400">No results</span>
      )}
      <button onClick={onClose} className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-500">
        <FiX className="text-sm" />
      </button>
    </div>
  );
}

/* ---------- page ---------- */

const POLL_MS = 50000;
const MAX_MESSAGE_LENGTH = 1000;

export default function PatientMessages() {
  const { user } = useAuth();
  const authUserId = user?.id;

  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState([]);
  const [threadsCursor, setThreadsCursor] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);

  const [activeId, setActiveId] = useState(null);
  const [activeMeta, setActiveMeta] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [msgsCursor, setMsgsCursor] = useState(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [sendText, setSendText] = useState("");
  const sendingRef = useRef(false);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [starredMessages, setStarredMessages] = useState(new Set());

  const [deleteDialog, setDeleteDialog] = useState({ open: false, messageId: null });
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDoctors, setComposeDoctors] = useState([]);
  const [composeDoctorId, setComposeDoctorId] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeBusy, setComposeBusy] = useState(false);

  const [otherNameByThread, setOtherNameByThread] = useState({});

  // New feature states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageFilter, setMessageFilter] = useState("all"); // all, starred

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Search results
  const searchResults = useMemo(() => {
    if (!messageSearch.trim()) return [];
    const term = messageSearch.toLowerCase();
    return msgs.filter((m) => m.body?.toLowerCase().includes(term)).map((m) => m.id);
  }, [msgs, messageSearch]);

  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Toggle star on message
  const toggleStar = useCallback((messageId) => {
    setStarredMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (messageFilter === "starred") {
      return msgs.filter((m) => starredMessages.has(m.id));
    }
    return msgs;
  }, [msgs, messageFilter, starredMessages]);

  // Initial threads and unread
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingThreads(true);
        const [threadsResult, unread] = await Promise.all([
          messageService.listThreads({ includeParticipants: true }).catch(() => []),
          messageService.getUnreadCount().catch(() => 0),
        ]);
        if (!mounted) return;

        const items = Array.isArray(threadsResult) ? threadsResult : threadsResult?.items || threadsResult?.threads || [];
        const nextCursor = Array.isArray(threadsResult) ? null : threadsResult?.nextCursor ?? null;

        setThreads(items);
        setThreadsCursor(nextCursor);
        setUnreadCount(unread);
        if (items.length && !activeId) setActiveId(items[0].id);

        if (!items.length) return;

        const needs = items.filter((t) => !(t.participants && t.participants.length)).slice(0, 12);

        if (needs.length) {
          const details = await Promise.all(needs.map((t) => messageService.getThread(t.id).catch(() => null)));
          const map = {};
          details.forEach((th) => {
            if (!th) return;
            const other = pickOtherParticipant(th);
            const name = formatParticipantName(other);
            if (name) map[th.id] = name;
          });
          if (Object.keys(map).length && mounted) {
            setOtherNameByThread((prev) => ({ ...prev, ...map }));
          }
        } else {
          const map = {};
          items.forEach((t) => {
            const other = pickOtherParticipant(t);
            const name = formatParticipantName(other);
            if (name) map[t.id] = name;
          });
          if (Object.keys(map).length && mounted) {
            setOtherNameByThread((prev) => ({ ...prev, ...map }));
          }
        }
      } finally {
        if (mounted) setLoadingThreads(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingMsgs(true);
        const thread = await messageService.getThread(activeId, { limit: 50 });
        if (!mounted) return;
        setActiveMeta(thread);
        setMsgs(thread?.messages || []);
        setMsgsCursor(null);

        const other = pickOtherParticipant(thread);
        const name = formatParticipantName(other);
        if (name) {
          setOtherNameByThread((prev) => (prev[thread.id] ? prev : { ...prev, [thread.id]: name }));
        }

        messageService.markRead(activeId).finally(async () => {
          const n = await messageService.getUnreadCount().catch(() => null);
          if (n !== null && mounted) setUnreadCount(n);
        });
      } finally {
        if (mounted) setLoadingMsgs(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    async function tick() {
      try {
        const [threadsResult, messages, unread] = await Promise.all([
          messageService.listThreads({ limit: 20 }).catch(() => []),
          messageService.listMessages(activeId, { limit: 50 }).catch(() => []),
          messageService.getUnreadCount().catch(() => 0),
        ]);
        if (cancelled) return;
        const items = Array.isArray(threadsResult) ? threadsResult : threadsResult?.items || [];
        setThreads(items);
        setMsgs(Array.isArray(messages) ? messages : []);
        setUnreadCount(unread);
      } catch {}
    }

    const id = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, POLL_MS);

    return () => { cancelled = true; clearInterval(id); };
  }, [activeId]);

  useEffect(() => {
    if (messagesEndRef.current && !showMessageSearch) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [msgs, activeId, showMessageSearch]);

  const filteredThreads = useMemo(() => {
    const base = (() => {
      if (!query.trim()) return threads;
      const q = query.toLowerCase();
      return threads.filter((t) => {
        const subject = (t.subject || t.title || "").toLowerCase();
        const preview = (t.lastMessage?.body || t.lastMessageSnippet || "").toLowerCase();
        const otherName = (otherNameByThread[t.id] || "").toLowerCase();
        return subject.includes(q) || preview.includes(q) || otherName.includes(q);
      });
    })();

    const map = new Map();
    for (const t of base) {
      const key = getDoctorKeyForThread(t);
      const existing = map.get(key);
      if (!existing) { map.set(key, t); continue; }
      const prevAt = getThreadLastAt(existing);
      const currAt = getThreadLastAt(t);
      if (!prevAt && currAt) { map.set(key, t); continue; }
      if (prevAt && currAt && new Date(currAt).getTime() > new Date(prevAt).getTime()) {
        map.set(key, t);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aAt = getThreadLastAt(a);
      const bAt = getThreadLastAt(b);
      if (!aAt && !bAt) return 0;
      if (!aAt) return 1;
      if (!bAt) return -1;
      return new Date(bAt).getTime() - new Date(aAt).getTime();
    });
  }, [threads, query, otherNameByThread]);

  const active = useMemo(() => (Array.isArray(filteredThreads) ? filteredThreads.find((t) => t.id === activeId) || filteredThreads[0] || null : null), [filteredThreads, activeId]);

  function threadDisplayTitle(t) {
    const cached = otherNameByThread[t.id];
    if (cached) return cached;
    if (t.participants?.length) {
      const other = pickOtherParticipant(t);
      const name = formatParticipantName(other);
      if (name) return name;
    }
    return t.subject || t.title || "Conversation";
  }

  const loadOlder = async () => {
    if (!activeId || sendingRef.current) return;
    const res = await messageService.listMessages(activeId, { cursor: msgsCursor || undefined, limit: 20 });
    const items = Array.isArray(res) ? res : res.items || [];
    const nextCursor = Array.isArray(res) ? null : res.nextCursor ?? null;
    if (items.length) setMsgs((prev) => [...items, ...prev]);
    setMsgsCursor(nextCursor);
  };

  const startEdit = (message) => {
    if (!message || message.isDeleted) return;
    setEditingMessageId(message.id);
    setSendText(message.body || "");
    textareaRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setSendText("");
  };

  const openDeleteDialog = (message) => {
    if (!message) return;
    setDeleteDialog({ open: true, messageId: message.id });
  };

  const closeDeleteDialog = () => {
    if (deleteBusy) return;
    setDeleteDialog({ open: false, messageId: null });
  };

  const confirmDelete = async () => {
    if (!activeId || !deleteDialog.messageId) return;
    setDeleteBusy(true);
    try {
      const deleted = await messageService.deleteMessage(activeId, deleteDialog.messageId);
      if (deleted) {
        setMsgs((prev) => prev.map((m) => (m.id === deleteDialog.messageId ? deleted : m)));
      } else {
        setMsgs((prev) => prev.map((m) => (m.id === deleteDialog.messageId ? { ...m, isDeleted: true, body: "" } : m)));
      }
      closeDeleteDialog();
    } catch {
      alert("Unable to delete this message right now. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    const text = sendText.trim();
    if (!text || !activeId || sendingRef.current) return;
    sendingRef.current = true;
    try {
      if (editingMessageId) {
        const original = msgs.find((m) => m.id === editingMessageId);
        if (original && (original.body || "") === text) {
          setEditingMessageId(null);
          setSendText("");
        } else {
          const updated = await messageService.editMessage(activeId, editingMessageId, text);
          setMsgs((prev) => prev.map((m) => (m.id === editingMessageId ? updated : m)));
          setEditingMessageId(null);
          setSendText("");
        }
      } else {
        const created = await messageService.postMessage(activeId, text);
        setSendText("");
        if (created) setMsgs((prev) => [...prev, created]);
      }

      const threadsResult = await messageService.listThreads({ limit: 20 });
      const items = Array.isArray(threadsResult) ? threadsResult : threadsResult?.items || [];
      const nextCursor = Array.isArray(threadsResult) ? null : threadsResult?.nextCursor ?? null;
      setThreads(items);
      setThreadsCursor(nextCursor);
    } finally {
      sendingRef.current = false;
    }
  };

  const openCompose = async () => {
    setComposeOpen(true);
    try {
      const doctors = await messageService.listDoctors();
      setComposeDoctors(doctors || []);
    } catch {
      setComposeDoctors([]);
    }
  };

  const submitCompose = async (e) => {
    e.preventDefault();
    const doctorId = composeDoctorId;
    const subject = composeSubject.trim();
    const body = composeBody.trim();
    if (!doctorId || !subject || !body) return;

    setComposeBusy(true);
    try {
      const threadsResult = await messageService.listThreads({ includeParticipants: true }).catch(() => []);
      const items = Array.isArray(threadsResult) ? threadsResult : threadsResult?.items || threadsResult?.threads || [];

      const existing = items.find((t) => {
        if (!Array.isArray(t.participants)) return false;
        return t.participants.some((p) => {
          if (p.role !== "DOCTOR") return false;
          const doc = p.doctor || p.user?.doctor || null;
          const candidateIds = [p.userId, doc?.userId, doc?.id].filter(Boolean);
          return candidateIds.includes(doctorId);
        });
      });

      let thread = null;

      if (existing) {
        const created = await messageService.postMessage(existing.id, body);
        thread = existing;
        if (activeId === existing.id && created) setMsgs((prev) => [...prev, created]);
        const refreshed = await messageService.listThreads({ limit: 20 }).catch(() => items);
        const refreshedItems = Array.isArray(refreshed) ? refreshed : refreshed?.items || refreshed?.threads || items;
        setThreads(refreshedItems);
        setThreadsCursor(Array.isArray(refreshed) ? null : refreshed?.nextCursor ?? null);
      } else {
        thread = await messageService.createThread({ doctorUserId: doctorId, subject, body });
        const refreshed = await messageService.listThreads({ limit: 20 }).catch(() => items);
        const refreshedItems = Array.isArray(refreshed) ? refreshed : refreshed?.items || refreshed?.threads || items;
        setThreads(refreshedItems);
        setThreadsCursor(Array.isArray(refreshed) ? null : refreshed?.nextCursor ?? null);
      }

      if (thread?.id) setActiveId(thread.id);
      setComposeDoctorId("");
      setComposeSubject("");
      setComposeBody("");
      setComposeOpen(false);
    } finally {
      setComposeBusy(false);
    }
  };

  const other = useMemo(() => pickOtherParticipant(activeMeta), [activeMeta]);
  const otherName = useMemo(() => formatParticipantName(other), [other]);
  const otherRole = useMemo(() => formatParticipantRole(other), [other]);

  const processedMessages = useMemo(() => {
    const result = [];
    let lastDate = null;
    let lastSenderId = null;

    filteredMessages.forEach((m, index) => {
      const msgDate = m.sentAt || m.createdAt || m.timestamp || m.created_at;
      const currentSenderId = m.senderUserId || m.sender?.id || (isMine(m, authUserId) ? "me" : "other");
      const nextMsg = filteredMessages[index + 1];
      const nextSenderId = nextMsg ? nextMsg.senderUserId || nextMsg.sender?.id || (isMine(nextMsg, authUserId) ? "me" : "other") : null;

      if (!areSameDay(lastDate, msgDate)) {
        result.push({ type: "date-separator", date: formatMessageDate(msgDate), key: `date-${msgDate}` });
      }

      const isFirstInGroup = currentSenderId !== lastSenderId || !areSameDay(lastDate, msgDate);
      const isLastInGroup = currentSenderId !== nextSenderId || !areSameDay(msgDate, nextMsg?.sentAt || nextMsg?.createdAt);

      result.push({ type: "message", message: m, isFirstInGroup, isLastInGroup, key: m.id });

      lastDate = msgDate;
      lastSenderId = currentSenderId;
    });

    return result;
  }, [filteredMessages, authUserId]);

  // Character count
  const charCount = sendText.length;
  const charCountColor = charCount > MAX_MESSAGE_LENGTH * 0.9 ? "text-red-500" : charCount > MAX_MESSAGE_LENGTH * 0.7 ? "text-amber-500" : "text-slate-400";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Messages</h1>
          {unreadCount > 0 ? (
            <p className="mt-1.5 text-sm text-sky-600 font-medium flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              {unreadCount} unread message{unreadCount === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-slate-500">Securely message your care team</p>
          )}
        </div>

        <button
          type="button"
          onClick={openCompose}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 hover:from-sky-600 hover:to-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 transition-all duration-200 active:scale-[0.98]"
        >
          <FiPlus className="text-lg" />
          New Message
        </button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT: Inbox */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px] max-h-[700px]">
            {/* Inbox header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
                    <FiMessageCircle className="text-white text-sm" />
                  </div>
                  <span className="font-bold text-slate-800">Inbox</span>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{filteredThreads.length}</span>
              </div>

              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all border border-transparent focus:border-sky-200"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <FiX className="text-sm" />
                  </button>
                )}
              </div>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {loadingThreads && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-10 w-10 rounded-full border-[3px] border-sky-500 border-t-transparent animate-spin" />
                  <p className="mt-4 text-sm text-slate-500">Loading…</p>
                </div>
              )}

              {!loadingThreads && filteredThreads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center mb-4">
                    <FiMessageCircle className="text-3xl text-sky-400" />
                  </div>
                  <p className="font-semibold text-slate-800">No messages</p>
                  <p className="mt-1 text-sm text-slate-500">Start a conversation with your care team</p>
                </div>
              )}

              {!loadingThreads &&
                filteredThreads.map((t) => {
                  const preview = t.lastMessageSnippet || t.lastMessage?.body || "";
                  const whenSource = getThreadLastAt(t) || t.createdAt || null;
                  const when = whenSource ? format(new Date(whenSource), "MMM d") : "";

                  return (
                    <InboxItem
                      key={t.id}
                      active={t.id === activeId}
                      title={threadDisplayTitle(t)}
                      preview={preview}
                      when={when}
                      unread={t.unreadCount || 0}
                      lastActivity={whenSource}
                      onClick={() => {
                        setActiveId(t.id);
                        setEditingMessageId(null);
                        setSendText("");
                        setShowMessageSearch(false);
                        setMessageSearch("");
                        setMessageFilter("all");
                      }}
                    />
                  );
                })}

              {threadsCursor && (
                <button
                  className="w-full py-4 text-sm text-sky-600 hover:text-sky-700 font-medium hover:bg-sky-50 transition-colors"
                  onClick={async () => {
                    const res = await messageService.listThreads({ cursor: threadsCursor, limit: 20 });
                    const items = Array.isArray(res) ? res : res.items || [];
                    const nextCursor = Array.isArray(res) ? null : res.nextCursor ?? null;
                    setThreads((prev) => [...prev, ...items]);
                    setThreadsCursor(nextCursor);
                  }}
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Conversation */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px] max-h-[700px]">
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-slate-50 to-white">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center mb-5">
                  <FiMessageCircle className="text-4xl text-sky-500" />
                </div>
                <p className="text-xl font-semibold text-slate-800">Select a conversation</p>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">Choose a conversation from the list or start a new message</p>
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={otherName || "Doctor"} size={48} showStatus={false} />
                    <div className="min-w-0">
                      <h2 className="font-bold text-slate-900 truncate">{otherName || active?.subject || "Conversation"}</h2>
                      <p className="text-xs text-slate-500">{otherRole || "Healthcare Provider"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Filter dropdown */}
                    <button
                      onClick={() => setMessageFilter(messageFilter === "all" ? "starred" : "all")}
                      className={["flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", messageFilter === "starred" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"].join(" ")}
                    >
                      <FiStar className={messageFilter === "starred" ? "fill-current" : ""} />
                      {messageFilter === "starred" ? "Starred" : "All"}
                    </button>

                    {/* Search toggle */}
                    <button
                      onClick={() => setShowMessageSearch(!showMessageSearch)}
                      className={["h-9 w-9 rounded-lg flex items-center justify-center transition-colors", showMessageSearch ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"].join(" ")}
                    >
                      <FiSearch className="text-sm" />
                    </button>

                    <button type="button" className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1 hidden sm:flex">
                      View details
                      <FiChevronRight className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Message search bar */}
                {showMessageSearch && (
                  <MessageSearchBar
                    value={messageSearch}
                    onChange={(v) => { setMessageSearch(v); setCurrentSearchIndex(0); }}
                    onClose={() => { setShowMessageSearch(false); setMessageSearch(""); }}
                    resultCount={searchResults.length}
                    currentResult={searchResults.length > 0 ? currentSearchIndex + 1 : 0}
                    onPrev={() => setCurrentSearchIndex((i) => (i > 0 ? i - 1 : searchResults.length - 1))}
                    onNext={() => setCurrentSearchIndex((i) => (i < searchResults.length - 1 ? i + 1 : 0))}
                  />
                )}

                {/* Messages area */}
                <div
                  className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
                  style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgb(226 232 240 / 0.4) 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                >
                  {loadingMsgs && msgs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="h-10 w-10 rounded-full border-[3px] border-sky-500 border-t-transparent animate-spin" />
                      <p className="mt-4 text-sm text-slate-500">Loading messages…</p>
                    </div>
                  )}

                  {msgsCursor && (
                    <div className="flex justify-center mb-4">
                      <button type="button" onClick={loadOlder} className="text-xs font-medium text-sky-600 bg-white px-4 py-2 rounded-full shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
                        Load older messages
                      </button>
                    </div>
                  )}

                  {processedMessages.map((item) => {
                    if (item.type === "date-separator") {
                      return <DateSeparator key={item.key} date={item.date} />;
                    }

                    const m = item.message;
                    const mine = isMine(m, authUserId);
                    const at = m.sentAt || m.createdAt || m.timestamp || m.created_at;
                    const isHighlighted = searchResults.includes(m.id);

                    return (
                      <MessageBubble
                        key={item.key}
                        mine={mine}
                        text={m.body}
                        at={at}
                        isDeleted={m.isDeleted}
                        editedAt={m.editedAt}
                        isEditing={m.id === editingMessageId}
                        isFirstInGroup={item.isFirstInGroup}
                        isLastInGroup={item.isLastInGroup}
                        senderName={!mine ? otherName : null}
                        isStarred={starredMessages.has(m.id)}
                        onToggleStar={() => toggleStar(m.id)}
                        status={m.readAt ? "read" : m.deliveredAt ? "delivered" : "sent"}
                        searchHighlight={isHighlighted ? messageSearch : ""}
                        onEdit={mine && !m.isDeleted ? () => startEdit(m) : undefined}
                        onDelete={mine && !m.isDeleted ? () => openDeleteDialog(m) : undefined}
                      />
                    );
                  })}

                  {!loadingMsgs && filteredMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      {messageFilter === "starred" ? (
                        <>
                          <FiStar className="text-4xl text-slate-300 mb-3" />
                          <p className="text-sm text-slate-500">No starred messages</p>
                          <button onClick={() => setMessageFilter("all")} className="mt-2 text-sm text-sky-600 hover:text-sky-700">
                            Show all messages
                          </button>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
                      )}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="border-t border-slate-100 bg-white px-4 sm:px-6 py-4">
                  {editingMessageId && (
                    <div className="flex items-center justify-between mb-3 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-xs font-medium text-amber-700 flex items-center gap-2">
                        <FiEdit className="text-sm" />
                        Editing message
                      </span>
                      <button type="button" onClick={cancelEdit} className="text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1">
                        <FiX className="text-sm" />
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Quick Replies */}
                  <QuickReplies
                    isVisible={showQuickReplies}
                    onToggle={() => setShowQuickReplies(false)}
                    onSelect={(text) => { setSendText(text); setShowQuickReplies(false); textareaRef.current?.focus(); }}
                  />

                  <form onSubmit={onSend} className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      {/* Emoji picker */}
                      {showEmojiPicker && (
                        <EmojiPicker
                          onSelect={(emoji) => setSendText((prev) => prev + emoji)}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={["h-8 w-8 rounded-lg flex items-center justify-center transition-colors", showEmojiPicker ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"].join(" ")}
                          title="Add emoji"
                        >
                          <FiSmile className="text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowQuickReplies(!showQuickReplies)}
                          className={["h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors", showQuickReplies ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"].join(" ")}
                        >
                          <FiMessageCircle className="text-sm" />
                          Quick Replies
                        </button>
                      </div>

                      <textarea
                        ref={textareaRef}
                        value={sendText}
                        onChange={(e) => setSendText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                        placeholder={editingMessageId ? "Edit your message…" : "Type a message…"}
                        rows={1}
                        className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-[15px] text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-slate-50 transition-all resize-none min-h-[48px] max-h-32 border border-transparent focus:border-sky-200"
                        style={{ height: "48px" }}
                        onInput={(e) => { e.target.style.height = "48px"; e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"; }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(e); }
                          if (e.key === "Escape" && editingMessageId) { e.preventDefault(); cancelEdit(); }
                        }}
                      />

                      {/* Character count */}
                      <div className="flex items-center justify-between mt-1.5 px-1">
                        <p className="text-[10px] text-slate-400">
                          Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-medium">Enter</kbd> to send
                        </p>
                        <span className={["text-[10px] font-medium", charCountColor].join(" ")}>
                          {charCount}/{MAX_MESSAGE_LENGTH}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!sendText.trim() || charCount > MAX_MESSAGE_LENGTH}
                      className={[
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-200 flex-shrink-0 mb-6",
                        sendText.trim() && charCount <= MAX_MESSAGE_LENGTH
                          ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 active:scale-95"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed",
                      ].join(" ")}
                    >
                      <FiSend className={["text-lg transition-transform", sendText.trim() ? "-rotate-45" : ""].join(" ")} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-cyan-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">New Message</h2>
                <p className="text-sm text-slate-500 mt-0.5">Start a conversation with your care team</p>
              </div>
              <button type="button" onClick={() => setComposeOpen(false)} disabled={composeBusy} className="h-10 w-10 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm">
                <FiX className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={submitCompose} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">To</label>
                <select
                  value={composeDoctorId}
                  onChange={(e) => setComposeDoctorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:bg-white transition-all"
                >
                  <option value="">Select a doctor…</option>
                  {composeDoctors.map((d) => (
                    <option key={d.userId || d.id} value={d.userId || d.id}>
                      Dr. {[d.firstName, d.lastName].filter(Boolean).join(" ")}
                      {d.specialization ? ` • ${d.specialization}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                <input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="What is this regarding?"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Type your message…"
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setComposeOpen(false)} disabled={composeBusy} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={composeBusy || !composeDoctorId || !composeSubject.trim() || !composeBody.trim()}
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

      {/* Delete Modal */}
      {deleteDialog.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FiTrash2 className="text-2xl text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Delete Message</h2>
                  <p className="mt-2 text-sm text-slate-500">This will remove the message from your view. Your care team may still see their copy.</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button type="button" onClick={closeDeleteDialog} disabled={deleteBusy} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:bg-red-600 disabled:opacity-50 transition-all"
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