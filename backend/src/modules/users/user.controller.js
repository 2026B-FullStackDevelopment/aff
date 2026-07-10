// Handles user HTTP requests and delegates profile rules to the user service.
const userService = require('./user.service');
const { toUserDto } = require('./user.dto');
const { ok } = require('../../shared/http/response');

async function getMyProfile(req, res, next) {
  try {
    const user = await userService.getUserById(req.user.id);
    return ok(res, toUserDto(user));
  } catch (error) {
    return next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return ok(res, toUserDto(user));
  } catch (error) {
    return next(error);
  }
}

module.exports = { getMyProfile, getUserById };
