import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findLatestSubscriptionByRecipientIdMock,
  setLatestSubscriptionFieldsMock,
  setSubscriptionCancelAtPeriodEndMock,
  setRecipientTierMock,
} = vi.hoisted(() => ({
  findLatestSubscriptionByRecipientIdMock: vi.fn(),
  setLatestSubscriptionFieldsMock: vi.fn(),
  setSubscriptionCancelAtPeriodEndMock: vi.fn(),
  setRecipientTierMock: vi.fn(),
}));

vi.mock('../../../src/modules/subscriptions/subscription.repository.js', () => ({
  findLatestSubscriptionByRecipientId: findLatestSubscriptionByRecipientIdMock,
  setLatestSubscriptionFields: setLatestSubscriptionFieldsMock,
}));

vi.mock('../../../src/modules/payments/payment.interface.js', () => ({
  paymentInterface: {
    setSubscriptionCancelAtPeriodEnd: setSubscriptionCancelAtPeriodEndMock,
  },
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    setRecipientTier: setRecipientTierMock,
  },
}));

import {
  cancelMySubscription,
  resumeMySubscription,
} from '../../../src/modules/subscriptions/subscription.lifecycle.service.js';

describe('subscription.lifecycle.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
