import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findMock, createMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    findMock: vi.fn(() => ({ lean: leanMock })),
    createMock: vi.fn(),
    leanMock,
  };
});

vi.mock('../../../src/modules/orders/order.model.js', () => ({
  default: {
    find: findMock,
    create: createMock,
  },
}));

import { findOrdersByRecipient, createOrder } from '../../../src/modules/orders/order.repository.js';

describe('order.repository', () => {
  beforeEach(() => {
    findMock.mockClear();
    createMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue([{ _id: 'o1' }]);
  });

  it('findOrdersByRecipient queries by recipientId and returns lean documents', async () => {
    await findOrdersByRecipient('r1');

    expect(findMock).toHaveBeenCalledWith({ recipientId: 'r1' });
    expect(leanMock).toHaveBeenCalled();
  });

  it('createOrder calls Order.create with the given data', async () => {
    createMock.mockResolvedValue({ _id: 'o1' });

    const deliveryLocation = { latitude: 21.0, longitude: 105.8, updatedAt: new Date('2026-01-01T00:00:00.000Z') };

    const result = await createOrder({
      recipientId: 'r1',
      listingId: 'l1',
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 0,
      paymentStatus: 'FREE',
      deliveryAddressText: '123 Main St',
      deliveryLocation,
    });

    expect(createMock).toHaveBeenCalledWith({
      recipientId: 'r1',
      listingId: 'l1',
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 0,
      paymentStatus: 'FREE',
      deliveryAddressText: '123 Main St',
      deliveryLocation,
    });
    expect(result).toEqual({ _id: 'o1' });
  });
});
