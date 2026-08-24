import { describe, expect, it } from 'vitest';
import {
  deliveryIdParamsSchema,
  markDeliveredSchema,
} from '../../../src/modules/delivery/delivery.schemas.js';

describe('delivery schemas', () => {
  it('accepts a MongoDB Delivery id', () => {
    expect(
      deliveryIdParamsSchema.safeParse({
        id: '507f1f77bcf86cd799439011',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid ids and unknown fields', () => {
    expect(deliveryIdParamsSchema.safeParse({ id: 'd1' }).success).toBe(false);
    expect(
      markDeliveredSchema.safeParse({
        cashConfirmed: true,
        courierId: 'c1',
      }).success,
    ).toBe(false);
  });

  it('accepts omitted cash confirmation or an explicit boolean', () => {
    expect(markDeliveredSchema.safeParse({}).success).toBe(true);
    expect(
      markDeliveredSchema.safeParse({ cashConfirmed: true }).success,
    ).toBe(true);
    expect(
      markDeliveredSchema.safeParse({ cashConfirmed: 'true' }).success,
    ).toBe(false);
  });
});
