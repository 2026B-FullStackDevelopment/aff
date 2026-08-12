// Re-exports the auth module's services so the module keeps one public entry point.
// The logic lives in auth.register.service, auth.login.service, auth.logout.service,
// and auth.token.service; each is small enough to read on its own.
export { registerRecipient, registerDonor } from './auth.register.service.js';
export { login } from './auth.login.service.js';
export { logout } from './auth.logout.service.js';
export { issueSession, verifyAccessToken } from './auth.token.service.js';
