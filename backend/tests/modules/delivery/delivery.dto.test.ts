import { describe, it, expect } from 'vitest';
import {
  toDeliveryResponseDto,
  toQueueDeliveryResponseDto,
} from '../../../src/modules/delivery/delivery.dto.js';

describe('toDeliveryResponseDto', () => {
  it('returns null when given null', () => {
    expect(
      toDeliveryResponseDto(null, { pickupAddressText: undefined, pickupAddressLocation: undefined })
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
      toDeliveryResponseDto(delivery, { pickupAddressText: '123 Main St', pickupAddressLocation })
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
      toDeliveryResponseDto(delivery, { pickupAddressText: undefined, pickupAddressLocation: undefined })
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
    });
  });

  describe('toQueueDeliveryResponseDto', () => {
    const delivery = {
      _id: 'd1',
      orderId: 'o1',
      stage: 'AWAITING_COURIER',
      createdAt: new Date('2026-08-02T09:00:00.000Z'),
    };

    it('carries what a Courier needs to decide whether to claim', () => {
      const result = toQueueDeliveryResponseDto(delivery, {
        order: { quantity: 3, deliveryAddressText: '12 Le Loi' },
        companyName: 'Fresh Foods',
      });

      expect(result).toMatchObject({
        id: 'd1',
        stage: 'AWAITING_COURIER',
        order: { id: 'o1', quantity: 3, deliveryAddressText: '12 Le Loi' },
        donor: { companyName: 'Fresh Foods' },
      });
    });

    it('omits the pickup address, which the queue never shows', () => {
      const result = toQueueDeliveryResponseDto(delivery, {
        order: { quantity: 3, deliveryAddressText: '12 Le Loi' },
        companyName: 'Fresh Foods',
      });

      expect(result.pickupAddressText).toBeUndefined();
      expect(result.pickupAddressLocation).toBeUndefined();
    });

    it('degrades a row whose Order or Donor could not be loaded rather than dropping it', () => {
      const result = toQueueDeliveryResponseDto(delivery, {
        order: null,
        companyName: null,
      });

      expect(result).toMatchObject({
        id: 'd1',
        order: { id: 'o1', quantity: null, deliveryAddressText: null },
        donor: { companyName: null },
      });
    });
  });
});
