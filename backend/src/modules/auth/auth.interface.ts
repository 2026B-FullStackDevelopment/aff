// Exposes safe auth functions for other modules without importing auth services directly.
import * as authTokenService from './auth.token.service.js';

const authInterface = {
  verifyAccessToken: authTokenService.verifyAccessToken,
};

export { authInterface };
