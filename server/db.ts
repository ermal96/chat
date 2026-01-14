import Database from 'better-sqlite3';
import path from 'path';
import { Room, User, Message, RoomType } from '../shared/types';

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
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
  CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON rooms(invite_code);
`);

// Prepared statements
const stmts = {
  // Users
  createUser: db.prepare('INSERT OR REPLACE INTO users (id, nickname) VALUES (?, ?)'),
  getUser: db.prepare('SELECT * FROM users WHERE id = ?'),
  updateNickname: db.prepare('UPDATE users SET nickname = ? WHERE id = ?'),

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
  isUserInRoom: db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?'),

  // Messages
  addMessage: db.prepare('INSERT INTO messages (id, room_id, user_id, nickname, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)'),
  getRoomMessages: db.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 100'),
  deleteOldMessages: db.prepare('DELETE FROM messages WHERE room_id = ? AND id NOT IN (SELECT id FROM messages WHERE room_id = ? ORDER BY timestamp DESC LIMIT 100)'),
};

export const database = {
  // User operations
  createOrUpdateUser(id: string, nickname: string): User {
    stmts.createUser.run(id, nickname);
    return { id, nickname, joinedAt: new Date().toISOString() };
  },

  getUser(id: string): User | undefined {
    const row = stmts.getUser.get(id) as { id: string; nickname: string; created_at: string } | undefined;
    if (!row) return undefined;
    return { id: row.id, nickname: row.nickname, joinedAt: row.created_at };
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
    // Check if room is empty and delete it
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

  isUserInRoom(roomId: string, userId: string): boolean {
    return !!stmts.isUserInRoom.get(roomId, userId);
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
  addMessage(id: string, roomId: string, userId: string, nickname: string, content: string): Message {
    const timestamp = new Date().toISOString();
    stmts.addMessage.run(id, roomId, userId, nickname, content, timestamp);
    return { id, roomId, userId, nickname, content, timestamp };
  },

  getRoomMessages(roomId: string): Message[] {
    const rows = stmts.getRoomMessages.all(roomId) as { id: string; room_id: string; user_id: string; nickname: string; content: string; timestamp: string }[];
    return rows.map(row => ({
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      nickname: row.nickname,
      content: row.content,
      timestamp: row.timestamp
    })).reverse(); // Return in chronological order
  },

  // Check if invite code exists
  inviteCodeExists(code: string): boolean {
    return !!stmts.getRoomByInviteCode.get(code.toUpperCase());
  }
};
