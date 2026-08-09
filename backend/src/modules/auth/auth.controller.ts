// Handles auth HTTP requests and returns safe auth DTO responses.
import * as authService from './auth.service.js';
import { toAuthDto } from './auth.dto.js';
import { created, ok, notImplemented } from '../../shared/http/response.js';

async function registerRecipient(req, res, next) {
  try {
    const session = await authService.register({ ...req.body, role: 'RECIPIENT' });
    return created(res, toAuthDto(session));
  } catch (error) {
    return next(error);
  }
}

async function registerDonor(req, res, next) {
  try {
    const session = await authService.register({ ...req.body, role: 'DONOR' });
    return created(res, toAuthDto(session));
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const session = await authService.login(req.body);
    return ok(res, toAuthDto(session));
  } catch (error) {
    return next(error);
  }
}

// Real server-side revocation (REVOKED_TOKEN, jti tracking) isn't built yet — see docs/api_design.md §4.
async function logout(_req, res) {
  return notImplemented(res);
}

export { registerRecipient, registerDonor, login, logout };
