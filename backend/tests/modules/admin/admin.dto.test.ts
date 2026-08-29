import { describe, expect, it } from 'vitest';

import {
  toCourierResponseDto,
  toAdminDeliveryResponseDto,
} from '../../../src/modules/admin/admin.dto.js';

const courierUser = {
  _id: 'u1',
  username: 'courier_01',
  email: 'courier@aff.com',
  role: 'COURIER',
  country: 'Vietnam',
  city: 'Ha Noi',
  status: 'ACTIVE',
  avatarUrl: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('admin.dto', () => {
  describe('toCourierResponseDto', () => {
    it('carries the account-management fields plus the Courier full name', () => {
      const result = toCourierResponseDto(courierUser, {
        userId: 'u1',
        fullName: 'Nguyen Van A',
      });

      expect(result).toMatchObject({
        id: 'u1',
        username: 'courier_01',
        email: 'courier@aff.com',
        role: 'COURIER',
        status: 'ACTIVE',
        fullName: 'Nguyen Van A',
      });
    });

    it('never leaks the password hash', () => {
      const result = toCourierResponseDto(
        { ...courierUser, passwordHash: 'secret-hash' },
        { userId: 'u1', fullName: 'Nguyen Van A' },
      );

      expect(result).not.toHaveProperty('passwordHash');
    });

    it('falls back to an empty name when the profile row is missing', () => {
      const result = toCourierResponseDto(courierUser, null);

      expect(result.fullName).toBe('');
    });
  });

  describe('toAdminDeliveryResponseDto', () => {
    const delivery = {
      _id: 'd1',
      orderId: 'o1',
      courierId: 'u1',
      stage: 'PICKED_UP',
      pickedUpAt: new Date('2026-08-02T10:00:00.000Z'),
      deliveredAt: null,
      courierLastLocation: null,
      createdAt: new Date('2026-08-02T09:00:00.000Z'),
    };

    it('shows the assigned Courier, the stage, and the lifecycle timestamps', () => {
      const result = toAdminDeliveryResponseDto(delivery, {
        courier: { userId: 'u1', fullName: 'Nguyen Van A' },
        order: { _id: 'o1', recipientId: 'r1' },
      });

      expect(result).toMatchObject({
        id: 'd1',
        stage: 'PICKED_UP',
        pickedUpAt: delivery.pickedUpAt,
        deliveredAt: null,
        courier: { id: 'u1', fullName: 'Nguyen Van A' },
        order: { id: 'o1', recipientId: 'r1' },
      });
    });

    it('reports a null Courier for a Delivery nobody has claimed', () => {
      const result = toAdminDeliveryResponseDto(
        { ...delivery, courierId: undefined, stage: 'AWAITING_COURIER' },
        { courier: null, order: { _id: 'o1', recipientId: 'r1' } },
      );

      expect(result.courier).toBeNull();
    });

    it('still identifies the Order when its row could not be loaded', () => {
      const result = toAdminDeliveryResponseDto(delivery, {
        courier: null,
        order: null,
      });

      expect(result.order).toEqual({ id: 'o1', recipientId: null });
    });
  });
});
