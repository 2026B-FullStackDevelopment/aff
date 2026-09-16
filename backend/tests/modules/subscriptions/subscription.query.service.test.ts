import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findLatestSubscriptionByRecipientIdMock, setRecipientTierMock } = vi.hoisted(() => ({
  findLatestSubscriptionByRecipientIdMock: vi.fn(),
  setRecipientTierMock: vi.fn(),
}));

vi.mock('../../../src/modules/subscriptions/subscription.repository.js', () => ({
  findLatestSubscriptionByRecipientId: findLatestSubscriptionByRecipientIdMock,
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    setRecipientTier: setRecipientTierMock,
  },
}));

import {
  isPremiumRecipient,
  getMySubscriptionStatus,
} from '../../../src/modules/subscriptions/subscription.query.service.js';

describe('subscription.query.service', () => {
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
});
