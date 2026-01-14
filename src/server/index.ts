import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import path from 'path';
import { roomManager } from './rooms';
import { generateId } from './invite';
import {
  ClientMessage,
  ServerMessage,
  CreateRoomPayload,
  JoinRoomPayload,
  SendMessagePayload,
  LeaveRoomPayload,
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

// Serve static files
app.use(express.static(path.join(__dirname, '../../public')));

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
  const room = roomManager.getRoomById(roomId);
  if (!room) return;

  clients.forEach((client, ws) => {
    if (ws !== excludeWs && client.rooms.has(roomId)) {
      send(ws, message);
    }
  });
}

// Serialize room for sending to client
function serializeRoom(room: Room) {
  return {
    id: room.id,
    inviteCode: room.inviteCode,
    name: room.name,
    type: room.type,
    memberCount: room.members.size,
    members: Array.from(room.members.values()).map(u => ({
      id: u.id,
      nickname: u.nickname
    }))
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

  ws.on('message', (data: string) => {
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
      // Remove user from all rooms and notify others
      client.rooms.forEach(roomId => {
        roomManager.removeUserFromRoom(roomId, client.user!.id);
        broadcastToRoom(roomId, {
          type: 'user_left',
          payload: {
            roomId,
            user: { id: client.user!.id, nickname: client.user!.nickname }
          }
        });
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
  }
}

function handleCreateRoom(ws: WebSocket, client: ConnectedClient, payload: CreateRoomPayload): void {
  const { name, type, nickname } = payload;

  if (!name || !nickname) {
    send(ws, { type: 'error', payload: { message: 'Name and nickname are required' } });
    return;
  }

  // Create or reuse user
  if (!client.user) {
    client.user = {
      id: generateId(),
      nickname,
      joinedAt: new Date()
    };
  }

  const room = roomManager.createRoom(name, type, client.user);
  client.rooms.add(room.id);

  send(ws, {
    type: 'room_created',
    payload: {
      room: serializeRoom(room),
      user: { id: client.user.id, nickname: client.user.nickname }
    }
  });

  console.log(`Room created: ${room.name} (${room.inviteCode})`);
}

function handleJoinRoom(ws: WebSocket, client: ConnectedClient, payload: JoinRoomPayload): void {
  const { inviteCode, nickname } = payload;

  if (!inviteCode || !nickname) {
    send(ws, { type: 'error', payload: { message: 'Invite code and nickname are required' } });
    return;
  }

  const room = roomManager.getRoomByInviteCode(inviteCode);
  if (!room) {
    send(ws, { type: 'error', payload: { message: 'Invalid invite code' } });
    return;
  }

  // Check if already in room
  if (client.rooms.has(room.id)) {
    send(ws, { type: 'error', payload: { message: 'Already in this room' } });
    return;
  }

  // Create or update user
  if (!client.user) {
    client.user = {
      id: generateId(),
      nickname,
      joinedAt: new Date()
    };
  }

  roomManager.addUserToRoom(room.id, client.user);
  client.rooms.add(room.id);

  // Send room info and history to joining user
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
      messages: roomManager.getRoomMessages(room.id)
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

  roomManager.removeUserFromRoom(roomId, client.user.id);
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

  const message = roomManager.addMessage(roomId, client.user.id, client.user.nickname, content.trim());

  if (message) {
    // Broadcast to all room members including sender
    broadcastToRoom(roomId, {
      type: 'new_message',
      payload: { message }
    });
  }
}

function handleGetRooms(ws: WebSocket, client: ConnectedClient): void {
  if (!client.user) {
    send(ws, { type: 'room_list', payload: { rooms: [] } });
    return;
  }

  const rooms = roomManager.getUserRooms(client.user.id).map(serializeRoom);
  send(ws, { type: 'room_list', payload: { rooms } });
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(Number(PORT), HOST, () => {
  console.log(`Chat server running on http://${HOST}:${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');

  // Close all WebSocket connections
  clients.forEach((client, ws) => {
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
