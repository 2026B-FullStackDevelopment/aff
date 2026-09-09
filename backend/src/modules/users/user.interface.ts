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
  createCourierProfile: userService.createCourierProfile,
  listAccounts: userService.listAccounts,
  listCourierAccounts: userService.listCourierAccounts,
  updateAccountStatus: userService.updateAccountStatus,
  getCourierAccountById: userService.getCourierAccountById,
  getDonorByUserId: userService.getDonorByUserId,
  findRecipientByUserId: userService.findRecipientByUserId,
  setRecipientStripeCustomerId: userService.setRecipientStripeCustomerId,
};

export { userInterface };
