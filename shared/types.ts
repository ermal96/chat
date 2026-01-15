// Room types (for direct chats)
export type RoomType = 'group' | 'direct';

export interface Room {
  id: string;
  inviteCode: string;
  name: string;
  type: RoomType;
  ownerId: string; // Room creator who can kick members
  createdAt: string;
  memberCount?: number;
  members?: UserInfo[];
  onlineMembers?: string[]; // User IDs of online members
  unreadCount?: number;
  lastMessage?: Message;
}

// Team types (like MS Teams)
export interface Channel {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  unreadCount?: number;
  lastMessage?: Message;
}

export interface TeamMember {
  id: string;
  nickname: string;
  role: 'owner' | 'member';
  isOnline?: boolean;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  channels: Channel[];
  members: TeamMember[];
  memberCount: number;
  createdAt: string;
}

export interface User {
  id: string;
  nickname: string;
  joinedAt: string;
  email?: string;
  avatar?: string; // Color for avatar
}

export interface UserInfo {
  id: string;
  nickname: string;
  isOnline?: boolean;
  avatar?: string;
}

export interface ReactionUser {
  id: string;
  nickname: string;
}

export interface Reaction {
  emoji: string;
  users: ReactionUser[]; // Users who reacted with id and nickname
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: string;
  expiresAt?: string; // Message expiration time (2 min after creation)
  imageUrl?: string; // Image or GIF URL
  edited?: boolean;
  editedAt?: string;
  replyTo?: {
    id: string;
    nickname: string;
    content: string;
  };
  reactions?: Reaction[];
}

// WebSocket message types
export type ClientMessageType =
  | 'register'
  | 'login'
  | 'create_room'
  | 'join_room'
  | 'leave_room'
  | 'kick_user'
  | 'rename_room'
  | 'send_message'
  | 'edit_message'
  | 'delete_message'
  | 'add_reaction'
  | 'remove_reaction'
  | 'typing_start'
  | 'typing_stop'
  | 'get_rooms'
  | 'get_room_history'
  | 'reconnect'
  | 'mark_read'
  | 'change_nickname'
  | 'subscribe_push'
  // Team operations
  | 'create_team'
  | 'join_team'
  | 'leave_team'
  | 'create_channel'
  | 'delete_channel'
  | 'get_channel_history';

export type ServerMessageType =
  | 'registered'
  | 'logged_in'
  | 'room_created'
  | 'room_joined'
  | 'room_left'
  | 'user_kicked'
  | 'new_message'
  | 'message_edited'
  | 'message_deleted'
  | 'reaction_added'
  | 'reaction_removed'
  | 'user_joined'
  | 'user_left'
  | 'user_online'
  | 'user_offline'
  | 'typing'
  | 'room_list'
  | 'error'
  | 'room_history'
  | 'reconnected'
  | 'nickname_changed'
  | 'push_subscribed'
  | 'messages_read'
  | 'room_renamed'
  // Team events
  | 'team_created'
  | 'team_joined'
  | 'team_left'
  | 'team_list'
  | 'channel_created'
  | 'channel_deleted'
  | 'channel_history';

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
  avatar?: string;
}

export interface JoinRoomPayload {
  inviteCode: string;
  nickname: string;
  userId?: string;
  avatar?: string;
}

export interface SendMessagePayload {
  roomId: string;
  content: string;
  imageUrl?: string; // Image or GIF URL
  replyTo?: {
    id: string;
    nickname: string;
    content: string;
  };
}

export interface EditMessagePayload {
  messageId: string;
  roomId: string;
  content: string;
}

export interface DeleteMessagePayload {
  messageId: string;
  roomId: string;
}

export interface ReactionPayload {
  messageId: string;
  roomId: string;
  emoji: string;
}

export interface TypingPayload {
  roomId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface KickUserPayload {
  roomId: string;
  userId: string; // User to kick
}

export interface RenameRoomPayload {
  roomId: string;
  name: string;
}

export interface ReconnectPayload {
  userId: string;
  nickname: string;
  avatar?: string;
}

export interface MarkReadPayload {
  roomId: string;
}

export interface GetRoomHistoryPayload {
  roomId: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  nickname: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Team payloads
export interface CreateTeamPayload {
  name: string;
  description?: string;
}

export interface JoinTeamPayload {
  inviteCode: string;
}

export interface LeaveTeamPayload {
  teamId: string;
}

export interface CreateChannelPayload {
  teamId: string;
  name: string;
  description?: string;
}

export interface DeleteChannelPayload {
  teamId: string;
  channelId: string;
}

export interface GetChannelHistoryPayload {
  channelId: string;
}

export interface ChangeNicknamePayload {
  nickname: string;
}

export interface MarkReadPayload {
  roomId: string;
  messageIds: string[];
}

export interface SubscribePushPayload {
  subscription: PushSubscriptionJSON;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh: string;
    auth: string;
  };
}

// Avatar colors
export const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

export function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(nickname: string): string {
  return nickname
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
