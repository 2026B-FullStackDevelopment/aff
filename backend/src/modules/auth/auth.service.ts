// Re-exports the auth module's services so the module keeps one public entry point.
// The logic lives in auth.register.service, auth.login.service, and
// auth.logout.service; each is small enough to read on its own. Token signing
// and session issuance live in the security module (security.interface.ts).
export { registerRecipient, registerDonor } from './auth.register.service.js';
export { login } from './auth.login.service.js';
export { logout } from './auth.logout.service.js';
