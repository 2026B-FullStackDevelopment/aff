// Shapes auth responses so password hashes and internal user fields are never returned.
const { toUserDto } = require('../users/user.dto');

function toAuthDto(session) {
  return {
    accessToken: session.accessToken,
    user: toUserDto(session.user),
  };
}

module.exports = { toAuthDto };
