import { describe, it, expect } from 'vitest';
import { updateSubscriptionSchema } from '../../../src/modules/subscriptions/subscription.schemas.js';

describe('updateSubscriptionSchema', () => {
  it('accepts cancelAtPeriodEnd: true (the cancel direction)', () => {
    expect(updateSubscriptionSchema.safeParse({ cancelAtPeriodEnd: true }).success).toBe(true);
  });

  it('accepts cancelAtPeriodEnd: false (the resume direction)', () => {
    expect(updateSubscriptionSchema.safeParse({ cancelAtPeriodEnd: false }).success).toBe(true);
  });

  it('rejects a missing cancelAtPeriodEnd field', () => {
    expect(updateSubscriptionSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-boolean cancelAtPeriodEnd value', () => {
    expect(updateSubscriptionSchema.safeParse({ cancelAtPeriodEnd: 'true' }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(updateSubscriptionSchema.safeParse({ cancelAtPeriodEnd: true, extra: 1 }).success).toBe(false);
  });
});
