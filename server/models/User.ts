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

// Note: email index is already created by unique: true option

export const User = mongoose.model<IUser>('User', UserSchema);
