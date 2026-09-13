import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findLatestSubscriptionByRecipientIdMock,
  findSubscriptionByStripeInvoiceIdMock,
  setLatestSubscriptionFieldsMock,
  createSubscriptionMock,
  getOrCreateStripeCustomerMock,
  startSubscriptionCheckoutMock,
  setSubscriptionCancelAtPeriodEndMock,
  findRecipientByStripeCustomerIdMock,
  getUserByIdMock,
  setRecipientTierMock,
} = vi.hoisted(() => ({
  findLatestSubscriptionByRecipientIdMock: vi.fn(),
  findSubscriptionByStripeInvoiceIdMock: vi.fn(),
  setLatestSubscriptionFieldsMock: vi.fn(),
  createSubscriptionMock: vi.fn(),
  getOrCreateStripeCustomerMock: vi.fn(),
  startSubscriptionCheckoutMock: vi.fn(),
  setSubscriptionCancelAtPeriodEndMock: vi.fn(),
  findRecipientByStripeCustomerIdMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  setRecipientTierMock: vi.fn(),
}));

vi.mock('../../../src/modules/subscriptions/subscription.repository.js', () => ({
  findLatestSubscriptionByRecipientId: findLatestSubscriptionByRecipientIdMock,
  findSubscriptionByStripeInvoiceId: findSubscriptionByStripeInvoiceIdMock,
  setLatestSubscriptionFields: setLatestSubscriptionFieldsMock,
  createSubscription: createSubscriptionMock,
}));

vi.mock('../../../src/modules/payments/payment.interface.js', () => ({
  paymentInterface: {
    getOrCreateStripeCustomer: getOrCreateStripeCustomerMock,
    startSubscriptionCheckout: startSubscriptionCheckoutMock,
    setSubscriptionCancelAtPeriodEnd: setSubscriptionCancelAtPeriodEndMock,
  },
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    findRecipientByStripeCustomerId: findRecipientByStripeCustomerIdMock,
    getUserById: getUserByIdMock,
    setRecipientTier: setRecipientTierMock,
  },
}));

vi.mock('../../../src/config/env.js', () => ({
  env: { clientUrl: 'https://app.example.com' },
}));

import {
  isPremiumRecipient,
  getMySubscriptionStatus,
  startCheckout,
  cancelMySubscription,
  resumeMySubscription,
  appendBillingCycle,
  markLatestPastDue,
  markLatestCancelled,
} from '../../../src/modules/subscriptions/subscription.service.js';

describe('subscription.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPremiumRecipient', () => {
    it('returns false when the recipient has no subscription', async () => {
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(null);

      const result = await isPremiumRecipient('u1');

      expect(result).toBe(false);
    });

    it('returns true when the latest subscription is active and not yet expired', async () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        status: 'ACTIVE',
        currentPeriodEnd: future,
      });

      const result = await isPremiumRecipient('u1');

      expect(result).toBe(true);
    });

    it('returns false when the latest subscription is active but expired', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        status: 'ACTIVE',
        currentPeriodEnd: past,
      });

      const result = await isPremiumRecipient('u1');

      expect(result).toBe(false);
    });

    it('returns false when the latest subscription is not active', async () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        status: 'CANCELLED',
        currentPeriodEnd: future,
      });

      const result = await isPremiumRecipient('u1');

      expect(result).toBe(false);
    });
  });

  describe('getMySubscriptionStatus', () => {
    it('reports PREMIUM with the mapped DTO when the latest row is active and unexpired', async () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await getMySubscriptionStatus('u1');

      expect(result.tier).toBe('PREMIUM');
      expect(result.subscription).toMatchObject({ id: 'sub1', status: 'ACTIVE', cancelAtPeriodEnd: false });
    });

    it('reports STANDARD when the latest row has expired', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: past,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
      });

      const result = await getMySubscriptionStatus('u1');

      expect(result.tier).toBe('STANDARD');
    });

    it('reports STANDARD with a null subscription when none exists', async () => {
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(null);

      const result = await getMySubscriptionStatus('u1');

      expect(result).toEqual({ tier: 'STANDARD', subscription: null });
    });

    it('reports STANDARD when the latest row is PAST_DUE', async () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        _id: 'sub1',
        status: 'PAST_DUE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
      });

      const result = await getMySubscriptionStatus('u1');

      expect(result.tier).toBe('STANDARD');
    });

    // Read-repair: keeps the denormalized recipient.tier column honest even when a billing webhook
    // was never delivered, or when a subscription simply lapsed with no further Stripe event.
    it('repairs the cached recipient tier to PREMIUM on read', async () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
      });

      await getMySubscriptionStatus('u1');

      expect(setRecipientTierMock).toHaveBeenCalledWith('u1', 'PREMIUM');
    });

    it('repairs the cached recipient tier to STANDARD on read when the latest row has expired', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: past,
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
      });

      await getMySubscriptionStatus('u1');

      expect(setRecipientTierMock).toHaveBeenCalledWith('u1', 'STANDARD');
    });

    it('repairs the cached recipient tier to STANDARD when no subscription exists', async () => {
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(null);

      await getMySubscriptionStatus('u1');

      expect(setRecipientTierMock).toHaveBeenCalledWith('u1', 'STANDARD');
    });
  });

  describe('startCheckout', () => {
    it('gets/creates the Stripe customer then starts a subscription checkout with the right URLs and metadata', async () => {
      getOrCreateStripeCustomerMock.mockResolvedValue('cus_123');
      startSubscriptionCheckoutMock.mockResolvedValue({ checkoutUrl: 'https://checkout.stripe.com/cs_1' });

      const result = await startCheckout('u1');

      expect(getOrCreateStripeCustomerMock).toHaveBeenCalledWith('u1');
      expect(startSubscriptionCheckoutMock).toHaveBeenCalledWith({
        customerId: 'cus_123',
        successUrl: 'https://app.example.com/subscription?status=success',
        cancelUrl: 'https://app.example.com/subscription?status=cancelled',
        metadata: { userId: 'u1' },
      });
      expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/cs_1' });
    });
  });

  describe('cancelMySubscription', () => {
    it('throws a 409 when there is no active subscription', async () => {
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(null);

      await expect(cancelMySubscription('u1')).rejects.toMatchObject({ statusCode: 409 });
      expect(setSubscriptionCancelAtPeriodEndMock).not.toHaveBeenCalled();
    });

    it('throws a 409 when the latest subscription has already expired', async () => {
      const past = new Date(Date.now() - 1000);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({ status: 'ACTIVE', currentPeriodEnd: past });

      await expect(cancelMySubscription('u1')).rejects.toMatchObject({ statusCode: 409 });
    });

    it('is an idempotent no-op when already cancelAtPeriodEnd, without calling Stripe again', async () => {
      const future = new Date(Date.now() + 100_000);
      const row = {
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: 'stripe_sub_1',
        createdAt: new Date(),
      };
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(row);

      const result = await cancelMySubscription('u1');

      expect(setSubscriptionCancelAtPeriodEndMock).not.toHaveBeenCalled();
      expect(setLatestSubscriptionFieldsMock).not.toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'sub1', cancelAtPeriodEnd: true });
    });

    it('calls Stripe and persists cancelAtPeriodEnd=true on the happy path', async () => {
      const future = new Date(Date.now() + 100_000);
      const row = {
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'stripe_sub_1',
        createdAt: new Date(),
      };
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(row);
      setLatestSubscriptionFieldsMock.mockResolvedValue({ ...row, cancelAtPeriodEnd: true });

      const result = await cancelMySubscription('u1');

      expect(setSubscriptionCancelAtPeriodEndMock).toHaveBeenCalledWith('stripe_sub_1', true);
      expect(setLatestSubscriptionFieldsMock).toHaveBeenCalledWith('u1', { cancelAtPeriodEnd: true });
      expect(result).toMatchObject({ cancelAtPeriodEnd: true });
    });

    // A pending cancellation must not downgrade the tier — access runs to currentPeriodEnd (F5).
    // The downgrade happens later, when customer.subscription.deleted arrives.
    it('does not touch the cached tier — access continues until the period ends', async () => {
      const future = new Date(Date.now() + 100_000);
      const row = {
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 'stripe_sub_1',
        createdAt: new Date(),
      };
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(row);
      setLatestSubscriptionFieldsMock.mockResolvedValue({ ...row, cancelAtPeriodEnd: true });

      await cancelMySubscription('u1');

      expect(setRecipientTierMock).not.toHaveBeenCalled();
    });

    it('only ever targets the caller\'s own latest subscription (owner scoping)', async () => {
      const future = new Date(Date.now() + 100_000);
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue({
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 's1',
        createdAt: new Date(),
      });
      setLatestSubscriptionFieldsMock.mockResolvedValue({});

      await cancelMySubscription('u1');

      expect(findLatestSubscriptionByRecipientIdMock).toHaveBeenCalledWith('u1');
      expect(setLatestSubscriptionFieldsMock).toHaveBeenCalledWith('u1', expect.anything());
    });
  });

  describe('resumeMySubscription', () => {
    it('throws a 409 when there is no active subscription', async () => {
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(null);

      await expect(resumeMySubscription('u1')).rejects.toMatchObject({ statusCode: 409 });
      expect(setSubscriptionCancelAtPeriodEndMock).not.toHaveBeenCalled();
    });

    it('is an idempotent no-op when not currently scheduled to cancel', async () => {
      const future = new Date(Date.now() + 100_000);
      const row = {
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: 's1',
        createdAt: new Date(),
      };
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(row);

      const result = await resumeMySubscription('u1');

      expect(setSubscriptionCancelAtPeriodEndMock).not.toHaveBeenCalled();
      expect(result).toMatchObject({ cancelAtPeriodEnd: false });
    });

    it('calls Stripe and persists cancelAtPeriodEnd=false on the happy path', async () => {
      const future = new Date(Date.now() + 100_000);
      const row = {
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: 's1',
        createdAt: new Date(),
      };
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(row);
      setLatestSubscriptionFieldsMock.mockResolvedValue({ ...row, cancelAtPeriodEnd: false });

      const result = await resumeMySubscription('u1');

      expect(setSubscriptionCancelAtPeriodEndMock).toHaveBeenCalledWith('s1', false);
      expect(setLatestSubscriptionFieldsMock).toHaveBeenCalledWith('u1', { cancelAtPeriodEnd: false });
      expect(result).toMatchObject({ cancelAtPeriodEnd: false });
    });

    it('does not touch the cached tier — the caller was already PREMIUM throughout', async () => {
      const future = new Date(Date.now() + 100_000);
      const row = {
        _id: 'sub1',
        status: 'ACTIVE',
        currentPeriodEnd: future,
        cancelAtPeriodEnd: true,
        stripeSubscriptionId: 's1',
        createdAt: new Date(),
      };
      findLatestSubscriptionByRecipientIdMock.mockResolvedValue(row);
      setLatestSubscriptionFieldsMock.mockResolvedValue({ ...row, cancelAtPeriodEnd: false });

      await resumeMySubscription('u1');

      expect(setRecipientTierMock).not.toHaveBeenCalled();
    });
  });

  describe('appendBillingCycle', () => {
    const input = {
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'stripe_sub_1',
      stripeInvoiceId: 'in_123',
      currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
      cancelAtPeriodEnd: false,
    };

    it('creates a new SUBSCRIPTION row and returns the recipient email for a first-seen invoice', async () => {
      findSubscriptionByStripeInvoiceIdMock.mockResolvedValue(null);
      findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1' });
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });

      const result = await appendBillingCycle(input);

      expect(createSubscriptionMock).toHaveBeenCalledWith({
        recipientId: 'u1',
        stripeSubscriptionId: 'stripe_sub_1',
        status: 'ACTIVE',
        currentPeriodEnd: input.currentPeriodEnd,
        stripeInvoiceId: 'in_123',
        cancelAtPeriodEnd: false,
      });
      expect(result).toEqual({
        created: true,
        recipientEmail: 'jane@example.com',
        currentPeriodEnd: input.currentPeriodEnd,
      });
    });

    it('caches PREMIUM on the recipient when a row is created', async () => {
      findSubscriptionByStripeInvoiceIdMock.mockResolvedValue(null);
      findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1' });
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });

      await appendBillingCycle(input);

      expect(setRecipientTierMock).toHaveBeenCalledWith('u1', 'PREMIUM');
    });

    it('does not touch the cached tier when the invoice was already recorded', async () => {
      findSubscriptionByStripeInvoiceIdMock.mockResolvedValue({ _id: 'sub1' });

      await appendBillingCycle(input);

      expect(setRecipientTierMock).not.toHaveBeenCalled();
    });

    it('is idempotent: a duplicate invoice id creates no row', async () => {
      findSubscriptionByStripeInvoiceIdMock.mockResolvedValue({ _id: 'sub1' });

      const result = await appendBillingCycle(input);

      expect(createSubscriptionMock).not.toHaveBeenCalled();
      expect(result).toEqual({ created: false });
    });

    it('throws a 404 when no Recipient matches the Stripe customer id', async () => {
      findSubscriptionByStripeInvoiceIdMock.mockResolvedValue(null);
      findRecipientByStripeCustomerIdMock.mockResolvedValue(null);

      await expect(appendBillingCycle(input)).rejects.toMatchObject({ statusCode: 404 });
      expect(createSubscriptionMock).not.toHaveBeenCalled();
    });
  });

  describe('markLatestPastDue', () => {
    it('sets the latest row to PAST_DUE for the resolved recipient', async () => {
      findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1' });

      await markLatestPastDue('cus_123');

      expect(setLatestSubscriptionFieldsMock).toHaveBeenCalledWith('u1', { status: 'PAST_DUE' });
    });

    it('caches STANDARD on the recipient', async () => {
      findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1' });

      await markLatestPastDue('cus_123');

      expect(setRecipientTierMock).toHaveBeenCalledWith('u1', 'STANDARD');
    });

    it('no-ops when no Recipient matches the Stripe customer id', async () => {
      findRecipientByStripeCustomerIdMock.mockResolvedValue(null);

      await markLatestPastDue('cus_unknown');

      expect(setLatestSubscriptionFieldsMock).not.toHaveBeenCalled();
    });
  });

  describe('markLatestCancelled', () => {
    it('sets the latest row to CANCELLED for the resolved recipient', async () => {
      findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1' });

      await markLatestCancelled('cus_123');

      expect(setLatestSubscriptionFieldsMock).toHaveBeenCalledWith('u1', { status: 'CANCELLED' });
    });

    it('caches STANDARD on the recipient', async () => {
      findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1' });

      await markLatestCancelled('cus_123');

      expect(setRecipientTierMock).toHaveBeenCalledWith('u1', 'STANDARD');
    });

    it('no-ops when no Recipient matches the Stripe customer id', async () => {
      findRecipientByStripeCustomerIdMock.mockResolvedValue(null);

      await markLatestCancelled('cus_unknown');

      expect(setLatestSubscriptionFieldsMock).not.toHaveBeenCalled();
    });
  });
});
