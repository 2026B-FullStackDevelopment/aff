// Wraps the Stripe SDK for one-off order payments and Premium subscription billing.
// Only this file may talk to Stripe directly — other modules go through payments.service.ts.
import Stripe from 'stripe';
import { env } from '../../config/env.js';

let client: Stripe | undefined;

function getClient() {
  if (!env.stripeSecretKey) {
    throw new Error('Stripe is not configured: set STRIPE_SECRET_KEY');
  }
  if (!client) {
    client = new Stripe(env.stripeSecretKey);
  }
  return client;
}

/**
 * Creates a new Stripe Customer.
 * @param email - the Recipient's email, attached to the Stripe Customer record
 * @param metadata - optional key/value tags (e.g. userId) for cross-referencing in the Stripe dashboard
 */
async function createStripeCustomer({ email, metadata }: { email: string; metadata?: Record<string, string> }) {
  const customer = await getClient().customers.create({ email, metadata });

  return {
    provider: 'stripe',
    customerId: customer.id,
  };
}

/**
 * Starts a one-off Stripe Checkout Session (hosted redirect flow) for a single payable amount.
 * @param customerId - the Stripe Customer to attach the session to
 * @param amount - total charge in the currency's smallest unit (e.g. cents)
 * @param currency - ISO currency code (e.g. "usd")
 * @param successUrl - where Stripe redirects the browser after a successful payment
 * @param cancelUrl - where Stripe redirects the browser if the customer backs out
 * @param metadata - optional key/value tags (e.g. orderId) so the webhook can look up what was paid for
 */
async function createCheckoutSession({
  customerId,
  amount,
  currency,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const session = await getClient().checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    // TODO: this sends one generic line item covering the whole order amount, not the
    // order's actual itemized contents. Fine for now since this helper is intentionally
    // generic (no order-specific logic per the payments-foundation ticket) — revisit if
    // D2/C3 want real per-item names/quantities to show on the Stripe checkout page.
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name: 'AFF order' },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });

  return {
    provider: 'stripe',
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

/**
 * Starts a Stripe Checkout Session (hosted redirect flow) for the $5/month Premium subscription.
 * @param customerId - the Stripe Customer to attach the subscription to
 * @param successUrl - where Stripe redirects the browser after a successful subscribe
 * @param cancelUrl - where Stripe redirects the browser if the customer backs out
 * @param metadata - optional key/value tags (e.g. userId) so the webhook can look up who subscribed
 */
async function createSubscriptionCheckoutSession({
  customerId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const session = await getClient().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    // Fixed $5/month price built inline rather than referencing a pre-created Stripe
    // Price object — confirmed design decision, not a gap (test-mode only, no Dashboard
    // setup needed). Unlike the one-off checkout above, there's nothing to itemize here.
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 500,
          recurring: { interval: 'month' },
          product_data: { name: 'AFF Premium' },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });

  return {
    provider: 'stripe',
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

/**
 * Verifies and parses an incoming Stripe webhook event.
 * @param rawBody - the exact, unparsed request bytes Stripe signed (see req.rawBody in app.ts)
 * @param signatureHeader - the value of the `Stripe-Signature` request header
 * @throws {Error} with statusCode = 400 if the signature is missing/invalid
 */
function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string) {
  if (!env.stripeWebhookSecret) {
    throw new Error('Stripe is not configured: set STRIPE_WEBHOOK_SECRET');
  }

  try {
    return getClient().webhooks.constructEvent(rawBody, signatureHeader, env.stripeWebhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook signature';
    const wrapped = new Error(message);
    wrapped.statusCode = 400;
    throw wrapped;
  }
}

export { createStripeCustomer, createCheckoutSession, createSubscriptionCheckoutSession,
  verifyWebhookSignature,
};
