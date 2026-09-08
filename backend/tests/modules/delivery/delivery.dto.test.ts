import { describe, it, expect } from 'vitest';
import {
  toDeliveryResponseDto,
  toQueueDeliveryResponseDto,
  requiresCashCollection,
} from '../../../src/modules/delivery/delivery.dto.js';

describe('toDeliveryResponseDto', () => {
  it('returns null when given null', () => {
    expect(
      toDeliveryResponseDto(null, {
        pickupAddressText: undefined,
        pickupAddressLocation: undefined,
        order: null,
      })
    ).toBeNull();
  });

  it('maps a delivery document to the documented DeliveryDTO shape', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const delivery = {
      _id: 'd1',
      orderId: 'o1',
      courierId: 'c1',
      stage: 'PICKED_UP',
      pickedUpAt: createdAt,
      deliveredAt: null,
      courierLastLocation: { latitude: 21.0, longitude: 105.8, updatedAt: createdAt },
      createdAt,
    };
    const pickupAddressLocation = { latitude: 10.8, longitude: 106.6, updatedAt: createdAt };

    expect(
      toDeliveryResponseDto(delivery, {
        pickupAddressText: '123 Main St',
        pickupAddressLocation,
        order: null,
      })
    ).toEqual({
      id: 'd1',
      orderId: 'o1',
      courierId: 'c1',
      stage: 'PICKED_UP',
      pickupAddressText: '123 Main St',
      pickupAddressLocation,
      pickedUpAt: createdAt,
      deliveredAt: null,
      courierLastLocation: { latitude: 21.0, longitude: 105.8, updatedAt: createdAt },
      createdAt,
      deliveryAddressText: null,
      deliveryLocation: null,
      requiresCashCollection: false,
      amount: null,
    });
  });

  it('defaults courierId, pickedUpAt, deliveredAt, and courierLastLocation to null when absent', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const delivery = {
      _id: 'd1',
      orderId: 'o1',
      courierId: undefined,
      stage: 'AWAITING_COURIER',
      pickedUpAt: undefined,
      deliveredAt: undefined,
      courierLastLocation: undefined,
      createdAt,
    };

    expect(
      toDeliveryResponseDto(delivery, {
        pickupAddressText: undefined,
        pickupAddressLocation: undefined,
        order: null,
      })
    ).toEqual({
      id: 'd1',
      orderId: 'o1',
      courierId: null,
      stage: 'AWAITING_COURIER',
      pickupAddressText: undefined,
      pickupAddressLocation: undefined,
      pickedUpAt: null,
      deliveredAt: null,
      courierLastLocation: null,
      createdAt,
      deliveryAddressText: null,
      deliveryLocation: null,
      requiresCashCollection: false,
      amount: null,
    });
  });

  it('carries the destination and the cash flag from the Order', () => {
    const delivery = {
      _id: 'd1',
      orderId: 'o1',
      stage: 'ASSIGNED',
      createdAt: new Date(),
    };

    const result = toDeliveryResponseDto(delivery, {
      pickupAddressText: '1 Donor St',
      pickupAddressLocation: undefined,
      order: {
        deliveryAddressText: '12 Le Loi',
        deliveryLocation: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
        paymentMethod: 'CASH',
      },
    });

    expect(result).toMatchObject({
      deliveryAddressText: '12 Le Loi',
      deliveryLocation: { latitude: 10.8, longitude: 106.6 },
      requiresCashCollection: true,
    });
  });

  it('carries the order amount so a Courier can see it', () => {
    const result = toDeliveryResponseDto(
      { _id: 'd1', orderId: 'o1', stage: 'ASSIGNED', createdAt: new Date() },
      {
        pickupAddressText: undefined,
        pickupAddressLocation: undefined,
        order: {
          deliveryAddressText: '12 Le Loi',
          paymentMethod: 'CASH',
          amount: 50000,
        },
      },
    );

    expect(result).toMatchObject({ amount: 50000 });
  });

  it('never leaks the raw payment method to the client', () => {
    const result = toDeliveryResponseDto(
      { _id: 'd1', orderId: 'o1', stage: 'ASSIGNED', createdAt: new Date() },
      {
        pickupAddressText: undefined,
        pickupAddressLocation: undefined,
        order: {
          deliveryAddressText: '12 Le Loi',
          deliveryLocation: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
          paymentMethod: 'CASH',
        },
      },
    );

    expect(result).not.toHaveProperty('paymentMethod');
  });

  it('degrades to nulls and false when no Order was supplied', () => {
    const result = toDeliveryResponseDto(
      { _id: 'd1', orderId: 'o1', stage: 'ASSIGNED', createdAt: new Date() },
      {
        pickupAddressText: undefined,
        pickupAddressLocation: undefined,
        order: null,
      },
    );

    expect(result).toMatchObject({
      deliveryAddressText: null,
      deliveryLocation: null,
      requiresCashCollection: false,
      amount: null,
    });
  });

  describe('requiresCashCollection', () => {
    it('is true only for a cash Order', () => {
      expect(requiresCashCollection({ paymentMethod: 'CASH' })).toBe(true);
    });

    it('is false for a card Order', () => {
      expect(requiresCashCollection({ paymentMethod: 'STRIPE' })).toBe(false);
    });

    it('is false for a free Order, which has no payment method at all', () => {
      expect(requiresCashCollection({})).toBe(false);
    });

    it('is false when the Order could not be loaded', () => {
      expect(requiresCashCollection(null)).toBe(false);
    });
  });

  describe('toQueueDeliveryResponseDto', () => {
    const createdAt = new Date('2026-08-02T09:00:00.000Z');
    const delivery = {
      _id: 'd1',
      orderId: 'o1',
      stage: 'AWAITING_COURIER',
      createdAt,
    };

    const pickupAddressLocation = {
      latitude: 21.03,
      longitude: 105.85,
      updatedAt: createdAt,
    };
    const deliveryLocation = {
      latitude: 10.8,
      longitude: 106.6,
      updatedAt: createdAt,
    };

    it('carries what a Courier needs to decide whether to claim', () => {
      const result = toQueueDeliveryResponseDto(delivery, {
        order: {
          quantity: 3,
          deliveryAddressText: '12 Le Loi',
          deliveryLocation,
          amount: 50000,
          paymentMethod: 'CASH',
        },
        listingName: 'Sourdough loaves',
        companyName: 'Fresh Foods',
        pickupAddressText: '5 Hang Bac',
        pickupAddressLocation,
      });

      expect(result).toEqual({
        id: 'd1',
        createdAt,
        listing: {
          name: 'Sourdough loaves',
          pickupAddressText: '5 Hang Bac',
          pickupAddressLocation,
        },
        order: {
          quantity: 3,
          deliveryAddressText: '12 Le Loi',
          deliveryLocation,
          amount: 50000,
          requiresCashCollection: true,
        },
        donor: { companyName: 'Fresh Foods' },
      });
    });

    it('is false for a card-paid queue row', () => {
      const result = toQueueDeliveryResponseDto(delivery, {
        order: {
          quantity: 3,
          deliveryAddressText: '12 Le Loi',
          amount: 50000,
          paymentMethod: 'STRIPE',
        },
        listingName: 'Sourdough loaves',
        companyName: 'Fresh Foods',
      });

      expect(result.order.requiresCashCollection).toBe(false);
    });

    it('nulls the pickup address when the caller could not resolve it', () => {
      const result = toQueueDeliveryResponseDto(delivery, {
        order: { quantity: 3, deliveryAddressText: '12 Le Loi' },
        listingName: 'Sourdough loaves',
        companyName: 'Fresh Foods',
      });

      expect(result.listing.pickupAddressText).toBeNull();
      expect(result.listing.pickupAddressLocation).toBeNull();
    });

    it('degrades a row whose Order, Listing or Donor could not be loaded rather than dropping it', () => {
      const result = toQueueDeliveryResponseDto(delivery, {
        order: null,
        listingName: null,
        companyName: null,
      });

      expect(result).toEqual({
        id: 'd1',
        createdAt,
        listing: { name: null, pickupAddressText: null, pickupAddressLocation: null },
        order: {
          quantity: null,
          deliveryAddressText: null,
          deliveryLocation: null,
          amount: null,
          requiresCashCollection: false,
        },
        donor: { companyName: null },
      });
    });
  });
});
