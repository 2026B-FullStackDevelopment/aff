import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findOrCreateForOrderMock,
  findDeliveryByOrderIdMock,
  findProtectedOrderIdsMock,
  cancelAwaitingDeliveriesByOrderIdsMock,
  withTransactionMock,
  findDeliveryByIdMock,
  markDeliveredIfPickedUpMock,
  listForAdminMock,
  findOrderByIdMock,
  markOrderDeliveredMock,
  getListingByIdMock,
} = vi.hoisted(() => ({
  findOrCreateForOrderMock: vi.fn(),
  findDeliveryByOrderIdMock: vi.fn(),
  findProtectedOrderIdsMock: vi.fn(),
  cancelAwaitingDeliveriesByOrderIdsMock: vi.fn(),
  withTransactionMock: vi.fn(),
  findDeliveryByIdMock: vi.fn(),
  markDeliveredIfPickedUpMock: vi.fn(),
  listForAdminMock: vi.fn(),
  findOrderByIdMock: vi.fn(),
  markOrderDeliveredMock: vi.fn(),
  getListingByIdMock: vi.fn(),
}));

vi.mock('../../../src/modules/delivery/delivery.repository.js', () => ({
  findOrCreateForOrder: findOrCreateForOrderMock,
  findDeliveryByOrderId: findDeliveryByOrderIdMock,
  findProtectedOrderIds: findProtectedOrderIdsMock,
  cancelAwaitingDeliveriesByOrderIds:
    cancelAwaitingDeliveriesByOrderIdsMock,
  withTransaction: withTransactionMock,
  findDeliveryById: findDeliveryByIdMock,
  markDeliveredIfPickedUp: markDeliveredIfPickedUpMock,
  listForAdmin: listForAdminMock,
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    findOrderById: findOrderByIdMock,
    markOrderDelivered: markOrderDeliveredMock,
  },
}));

vi.mock('../../../src/modules/listings/listing.interface.js', () => ({
  listingInterface: {
    getListingById: getListingByIdMock,
  },
}));

import {
  createForOrder,
  markDelivered,
  listForAdmin,
} from '../../../src/modules/delivery/delivery.service.js';

describe('delivery.service', () => {
  const databaseSession = { id: 'database-session' };

  beforeEach(() => {
    vi.clearAllMocks();
    withTransactionMock.mockImplementation(
      async (operation) => operation(databaseSession),
    );
  });

  describe('createForOrder', () => {
    it('returns the single Delivery created or found for the Order', async () => {
      const delivery = {
        _id: 'd1',
        orderId: 'o1',
        stage: 'AWAITING_COURIER',
      };
      findOrCreateForOrderMock.mockResolvedValue(delivery);

      const result = await createForOrder('o1');

      expect(findOrCreateForOrderMock).toHaveBeenCalledWith(
        'o1',
        undefined,
      );
      expect(result).toBe(delivery);
    });

    it('is idempotent when a concurrent insert wins the unique orderId race', async () => {
      const existing = {
        _id: 'd1',
        orderId: 'o1',
        stage: 'AWAITING_COURIER',
      };
      findOrCreateForOrderMock.mockRejectedValue({ code: 11000 });
      findDeliveryByOrderIdMock.mockResolvedValue(existing);

      const result = await createForOrder('o1');

      expect(findDeliveryByOrderIdMock).toHaveBeenCalledWith(
        'o1',
        undefined,
      );
      expect(result).toBe(existing);
    });
  });

  describe('markDelivered', () => {
    function preparePickedUpOrder(paymentMethod: 'CASH' | 'STRIPE') {
      const delivery = {
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'PICKED_UP',
      };
      findDeliveryByIdMock.mockResolvedValue(delivery);
      findOrderByIdMock.mockResolvedValue({
        _id: 'o1',
        listingId: 'l1',
        paymentMethod,
      });
      markDeliveredIfPickedUpMock.mockResolvedValue({
        ...delivery,
        stage: 'DELIVERED',
      });
      markOrderDeliveredMock.mockResolvedValue({
        _id: 'o1',
        orderStatus: 'DELIVERED',
      });
      getListingByIdMock.mockResolvedValue({
        listing: { _id: 'l1' },
        donor: {
          addressText: '123 Main St',
          location: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
        },
      });
    }

    it('requires explicit confirmation before completing a cash Order', async () => {
      preparePickedUpOrder('CASH');

      await expect(
        markDelivered('d1', 'c1', {}),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cash confirmation is required.',
      });

      expect(markDeliveredIfPickedUpMock).not.toHaveBeenCalled();
      expect(markOrderDeliveredMock).not.toHaveBeenCalled();
    });

    it('completes the Delivery and cash Order in the same transaction', async () => {
      preparePickedUpOrder('CASH');

      const result = await markDelivered('d1', 'c1', {
        cashConfirmed: true,
      });

      expect(markDeliveredIfPickedUpMock).toHaveBeenCalledWith(
        'd1',
        'c1',
        expect.any(Date),
        databaseSession,
      );
      expect(markOrderDeliveredMock).toHaveBeenCalledWith(
        'o1',
        'c1',
        expect.any(Date),
        true,
        databaseSession,
      );
      expect(getListingByIdMock).toHaveBeenCalledWith('l1');
      expect(result.delivery).toMatchObject({ stage: 'DELIVERED' });
      expect(result.pickupAddressText).toBe('123 Main St');
      expect(result.pickupAddressLocation).toMatchObject({
        latitude: 10.8,
        longitude: 106.6,
      });
    });
  });

  describe('listForAdmin', () => {
    it('hands the Admin filter straight to the repository', async () => {
      const page = { items: [{ _id: 'd1' }], page: 2, limit: 5, total: 9 };
      listForAdminMock.mockResolvedValue(page);

      const result = await listForAdmin({
        page: 2,
        limit: 5,
        stage: 'ASSIGNED',
      });

      expect(listForAdminMock).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        stage: 'ASSIGNED',
      });
      expect(result).toBe(page);
    });
  });
});
