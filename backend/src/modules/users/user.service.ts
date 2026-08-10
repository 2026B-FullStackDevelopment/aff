// Contains user business rules and calls the user repository for database work.
import * as userRepository from './user.repository.js';
import type { CreateUserRequestDto } from './user.dto.js';

async function createUser(payload: CreateUserRequestDto) {
  return userRepository.createUser({
    username: payload.username,
    email: payload.email,
    passwordHash: payload.password || 'replace-with-hash',
    role: payload.role || 'RECIPIENT',
    country: payload.country,
    city: payload.city,
  });
}

async function findUserByEmail(email: string) {
  return userRepository.findUserByEmail(email);
}

async function getUserById(id: string) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    const error: Error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

export { createUser, findUserByEmail, getUserById };
