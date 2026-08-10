import { describe, it, expect } from 'vitest';
import { toOrderResponseDto } from '../../../src/modules/orders/order.dto.js';

describe('toOrderResponseDto', () => {
  it('returns null when given null', () => {
    expect(toOrderResponseDto(null)).toBeNull();
  });

  it('maps an order document to the documented OrderDTO shape', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const deliveryLocation = { latitude: 21.0, longitude: 105.8, updatedAt: createdAt };
    const order = {
      _id: 'o1',
      recipientId: 'r1',
      listingId: 'l1',
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 0,
      paymentMethod: undefined,
      paymentStatus: 'FREE',
      orderStatus: 'PENDING_PAYMENT',
      deliveryAddressText: '123 Main St',
      deliveryLocation,
      cancelledByUserId: undefined,
      feedback: undefined,
      createdAt,
    };

    expect(toOrderResponseDto(order)).toEqual({
      id: 'o1',
      recipientId: 'r1',
      listing: {
        id: 'l1',
        name: undefined,
        imageUrl: undefined,
        unit: undefined,
      },
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 0,
      paymentMethod: undefined,
      paymentStatus: 'FREE',
      orderStatus: 'PENDING_PAYMENT',
      deliveryAddressText: '123 Main St',
      deliveryLocation,
      cancelledByUserId: null,
      feedback: null,
      createdAt,
    });
  });
});
