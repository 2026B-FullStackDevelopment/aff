import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findLatestSubscriptionByRecipientIdMock } = vi.hoisted(() => ({
  findLatestSubscriptionByRecipientIdMock: vi.fn(),
}));

vi.mock('../../../src/modules/subscriptions/subscription.repository.js', () => ({
  findLatestSubscriptionByRecipientId: findLatestSubscriptionByRecipientIdMock,
}));

import { isPremiumRecipient } from '../../../src/modules/subscriptions/subscription.service.js';

describe('subscription.service', () => {
  beforeEach(() => {
    findLatestSubscriptionByRecipientIdMock.mockClear();
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
});
