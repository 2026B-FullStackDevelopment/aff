// Exposes safe auth functions for other modules without importing auth services directly.
import * as authTokenService from './auth.token.service.js';

/**
 * The auth module's public surface for other modules. Per the project's
 * module-boundary rule (`AGENTS.md`), code outside `modules/auth` must go
 * through this object rather than importing an auth service file directly.
 */
const authInterface = {
  verifyAccessToken: authTokenService.verifyAccessToken,
};

export { authInterface };
