import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, findOneMock, findOneAndUpdateMock, sortMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  const sortMock = vi.fn(() => ({ lean: leanMock }));
  return {
    createMock: vi.fn(),
    findOneMock: vi.fn(() => ({ sort: sortMock, lean: leanMock })),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    sortMock,
    leanMock,
  };
});

vi.mock('../../../src/modules/subscriptions/subscription.model.js', () => ({
  default: {
    create: createMock,
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import {
  createSubscription,
  findLatestSubscriptionByRecipientId,
  findSubscriptionByStripeInvoiceId,
  setLatestSubscriptionFields,
} from '../../../src/modules/subscriptions/subscription.repository.js';

describe('subscription.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
    findOneAndUpdateMock.mockClear();
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

  it('createSubscription stores the new stripeInvoiceId/cancelAtPeriodEnd fields (F1/F5)', async () => {
    createMock.mockResolvedValue({ _id: 'sub1' });

    await createSubscription({
      recipientId: 'u1',
      stripeSubscriptionId: 'stripe_sub_1',
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
      stripeInvoiceId: 'in_123',
      cancelAtPeriodEnd: true,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ stripeInvoiceId: 'in_123', cancelAtPeriodEnd: true }),
    );
  });

  it('findLatestSubscriptionByRecipientId queries by recipientId, sorts newest-first, and returns a lean document', async () => {
    await findLatestSubscriptionByRecipientId('u1');

    expect(findOneMock).toHaveBeenCalledWith({ recipientId: 'u1' });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(leanMock).toHaveBeenCalled();
  });

  it('findSubscriptionByStripeInvoiceId queries by stripeInvoiceId and returns a lean document', async () => {
    await findSubscriptionByStripeInvoiceId('in_123');

    expect(findOneMock).toHaveBeenCalledWith({ stripeInvoiceId: 'in_123' });
    expect(leanMock).toHaveBeenCalled();
  });

  it('setLatestSubscriptionFields targets the newest row for the recipient and returns the updated lean document', async () => {
    await setLatestSubscriptionFields('u1', { cancelAtPeriodEnd: true });

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { recipientId: 'u1' },
      { cancelAtPeriodEnd: true },
      { new: true, sort: { createdAt: -1 } },
    );
    expect(leanMock).toHaveBeenCalled();
  });
});
