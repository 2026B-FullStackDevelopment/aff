// Shapes auth responses so password hashes and internal user fields are never returned.
import { toUserDto } from '../users/user.dto.js';

function toAuthDto(session) {
  return {
    accessToken: session.accessToken,
    user: toUserDto(session.user),
  };
}

export { toAuthDto };
