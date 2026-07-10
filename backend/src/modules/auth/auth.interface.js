// Exposes safe auth functions for other modules without importing auth.service directly.
const authService = require('./auth.service');

const authInterface = {
  verifyAccessToken: authService.verifyAccessToken,
};

module.exports = { authInterface };
