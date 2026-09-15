// Defines internal service types for signing and issuing JWT sessions.
import type { Role, UserDocument } from '../users/user.types.js';

interface AccessTokenPayload { userId: string; role: Role }
interface SignedToken { token: string; jti: string; expiresAt: Date }
interface DecodedToken extends AccessTokenPayload { jti: string; expiresAt: Date }
interface AuthSession { accessToken: string; jti: string; expiresAt: Date; user: UserDocument }

export type { AccessTokenPayload, SignedToken, DecodedToken, AuthSession };
