import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findOneMock,
  findOneAndUpdateMock,
  findByIdAndUpdateMock,
  createMock,
  leanMock,
} = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    findByIdAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    createMock: vi.fn(),
    leanMock,
  };
});

vi.mock('../../../src/modules/payments/payment.model.js', () => ({
  default: {
    create: createMock,
    findOne: findOneMock,
    findOneAndUpdate: findOneAndUpdateMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
  },
}));

import {
  createPayment,
  findPaymentBySessionId,
  findPaymentByPayable,
  findPaymentByRefundId,
  updatePaymentEvent,
  markPaymentPaidIfPending,
  markPaymentRefundPending,
  cancelPendingPaymentByPayable,
} from '../../../src/modules/payments/payment.repository.js';

describe('payment.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
    findOneAndUpdateMock.mockClear();
    findByIdAndUpdateMock.mockClear();
    leanMock.mockClear();
  });

  it('createPayment calls Payment.create with the given data', async () => {
    createMock.mockResolvedValue({ _id: 'p1' });

    const result = await createPayment({
      payableType: 'ORDER',
      payableId: 'o1',
      stripeSessionId: 'cs_123',
      amount: 5000,
      currency: 'usd',
      status: 'PENDING',
    });

    expect(createMock).toHaveBeenCalledWith({
      payableType: 'ORDER',
      payableId: 'o1',
      stripeSessionId: 'cs_123',
      amount: 5000,
      currency: 'usd',
      status: 'PENDING',
    });
    expect(result).toEqual({ _id: 'p1' });
  });

  it('findPaymentBySessionId queries by stripeSessionId and returns a lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'p1', stripeSessionId: 'cs_123' });

    const result = await findPaymentBySessionId('cs_123');

    expect(findOneMock).toHaveBeenCalledWith({ stripeSessionId: 'cs_123' });
    expect(leanMock).toHaveBeenCalled();
    expect(result).toEqual({ _id: 'p1', stripeSessionId: 'cs_123' });
  });

  it('findPaymentByPayable queries by payableType/payableId and returns a lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'p1', payableType: 'ORDER', payableId: 'o1' });

    const result = await findPaymentByPayable('ORDER', 'o1');

    expect(findOneMock).toHaveBeenCalledWith({ payableType: 'ORDER', payableId: 'o1' });
    expect(result).toEqual({ _id: 'p1', payableType: 'ORDER', payableId: 'o1' });
  });

  it('updatePaymentEvent updates the payment and returns the new lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'p1', status: 'PAID' });

    const result = await updatePaymentEvent('p1', {
      lastProcessedEventId: 'evt_1',
      status: 'PAID',
      paidAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      'p1',
      { lastProcessedEventId: 'evt_1', status: 'PAID', paidAt: new Date('2026-01-01T00:00:00.000Z') },
      { new: true },
    );
    expect(result).toEqual({ _id: 'p1', status: 'PAID' });
  });

  it('updatePaymentEvent can also set REFUNDED + refundedAt (charge.refunded reconciliation)', async () => {
    leanMock.mockResolvedValue({ _id: 'p1', status: 'REFUNDED' });

    await updatePaymentEvent('p1', {
      lastProcessedEventId: 'evt_2',
      status: 'REFUNDED',
      refundedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      'p1',
      { lastProcessedEventId: 'evt_2', status: 'REFUNDED', refundedAt: new Date('2026-01-02T00:00:00.000Z') },
      { new: true },
    );
  });

  it('atomically marks only a pending Payment paid and records webhook identifiers', async () => {
    const paidAt = new Date('2026-01-01T00:00:00.000Z');
    leanMock.mockResolvedValue({ _id: 'p1', status: 'PAID' });

    const result = await markPaymentPaidIfPending(
      'cs_123',
      'evt_1',
      paidAt,
      undefined,
      'pi_123',
    );

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      {
        stripeSessionId: 'cs_123',
        status: 'PENDING',
      },
      {
        $set: {
          status: 'PAID',
          paidAt,
          lastProcessedEventId: 'evt_1',
          stripePaymentIntentId: 'pi_123',
        },
      },
      { new: true, session: undefined },
    );
    expect(result).toEqual({ _id: 'p1', status: 'PAID' });
  });

  it('findPaymentByRefundId queries by stripeRefundId and returns a lean document', async () => {
    leanMock.mockResolvedValue({ _id: 'p1', stripeRefundId: 're_123' });

    const result = await findPaymentByRefundId('re_123');

    expect(findOneMock).toHaveBeenCalledWith({ stripeRefundId: 're_123' });
    expect(result).toEqual({ _id: 'p1', stripeRefundId: 're_123' });
  });

  it('markPaymentRefundPending sets status=REFUND_PENDING and stores the stripeRefundId', async () => {
    leanMock.mockResolvedValue({ _id: 'p1', status: 'REFUND_PENDING', stripeRefundId: 're_123' });

    const result = await markPaymentRefundPending('p1', 're_123');

    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      'p1',
      { status: 'REFUND_PENDING', stripeRefundId: 're_123' },
      { new: true },
    );
    expect(result).toEqual({ _id: 'p1', status: 'REFUND_PENDING', stripeRefundId: 're_123' });
  });

  describe('cancelPendingPaymentByPayable', () => {
    it('cancels a PENDING payment for the given payable', async () => {
      leanMock.mockResolvedValue({ _id: 'p1', status: 'CANCELLED' });

      const result = await cancelPendingPaymentByPayable('ORDER', 'o1');

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        { payableType: 'ORDER', payableId: 'o1', status: 'PENDING' },
        { $set: { status: 'CANCELLED' } },
        { new: true, session: undefined },
      );
      expect(result).toEqual({ _id: 'p1', status: 'CANCELLED' });
    });

    it('no-ops (returns null) when no PENDING payment exists for the payable', async () => {
      leanMock.mockResolvedValue(null);

      const result = await cancelPendingPaymentByPayable('ORDER', 'o1');

      expect(result).toBeNull();
    });
  });
});
