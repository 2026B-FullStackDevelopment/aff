export {};

import type { Role } from '../modules/users/user.model.js';
import type { OrderFeedback } from '../modules/orders/order.model.js';

declare global {
  interface Error {
    statusCode?: number;
    // Set on the 429 thrown by login so the error DTO can surface it (api_design.md §4).
    lockedUntilSeconds?: number;
    // Set on the 409 from submitFeedback when feedback was already submitted, so the client gets
    // the existing feedback back instead of just a message (D7).
    feedback?: OrderFeedback;
  }

  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
      // Set by requireAuth so logout can revoke the exact token that was presented.
      auth?: {
        jti: string;
        expiresAt: Date;
      };
      // Captured by express.json()'s verify callback so the Stripe webhook can check its signature
      // against the exact bytes Stripe signed (the parsed req.body is not sufficient).
      rawBody?: Buffer;
    }
  }
}
