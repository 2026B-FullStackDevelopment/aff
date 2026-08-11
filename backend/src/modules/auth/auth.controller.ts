// Handles auth HTTP requests and returns safe auth DTO responses.
import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { toAuthDto } from './auth.dto.js';
import { created, ok, notImplemented } from '../../shared/http/response.js';
import type { AuthSession } from './auth.token.service.js';

// auth.service.ts is a stub (Task 14 replaces it with real session issuance) and still
// returns the old { accessToken, user } shape, narrower than the AuthSession that
// toAuthDto now expects. The cast is a type-only bridge; no runtime behaviour changes.
async function registerRecipient(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await authService.register({ ...req.body, role: 'RECIPIENT' });
    return created(res, toAuthDto(session as AuthSession));
  } catch (error) {
    return next(error);
  }
}

async function registerDonor(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await authService.register({ ...req.body, role: 'DONOR' });
    return created(res, toAuthDto(session as AuthSession));
  } catch (error) {
    return next(error);
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await authService.login(req.body);
    return ok(res, toAuthDto(session as AuthSession));
  } catch (error) {
    return next(error);
  }
}

// Real server-side revocation (REVOKED_TOKEN, jti tracking) isn't built yet — see docs/api_design.md §4.
async function logout(_req: Request, res: Response) {
  return notImplemented(res);
}

export { registerRecipient, registerDonor, login, logout };
