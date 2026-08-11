// Contains user database queries so services do not call Mongoose directly.
import User, { type UserDocument, type Role } from './user.model.js';
import type { Types } from 'mongoose';

interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  country?: string;
  city?: string;
}

function createUser(data: CreateUserInput) {
  return User.create(data);
}

function findUserByEmail(email: string) {
  return User.findOne({ email }).lean<UserDocument>();
}

function findUserById(id: string | Types.ObjectId) {
  return User.findById(id).lean<UserDocument>();
}

function updateUser(id: string | Types.ObjectId, data: Partial<CreateUserInput>) {
  return User.findByIdAndUpdate(id, data, { new: true }).lean<UserDocument>();
}

interface LoginStateUpdate {
  failedLoginCount: number;
  windowStartedAt: Date | null;
  lockedUntil: Date | null;
}

function updateLoginState(id: string | Types.ObjectId, state: LoginStateUpdate) {
  return User.updateOne({ _id: id }, { ...state });
}

function deleteUser(id: string | Types.ObjectId) {
  return User.deleteOne({ _id: id });
}

export { createUser, findUserByEmail, findUserById, updateUser, updateLoginState, deleteUser };
export type { CreateUserInput, LoginStateUpdate };
