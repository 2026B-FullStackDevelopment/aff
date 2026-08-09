// Contains user business rules and calls the user repository for database work.
import * as userRepository from './user.repository.js';

async function createUser(payload) {
  return userRepository.createUser({
    name: payload.name,
    email: payload.email,
    passwordHash: payload.password || 'replace-with-hash',
    role: payload.role || 'RECIPIENT',
  });
}

async function findUserByEmail(email) {
  return userRepository.findUserByEmail(email);
}

async function getUserById(id) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function updatePremiumStatus(userId, isPremium) {
  return userRepository.updateUser(userId, { isPremium });
}

export { createUser, findUserByEmail, getUserById, updatePremiumStatus };
