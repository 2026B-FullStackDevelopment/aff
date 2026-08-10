// Contains authentication business rules such as registering and logging in users.
import { userInterface } from '../users/user.interface.js';
import type { CreateUserRequestDto } from '../users/user.dto.js';
import type { UserDocument, Role } from '../users/user.model.js';
import type { AuthSession, LoginRequestDto } from './auth.dto.js';

async function register(payload: CreateUserRequestDto): Promise<AuthSession> {
  const user = await userInterface.createUser(payload);
  return buildSession(user);
}

async function login(payload: LoginRequestDto): Promise<AuthSession> {
  const user = await userInterface.findUserByEmail(payload.email);

  if (!user) {
    const error: Error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  return buildSession(user);
}

async function verifyAccessToken(token: string): Promise<{ userId: string; role: Role }> {
  return {
    userId: token || 'demo-user-id',
    role: 'RECIPIENT',
  };
}

function buildSession(user: UserDocument): AuthSession {
  return {
    accessToken: `demo-token-for-${String(user._id)}`,
    user,
  };
}

export { register, login, verifyAccessToken };
