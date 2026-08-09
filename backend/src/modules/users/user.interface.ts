// Exposes safe user operations for other modules without importing user.service directly.
import * as userService from './user.service.js';

const userInterface = {
  createUser: userService.createUser,
  findUserByEmail: userService.findUserByEmail,
  getUserById: userService.getUserById,
  updatePremiumStatus: userService.updatePremiumStatus,
};

export { userInterface };
