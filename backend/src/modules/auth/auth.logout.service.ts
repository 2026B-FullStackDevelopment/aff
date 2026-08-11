// Contains the logout business rules, revoking the presented token server-side.
import { revokeToken } from './revoked-token.repository.js';

interface LogoutInput {
  userId: string;
  jti: string;
  expiresAt: Date;
}

async function logout(input: LogoutInput): Promise<void> {
  // Revocation is a server-side write, not a client-side delete (issue #50).
  // Any failure propagates so the client is never told the token is dead when
  // it is not. The repository already treats a duplicate jti as success.
  await revokeToken({
    jti: input.jti,
    userId: input.userId,
    expiresAt: input.expiresAt,
    reason: 'LOGOUT',
  });
}

export { logout };
export type { LogoutInput };
