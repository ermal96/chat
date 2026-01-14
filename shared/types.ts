// Room types
export type RoomType = 'group' | 'direct';

export interface Room {
  id: string;
  inviteCode: string;
  name: string;
  type: RoomType;
  createdAt: string;
  memberCount?: number;
  members?: UserInfo[];
}

export interface User {
  id: string;
  nickname: string;
  joinedAt: string;
}

export interface UserInfo {
  id: string;
  nickname: string;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: string;
}

// WebSocket message types
export type ClientMessageType =
  | 'create_room'
  | 'join_room'
  | 'leave_room'
  | 'send_message'
  | 'get_rooms'
  | 'reconnect';

export type ServerMessageType =
  | 'room_created'
  | 'room_joined'
  | 'room_left'
  | 'new_message'
  | 'user_joined'
  | 'user_left'
  | 'room_list'
  | 'error'
  | 'room_history'
  | 'reconnected';

export interface ClientMessage {
  type: ClientMessageType;
  payload: unknown;
}

export interface ServerMessage {
  type: ServerMessageType;
  payload: unknown;
}

// Payloads
export interface CreateRoomPayload {
  name: string;
  type: RoomType;
  nickname: string;
  userId?: string;
}

export interface JoinRoomPayload {
  inviteCode: string;
  nickname: string;
  userId?: string;
}

export interface SendMessagePayload {
  roomId: string;
  content: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface ReconnectPayload {
  userId: string;
  nickname: string;
}
