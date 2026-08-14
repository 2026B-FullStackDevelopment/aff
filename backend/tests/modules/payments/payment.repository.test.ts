import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findOneMock, findByIdAndUpdateMock, createMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    findByIdAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    createMock: vi.fn(),
    leanMock,
  };
});

vi.mock('../../../src/modules/payments/payment.model.js', () => ({
  default: {
    create: createMock,
    findOne: findOneMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
  },
}));

import {
  createPayment,
  findPaymentBySessionId,
  findPaymentByPayable,
  updatePaymentEvent,
} from '../../../src/modules/payments/payment.repository.js';

describe('payment.repository', () => {
  beforeEach(() => {
    createMock.mockClear();
    findOneMock.mockClear();
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
});
