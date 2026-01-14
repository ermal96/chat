import { Room, RoomType, User, Message } from '../shared/types';
import { generateInviteCode, generateId } from './invite';

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private inviteCodeToRoom: Map<string, string> = new Map();

  createRoom(name: string, type: RoomType, creator: User): Room {
    const id = generateId();
    let inviteCode = generateInviteCode();

    // Ensure unique invite code
    while (this.inviteCodeToRoom.has(inviteCode)) {
      inviteCode = generateInviteCode();
    }

    const room: Room = {
      id,
      inviteCode,
      name,
      type,
      createdAt: new Date(),
      members: new Map([[creator.id, creator]]),
      messages: []
    };

    this.rooms.set(id, room);
    this.inviteCodeToRoom.set(inviteCode, id);

    return room;
  }

  getRoomByInviteCode(code: string): Room | undefined {
    const roomId = this.inviteCodeToRoom.get(code.toUpperCase());
    if (roomId) {
      return this.rooms.get(roomId);
    }
    return undefined;
  }

  getRoomById(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  addUserToRoom(roomId: string, user: User): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      room.members.set(user.id, user);
      return true;
    }
    return false;
  }

  removeUserFromRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      room.members.delete(userId);

      // Clean up empty rooms
      if (room.members.size === 0) {
        this.inviteCodeToRoom.delete(room.inviteCode);
        this.rooms.delete(roomId);
      }
      return true;
    }
    return false;
  }

  addMessage(roomId: string, userId: string, nickname: string, content: string): Message | undefined {
    const room = this.rooms.get(roomId);
    if (room) {
      const message: Message = {
        id: generateId(),
        roomId,
        userId,
        nickname,
        content,
        timestamp: new Date()
      };
      room.messages.push(message);

      // Keep only last 100 messages per room
      if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100);
      }

      return message;
    }
    return undefined;
  }

  getRoomMessages(roomId: string): Message[] {
    const room = this.rooms.get(roomId);
    return room ? room.messages : [];
  }

  getRoomMembers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.members.values()) : [];
  }

  getUserRooms(userId: string): Room[] {
    const userRooms: Room[] = [];
    this.rooms.forEach(room => {
      if (room.members.has(userId)) {
        userRooms.push(room);
      }
    });
    return userRooms;
  }
}

export const roomManager = new RoomManager();
