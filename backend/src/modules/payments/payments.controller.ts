// Handles the Stripe webhook HTTP request. See docs/api_design.md §8.
import type { Request, Response, NextFunction } from 'express';
import * as paymentProvider from '../../integrations/payment/payment.provider.js';
import { processWebhookEvent } from './payment.webhook.service.js';
import { ok } from '../../shared/http/response.js';

/**
 * Verifies the Stripe-Signature header against the raw request body, then routes the event to
 * `processWebhookEvent`. Always responds 200 so Stripe doesn't retry (docs/api_design.md §8).
 */
async function handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signatureHeader = req.headers['stripe-signature'];

    if (!req.rawBody || typeof signatureHeader !== 'string') {
      const error: Error = new Error('Missing Stripe-Signature header or request body.');
      error.statusCode = 400;
      throw error;
    }

    const event = paymentProvider.verifyWebhookSignature(req.rawBody, signatureHeader);

    await processWebhookEvent(event);

    return ok(res, null);
  } catch (error) {
    return next(error);
  }
}

export { handleStripeWebhook };
