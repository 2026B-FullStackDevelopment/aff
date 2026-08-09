// Handles subscription HTTP requests and returns subscription DTOs.
import * as subscriptionService from './subscription.service.js';
import { toSubscriptionDto } from './subscription.dto.js';
import { created, notImplemented } from '../../shared/http/response.js';

// The following need the Stripe recurring-billing integration and the SUBSCRIPTION schema
// (append-only ledger, RECIPIENT.tier derivation) — see docs/api_design.md §10 and docs/blockers.md.
async function getMySubscription(_req, res) {
  return notImplemented(res);
}

async function createSubscriptionCheckoutSession(_req, res) {
  return notImplemented(res);
}

async function updateNotificationPreferences(_req, res) {
  return notImplemented(res);
}

export { getMySubscription, createSubscriptionCheckoutSession, updateNotificationPreferences };
