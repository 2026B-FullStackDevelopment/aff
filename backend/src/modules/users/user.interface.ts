// Exposes safe user operations for other modules without importing user.service directly.
const userService = require('./user.service');

const userInterface = {
  createUser: userService.createUser,
  findUserByEmail: userService.findUserByEmail,
  getUserById: userService.getUserById,
  updatePremiumStatus: userService.updatePremiumStatus,
};

module.exports = { userInterface };
