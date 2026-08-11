// Signs and decodes access tokens so only this file knows the JWT payload shape.
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import type { Role } from '../../modules/users/user.model.js';

interface AccessTokenPayload {
  userId: string;
  role: Role;
}

interface SignedToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

interface DecodedToken extends AccessTokenPayload {
  jti: string;
  expiresAt: Date;
}

function signAccessToken(payload: AccessTokenPayload): SignedToken {
  const jti = randomUUID();
  const token = jwt.sign({ userId: payload.userId, role: payload.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as any,
    jwtid: jti,
  });

  // `exp` is seconds since the epoch; REVOKED_TOKEN.expiresAt is a Date.
  const { exp } = jwt.decode(token) as { exp: number };

  return { token, jti, expiresAt: new Date(exp * 1000) };
}

function decodeAccessToken(token: string): DecodedToken {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as {
      userId: string;
      role: Role;
      jti: string;
      exp: number;
    };

    return {
      userId: payload.userId,
      role: payload.role,
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    // Bad signature, malformed token, and expiry are all the same to a caller.
    const error: Error = new Error('Your session is invalid or has expired.');
    error.statusCode = 401;
    throw error;
  }
}

export { signAccessToken, decodeAccessToken };
export type { AccessTokenPayload, SignedToken, DecodedToken };
