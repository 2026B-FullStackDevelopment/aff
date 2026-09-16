import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findSubscriptionByStripeInvoiceIdMock,
  setLatestSubscriptionFieldsMock,
  createSubscriptionMock,
  findRecipientByStripeCustomerIdMock,
  getUserByIdMock,
  setRecipientTierMock,
} = vi.hoisted(() => ({
  findSubscriptionByStripeInvoiceIdMock: vi.fn(),
  setLatestSubscriptionFieldsMock: vi.fn(),
  createSubscriptionMock: vi.fn(),
  findRecipientByStripeCustomerIdMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  setRecipientTierMock: vi.fn(),
}));

vi.mock('../../../src/modules/subscriptions/subscription.repository.js', () => ({
  findSubscriptionByStripeInvoiceId: findSubscriptionByStripeInvoiceIdMock,
  setLatestSubscriptionFields: setLatestSubscriptionFieldsMock,
  createSubscription: createSubscriptionMock,
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    findRecipientByStripeCustomerId: findRecipientByStripeCustomerIdMock,
    getUserById: getUserByIdMock,
    setRecipientTier: setRecipientTierMock,
  },
}));

import {
  appendBillingCycle,
  markLatestPastDue,
  markLatestCancelled,
} from '../../../src/modules/subscriptions/subscription.billing.service.js';

describe('subscription.billing.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it('appends a second, distinct row for a renewal invoice after the first payment — both created:true', async () => {
      // Each invoice is genuinely new to the ledger (a renewal never shares the first payment's
      // invoice id), so the idempotency guard must not treat the second call as a duplicate.
      findSubscriptionByStripeInvoiceIdMock.mockResolvedValue(null);
      findRecipientByStripeCustomerIdMock.mockResolvedValue({ userId: 'u1' });
      getUserByIdMock.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });

      const firstPayment = { ...input, stripeInvoiceId: 'in_first' };
      const renewal = {
        ...input,
        stripeInvoiceId: 'in_renewal',
        currentPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
      };

      const firstResult = await appendBillingCycle(firstPayment);
      const renewalResult = await appendBillingCycle(renewal);

      expect(firstResult).toEqual({
        created: true,
        recipientEmail: 'jane@example.com',
        currentPeriodEnd: firstPayment.currentPeriodEnd,
      });
      expect(renewalResult).toEqual({
        created: true,
        recipientEmail: 'jane@example.com',
        currentPeriodEnd: renewal.currentPeriodEnd,
      });
      expect(createSubscriptionMock).toHaveBeenCalledTimes(2);
      expect(createSubscriptionMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ stripeInvoiceId: 'in_first' }),
      );
      expect(createSubscriptionMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ stripeInvoiceId: 'in_renewal', currentPeriodEnd: renewal.currentPeriodEnd }),
      );
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
