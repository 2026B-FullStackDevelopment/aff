// Contains active-session database queries used by the Auth module.
import ActiveSession, { type ActiveSessionDocument } from './active-session.model.js';
import type { Types } from 'mongoose';

interface CreateActiveSessionInput {
  jti: string;
  userId: string | Types.ObjectId;
  expiresAt: Date;
}

function createActiveSession(data: CreateActiveSessionInput) {
  return ActiveSession.create(data);
}

function findActiveSessionsByUserId(userId: string | Types.ObjectId) {
  return ActiveSession.find({ userId }).lean<ActiveSessionDocument[]>();
}

function deleteActiveSession(jti: string) {
  return ActiveSession.deleteOne({ jti });
}

function deleteActiveSessionsByUserId(userId: string | Types.ObjectId) {
  return ActiveSession.deleteMany({ userId });
}

export {
  createActiveSession,
  findActiveSessionsByUserId,
  deleteActiveSession,
  deleteActiveSessionsByUserId,
};
export type { CreateActiveSessionInput };
