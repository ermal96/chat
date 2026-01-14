import mongoose, { Schema } from 'mongoose';

export interface IReaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

export interface IReplyTo {
  messageId: string;
  nickname: string;
  content: string;
}

export interface IMessage {
  _id: string;
  roomId: string;
  userId: string;
  nickname: string;
  content: string;
  imageUrl?: string;
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  replyTo?: IReplyTo;
  reactions: IReaction[];
  expiresAt?: Date;
  createdAt: Date;
}

const ReactionSchema = new Schema<IReaction>({
  emoji: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ReplyToSchema = new Schema<IReplyTo>({
  messageId: { type: String, required: true },
  nickname: { type: String, required: true },
  content: { type: String, required: true }
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  _id: { type: String, required: true },
  roomId: { type: String, required: true },
  userId: { type: String, required: true },
  nickname: { type: String, required: true },
  content: { type: String, default: '' },
  imageUrl: { type: String },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  replyTo: { type: ReplyToSchema },
  reactions: [ReactionSchema],
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Index for room message queries
MessageSchema.index({ roomId: 1, createdAt: -1 });
// TTL index for auto-deletion
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
