import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import path from 'path';
import { connectDB, database } from './db';
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
  RegisterPayload,
  LoginPayload,
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
const typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // `${roomId}:${userId}` -> timeout

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
async function serializeRoom(room: Room): Promise<Room> {
  const members = await database.getRoomMembers(room.id);
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
          payload: { roomId, userId, nickname, isTyping: false }
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

async function handleMessage(ws: WebSocket, message: ClientMessage): Promise<void> {
  const client = clients.get(ws);
  if (!client) return;

  switch (message.type) {
    case 'register':
      await handleRegister(ws, client, message.payload as RegisterPayload);
      break;
    case 'login':
      await handleLogin(ws, client, message.payload as LoginPayload);
      break;
    case 'create_room':
      await handleCreateRoom(ws, client, message.payload as CreateRoomPayload);
      break;
    case 'join_room':
      await handleJoinRoom(ws, client, message.payload as JoinRoomPayload);
      break;
    case 'leave_room':
      await handleLeaveRoom(ws, client, message.payload as LeaveRoomPayload);
      break;
    case 'send_message':
      await handleSendMessage(ws, client, message.payload as SendMessagePayload);
      break;
    case 'edit_message':
      await handleEditMessage(ws, client, message.payload as EditMessagePayload);
      break;
    case 'delete_message':
      await handleDeleteMessage(ws, client, message.payload as DeleteMessagePayload);
      break;
    case 'add_reaction':
      await handleAddReaction(ws, client, message.payload as ReactionPayload);
      break;
    case 'remove_reaction':
      await handleRemoveReaction(ws, client, message.payload as ReactionPayload);
      break;
    case 'typing_start':
      handleTypingStart(ws, client, message.payload as TypingPayload);
      break;
    case 'typing_stop':
      handleTypingStop(ws, client, message.payload as TypingPayload);
      break;
    case 'get_rooms':
      await handleGetRooms(ws, client);
      break;
    case 'reconnect':
      await handleReconnect(ws, client, message.payload as ReconnectPayload);
      break;
  }
}

async function handleRegister(ws: WebSocket, client: ConnectedClient, payload: RegisterPayload): Promise<void> {
  const { email, password, nickname } = payload;

  if (!email || !password || !nickname) {
    send(ws, { type: 'error', payload: { message: 'Email, password, and nickname are required' } });
    return;
  }

  if (password.length < 6) {
    send(ws, { type: 'error', payload: { message: 'Password must be at least 6 characters' } });
    return;
  }

  const id = generateId();
  const result = await database.registerUser(id, nickname, email, password);

  if (!result.success) {
    send(ws, { type: 'error', payload: { message: result.error || 'Registration failed' } });
    return;
  }

  client.user = result.user!;
  trackUserConnection(id, ws);

  send(ws, {
    type: 'registered',
    payload: {
      user: { id: client.user.id, nickname: client.user.nickname, email: client.user.email, avatar: getAvatarColor(id) }
    }
  });

  console.log(`User registered: ${nickname} (${email})`);
}

async function handleLogin(ws: WebSocket, client: ConnectedClient, payload: LoginPayload): Promise<void> {
  const { email, password } = payload;

  if (!email || !password) {
    send(ws, { type: 'error', payload: { message: 'Email and password are required' } });
    return;
  }

  const result = await database.loginUser(email, password);

  if (!result.success) {
    send(ws, { type: 'error', payload: { message: result.error || 'Login failed' } });
    return;
  }

  const wasOnline = isUserOnline(result.user!.id);
  client.user = result.user!;
  trackUserConnection(result.user!.id, ws);

  // Get user's rooms from database
  const rooms = await database.getUserRooms(result.user!.id);
  rooms.forEach(room => {
    client.rooms.add(room.id);

    // If user just came online, notify room members
    if (!wasOnline) {
      broadcastToRoom(room.id, {
        type: 'user_online',
        payload: {
          roomId: room.id,
          user: { id: result.user!.id, nickname: result.user!.nickname, avatar: getAvatarColor(result.user!.id) }
        }
      }, ws);
    }
  });

  // Serialize rooms with member info
  const serializedRooms = await Promise.all(rooms.map(serializeRoom));

  send(ws, {
    type: 'logged_in',
    payload: {
      user: { id: client.user.id, nickname: client.user.nickname, email: client.user.email, avatar: getAvatarColor(client.user.id) },
      rooms: serializedRooms
    }
  });

  console.log(`User logged in: ${result.user!.nickname} (${email}) with ${rooms.length} rooms`);
}

async function handleCreateRoom(ws: WebSocket, client: ConnectedClient, payload: CreateRoomPayload): Promise<void> {
  const { name, type, nickname, userId } = payload;

  if (!name || !nickname) {
    send(ws, { type: 'error', payload: { message: 'Name and nickname are required' } });
    return;
  }

  // Create or reuse user
  const id = userId || generateId();
  client.user = await database.createOrUpdateUser(id, nickname);
  trackUserConnection(id, ws);

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  while (await database.inviteCodeExists(inviteCode)) {
    inviteCode = generateInviteCode();
  }

  const roomId = generateId();
  const room = await database.createRoom(roomId, inviteCode, name, type, client.user.id);
  client.rooms.add(room.id);

  const serializedRoom = await serializeRoom(room);

  send(ws, {
    type: 'room_created',
    payload: {
      room: serializedRoom,
      user: { id: client.user.id, nickname: client.user.nickname, avatar: getAvatarColor(client.user.id) }
    }
  });

  console.log(`Room created: ${room.name} (${room.inviteCode}) by ${nickname}`);
}

async function handleJoinRoom(ws: WebSocket, client: ConnectedClient, payload: JoinRoomPayload): Promise<void> {
  const { inviteCode, nickname, userId } = payload;

  if (!inviteCode || !nickname) {
    send(ws, { type: 'error', payload: { message: 'Invite code and nickname are required' } });
    return;
  }

  const room = await database.getRoomByInviteCode(inviteCode);
  if (!room) {
    send(ws, { type: 'error', payload: { message: 'Invalid invite code' } });
    return;
  }

  // Create or reuse user
  const id = userId || generateId();
  const wasOnline = isUserOnline(id);
  client.user = await database.createOrUpdateUser(id, nickname);
  trackUserConnection(id, ws);

  // Check if already in room (in this session)
  if (client.rooms.has(room.id)) {
    send(ws, { type: 'error', payload: { message: 'Already in this room' } });
    return;
  }

  // Add user to room in database
  await database.addMemberToRoom(room.id, client.user.id);
  client.rooms.add(room.id);

  const userInfo = { id: client.user.id, nickname: client.user.nickname, avatar: getAvatarColor(client.user.id) };

  const serializedRoom = await serializeRoom(room);

  // Send room info to joining user
  send(ws, {
    type: 'room_joined',
    payload: {
      room: serializedRoom,
      user: userInfo
    }
  });

  // Send message history
  const messages = await database.getRoomMessages(room.id);
  send(ws, {
    type: 'room_history',
    payload: {
      roomId: room.id,
      messages
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

async function handleLeaveRoom(ws: WebSocket, client: ConnectedClient, payload: LeaveRoomPayload): Promise<void> {
  const { roomId } = payload;

  if (!client.user || !client.rooms.has(roomId)) {
    send(ws, { type: 'error', payload: { message: 'Not in this room' } });
    return;
  }

  // Remove from database
  await database.removeMemberFromRoom(roomId, client.user.id);
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

async function handleSendMessage(ws: WebSocket, client: ConnectedClient, payload: SendMessagePayload): Promise<void> {
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
  const message = await database.addMessage(
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

async function handleEditMessage(ws: WebSocket, client: ConnectedClient, payload: EditMessagePayload): Promise<void> {
  const { messageId, roomId, content } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  if (!content || content.trim().length === 0) {
    send(ws, { type: 'error', payload: { message: 'Message cannot be empty' } });
    return;
  }

  const updated = await database.editMessage(messageId, client.user.id, content.trim());
  if (!updated) {
    send(ws, { type: 'error', payload: { message: 'Cannot edit this message' } });
    return;
  }

  broadcastToRoom(roomId, {
    type: 'message_edited',
    payload: { messageId, roomId, content: content.trim(), editedAt: new Date().toISOString() }
  });
}

async function handleDeleteMessage(ws: WebSocket, client: ConnectedClient, payload: DeleteMessagePayload): Promise<void> {
  const { messageId, roomId } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  const deleted = await database.deleteMessage(messageId, client.user.id);
  if (!deleted) {
    send(ws, { type: 'error', payload: { message: 'Cannot delete this message' } });
    return;
  }

  broadcastToRoom(roomId, {
    type: 'message_deleted',
    payload: { messageId, roomId }
  });
}

async function handleAddReaction(ws: WebSocket, client: ConnectedClient, payload: ReactionPayload): Promise<void> {
  const { messageId, roomId, emoji } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  await database.addReaction(messageId, client.user.id, emoji);

  broadcastToRoom(roomId, {
    type: 'reaction_added',
    payload: { messageId, roomId, userId: client.user.id, emoji }
  });
}

async function handleRemoveReaction(ws: WebSocket, client: ConnectedClient, payload: ReactionPayload): Promise<void> {
  const { messageId, roomId, emoji } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  await database.removeReaction(messageId, client.user.id, emoji);

  broadcastToRoom(roomId, {
    type: 'reaction_removed',
    payload: { messageId, roomId, userId: client.user.id, emoji }
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
      payload: { roomId, userId: client.user.id, nickname: client.user.nickname, isTyping: true }
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
      payload: { roomId, userId: client.user.id, nickname: client.user.nickname, isTyping: false }
    }, ws);
  }
}

async function handleGetRooms(ws: WebSocket, client: ConnectedClient): Promise<void> {
  if (!client.user) {
    send(ws, { type: 'room_list', payload: { rooms: [] } });
    return;
  }

  const rooms = await database.getUserRooms(client.user.id);
  const serializedRooms = await Promise.all(rooms.map(serializeRoom));
  send(ws, { type: 'room_list', payload: { rooms: serializedRooms } });
}

async function handleReconnect(ws: WebSocket, client: ConnectedClient, payload: ReconnectPayload): Promise<void> {
  const { userId, nickname } = payload;

  if (!userId || !nickname) {
    send(ws, { type: 'error', payload: { message: 'User ID and nickname required for reconnect' } });
    return;
  }

  const wasOnline = isUserOnline(userId);

  // Get or create user
  client.user = await database.createOrUpdateUser(userId, nickname);
  trackUserConnection(userId, ws);

  // Get user's rooms from database
  const rooms = await database.getUserRooms(userId);
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

  const serializedRooms = await Promise.all(rooms.map(serializeRoom));

  send(ws, {
    type: 'reconnected',
    payload: {
      user: { id: client.user.id, nickname: client.user.nickname, avatar: getAvatarColor(userId) },
      rooms: serializedRooms
    }
  });

  console.log(`${nickname} reconnected with ${rooms.length} rooms`);
}

const PORT = process.env.PORT || 4545;
const HOST = process.env.HOST || '0.0.0.0';

// Clean up expired messages every 10 seconds
const messageCleanupInterval = setInterval(async () => {
  try {
    const expiredMessages = await database.getExpiredMessagesWithRooms();

    if (expiredMessages.length > 0) {
      // Group by room for efficient broadcasting
      const messagesByRoom = new Map<string, string[]>();
      expiredMessages.forEach(({ id, roomId }) => {
        if (!messagesByRoom.has(roomId)) {
          messagesByRoom.set(roomId, []);
        }
        messagesByRoom.get(roomId)!.push(id);
      });

      // Delete from database (MongoDB TTL handles this, but we still broadcast)
      const deletedCount = await database.deleteExpiredMessages();

      // Broadcast deletions to rooms
      messagesByRoom.forEach((messageIds, roomId) => {
        messageIds.forEach(messageId => {
          broadcastToRoom(roomId, {
            type: 'message_deleted',
            payload: { messageId, roomId }
          });
        });
      });

      if (expiredMessages.length > 0) {
        console.log(`Cleaned up ${expiredMessages.length} expired messages`);
      }
    }
  } catch (err) {
    console.error('Error cleaning up expired messages:', err);
  }
}, 10000);

// Start server after connecting to MongoDB
async function startServer() {
  try {
    await connectDB();

    server.listen(Number(PORT), HOST, () => {
      console.log(`Chat server running on http://${HOST}:${PORT}`);
      console.log('Messages will auto-delete after 2 minutes');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

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
