export {};

import type { Role } from '../modules/users/user.model.js';

declare global {
  interface Error {
    statusCode?: number;
  }

  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}
