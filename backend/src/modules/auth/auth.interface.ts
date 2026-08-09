// Exposes safe auth functions for other modules without importing auth.service directly.
import * as authService from './auth.service.js';

const authInterface = {
  verifyAccessToken: authService.verifyAccessToken,
};

export { authInterface };
