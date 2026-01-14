import mongoose, { Schema } from 'mongoose';

export interface IUser {
  _id: string;
  nickname: string;
  email?: string;
  passwordHash?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  nickname: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  passwordHash: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Index for email lookups
UserSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
