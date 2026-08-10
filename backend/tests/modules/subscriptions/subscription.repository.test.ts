import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, findOneMock, sortMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  const sortMock = vi.fn(() => ({ lean: leanMock }));
  return {
    createMock: vi.fn(),
    findOneMock: vi.fn(() => ({ sort: sortMock })),
    sortMock,
    leanMock,
  };
});

vi.mock('../../../src/modules/subscriptions/subscription.model.js', () => ({
  default: {
    create: createMock,
    findOne: findOneMock,
  },
}));

import {
  createSubscription,
  findLatestSubscriptionByRecipientId,
} from '../../../src/modules/subscriptions/subscription.repository.js';

describe('subscription.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
    sortMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue({ _id: 'sub1' });
  });

  it('createSubscription calls Subscription.create with the given data', async () => {
    createMock.mockResolvedValue({ _id: 'sub1' });

    const result = await createSubscription({
      recipientId: 'u1',
      stripeSubscriptionId: 'stripe_sub_1',
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
    });

    expect(createMock).toHaveBeenCalledWith({
      recipientId: 'u1',
      stripeSubscriptionId: 'stripe_sub_1',
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(result).toEqual({ _id: 'sub1' });
  });

  it('findLatestSubscriptionByRecipientId queries by recipientId, sorts newest-first, and returns a lean document', async () => {
    await findLatestSubscriptionByRecipientId('u1');

    expect(findOneMock).toHaveBeenCalledWith({ recipientId: 'u1' });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(leanMock).toHaveBeenCalled();
  });
});
