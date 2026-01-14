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
  LeaveRoomPayload,
  ReconnectPayload,
  User,
  Room
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
}

const clients: Map<WebSocket, ConnectedClient> = new Map();

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

// Serialize room for sending to client
function serializeRoom(room: Room): Room & { memberCount: number; members: { id: string; nickname: string }[] } {
  const members = database.getRoomMembers(room.id);
  return {
    ...room,
    memberCount: members.length,
    members
  };
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  // Initialize client
  const client: ConnectedClient = {
    ws,
    user: null,
    rooms: new Set()
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
      // Notify rooms about user disconnection
      client.rooms.forEach(roomId => {
        broadcastToRoom(roomId, {
          type: 'user_left',
          payload: {
            roomId,
            user: { id: client.user!.id, nickname: client.user!.nickname }
          }
        }, ws);
      });
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
      user: { id: client.user.id, nickname: client.user.nickname }
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
  client.user = database.createOrUpdateUser(id, nickname);

  // Check if already in room (in this session)
  if (client.rooms.has(room.id)) {
    send(ws, { type: 'error', payload: { message: 'Already in this room' } });
    return;
  }

  // Add user to room in database
  database.addMemberToRoom(room.id, client.user.id);
  client.rooms.add(room.id);

  // Send room info to joining user
  send(ws, {
    type: 'room_joined',
    payload: {
      room: serializeRoom(room),
      user: { id: client.user.id, nickname: client.user.nickname }
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
    payload: {
      roomId: room.id,
      user: { id: client.user.id, nickname: client.user.nickname }
    }
  }, ws);

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

  send(ws, {
    type: 'room_left',
    payload: { roomId }
  });

  // Notify others
  broadcastToRoom(roomId, {
    type: 'user_left',
    payload: {
      roomId,
      user: { id: client.user.id, nickname: client.user.nickname }
    }
  });

  console.log(`${client.user.nickname} left room: ${roomId}`);
}

function handleSendMessage(ws: WebSocket, client: ConnectedClient, payload: SendMessagePayload): void {
  const { roomId, content } = payload;

  if (!client.user) {
    send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
    return;
  }

  if (!client.rooms.has(roomId)) {
    send(ws, { type: 'error', payload: { message: 'Not in this room' } });
    return;
  }

  if (!content || content.trim().length === 0) {
    send(ws, { type: 'error', payload: { message: 'Message cannot be empty' } });
    return;
  }

  const messageId = generateId();
  const message = database.addMessage(messageId, roomId, client.user.id, client.user.nickname, content.trim());

  // Broadcast to all room members including sender
  broadcastToRoom(roomId, {
    type: 'new_message',
    payload: { message }
  });
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

  // Get or create user
  client.user = database.createOrUpdateUser(userId, nickname);

  // Get user's rooms from database
  const rooms = database.getUserRooms(userId);
  rooms.forEach(room => {
    client.rooms.add(room.id);
    // Notify room members that user is back online
    broadcastToRoom(room.id, {
      type: 'user_joined',
      payload: {
        roomId: room.id,
        user: { id: client.user!.id, nickname: client.user!.nickname }
      }
    }, ws);
  });

  send(ws, {
    type: 'reconnected',
    payload: {
      user: { id: client.user.id, nickname: client.user.nickname },
      rooms: rooms.map(serializeRoom)
    }
  });

  console.log(`${nickname} reconnected with ${rooms.length} rooms`);
}

const PORT = process.env.PORT || 4545;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(Number(PORT), HOST, () => {
  console.log(`Chat server running on http://${HOST}:${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');

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
