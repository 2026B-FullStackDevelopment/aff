// Shapes auth responses so password hashes and internal user fields are never returned.
import { toUserResponseDto } from '../users/user.dto.js';

function toAuthDto(session) {
  return {
    accessToken: session.accessToken,
    user: toUserResponseDto(session.user),
  };
}

export { toAuthDto };
