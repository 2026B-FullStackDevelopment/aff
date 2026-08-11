// Checks user roles so users cannot access APIs outside their permission level.
import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../modules/users/user.model.js';

function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }

    return next();
  };
}

export { requireRole };
