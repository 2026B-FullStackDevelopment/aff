// Handles auth HTTP requests and returns safe auth DTO responses.
const authService = require('./auth.service');
const { toAuthDto } = require('./auth.dto');
const { created, ok } = require('../../shared/http/response');

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

module.exports = { register, login };
