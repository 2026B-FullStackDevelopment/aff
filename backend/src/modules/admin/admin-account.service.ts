// Implements Admin account-management rules through module interfaces.
import { userInterface } from '../users/user.interface.js';
import { authInterface } from '../auth/auth.interface.js';
import type {
  AdminCouriersQuery,
  AdminUsersQuery,
  CreateCourierInput,
  UpdateUserStatusInput,
} from './admin-account.schemas.js';

async function createCourier(payload: CreateCourierInput) {
  const user = await userInterface.createUser({
    username: payload.username,
    email: payload.email,
    password: payload.tempPassword,
    role: 'COURIER',
  });

  try {
    await userInterface.createCourierProfile({
      userId: user._id,
      fullName: payload.fullName,
    });
  } catch (error) {
    await userInterface.deleteUser(user._id);
    throw error;
  }

  return userInterface.getCourierAccountById(user._id);
}

async function listUsers(query: AdminUsersQuery) {
  return userInterface.listAccounts(query);
}

async function listCouriers(query: AdminCouriersQuery) {
  return userInterface.listCourierAccounts(query);
}

async function updateUserStatus(userId: string, input: UpdateUserStatusInput) {
  const user = await userInterface.updateAccountStatus(userId, input.status);

  if (input.status === 'DEACTIVATED') {
    await authInterface.revokeAllUserSessions(userId, 'ADMIN_DEACTIVATE');
  }

  return user;
}

export { createCourier, listUsers, listCouriers, updateUserStatus };
