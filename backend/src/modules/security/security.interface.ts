// Exposes token and password primitives for other modules without importing
// security service files directly.
import * as tokenService from './token.service.js';
import * as passwordService from './password.service.js';
import * as revokedTokenRepository from './revoked-token.repository.js';

/**
 * The security module's public surface. Per the project's module-boundary
 * rule (`AGENTS.md`), code outside `modules/security` must go through this
 * object rather than importing a security service file directly.
 */
const securityInterface = {
  signAccessToken: tokenService.signAccessToken,
  verifyAccessToken: tokenService.verifyAccessToken,
  issueSession: tokenService.issueSession,
  revokeToken: revokedTokenRepository.revokeToken,
  hashPassword: passwordService.hashPassword,
  verifyPassword: passwordService.verifyPassword,
  dummyCompare: passwordService.dummyCompare,
};

export { securityInterface };
