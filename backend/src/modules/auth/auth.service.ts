// Contains authentication business rules such as registering and logging in users.
import { userInterface } from '../users/user.interface.js';

async function register(payload) {
  const user = await userInterface.createUser(payload);
  return buildSession(user);
}

async function login(payload) {
  const user = await userInterface.findUserByEmail(payload.email);

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  return buildSession(user);
}

async function verifyAccessToken(token) {
  return {
    userId: token || 'demo-user-id',
    role: 'RECIPIENT',
  };
}

function buildSession(user) {
  return {
    accessToken: `demo-token-for-${user.id || user._id}`,
    user,
  };
}

export { register, login, verifyAccessToken };
