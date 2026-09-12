import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createCourierAccountMock,
  listCouriersMock,
  listUsersForAdminMock,
  findCourierProfilesByUserIdsMock,
  listForAdminMock,
  findOrdersByIdsMock,
} = vi.hoisted(() => ({
  createCourierAccountMock: vi.fn(),
  listCouriersMock: vi.fn(),
  listUsersForAdminMock: vi.fn(),
  findCourierProfilesByUserIdsMock: vi.fn(),
  listForAdminMock: vi.fn(),
  findOrdersByIdsMock: vi.fn(),
}));

vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    createCourierAccount: createCourierAccountMock,
    listCouriers: listCouriersMock,
    listUsersForAdmin: listUsersForAdminMock,
    findCourierProfilesByUserIds: findCourierProfilesByUserIdsMock,
  },
}));

vi.mock('../../../src/modules/delivery/delivery.interface.js', () => ({
  deliveryInterface: {
    listForAdmin: listForAdminMock,
  },
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    findOrdersByIds: findOrdersByIdsMock,
  },
}));

import {
  createCourier,
  listCouriers,
  listUsers,
  listDeliveries,
} from '../../../src/modules/admin/admin.service.js';

const courierUser = {
  _id: 'u1',
  username: 'courier_01',
  email: 'courier@aff.com',
  role: 'COURIER',
  status: 'ACTIVE',
  avatarUrl: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('admin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCourier', () => {
    it('creates the account and returns it as a Courier DTO', async () => {
      createCourierAccountMock.mockResolvedValue({
        user: courierUser,
        courier: { userId: 'u1', fullName: 'Nguyen Van A' },
      });

      const result = await createCourier({
        username: 'courier_01',
        email: 'courier@aff.com',
        tempPassword: 'Str0ng#Pass',
        fullName: 'Nguyen Van A',
      });

      expect(createCourierAccountMock).toHaveBeenCalledWith({
        username: 'courier_01',
        email: 'courier@aff.com',
        password: 'Str0ng#Pass',
        fullName: 'Nguyen Van A',
      });
      expect(result).toMatchObject({
        id: 'u1',
        email: 'courier@aff.com',
        role: 'COURIER',
        fullName: 'Nguyen Van A',
      });
    });

    it('lets a duplicate-email rejection reach the caller unchanged', async () => {
      const conflict: Error & { statusCode?: number } = new Error(
        'This email is already registered.',
      );
      conflict.statusCode = 409;
      createCourierAccountMock.mockRejectedValue(conflict);

      await expect(
        createCourier({
          username: 'courier_01',
          email: 'taken@aff.com',
          tempPassword: 'Str0ng#Pass',
          fullName: 'Nguyen Van A',
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('listCouriers', () => {
    it('returns a page of Courier DTOs', async () => {
      listCouriersMock.mockResolvedValue({
        items: [
          { user: courierUser, courier: { userId: 'u1', fullName: 'Nguyen Van A' } },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });

      const result = await listCouriers({ page: 1, limit: 20 });

      expect(listCouriersMock).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toMatchObject({ page: 1, limit: 20, total: 1 });
      expect(result.items[0]).toMatchObject({
        id: 'u1',
        fullName: 'Nguyen Van A',
      });
    });
  });

  describe('listUsers', () => {
    it('delegates the validated filters to the users module', async () => {
      const page = {
        items: [courierUser],
        page: 2,
        limit: 10,
        total: 11,
      };
      const query = {
        page: 2,
        limit: 10,
        role: 'COURIER' as const,
        status: 'ACTIVE' as const,
        search: 'courier',
      };
      listUsersForAdminMock.mockResolvedValue(page);

      await expect(listUsers(query)).resolves.toBe(page);
      expect(listUsersForAdminMock).toHaveBeenCalledWith(query);
    });
  });

  describe('listDeliveries', () => {
    const claimed = {
      _id: 'd1',
      orderId: 'o1',
      courierId: 'u1',
      stage: 'PICKED_UP',
      pickedUpAt: new Date('2026-08-02T10:00:00.000Z'),
      createdAt: new Date('2026-08-02T09:00:00.000Z'),
    };

    const unclaimed = {
      _id: 'd2',
      orderId: 'o2',
      stage: 'AWAITING_COURIER',
      createdAt: new Date('2026-08-02T08:00:00.000Z'),
    };

    it('passes the stage filter through to the Delivery module', async () => {
      listForAdminMock.mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      await listDeliveries({ page: 1, limit: 20, stage: 'PICKED_UP' });

      expect(listForAdminMock).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        stage: 'PICKED_UP',
      });
    });

    it('hydrates each row with its Courier and its Order recipient', async () => {
      listForAdminMock.mockResolvedValue({
        items: [claimed, unclaimed],
        page: 1,
        limit: 20,
        total: 2,
      });
      findCourierProfilesByUserIdsMock.mockResolvedValue([
        { userId: 'u1', fullName: 'Nguyen Van A' },
      ]);
      findOrdersByIdsMock.mockResolvedValue([
        { _id: 'o1', recipientId: 'r1' },
        { _id: 'o2', recipientId: 'r2' },
      ]);

      const result = await listDeliveries({ page: 1, limit: 20 });

      expect(findCourierProfilesByUserIdsMock).toHaveBeenCalledWith(['u1']);
      expect(findOrdersByIdsMock).toHaveBeenCalledWith(['o1', 'o2']);
      expect(result.items[0]).toMatchObject({
        id: 'd1',
        stage: 'PICKED_UP',
        courier: { id: 'u1', fullName: 'Nguyen Van A' },
        order: { id: 'o1', recipientId: 'r1' },
      });
      expect(result.items[1]).toMatchObject({
        id: 'd2',
        courier: null,
        order: { id: 'o2', recipientId: 'r2' },
      });
    });

    it('asks for each Courier once when they hold several Deliveries', async () => {
      listForAdminMock.mockResolvedValue({
        items: [claimed, { ...claimed, _id: 'd3', orderId: 'o3' }],
        page: 1,
        limit: 20,
        total: 2,
      });
      findCourierProfilesByUserIdsMock.mockResolvedValue([
        { userId: 'u1', fullName: 'Nguyen Van A' },
      ]);
      findOrdersByIdsMock.mockResolvedValue([]);

      await listDeliveries({ page: 1, limit: 20 });

      expect(findCourierProfilesByUserIdsMock).toHaveBeenCalledWith(['u1']);
    });

    it('skips both hydration queries when the page is empty', async () => {
      listForAdminMock.mockResolvedValue({
        items: [],
        page: 5,
        limit: 20,
        total: 0,
      });

      const result = await listDeliveries({ page: 5, limit: 20 });

      expect(findCourierProfilesByUserIdsMock).not.toHaveBeenCalled();
      expect(findOrdersByIdsMock).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });

    it('exposes no way to assign or reassign a Delivery', async () => {
      const adminService = await import(
        '../../../src/modules/admin/admin.service.js'
      );

      expect(Object.keys(adminService).sort()).toEqual([
        'createCourier',
        'listCouriers',
        'listDeliveries',
        'listUsers',
      ]);
    });
  });
});
