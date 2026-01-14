import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Room, Message } from './models';
import { Room as RoomType, User as UserType, Message as MessageType, RoomType as RoomTypeEnum, Reaction } from '../shared/types';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat';

// Connect to MongoDB
export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log(`Database URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Helper to convert MongoDB document to API format
function toUserType(doc: any): UserType {
  return {
    id: doc._id,
    nickname: doc.nickname,
    joinedAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    email: doc.email
  };
}

function toRoomType(doc: any): RoomType {
  return {
    id: doc._id,
    inviteCode: doc.inviteCode,
    name: doc.name,
    type: doc.type as RoomTypeEnum,
    createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    memberCount: doc.members?.length || 0
  };
}

function toMessageType(doc: any): MessageType {
  const message: MessageType = {
    id: doc._id,
    roomId: doc.roomId,
    userId: doc.userId,
    nickname: doc.nickname,
    content: doc.content,
    timestamp: doc.createdAt?.toISOString() || new Date().toISOString(),
    reactions: aggregateReactions(doc.reactions || [])
  };

  if (doc.edited) {
    message.edited = true;
    message.editedAt = doc.editedAt?.toISOString();
  }

  if (doc.replyTo) {
    message.replyTo = {
      id: doc.replyTo.messageId,
      nickname: doc.replyTo.nickname,
      content: doc.replyTo.content
    };
  }

  if (doc.imageUrl) {
    message.imageUrl = doc.imageUrl;
  }

  if (doc.expiresAt) {
    message.expiresAt = doc.expiresAt.toISOString();
  }

  return message;
}

function aggregateReactions(reactions: { emoji: string; userId: string }[]): Reaction[] {
  const reactionMap = new Map<string, string[]>();

  reactions.forEach(r => {
    if (!reactionMap.has(r.emoji)) {
      reactionMap.set(r.emoji, []);
    }
    reactionMap.get(r.emoji)!.push(r.userId);
  });

  return Array.from(reactionMap.entries()).map(([emoji, users]) => ({ emoji, users }));
}

export const database = {
  // User operations
  async createOrUpdateUser(id: string, nickname: string): Promise<UserType> {
    const user = await User.findByIdAndUpdate(
      id,
      { nickname },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return toUserType(user);
  },

  async getUser(id: string): Promise<UserType | undefined> {
    const user = await User.findById(id);
    return user ? toUserType(user) : undefined;
  },

  async getUserByEmail(email: string): Promise<UserType | undefined> {
    const user = await User.findOne({ email: email.toLowerCase() });
    return user ? toUserType(user) : undefined;
  },

  async registerUser(id: string, nickname: string, email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserType }> {
    try {
      // Check if email already exists
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return { success: false, error: 'Email already registered' };
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = new User({
        _id: id,
        nickname,
        email: email.toLowerCase(),
        passwordHash
      });

      await user.save();
      console.log(`User registered: ${nickname} (${email.toLowerCase()})`);

      return {
        success: true,
        user: toUserType(user)
      };
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 11000) {
        return { success: false, error: 'Email already registered' };
      }
      return { success: false, error: 'Registration failed' };
    }
  },

  async loginUser(email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserType }> {
    try {
      console.log(`Login attempt for: ${email.toLowerCase()}`);

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !user.passwordHash) {
        console.log(`User not found: ${email.toLowerCase()}`);
        return { success: false, error: 'Invalid email or password' };
      }

      console.log(`Found user: ${user.nickname}, checking password...`);
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        console.log(`Password mismatch for: ${email.toLowerCase()}`);
        return { success: false, error: 'Invalid email or password' };
      }

      console.log(`Login successful for: ${user.nickname}`);
      return {
        success: true,
        user: toUserType(user)
      };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Login failed' };
    }
  },

  // Room operations
  async createRoom(id: string, inviteCode: string, name: string, type: RoomTypeEnum, creatorId: string): Promise<RoomType> {
    const room = new Room({
      _id: id,
      inviteCode: inviteCode.toUpperCase(),
      name,
      type,
      members: [{ userId: creatorId, joinedAt: new Date() }]
    });

    await room.save();
    return toRoomType(room);
  },

  async getRoomById(id: string): Promise<RoomType | undefined> {
    const room = await Room.findById(id);
    return room ? toRoomType(room) : undefined;
  },

  async getRoomByInviteCode(code: string): Promise<RoomType | undefined> {
    const room = await Room.findOne({ inviteCode: code.toUpperCase() });
    return room ? toRoomType(room) : undefined;
  },

  async deleteRoom(id: string): Promise<void> {
    await Room.findByIdAndDelete(id);
    await Message.deleteMany({ roomId: id });
  },

  // Member operations
  async addMemberToRoom(roomId: string, userId: string): Promise<void> {
    await Room.findByIdAndUpdate(roomId, {
      $addToSet: { members: { userId, joinedAt: new Date() } }
    });
  },

  async removeMemberFromRoom(roomId: string, userId: string): Promise<void> {
    const room = await Room.findByIdAndUpdate(
      roomId,
      { $pull: { members: { userId } } },
      { new: true }
    );

    if (room && room.members.length === 0) {
      await this.deleteRoom(roomId);
    }
  },

  async getRoomMembers(roomId: string): Promise<{ id: string; nickname: string }[]> {
    const room = await Room.findById(roomId);
    if (!room) return [];

    const userIds = room.members.map(m => m.userId);
    const users = await User.find({ _id: { $in: userIds } });

    return users.map(u => ({ id: u._id, nickname: u.nickname }));
  },

  async getMemberCount(roomId: string): Promise<number> {
    const room = await Room.findById(roomId);
    return room?.members.length || 0;
  },

  async getUserRooms(userId: string): Promise<RoomType[]> {
    const rooms = await Room.find({ 'members.userId': userId });
    return rooms.map(toRoomType);
  },

  // Message operations
  async addMessage(
    id: string,
    roomId: string,
    userId: string,
    nickname: string,
    content: string,
    replyTo?: { id: string; nickname: string; content: string },
    imageUrl?: string
  ): Promise<MessageType> {
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    const message = new Message({
      _id: id,
      roomId,
      userId,
      nickname,
      content,
      imageUrl,
      replyTo: replyTo ? {
        messageId: replyTo.id,
        nickname: replyTo.nickname,
        content: replyTo.content
      } : undefined,
      expiresAt,
      reactions: []
    });

    await message.save();
    return toMessageType(message);
  },

  async deleteExpiredMessages(): Promise<number> {
    // MongoDB TTL index handles this automatically
    return 0;
  },

  async getExpiredMessageIds(): Promise<string[]> {
    const now = new Date();
    const messages = await Message.find({
      expiresAt: { $lte: now },
      deleted: false
    }).select('_id');
    return messages.map(m => m._id);
  },

  async getExpiredMessagesWithRooms(): Promise<{ id: string; roomId: string }[]> {
    const now = new Date();
    const messages = await Message.find({
      expiresAt: { $lte: now },
      deleted: false
    }).select('_id roomId');
    return messages.map(m => ({ id: m._id, roomId: m.roomId }));
  },

  async editMessage(messageId: string, userId: string, content: string): Promise<boolean> {
    const result = await Message.updateOne(
      { _id: messageId, userId, deleted: false },
      { content, edited: true, editedAt: new Date() }
    );
    return result.modifiedCount > 0;
  },

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const result = await Message.updateOne(
      { _id: messageId, userId },
      { deleted: true, content: '[Message deleted]' }
    );
    return result.modifiedCount > 0;
  },

  async getRoomMessages(roomId: string): Promise<MessageType[]> {
    const messages = await Message.find({ roomId, deleted: false })
      .sort({ createdAt: -1 })
      .limit(100);
    return messages.map(toMessageType).reverse();
  },

  // Reaction operations
  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await Message.updateOne(
      { _id: messageId },
      { $addToSet: { reactions: { emoji, userId, createdAt: new Date() } } }
    );
  },

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await Message.updateOne(
      { _id: messageId },
      { $pull: { reactions: { emoji, userId } } }
    );
  },

  // Check if invite code exists
  async inviteCodeExists(code: string): Promise<boolean> {
    const room = await Room.findOne({ inviteCode: code.toUpperCase() });
    return !!room;
  }
};
