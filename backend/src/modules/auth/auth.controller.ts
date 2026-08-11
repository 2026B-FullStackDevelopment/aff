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

async function registerRecipient(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(registerRecipientSchema, req.body);
    const { session, recipient } = await registerService.registerRecipient(payload);

    return created(res, toRecipientAuthDto(session, recipient));
  } catch (error) {
    return next(error);
  }
}

async function registerDonor(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(registerDonorSchema, req.body);
    const { session, donor } = await registerService.registerDonor(payload);

    return created(res, toDonorAuthDto(session, donor));
  } catch (error) {
    return next(error);
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(loginSchema, req.body);
    const session = await loginService.login(payload);

    return ok(res, toAuthDto(session));
  } catch (error) {
    return next(error);
  }
}

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
