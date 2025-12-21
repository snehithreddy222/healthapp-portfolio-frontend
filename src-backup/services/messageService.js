import http from "./http";
import { authService } from "./authService";

// Helper to get the current user id from authService
function getCurrentUserId() {
  try {
    const user = authService.getCurrentUser
      ? authService.getCurrentUser()
      : JSON.parse(localStorage.getItem("user") || "null");

    if (!user) return null;
    return user.id || user.userId || user.user?.id || null;
  } catch {
    return null;
  }
}

// Normalize a raw thread from the API into the shape the UI expects
function normalizeThread(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id;
  const subject = raw.subject || "";
  const lastMessage = raw.lastMessage || raw.last_message || null;

  const lastBody = lastMessage?.body || lastMessage?.text || "";
  const lastAt =
    lastMessage?.createdAt ||
    lastMessage?.sentAt ||
    raw.lastActivity ||
    raw.updatedAt ||
    null;

  return {
    id,
    title: subject || "Conversation",
    lastMessageSnippet: lastBody,
    lastMessageAt: lastAt,
    unreadCount: raw.unreadCount ?? raw.unread ?? 0,
    // keep originals in case we want them later
    counterpartName: raw.counterpartName || raw.otherPartyName || "",
    counterpartInitials: raw.counterpartInitials || "",
    counterpartRole: raw.counterpartRole || "",
    otherPartyRole: raw.otherPartyRole || "",
    // pass through participants if backend included them
    participants: Array.isArray(raw.participants) ? raw.participants : undefined,
  };
}

// Normalize a raw message into the shape the UI expects
function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;

  const myId = getCurrentUserId();
  const sender = raw.sender || raw.user || {};
  const senderId = sender.id || sender.userId || raw.senderUserId || null;

  const sentAt =
    raw.createdAt ||
    raw.sentAt ||
    raw.timestamp ||
    null;

  let senderName =
    sender.username ||
    sender.name ||
    (sender.role === "DOCTOR" ? "Doctor" : "Patient");

  if (!senderName && typeof raw.senderName === "string") {
    senderName = raw.senderName;
  }

  const isDeleted = !!raw.isDeleted || !!raw.deletedAt;

  return {
    id: raw.id,
    body: isDeleted ? "" : raw.body || raw.text || "",
    sentAt,
    senderName: senderName || "User",
    isMine: myId != null && senderId === myId,
    isDeleted,
    editedAt: raw.editedAt || null,
  };
}

export const messageService = {
  async getUnreadCount() {
    const { data } = await http.get("/messages/unread-count");
    const payload = data?.data || data || {};
    return payload.unread ?? payload.count ?? payload.total ?? 0;
  },

  // Threads for current user (patient or doctor)
  async listThreads({ cursor, limit = 20, q } = {}) {
    const { data } = await http.get("/messages/threads", {
      params: {
        cursor: cursor || undefined,
        limit,
        q: q || undefined,
      },
    });

    const root = data || {};
    const rawList = Array.isArray(root.data)
      ? root.data
      : Array.isArray(root)
      ? root
      : Array.isArray(root.items)
      ? root.items
      : Array.isArray(root.threads)
      ? root.threads
      : [];

    const threads = rawList.map(normalizeThread).filter(Boolean);

    return threads;
  },

  // Detailed thread (used by patient and doctor UI)
  async getThread(threadId, { limit = 200, cursor } = {}) {
    const { data } = await http.get(`/messages/threads/${threadId}`, {
      params: {
        limit,
        cursor: cursor || undefined,
      },
    });

    const root = data?.data || data;
    if (!root) return null;

    let messages = Array.isArray(root.messages) ? root.messages : [];
    messages = messages.map(normalizeMessage).filter(Boolean);

    return {
      ...root,
      messages,
    };
  },

  // Messages inside a single thread, as a simple array
  async listMessages(threadId, { limit = 100, cursor } = {}) {
    const { data } = await http.get(
      `/messages/threads/${threadId}/messages`,
      {
        params: {
          limit,
          cursor: cursor || undefined,
        },
      }
    );

    const root = data || {};
    const rawList = Array.isArray(root.data)
      ? root.data
      : Array.isArray(root)
      ? root
      : Array.isArray(root.items)
      ? root.items
      : [];

    const messages = rawList.map(normalizeMessage).filter(Boolean);

    return messages;
  },

  // Send a new message in an existing thread
  async postMessage(threadId, body) {
    const { data } = await http.post(
      `/messages/threads/${threadId}/messages`,
      { body }
    );
    const raw = data?.data || data;
    return normalizeMessage(raw);
  },

  async sendMessage(threadId, body) {
    return this.postMessage(threadId, body);
  },

  async markRead(threadId) {
    try {
      await http.post(`/messages/threads/${threadId}/read`, {});
    } catch {
      // non-blocking
    }
  },

  async markThreadRead(threadId) {
    return this.markRead(threadId);
  },

  async listDoctors() {
    const { data } = await http.get("/doctors", {
      params: { limit: 100 },
    });
    const list = data?.data || data;
    const arr = Array.isArray(list)
      ? list
      : Array.isArray(list?.items)
      ? list.items
      : [];

    return arr.map((d) => ({
      id: d.id,
      userId: d.userId || d.user?.id || d.user_id,
      firstName: d.firstName || d.first_name,
      lastName: d.lastName || d.last_name,
      specialization: d.specialization || "",
    }));
  },

  // Backend contract now supports both patientUserId and doctorUserId
  // POST /messages/threads { doctorUserId?, patientUserId?, subject, body }
  async createThread({ doctorUserId, patientUserId, subject, body }) {
    const payload = {
      subject,
      body,
    };

    if (doctorUserId) payload.doctorUserId = doctorUserId;
    if (patientUserId) payload.patientUserId = patientUserId;

    const { data } = await http.post("/messages/threads", payload);
    return data?.data || data;
  },

  // Edit an existing message (soft edit)
  async editMessage(threadId, messageId, body) {
    const { data } = await http.patch(
      `/messages/threads/${threadId}/messages/${messageId}`,
      { body }
    );
    const raw = data?.data || data;
    return normalizeMessage(raw);
  },

  // Soft delete an existing message
  async deleteMessage(threadId, messageId) {
    const { data } = await http.delete(
      `/messages/threads/${threadId}/messages/${messageId}`
    );
    const raw = data?.data || data;
    return normalizeMessage(raw);
  },
};
