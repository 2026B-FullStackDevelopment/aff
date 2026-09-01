import { describe, it, expect } from 'vitest';
import {
  toOrderResponseDto,
  toRecipientOrderResponseDto,
  toSubmitFeedbackResponseDto,
} from '../../../src/modules/orders/order.dto.js';

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
      delivery: null,
    });
  });

  it('embeds the Delivery stage when one is given', () => {
    const order = {
      _id: 'o1',
      recipientId: 'r1',
      listingId: 'l1',
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 0,
      paymentStatus: 'FREE',
      orderStatus: 'PREPARING',
      deliveryAddressText: '123 Main St',
      deliveryLocation: { latitude: 21.0, longitude: 105.8, updatedAt: new Date() },
      createdAt: new Date(),
    };

    const result = toOrderResponseDto(order, 'AWAITING_COURIER');

    expect(result?.delivery).toEqual({ stage: 'AWAITING_COURIER' });
  });
});

describe('toRecipientOrderResponseDto', () => {
  it('maps a joined order row into OrderDTO plus donor, overriding the listing summary', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const order = {
      _id: 'o1',
      recipientId: 'r1',
      listingId: 'l1',
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 5000,
      paymentMethod: 'STRIPE',
      paymentStatus: 'PAID',
      orderStatus: 'PREPARING',
      deliveryAddressText: '123 Main St',
      deliveryLocation: { latitude: 21.0, longitude: 105.8, updatedAt: createdAt },
      cancelledByUserId: undefined,
      feedback: undefined,
      createdAt,
    };

    const result = toRecipientOrderResponseDto({
      order,
      listing: { id: 'l1', name: 'Bread', imageUrl: 'https://example.com/bread.jpg', unit: 'UNIT' },
      donor: { id: 'd1', companyName: 'Acme Foods' },
      deliveryStage: 'ASSIGNED',
    });

    expect(result).toEqual({
      id: 'o1',
      recipientId: 'r1',
      listing: { id: 'l1', name: 'Bread', imageUrl: 'https://example.com/bread.jpg', unit: 'UNIT' },
      donor: { id: 'd1', companyName: 'Acme Foods' },
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 5000,
      paymentMethod: 'STRIPE',
      paymentStatus: 'PAID',
      orderStatus: 'PREPARING',
      deliveryAddressText: '123 Main St',
      deliveryLocation: order.deliveryLocation,
      cancelledByUserId: null,
      feedback: null,
      createdAt,
      delivery: { stage: 'ASSIGNED' },
    });
  });

  it('reports delivery: null when deliveryStage is null', () => {
    const order = {
      _id: 'o1',
      recipientId: 'r1',
      listingId: 'l1',
      intakePath: 'RESERVATION',
      quantity: 1,
      amount: 0,
      paymentStatus: 'FREE',
      orderStatus: 'PENDING_PAYMENT',
      deliveryAddressText: '123 Main St',
      deliveryLocation: { latitude: 21.0, longitude: 105.8, updatedAt: new Date() },
      createdAt: new Date(),
    };

    const result = toRecipientOrderResponseDto({
      order,
      listing: { id: 'l1', name: 'Bread', imageUrl: undefined, unit: 'UNIT' },
      donor: { id: 'd1', companyName: 'Acme Foods' },
      deliveryStage: null,
    });

    expect(result.delivery).toBeNull();
  });
});

describe('toSubmitFeedbackResponseDto', () => {
  it('wraps the feedback object as { feedback }', () => {
    const feedback = { comment: 'Great donation!', createdAt: new Date('2026-01-01T00:00:00.000Z') };

    expect(toSubmitFeedbackResponseDto(feedback)).toEqual({ feedback });
  });
});
