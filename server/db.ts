import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Room, User, Message, RoomType, Reaction } from '../shared/types';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/chat.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    invite_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS room_members (
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    edited INTEGER DEFAULT 0,
    edited_at TEXT,
    deleted INTEGER DEFAULT 0,
    reply_to_id TEXT,
    reply_to_nickname TEXT,
    reply_to_content TEXT,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reactions (
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id, emoji),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
  CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code);
  CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
`);

// Add columns if they don't exist (for migration)
// Note: UNIQUE constraint is added via index below, not in ALTER TABLE (SQLite limitation)
try {
  db.exec('ALTER TABLE users ADD COLUMN email TEXT');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE messages ADD COLUMN edited INTEGER DEFAULT 0');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE messages ADD COLUMN edited_at TEXT');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE messages ADD COLUMN deleted INTEGER DEFAULT 0');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE messages ADD COLUMN reply_to_id TEXT');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE messages ADD COLUMN reply_to_nickname TEXT');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE messages ADD COLUMN reply_to_content TEXT');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE messages ADD COLUMN image_url TEXT');
} catch { /* Column exists */ }
try {
  db.exec('ALTER TABLE messages ADD COLUMN expires_at TEXT');
} catch { /* Column exists */ }

// Create unique index for email lookups (enforces uniqueness)
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
} catch { /* Index exists */ }

// Prepared statements
const stmts = {
  // Users
  createUser: db.prepare('INSERT OR REPLACE INTO users (id, nickname) VALUES (?, ?)'),
  getUser: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  registerUser: db.prepare('INSERT INTO users (id, nickname, email, password_hash) VALUES (?, ?, ?, ?)'),
  updateUserAuth: db.prepare('UPDATE users SET email = ?, password_hash = ? WHERE id = ?'),

  // Rooms
  createRoom: db.prepare('INSERT INTO rooms (id, invite_code, name, type) VALUES (?, ?, ?, ?)'),
  getRoomById: db.prepare('SELECT * FROM rooms WHERE id = ?'),
  getRoomByInviteCode: db.prepare('SELECT * FROM rooms WHERE invite_code = ?'),
  deleteRoom: db.prepare('DELETE FROM rooms WHERE id = ?'),

  // Room members
  addMember: db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)'),
  removeMember: db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?'),
  getRoomMembers: db.prepare(`
    SELECT u.id, u.nickname FROM users u
    JOIN room_members rm ON u.id = rm.user_id
    WHERE rm.room_id = ?
  `),
  getUserRooms: db.prepare(`
    SELECT r.* FROM rooms r
    JOIN room_members rm ON r.id = rm.room_id
    WHERE rm.user_id = ?
  `),
  getMemberCount: db.prepare('SELECT COUNT(*) as count FROM room_members WHERE room_id = ?'),

  // Messages
  addMessage: db.prepare(`
    INSERT INTO messages (id, room_id, user_id, nickname, content, timestamp, reply_to_id, reply_to_nickname, reply_to_content, image_url, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  deleteExpiredMessages: db.prepare(`DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < ?`),
  getMessage: db.prepare('SELECT * FROM messages WHERE id = ?'),
  editMessage: db.prepare('UPDATE messages SET content = ?, edited = 1, edited_at = ? WHERE id = ? AND user_id = ? AND deleted = 0'),
  deleteMessage: db.prepare("UPDATE messages SET deleted = 1, content = '[Message deleted]' WHERE id = ? AND user_id = ?"),
  getRoomMessages: db.prepare(`
    SELECT * FROM messages
    WHERE room_id = ? AND deleted = 0
    ORDER BY timestamp DESC
    LIMIT 100
  `),

  // Reactions
  addReaction: db.prepare('INSERT OR IGNORE INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)'),
  removeReaction: db.prepare('DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'),
  getMessageReactions: db.prepare('SELECT emoji, user_id FROM reactions WHERE message_id = ?'),
};

// Helper to get reactions for messages
function getReactionsForMessage(messageId: string): Reaction[] {
  const rows = stmts.getMessageReactions.all(messageId) as { emoji: string; user_id: string }[];
  const reactionMap = new Map<string, string[]>();

  rows.forEach(row => {
    if (!reactionMap.has(row.emoji)) {
      reactionMap.set(row.emoji, []);
    }
    reactionMap.get(row.emoji)!.push(row.user_id);
  });

  return Array.from(reactionMap.entries()).map(([emoji, users]) => ({ emoji, users }));
}

interface MessageRow {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  content: string;
  timestamp: string;
  edited: number;
  edited_at: string | null;
  reply_to_id: string | null;
  reply_to_nickname: string | null;
  reply_to_content: string | null;
  image_url: string | null;
  expires_at: string | null;
}

function rowToMessage(row: MessageRow): Message {
  const message: Message = {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    nickname: row.nickname,
    content: row.content,
    timestamp: row.timestamp,
    reactions: getReactionsForMessage(row.id)
  };

  if (row.edited) {
    message.edited = true;
    message.editedAt = row.edited_at || undefined;
  }

  if (row.reply_to_id) {
    message.replyTo = {
      id: row.reply_to_id,
      nickname: row.reply_to_nickname || '',
      content: row.reply_to_content || ''
    };
  }

  if (row.image_url) {
    message.imageUrl = row.image_url;
  }

  if (row.expires_at) {
    message.expiresAt = row.expires_at;
  }

  return message;
}

export const database = {
  // User operations
  createOrUpdateUser(id: string, nickname: string): User {
    stmts.createUser.run(id, nickname);
    return { id, nickname, joinedAt: new Date().toISOString() };
  },

  getUser(id: string): User | undefined {
    const row = stmts.getUser.get(id) as { id: string; nickname: string; created_at: string; email?: string } | undefined;
    if (!row) return undefined;
    return { id: row.id, nickname: row.nickname, joinedAt: row.created_at, email: row.email };
  },

  getUserByEmail(email: string): User | undefined {
    const row = stmts.getUserByEmail.get(email.toLowerCase()) as { id: string; nickname: string; created_at: string; email: string; password_hash: string } | undefined;
    if (!row) return undefined;
    return { id: row.id, nickname: row.nickname, joinedAt: row.created_at, email: row.email };
  },

  async registerUser(id: string, nickname: string, email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    // Check if email already exists
    const existing = stmts.getUserByEmail.get(email.toLowerCase());
    if (existing) {
      return { success: false, error: 'Email already registered' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      stmts.registerUser.run(id, nickname, email.toLowerCase(), passwordHash);
      return {
        success: true,
        user: { id, nickname, joinedAt: new Date().toISOString(), email: email.toLowerCase() }
      };
    } catch (err) {
      return { success: false, error: 'Registration failed' };
    }
  },

  async loginUser(email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    console.log(`Login attempt for: ${email.toLowerCase()}`);
    const row = stmts.getUserByEmail.get(email.toLowerCase()) as { id: string; nickname: string; created_at: string; email: string; password_hash: string } | undefined;
    if (!row) {
      console.log(`User not found: ${email.toLowerCase()}`);
      return { success: false, error: 'Invalid email or password' };
    }
    if (!row.password_hash) {
      console.log(`User has no password: ${email.toLowerCase()}`);
      return { success: false, error: 'Invalid email or password' };
    }

    console.log(`Found user: ${row.nickname}, checking password...`);
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      console.log(`Password mismatch for: ${email.toLowerCase()}`);
      return { success: false, error: 'Invalid email or password' };
    }

    console.log(`Login successful for: ${row.nickname}`);
    return {
      success: true,
      user: { id: row.id, nickname: row.nickname, joinedAt: row.created_at, email: row.email }
    };
  },

  // Room operations
  createRoom(id: string, inviteCode: string, name: string, type: RoomType, creatorId: string): Room {
    const now = new Date().toISOString();
    stmts.createRoom.run(id, inviteCode, name, type);
    stmts.addMember.run(id, creatorId);
    return { id, inviteCode, name, type, createdAt: now };
  },

  getRoomById(id: string): Room | undefined {
    const row = stmts.getRoomById.get(id) as { id: string; invite_code: string; name: string; type: RoomType; created_at: string } | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      inviteCode: row.invite_code,
      name: row.name,
      type: row.type,
      createdAt: row.created_at
    };
  },

  getRoomByInviteCode(code: string): Room | undefined {
    const row = stmts.getRoomByInviteCode.get(code.toUpperCase()) as { id: string; invite_code: string; name: string; type: RoomType; created_at: string } | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      inviteCode: row.invite_code,
      name: row.name,
      type: row.type,
      createdAt: row.created_at
    };
  },

  deleteRoom(id: string): void {
    stmts.deleteRoom.run(id);
  },

  // Member operations
  addMemberToRoom(roomId: string, userId: string): void {
    stmts.addMember.run(roomId, userId);
  },

  removeMemberFromRoom(roomId: string, userId: string): void {
    stmts.removeMember.run(roomId, userId);
    const count = stmts.getMemberCount.get(roomId) as { count: number };
    if (count.count === 0) {
      stmts.deleteRoom.run(roomId);
    }
  },

  getRoomMembers(roomId: string): { id: string; nickname: string }[] {
    return stmts.getRoomMembers.all(roomId) as { id: string; nickname: string }[];
  },

  getMemberCount(roomId: string): number {
    const result = stmts.getMemberCount.get(roomId) as { count: number };
    return result.count;
  },

  getUserRooms(userId: string): Room[] {
    const rows = stmts.getUserRooms.all(userId) as { id: string; invite_code: string; name: string; type: RoomType; created_at: string }[];
    return rows.map(row => ({
      id: row.id,
      inviteCode: row.invite_code,
      name: row.name,
      type: row.type,
      createdAt: row.created_at
    }));
  },

  // Message operations
  addMessage(
    id: string,
    roomId: string,
    userId: string,
    nickname: string,
    content: string,
    replyTo?: { id: string; nickname: string; content: string },
    imageUrl?: string
  ): Message {
    const timestamp = new Date().toISOString();
    // Messages expire after 2 minutes
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    stmts.addMessage.run(
      id, roomId, userId, nickname, content, timestamp,
      replyTo?.id || null, replyTo?.nickname || null, replyTo?.content || null,
      imageUrl || null, expiresAt
    );
    return {
      id,
      roomId,
      userId,
      nickname,
      content,
      timestamp,
      expiresAt,
      imageUrl,
      replyTo,
      reactions: []
    };
  },

  deleteExpiredMessages(): number {
    const now = new Date().toISOString();
    const result = stmts.deleteExpiredMessages.run(now);
    return result.changes;
  },

  getExpiredMessageIds(): string[] {
    const now = new Date().toISOString();
    const rows = db.prepare(`SELECT id, room_id FROM messages WHERE expires_at IS NOT NULL AND expires_at < ? AND deleted = 0`).all(now) as { id: string; room_id: string }[];
    return rows.map(r => r.id);
  },

  getExpiredMessagesWithRooms(): { id: string; roomId: string }[] {
    const now = new Date().toISOString();
    const rows = db.prepare(`SELECT id, room_id FROM messages WHERE expires_at IS NOT NULL AND expires_at < ? AND deleted = 0`).all(now) as { id: string; room_id: string }[];
    return rows.map(r => ({ id: r.id, roomId: r.room_id }));
  },

  editMessage(messageId: string, userId: string, content: string): boolean {
    const editedAt = new Date().toISOString();
    const result = stmts.editMessage.run(content, editedAt, messageId, userId);
    return result.changes > 0;
  },

  deleteMessage(messageId: string, userId: string): boolean {
    const result = stmts.deleteMessage.run(messageId, userId);
    return result.changes > 0;
  },

  getRoomMessages(roomId: string): Message[] {
    const rows = stmts.getRoomMessages.all(roomId) as MessageRow[];
    return rows.map(rowToMessage).reverse();
  },

  // Reaction operations
  addReaction(messageId: string, userId: string, emoji: string): void {
    stmts.addReaction.run(messageId, userId, emoji);
  },

  removeReaction(messageId: string, userId: string, emoji: string): void {
    stmts.removeReaction.run(messageId, userId, emoji);
  },

  // Check if invite code exists
  inviteCodeExists(code: string): boolean {
    return !!stmts.getRoomByInviteCode.get(code.toUpperCase());
  }
};
