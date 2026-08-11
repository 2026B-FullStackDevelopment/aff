// Verifies the Bearer token on protected routes before they reach a controller.
import type { Request, Response, NextFunction } from 'express';
import { authInterface } from '../modules/auth/auth.interface.js';

const UNAUTHENTICATED = 'Authentication is required.';

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const [scheme, token] = (authHeader || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: UNAUTHENTICATED });
  }

  try {
    const decoded = await authInterface.verifyAccessToken(token);

    // Role comes from the token payload (docs/api_design.md §2.1); no user lookup here.
    req.user = { id: decoded.userId, role: decoded.role };
    // Logout needs the exact jti and expiry to write a REVOKED_TOKEN row.
    req.auth = { jti: decoded.jti, expiresAt: decoded.expiresAt };

    return next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message || UNAUTHENTICATED });
  }
}

export { requireAuth };
