import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import path from 'path';
import { database } from './db';
import { generateInviteCode, generateId } from './invite';
import {
  ClientMessage,
  ServerMessage,
  CreateRoomPayload,
  JoinRoomPayload,
  SendMessagePayload,
  EditMessagePayload,
  DeleteMessagePayload,
  ReactionPayload,
  TypingPayload,
  LeaveRoomPayload,
  ReconnectPayload,
  User,
  Room,
  UserInfo,
  getAvatarColor
} from '../shared/types';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Health check endpoint for Coolify/Docker
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client')));

// SPA fallback - serve index.html for all other routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Track connected clients
interface ConnectedClient {
  ws: WebSocket;
  user: User | null;
  rooms: Set<string>;
  typingIn: Set<string>; // Room IDs where user is typing
}

const clients: Map<WebSocket, ConnectedClient> = new Map();
const userConnections: Map<string, Set<WebSocket>> = new Map(); // userId -> Set of connections

// Typing timeout management
const typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // `${roomId}:${oderId}` -> timeout

// Helper to send message to a client
function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Helper to broadcast to room members
function broadcastToRoom(roomId: string, message: ServerMessage, excludeWs?: WebSocket): void {
  clients.forEach((client, ws) => {
    if (ws !== excludeWs && client.rooms.has(roomId)) {
      send(ws, message);
    }
  });
}

// Get online members for a room
function getOnlineMembers(roomId: string): UserInfo[] {
  const online: UserInfo[] = [];
  const seenUsers = new Set<string>();

  clients.forEach((client) => {
    if (client.user && client.rooms.has(roomId) && !seenUsers.has(client.user.id)) {
      seenUsers.add(client.user.id);
      online.push({
        id: client.user.id,
        nickname: client.user.nickname,
        isOnline: true,
        avatar: getAvatarColor(client.user.id)
      });
    }
  });

  return online;
}

// Serialize room for sending to client
function serializeRoom(room: Room): Room {
  const members = database.getRoomMembers(room.id);
  const onlineMembers = getOnlineMembers(room.id);
  const onlineIds = onlineMembers.map(m => m.id);

  return {
    ...room,
    memberCount: members.length,
    members: members.map(m => ({
      ...m,
      isOnline: onlineIds.includes(m.id),
      avatar: getAvatarColor(m.id)
    })),
    onlineMembers: onlineIds
  };
}

// Track user connection
function trackUserConnection(userId: string, ws: WebSocket): void {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(ws);
}

// Untrack user connection
function untrackUserConnection(userId: string, ws: WebSocket): void {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
  }
}

// Check if user is online (has any connection)
function isUserOnline(userId: string): boolean {
  const connections = userConnections.get(userId);
  return connections ? connections.size > 0 : false;
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  // Initialize client
  const client: ConnectedClient = {
    ws,
    user: null,
    rooms: new Set(),
    typingIn: new Set()
  };
  clients.set(ws, client);

  ws.on('message', (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (err) {
      send(ws, { type: 'error', payload: { message: 'Invalid message format' } });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    const client = clients.get(ws);

    if (client && client.user) {
      const userId = client.user.id;
      const nickname = client.user.nickname;

      // Clear typing indicators
      client.typingIn.forEach(roomId => {
        const key = `${roomId}:${userId}`;
        const timeout = typingTimeouts.get(key);
        if (timeout) {
          clearTimeout(timeout);
          typingTimeouts.delete(key);
        }
        broadcastToRoom(roomId, {
          type: 'typing',
          payload: { roomId, oderId: userId, nickname, isTyping: false }
        });
      });

      // Untrack connection
      untrackUserConnection(userId, ws);

      // If user has no more connections, notify rooms they're offline
      if (!isUserOnline(userId)) {
        client.rooms.forEach(roomId => {
          broadcastToRoom(roomId, {
            type: 'user_offline',
            payload: {
              roomId,
              user: { id: userId, nickname, avatar: getAvatarColor(userId) }
            }
          });
        });
      }
    }

    clients.delete(ws);
  });
});

function handleMessage(ws: WebSocket, message: ClientMessage): void {
  const client = clients.get(ws);
  if (!client) return;

  switch (message.type) {
    case 'create_room':
      handleCreateRoom(ws, client, message.payload as CreateRoomPayload);
      break;
    case 'join_room':
      handleJoinRoom(ws, client, message.payload as JoinRoomPayload);
      break;
    case 'leave_room':
      handleLeaveRoom(ws, client, message.payload as LeaveRoomPayload);
      break;
    case 'send_message':
      handleSendMessage(ws, client, message.payload as SendMessagePayload);
      break;
    case 'edit_message':
      handleEditMessage(ws, client, message.payload as EditMessagePayload);
      break;
    case 'delete_message':
      handleDeleteMessage(ws, client, message.payload as DeleteMessagePayload);
      break;
    case 'add_reaction':
      handleAddReaction(ws, client, message.payload as ReactionPayload);
      break;
    case 'remove_reaction':
      handleRemoveReaction(ws, client, message.payload as ReactionPayload);
      break;
    case 'typing_start':
      handleTypingStart(ws, client, message.payload as TypingPayload);
      break;
    case 'typing_stop':
      handleTypingStop(ws, client, message.payload as TypingPayload);
      break;
    case 'get_rooms':
      handleGetRooms(ws, client);
      break;
    case 'reconnect':
      handleReconnect(ws, client, message.payload as ReconnectPayload);
      break;
  }
}

function handleCreateRoom(ws: WebSocket, client: ConnectedClient, payload: CreateRoomPayload): void {
  const { name, type, nickname, userId } = payload;

  if (!name || !nickname) {
    send(ws, { type: 'error', payload: { message: 'Name and nickname are required' } });
    return;
  }

  // Create or reuse user
  const id = userId || generateId();
  client.user = database.createOrUpdateUser(id, nickname);
  trackUserConnection(id, ws);

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  while (database.inviteCodeExists(inviteCode)) {
    inviteCode = generateInviteCode();
  }

  const roomId = generateId();
  const room = database.createRoom(roomId, inviteCode, name, type, client.user.id);
  client.rooms.add(room.id);

  send(ws, {
    type: 'room_created',
    payload: {
      room: serializeRoom(room),
      user: { id: client.user.id, nickname: client.user.nickname, avatar: getAvatarColor(client.user.id) }
    }
  });

  console.log(`Room created: ${room.name} (${room.inviteCode}) by ${nickname}`);
}

function handleJoinRoom(ws: WebSocket, client: ConnectedClient, payload: JoinRoomPayload): void {
  const { inviteCode, nickname, userId } = payload;

  if (!inviteCode || !nickname) {
    send(ws, { type: 'error', payload: { message: 'Invite code and nickname are required' } });
    return;
  }

  const room = database.getRoomByInviteCode(inviteCode);
  if (!room) {
    send(ws, { type: 'error', payload: { message: 'Invalid invite code' } });
    return;
  }

  // Create or reuse user
  const id = userId || generateId();
  const wasOnline = isUserOnline(id);
  client.user = database.createOrUpdateUser(id, nickname);
  trackUserConnection(id, ws);

  // Check if already in room (in this session)
  if (client.rooms.has(room.id)) {
    send(ws, { type: 'error', payload: { message: 'Already in this room' } });
    return;
  }

  // Add user to room in database
  database.addMemberToRoom(room.id, client.user.id);
  client.rooms.add(room.id);

  const userInfo = { id: client.user.id, nickname: client.user.nickname, avatar: getAvatarColor(client.user.id) };

  // Send room info to joining user
  send(ws, {
    type: 'room_joined',
    payload: {
      room: serializeRoom(room),
      user: userInfo
    }
  });

  // Send message history
  send(ws, {
    type: 'room_history',
    payload: {
      roomId: room.id,
      messages: database.getRoomMessages(room.id)
    }
  });

  // Notify others in the room
  broadcastToRoom(room.id, {
    type: 'user_joined',
    payload: { roomId: room.id, user: userInfo }
  }, ws);

  // If user just came online, notify
  if (!wasOnline) {
    broadcastToRoom(room.id, {
      type: 'user_online',
      payload: { roomId: room.id, user: userInfo }
    }, ws);
  }

  console.log(`${nickname} joined room: ${room.name}`);
}

function handleLeaveRoom(ws: WebSocket, client: ConnectedClient, payload: LeaveRoomPayload): void {
  const { roomId } = payload;

  if (!client.user || !client.rooms.has(roomId)) {
    send(ws, { type: 'error', payload: { message: 'Not in this room' } });
    return;
  }

  // Remove from database
  database.removeMemberFromRoom(roomId, client.user.id);
  client.rooms.delete(roomId);

  // Clear typing
  client.typingIn.delete(roomId);

  send(ws, {
    type: 'room_left',
    payload: { roomId }
  });

  // Notify others
  broadcastToRoom(roomId, {
    type: 'user_left',
    payload: {
      roomId,
      user: { id: client.user.id, nickname: client.user.nickname, avatar: getAvatarColor(client.user.id) }
    }
  });

  console.log(`${client.user.nickname} left room: ${roomId}`);
}

function handleSendMessage(ws: WebSocket, client: ConnectedClient, payload: SendMessagePayload): void {
  const { roomId, content, replyTo, imageUrl } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  if (!client.rooms.has(roomId)) {
    send(ws, { type: 'error', payload: { message: 'Not in this room' } });
    return;
  }

  // Either content or image is required
  const hasContent = content && content.trim().length > 0;
  const hasImage = imageUrl && imageUrl.trim().length > 0;

  if (!hasContent && !hasImage) {
    send(ws, { type: 'error', payload: { message: 'Message cannot be empty' } });
    return;
  }

  // Stop typing indicator
  handleTypingStop(ws, client, { roomId });

  const messageId = generateId();
  const message = database.addMessage(
    messageId,
    roomId,
    client.user.id,
    client.user.nickname,
    content?.trim() || '',
    replyTo,
    imageUrl?.trim()
  );

  // Broadcast to all room members including sender
  broadcastToRoom(roomId, {
    type: 'new_message',
    payload: { message }
  });
}

function handleEditMessage(ws: WebSocket, client: ConnectedClient, payload: EditMessagePayload): void {
  const { messageId, roomId, content } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  if (!content || content.trim().length === 0) {
    send(ws, { type: 'error', payload: { message: 'Message cannot be empty' } });
    return;
  }

  const updated = database.editMessage(messageId, client.user.id, content.trim());
  if (!updated) {
    send(ws, { type: 'error', payload: { message: 'Cannot edit this message' } });
    return;
  }

  broadcastToRoom(roomId, {
    type: 'message_edited',
    payload: { messageId, roomId, content: content.trim(), editedAt: new Date().toISOString() }
  });
}

function handleDeleteMessage(ws: WebSocket, client: ConnectedClient, payload: DeleteMessagePayload): void {
  const { messageId, roomId } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  const deleted = database.deleteMessage(messageId, client.user.id);
  if (!deleted) {
    send(ws, { type: 'error', payload: { message: 'Cannot delete this message' } });
    return;
  }

  broadcastToRoom(roomId, {
    type: 'message_deleted',
    payload: { messageId, roomId }
  });
}

function handleAddReaction(ws: WebSocket, client: ConnectedClient, payload: ReactionPayload): void {
  const { messageId, roomId, emoji } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  database.addReaction(messageId, client.user.id, emoji);

  broadcastToRoom(roomId, {
    type: 'reaction_added',
    payload: { messageId, roomId, oderId: client.user.id, emoji }
  });
}

function handleRemoveReaction(ws: WebSocket, client: ConnectedClient, payload: ReactionPayload): void {
  const { messageId, roomId, emoji } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  database.removeReaction(messageId, client.user.id, emoji);

  broadcastToRoom(roomId, {
    type: 'reaction_removed',
    payload: { messageId, roomId, oderId: client.user.id, emoji }
  });
}

function handleTypingStart(ws: WebSocket, client: ConnectedClient, payload: TypingPayload): void {
  const { roomId } = payload;

  if (!client.user || !client.rooms.has(roomId)) return;

  const key = `${roomId}:${client.user.id}`;

  // Clear existing timeout
  const existing = typingTimeouts.get(key);
  if (existing) clearTimeout(existing);

  // Only broadcast if not already typing
  if (!client.typingIn.has(roomId)) {
    client.typingIn.add(roomId);
    broadcastToRoom(roomId, {
      type: 'typing',
      payload: { roomId, oderId: client.user.id, nickname: client.user.nickname, isTyping: true }
    }, ws);
  }

  // Auto-stop after 3 seconds
  typingTimeouts.set(key, setTimeout(() => {
    handleTypingStop(ws, client, payload);
  }, 3000));
}

function handleTypingStop(ws: WebSocket, client: ConnectedClient, payload: TypingPayload): void {
  const { roomId } = payload;

  if (!client.user) return;

  const key = `${roomId}:${client.user.id}`;

  // Clear timeout
  const existing = typingTimeouts.get(key);
  if (existing) {
    clearTimeout(existing);
    typingTimeouts.delete(key);
  }

  if (client.typingIn.has(roomId)) {
    client.typingIn.delete(roomId);
    broadcastToRoom(roomId, {
      type: 'typing',
      payload: { roomId, oderId: client.user.id, nickname: client.user.nickname, isTyping: false }
    }, ws);
  }
}

function handleGetRooms(ws: WebSocket, client: ConnectedClient): void {
  if (!client.user) {
    send(ws, { type: 'room_list', payload: { rooms: [] } });
    return;
  }

  const rooms = database.getUserRooms(client.user.id).map(serializeRoom);
  send(ws, { type: 'room_list', payload: { rooms } });
}

function handleReconnect(ws: WebSocket, client: ConnectedClient, payload: ReconnectPayload): void {
  const { userId, nickname } = payload;

  if (!userId || !nickname) {
    send(ws, { type: 'error', payload: { message: 'User ID and nickname required for reconnect' } });
    return;
  }

  const wasOnline = isUserOnline(userId);

  // Get or create user
  client.user = database.createOrUpdateUser(userId, nickname);
  trackUserConnection(userId, ws);

  // Get user's rooms from database
  const rooms = database.getUserRooms(userId);
  rooms.forEach(room => {
    client.rooms.add(room.id);

    // If user just came online, notify room members
    if (!wasOnline) {
      broadcastToRoom(room.id, {
        type: 'user_online',
        payload: {
          roomId: room.id,
          user: { id: userId, nickname, avatar: getAvatarColor(userId) }
        }
      }, ws);
    }
  });

  send(ws, {
    type: 'reconnected',
    payload: {
      user: { id: client.user.id, nickname: client.user.nickname, avatar: getAvatarColor(userId) },
      rooms: rooms.map(serializeRoom)
    }
  });

  console.log(`${nickname} reconnected with ${rooms.length} rooms`);
}

const PORT = process.env.PORT || 4545;
const HOST = process.env.HOST || '0.0.0.0';

// Clean up expired messages every 10 seconds
const messageCleanupInterval = setInterval(() => {
  const expiredMessages = database.getExpiredMessagesWithRooms();

  if (expiredMessages.length > 0) {
    // Group by room for efficient broadcasting
    const messagesByRoom = new Map<string, string[]>();
    expiredMessages.forEach(({ id, roomId }) => {
      if (!messagesByRoom.has(roomId)) {
        messagesByRoom.set(roomId, []);
      }
      messagesByRoom.get(roomId)!.push(id);
    });

    // Delete from database
    const deletedCount = database.deleteExpiredMessages();

    // Broadcast deletions to rooms
    messagesByRoom.forEach((messageIds, roomId) => {
      messageIds.forEach(messageId => {
        broadcastToRoom(roomId, {
          type: 'message_deleted',
          payload: { messageId, roomId }
        });
      });
    });

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired messages`);
    }
  }
}, 10000);

server.listen(Number(PORT), HOST, () => {
  console.log(`Chat server running on http://${HOST}:${PORT}`);
  console.log('Messages will auto-delete after 2 minutes');
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');

  // Clear message cleanup interval
  clearInterval(messageCleanupInterval);

  // Clear all typing timeouts
  typingTimeouts.forEach(timeout => clearTimeout(timeout));
  typingTimeouts.clear();

  // Close all WebSocket connections
  clients.forEach((_client, ws) => {
    ws.close(1000, 'Server shutting down');
  });

  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
