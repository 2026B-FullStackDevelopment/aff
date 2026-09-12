// Exposes safe user operations for other modules without importing user.service directly.
import * as userService from './user.service.js';

const userInterface = {
  createUser: userService.createUser,
  findUserByEmail: userService.findUserByEmail,
  getUserById: userService.getUserById,
  deleteUser: userService.deleteUser,
  updateLoginState: userService.updateLoginState,
  recordFailedLogin: userService.recordFailedLogin,
  lockAccount: userService.lockAccount,
  createRecipientProfile: userService.createRecipientProfile,
  createDonorProfile: userService.createDonorProfile,
  createCourierAccount: userService.createCourierAccount,
  listCouriers: userService.listCouriers,
  listUsersForAdmin: userService.listUsersForAdmin,
  findCourierProfilesByUserIds: userService.findCourierProfilesByUserIds,
  findDonorsByUserIds: userService.findDonorsByUserIds,
  getDonorByUserId: userService.getDonorByUserId,
  findRecipientByUserId: userService.findRecipientByUserId,
  setRecipientStripeCustomerId: userService.setRecipientStripeCustomerId,
};

export { userInterface };
