// services/serverService.js
import { db } from "../firebaseConfig";
import {
  ref,
  set,
  get,
  child,
  update,
  push,
  onValue,
  query,
  orderByChild,
  remove,
} from "firebase/database";

/* ------------------ Utilities ------------------ */

// Normalize role strings to a consistent format used across the app
function normalizeRole(role) {
  if (!role) return "Student";
  const r = String(role).trim();
  console.log("🔧 normalizeRole: Input role:", role, "-> Normalized:", r);
  return r === "Officer" ? "Officer" : "Student";
}

// Generate random 6-letter invite code (A-Z0-9)
function generateInviteCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/* ------------------ Server CRUD ------------------ */

/**
 * Create a server with an auto-generated invite code.
 * - uid: creator uid
 * - name: server name (editable)
 * - role: creator role (will be normalized to 'Officer'/'Student')
 */
export async function createServer(uid, name, role = "Student") {
  try {
    const roleNorm = normalizeRole(role);
    const code = generateInviteCode();
    const serverRef = ref(db, `servers/${code}`);

    await set(serverRef, {
      name,
      createdBy: uid,
      members: {
        [uid]: { role: roleNorm }, // store capitalized role
      },
      channels: {
        chat: true,
        announcement: true,
      },
    });

    console.log("🔧 Server created with role:", roleNorm, "for user:", uid);
    return code;
  } catch (error) {
    console.error("Error creating server:", error);
    throw error;
  }
}

/**
 * Join a server by invite code (case-insensitive)
 * - uid: joining user uid
 * - role: user's role (normalized)
 * - code: invite code (string)
 */
export async function joinServer(uid, role, code) {
  try {
    if (!code) throw new Error("Invite code required");
    const normalizedCode = String(code).trim().toUpperCase();

    const dbRef = ref(db);
    const serverSnap = await get(child(dbRef, `servers/${normalizedCode}`));

    if (!serverSnap.exists()) {
      throw new Error("Invalid invite code");
    }

    const roleNorm = normalizeRole(role);
    const updates = {};
    updates[`servers/${normalizedCode}/members/${uid}`] = { role: roleNorm };

    console.log("🔧 User joining server with role:", roleNorm, "for user:", uid);
    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error("Error joining server:", error);
    throw error;
  }
}

/**
 * Return list of servers the user belongs to:
 * [{ code, name, role }]
 */
export async function getUserServers(uid) {
  try {
    const dbRef = ref(db);
    const serversSnap = await get(child(dbRef, "servers"));

    if (!serversSnap.exists()) return [];

    const servers = serversSnap.val();
    return Object.entries(servers)
      .filter(([code, server]) => server.members && server.members[uid])
      .map(([code, server]) => ({
        code,
        name: server.name,
        role: normalizeRole(server.members[uid].role),
      }));
  } catch (error) {
    console.error("Error fetching user servers:", error);
    throw error;
  }
}

/* ------------------ Message Helpers ------------------ */

/**
 * Send a message to a channel.
 * Throws if announcement is attempted by a non-Officer.
 */
export async function sendMessage(serverId, channel, userId, senderName, role, text) {
  if (!text || !text.trim()) return;

  const roleNorm = normalizeRole(role);

  if (channel === "announcement" && roleNorm !== "Officer") {
    throw new Error("Only Officers can post in announcements.");
  }

  const messagesRef = ref(db, `servers/${serverId}/channels/${channel}/messages`);
  const newMessageRef = push(messagesRef);

  await set(newMessageRef, {
    sender: userId,
    senderName,
    text: text.trim(),
    timestamp: Date.now(),
  });
}

/**
 * Subscribe to messages for a channel (real-time).
 * callback(messagesArray) will be called with messages sorted by timestamp.
 * Returns the unsubscribe function.
 */
export function subscribeToMessages(serverId, channel, callback) {
  const messagesRef = query(
    ref(db, `servers/${serverId}/channels/${channel}/messages`),
    orderByChild("timestamp")
  );

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const messages = Object.entries(data).map(([id, msg]) => ({ id, ...msg }));
    messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    callback(messages);
  });

  return unsubscribe;
}

/* ------------------ Role / Membership Helpers ------------------ */

/**
 * Get a user's role in a server (normalized)
 */
export async function getUserRoleInServer(uid, serverId) {
  try {
    const roleRef = ref(db, `servers/${serverId}/members/${uid}`);
    const snap = await get(roleRef);
    if (snap.exists()) {
      return normalizeRole(snap.val().role);
    }
    return "Student";
  } catch (err) {
    console.error("Error fetching role:", err);
    return "Student";
  }
}

/**
 * Kick (remove) a member from a server
 * - only call this after verifying caller has permission (server-side / UI check)
 */
export async function kickMember(serverId, targetUid) {
  try {
    const memberRef = ref(db, `servers/${serverId}/members/${targetUid}`);
    await remove(memberRef);
    return true;
  } catch (err) {
    console.error("Error kicking member:", err);
    throw err;
  }
}

/**
 * Leave server helper (remove self)
 */
export async function leaveServer(serverId, uid) {
  try {
    await remove(ref(db, `servers/${serverId}/members/${uid}`));
    return true;
  } catch (err) {
    console.error("Error leaving server:", err);
    throw err;
  }
}

/* ------------------ Read helpers ------------------ */

/**
 * Get server object by id (returns snapshot val or null)
 */
export async function getServerById(serverId) {
  try {
    const snap = await get(child(ref(db), `servers/${serverId}`));
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.error("Error fetching server:", err);
    throw err;
  }
}