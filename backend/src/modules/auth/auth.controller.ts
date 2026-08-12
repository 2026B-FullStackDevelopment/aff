// Handles auth HTTP requests and returns safe auth DTO responses.
import type { Request, Response, NextFunction } from 'express';
import * as registerService from './auth.register.service.js';
import * as loginService from './auth.login.service.js';
import * as logoutService from './auth.logout.service.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import {
  registerRecipientSchema,
  registerDonorSchema,
  loginSchema,
} from './auth.schemas.js';
import { toAuthDto, toRecipientAuthDto, toDonorAuthDto } from './auth.dto.js';
import { created, ok } from '../../shared/http/response.js';

/**
 * `POST /auth/register/recipient` — public. Validates the body, registers a
 * new Recipient, and returns `201` with the new session.
 */
async function registerRecipient(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(registerRecipientSchema, req.body);
    const { session, recipient } = await registerService.registerRecipient(payload);

    return created(res, toRecipientAuthDto(session, recipient));
  } catch (error) {
    return next(error);
  }
}

/**
 * `POST /auth/register/donor` — public. Validates the body, registers a new
 * Donor, and returns `201` with the new session.
 */
async function registerDonor(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(registerDonorSchema, req.body);
    const { session, donor } = await registerService.registerDonor(payload);

    return created(res, toDonorAuthDto(session, donor));
  } catch (error) {
    return next(error);
  }
}

/**
 * `POST /auth/login` — public. Validates the body and authenticates the
 * user, returning `200` with a session on success.
 */
async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(loginSchema, req.body);
    const session = await loginService.login(payload);

    return ok(res, toAuthDto(session));
  } catch (error) {
    return next(error);
  }
}

/**
 * `POST /auth/logout` — requires a valid Bearer token (`requireAuth`).
 * Revokes the presented token and returns `200` with `{ data: null }`.
 */
async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // requireAuth guarantees req.user and req.auth are present.
    await logoutService.logout({
      userId: req.user.id,
      jti: req.auth.jti,
      expiresAt: req.auth.expiresAt,
    });

    return ok(res, null);
  } catch (error) {
    return next(error);
  }
}

export { registerRecipient, registerDonor, login, logout };
