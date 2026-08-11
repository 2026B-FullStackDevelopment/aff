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
};

export { userInterface };
