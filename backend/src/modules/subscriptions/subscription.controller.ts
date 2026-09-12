// Handles subscription HTTP requests and returns subscription DTOs.
import type { Request, Response } from 'express';
import { notImplemented } from '../../shared/http/response.js';

// The following need the Stripe recurring-billing integration and the SUBSCRIPTION schema
// (append-only ledger, RECIPIENT.tier derivation) — see docs/api_design.md §10 and docs/blockers.md.
async function getMySubscription(_req: Request, res: Response) {
  return notImplemented(res);
}

async function createSubscriptionCheckoutSession(_req: Request, res: Response) {
  return notImplemented(res);
}

export { getMySubscription, createSubscriptionCheckoutSession };
