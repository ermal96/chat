import mongoose, { Schema } from 'mongoose';

export interface IChannel {
  _id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface ITeamMember {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

export interface ITeam {
  _id: string;
  name: string;
  description?: string;
  inviteCode: string;
  channels: IChannel[];
  members: ITeamMember[];
  createdAt: Date;
}

const ChannelSchema = new Schema<IChannel>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const TeamMemberSchema = new Schema<ITeamMember>({
  userId: { type: String, required: true },
  role: { type: String, enum: ['owner', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const TeamSchema = new Schema<ITeam>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  inviteCode: { type: String, required: true, unique: true, uppercase: true },
  channels: [ChannelSchema],
  members: [TeamMemberSchema],
  createdAt: { type: Date, default: Date.now }
});

// Note: inviteCode index is already created by unique: true option
TeamSchema.index({ 'members.userId': 1 });

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
