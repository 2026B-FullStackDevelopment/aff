import { describe, expect, it } from 'vitest';

import {
  createCourierSchema,
  adminCouriersQuerySchema,
  adminUsersQuerySchema,
  adminUserIdParamsSchema,
  updateUserStatusSchema,
  adminDeliveriesQuerySchema,
} from '../../../src/modules/admin/admin.schemas.js';

describe('admin.schemas', () => {
  describe('createCourierSchema', () => {
    const validPayload = {
      username: 'courier_01',
      email: 'Courier@AFF.com',
      tempPassword: 'Str0ng#Pass',
      fullName: 'Nguyen Van A',
    };

    it('accepts a valid Courier payload and normalises the email', () => {
      const result = createCourierSchema.parse(validPayload);

      expect(result.email).toBe('courier@aff.com');
      expect(result.fullName).toBe('Nguyen Van A');
    });

    it('requires a full name', () => {
      const result = createCourierSchema.safeParse({
        ...validPayload,
        fullName: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Full name is required.');
    });

    it('holds tempPassword to the same strength rules as any other password', () => {
      const result = createCourierSchema.safeParse({
        ...validPayload,
        tempPassword: 'weak',
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        'Password must be at least 8 characters.',
      );
    });

    it('rejects a payload carrying an unexpected field', () => {
      const result = createCourierSchema.safeParse({
        ...validPayload,
        role: 'ADMIN',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('adminCouriersQuerySchema', () => {
    it('defaults pagination when the Admin sends no query', () => {
      expect(adminCouriersQuerySchema.parse({})).toEqual({
        page: 1,
        limit: 20,
      });
    });
  });

  describe('adminUsersQuerySchema', () => {
    it('defaults pagination while leaving every filter optional', () => {
      expect(adminUsersQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    });

    it('accepts composable role, status, and trimmed search filters', () => {
      expect(
        adminUsersQuerySchema.parse({
          page: '2',
          limit: '10',
          role: 'COURIER',
          status: 'ACTIVE',
          search: '  Nguyen  ',
        }),
      ).toEqual({
        page: 2,
        limit: 10,
        role: 'COURIER',
        status: 'ACTIVE',
        search: 'Nguyen',
      });
    });

    it('rejects unsupported role and status filters', () => {
      expect(adminUsersQuerySchema.safeParse({ role: 'SUPER_ADMIN' }).success).toBe(false);
      expect(adminUsersQuerySchema.safeParse({ status: 'LOCKED' }).success).toBe(false);
    });
  });

  describe('account status schemas', () => {
    it('accepts a MongoDB user id and either supported status', () => {
      expect(
        adminUserIdParamsSchema.parse({ id: '507f1f77bcf86cd799439011' }),
      ).toEqual({ id: '507f1f77bcf86cd799439011' });
      expect(updateUserStatusSchema.parse({ status: 'ACTIVE' })).toEqual({
        status: 'ACTIVE',
      });
      expect(updateUserStatusSchema.parse({ status: 'DEACTIVATED' })).toEqual({
        status: 'DEACTIVATED',
      });
    });

    it('rejects malformed ids, unsupported statuses, and extra fields', () => {
      expect(adminUserIdParamsSchema.safeParse({ id: 'not-an-id' }).success).toBe(false);
      expect(updateUserStatusSchema.safeParse({ status: 'LOCKED' }).success).toBe(false);
      expect(
        updateUserStatusSchema.safeParse({ status: 'ACTIVE', role: 'ADMIN' }).success,
      ).toBe(false);
    });
  });

  describe('adminDeliveriesQuerySchema', () => {
    it('leaves stage undefined when no filter is requested', () => {
      expect(adminDeliveriesQuerySchema.parse({})).toEqual({
        page: 1,
        limit: 20,
      });
    });

    it('accepts every Delivery stage as a filter, cancellations included', () => {
      for (const stage of [
        'AWAITING_COURIER',
        'ASSIGNED',
        'PICKED_UP',
        'DELIVERED',
        'CANCELLED',
      ]) {
        expect(adminDeliveriesQuerySchema.parse({ stage }).stage).toBe(stage);
      }
    });

    it('rejects a stage outside the Delivery lifecycle', () => {
      const result = adminDeliveriesQuerySchema.safeParse({ stage: 'LOST' });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        'Stage must be a valid Delivery stage.',
      );
    });
  });
});
