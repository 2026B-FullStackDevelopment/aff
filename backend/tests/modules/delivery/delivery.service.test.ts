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
  findQueueMock,
  claimIfAvailableMock,
  findActiveByCourierMock,
  findOrderByIdMock,
  findOrdersByIdsMock,
  findDonorSummariesByListingIdsMock,
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
  findQueueMock: vi.fn(),
  claimIfAvailableMock: vi.fn(),
  findActiveByCourierMock: vi.fn(),
  findOrderByIdMock: vi.fn(),
  findOrdersByIdsMock: vi.fn(),
  findDonorSummariesByListingIdsMock: vi.fn(),
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
  findQueue: findQueueMock,
  claimIfAvailable: claimIfAvailableMock,
  findActiveByCourier: findActiveByCourierMock,
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    findOrderById: findOrderByIdMock,
    findOrdersByIds: findOrdersByIdsMock,
    markOrderDelivered: markOrderDeliveredMock,
  },
}));

vi.mock('../../../src/modules/listings/listing.interface.js', () => ({
  listingInterface: {
    getListingById: getListingByIdMock,
    findDonorSummariesByListingIds: findDonorSummariesByListingIdsMock,
  },
}));

import {
  createForOrder,
  markDelivered,
  listForAdmin,
  listQueue,
  claimDelivery,
  getActiveDelivery,
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

  describe('listQueue', () => {
    const first = { _id: 'd1', orderId: 'o1', stage: 'AWAITING_COURIER', createdAt: new Date() };
    const second = { _id: 'd2', orderId: 'o2', stage: 'AWAITING_COURIER', createdAt: new Date() };

    it('hydrates each row with its Order and its Donor company name', async () => {
      findQueueMock.mockResolvedValue({
        items: [first, second],
        page: 1,
        limit: 20,
        total: 2,
      });
      findOrdersByIdsMock.mockResolvedValue([
        { _id: 'o1', quantity: 3, deliveryAddressText: '12 Le Loi', listingId: 'l1' },
        { _id: 'o2', quantity: 1, deliveryAddressText: '9 Tran Phu', listingId: 'l1' },
      ]);
      findDonorSummariesByListingIdsMock.mockResolvedValue([
        { listingId: 'l1', companyName: 'Fresh Foods' },
      ]);

      const result = await listQueue({ page: 1, limit: 20 });

      expect(findOrdersByIdsMock).toHaveBeenCalledWith(['o1', 'o2']);
      expect(findDonorSummariesByListingIdsMock).toHaveBeenCalledWith(['l1']);
      expect(result.items[0]).toMatchObject({
        id: 'd1',
        order: { id: 'o1', quantity: 3, deliveryAddressText: '12 Le Loi' },
        donor: { companyName: 'Fresh Foods' },
      });
      expect(result.total).toBe(2);
    });

    it('still lists a row whose Order could not be loaded', async () => {
      findQueueMock.mockResolvedValue({
        items: [first],
        page: 1,
        limit: 20,
        total: 1,
      });
      findOrdersByIdsMock.mockResolvedValue([]);
      findDonorSummariesByListingIdsMock.mockResolvedValue([]);

      const result = await listQueue({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        order: { id: 'o1', quantity: null },
        donor: { companyName: null },
      });
    });

    it('skips both hydration queries when the queue is empty', async () => {
      findQueueMock.mockResolvedValue({ items: [], page: 3, limit: 20, total: 0 });

      const result = await listQueue({ page: 3, limit: 20 });

      expect(findOrdersByIdsMock).not.toHaveBeenCalled();
      expect(findDonorSummariesByListingIdsMock).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });
  });

  describe('claimDelivery', () => {
    function prepareClaimable() {
      claimIfAvailableMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'ASSIGNED',
        createdAt: new Date(),
      });
      findOrderByIdMock.mockResolvedValue({ _id: 'o1', listingId: 'l1' });
      getListingByIdMock.mockResolvedValue({
        listing: { _id: 'l1' },
        donor: {
          addressText: '123 Main St',
          location: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
        },
      });
    }

    it('returns the claimed Delivery with the pickup address resolved', async () => {
      prepareClaimable();

      const result = await claimDelivery('d1', 'c1');

      expect(claimIfAvailableMock).toHaveBeenCalledWith('d1', 'c1');
      expect(result.delivery).toMatchObject({ stage: 'ASSIGNED' });
      expect(result.pickupAddressText).toBe('123 Main St');
      expect(result.pickupAddressLocation).toMatchObject({ latitude: 10.8 });
    });

    it('reports 409 when another Courier claimed it first', async () => {
      claimIfAvailableMock.mockResolvedValue(null);
      findDeliveryByIdMock.mockResolvedValue({ _id: 'd1', stage: 'ASSIGNED' });

      await expect(claimDelivery('d1', 'c1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'This Delivery has already been claimed.',
      });
    });

    it('reports 404 when the Delivery does not exist at all', async () => {
      claimIfAvailableMock.mockResolvedValue(null);
      findDeliveryByIdMock.mockResolvedValue(null);

      await expect(claimDelivery('d1', 'c1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('reports 409 when this Courier already has an active Delivery', async () => {
      claimIfAvailableMock.mockRejectedValue({ code: 11000 });

      await expect(claimDelivery('d1', 'c1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'You already have an active Delivery.',
      });
    });
  });

  describe('getActiveDelivery', () => {
    it('returns the in-flight Delivery with its pickup address', async () => {
      findActiveByCourierMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'PICKED_UP',
        createdAt: new Date(),
      });
      findOrderByIdMock.mockResolvedValue({ _id: 'o1', listingId: 'l1' });
      getListingByIdMock.mockResolvedValue({
        listing: { _id: 'l1' },
        donor: {
          addressText: '123 Main St',
          location: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
        },
      });

      const result = await getActiveDelivery('c1');

      expect(result.delivery).toMatchObject({ stage: 'PICKED_UP' });
      expect(result.pickupAddressText).toBe('123 Main St');
    });

    it('reports 404 when the Courier has none, so the client falls through to the queue', async () => {
      findActiveByCourierMock.mockResolvedValue(null);

      await expect(getActiveDelivery('c1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
