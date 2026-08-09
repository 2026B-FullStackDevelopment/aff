// Handles auth HTTP requests and returns safe auth DTO responses.
import * as authService from './auth.service.js';
import { toAuthDto } from './auth.dto.js';
import { created, ok } from '../../shared/http/response.js';

async function register(req, res, next) {
  try {
    const session = await authService.register(req.body);
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

export { register, login };
