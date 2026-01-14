// Room types
export type RoomType = 'group' | 'direct';

export interface Room {
  id: string;
  inviteCode: string;
  name: string;
  type: RoomType;
  createdAt: Date;
  members: Map<string, User>;
  messages: Message[];
}

export interface User {
  id: string;
  nickname: string;
  joinedAt: Date;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: Date;
}

// WebSocket message types
export type ClientMessageType =
  | 'create_room'
  | 'join_room'
  | 'leave_room'
  | 'send_message'
  | 'get_rooms';

export type ServerMessageType =
  | 'room_created'
  | 'room_joined'
  | 'room_left'
  | 'new_message'
  | 'user_joined'
  | 'user_left'
  | 'room_list'
  | 'error'
  | 'room_history';

export interface ClientMessage {
  type: ClientMessageType;
  payload: any;
}

export interface ServerMessage {
  type: ServerMessageType;
  payload: any;
}

// Payloads
export interface CreateRoomPayload {
  name: string;
  type: RoomType;
  nickname: string;
}

export interface JoinRoomPayload {
  inviteCode: string;
  nickname: string;
}

export interface SendMessagePayload {
  roomId: string;
  content: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}
