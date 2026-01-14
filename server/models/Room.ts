import mongoose, { Schema } from 'mongoose';

export type RoomType = 'group' | 'direct';

export interface IRoomMember {
  userId: string;
  joinedAt: Date;
}

export interface IRoom {
  _id: string;
  inviteCode: string;
  name: string;
  type: RoomType;
  members: IRoomMember[];
  createdAt: Date;
}

const RoomMemberSchema = new Schema<IRoomMember>({
  userId: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const RoomSchema = new Schema<IRoom>({
  _id: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['group', 'direct'], required: true },
  members: [RoomMemberSchema],
  createdAt: { type: Date, default: Date.now }
});

// Index for invite code lookups
RoomSchema.index({ inviteCode: 1 });
RoomSchema.index({ 'members.userId': 1 });

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
