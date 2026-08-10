import { describe, it, expect } from 'vitest';
import { toSubscriptionResponseDto } from '../../../src/modules/subscriptions/subscription.dto.js';

describe('toSubscriptionResponseDto', () => {
  it('returns null when given null', () => {
    expect(toSubscriptionResponseDto(null)).toBeNull();
  });

  it('maps a subscription document to the documented SubscriptionDTO shape', () => {
    const currentPeriodEnd = new Date('2026-02-01T00:00:00.000Z');
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const subscription = {
      _id: 'sub1',
      status: 'ACTIVE',
      currentPeriodEnd,
      createdAt,
    };

    expect(toSubscriptionResponseDto(subscription)).toEqual({
      id: 'sub1',
      status: 'ACTIVE',
      currentPeriodEnd,
      createdAt,
    });
  });
});
