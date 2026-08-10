// Handles the Stripe webhook HTTP request. See docs/api_design.md §8.
import type { Request, Response } from 'express';
import { notImplemented } from '../../shared/http/response.js';

// Signature verification, event-type routing (checkout.session.completed, invoice.paid, etc.),
// and PAYMENT.lastProcessedEventId idempotency aren't built yet.
async function handleStripeWebhook(_req: Request, res: Response) {
  return notImplemented(res);
}

export { handleStripeWebhook };
