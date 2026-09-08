import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findOrCreateForOrderMock,
  findDeliveryByOrderIdMock,
  findProtectedOrderIdsMock,
  cancelAwaitingDeliveriesByOrderIdsMock,
  withTransactionMock,
  findDeliveryByIdMock,
  markPickedUpIfAssignedMock,
  recordCourierLocationMock,
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
  emitToUserMock,
  emitToOrderMock,
  verifyOrderOwnershipMock,
} = vi.hoisted(() => ({
  findOrCreateForOrderMock: vi.fn(),
  findDeliveryByOrderIdMock: vi.fn(),
  findProtectedOrderIdsMock: vi.fn(),
  cancelAwaitingDeliveriesByOrderIdsMock: vi.fn(),
  withTransactionMock: vi.fn(),
  findDeliveryByIdMock: vi.fn(),
  markPickedUpIfAssignedMock: vi.fn(),
  recordCourierLocationMock: vi.fn(),
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
  emitToUserMock: vi.fn(),
  emitToOrderMock: vi.fn(),
  verifyOrderOwnershipMock: vi.fn(),
}));

vi.mock('../../../src/modules/delivery/delivery.repository.js', () => ({
  findOrCreateForOrder: findOrCreateForOrderMock,
  findDeliveryByOrderId: findDeliveryByOrderIdMock,
  findProtectedOrderIds: findProtectedOrderIdsMock,
  cancelAwaitingDeliveriesByOrderIds:
    cancelAwaitingDeliveriesByOrderIdsMock,
  withTransaction: withTransactionMock,
  findDeliveryById: findDeliveryByIdMock,
  markPickedUpIfAssigned: markPickedUpIfAssignedMock,
  recordCourierLocation: recordCourierLocationMock,
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
    verifyOrderOwnership: verifyOrderOwnershipMock,
  },
}));

vi.mock('../../../src/modules/listings/listing.interface.js', () => ({
  listingInterface: {
    getListingById: getListingByIdMock,
    findDonorSummariesByListingIds: findDonorSummariesByListingIdsMock,
  },
}));

vi.mock('../../../src/realtime/socket.js', () => ({
  emitToUser: emitToUserMock,
  emitToOrder: emitToOrderMock,
}));

import {
  createForOrder,
  markPickedUp,
  recordCourierLocation,
  markDelivered,
  listForAdmin,
  listQueue,
  claimDelivery,
  getActiveDelivery,
  getDeliveryById,
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

    it('announces a completed Delivery to both the order room and the Recipient', async () => {
      preparePickedUpOrder('STRIPE');
      findOrderByIdMock.mockResolvedValue({
        _id: 'o1',
        listingId: 'l1',
        recipientId: 'r1',
        paymentMethod: 'STRIPE',
      });

      await markDelivered('d1', 'c1', {});

      expect(emitToUserMock).toHaveBeenCalledWith('r1', 'order:status_changed', {
        orderId: 'o1',
        stage: 'DELIVERED',
      });
      expect(emitToOrderMock).toHaveBeenCalledWith(
        'o1',
        'delivery:delivered',
        expect.objectContaining({ orderId: 'o1' }),
      );
      expect(emitToUserMock).toHaveBeenCalledWith(
        'r1',
        'delivery:delivered',
        expect.objectContaining({ orderId: 'o1' }),
      );
    });

    it('emits only after the delivery transaction commits', async () => {
      preparePickedUpOrder('STRIPE');
      findOrderByIdMock.mockResolvedValue({
        _id: 'o1',
        listingId: 'l1',
        recipientId: 'r1',
        paymentMethod: 'STRIPE',
      });

      let emittedDuringTransaction = false;
      withTransactionMock.mockImplementation(async (operation) => {
        const value = await operation(databaseSession);
        emittedDuringTransaction = emitToUserMock.mock.calls.length > 0;
        return value;
      });

      await markDelivered('d1', 'c1', {});

      expect(emittedDuringTransaction).toBe(false);
      expect(emitToUserMock).toHaveBeenCalled();
    });

    it('still completes the Delivery when every post-commit notification fails', async () => {
      preparePickedUpOrder('STRIPE');
      findOrderByIdMock.mockResolvedValue({
        _id: 'o1',
        listingId: 'l1',
        recipientId: 'r1',
        paymentMethod: 'STRIPE',
      });
      emitToUserMock.mockImplementation(() => {
        throw new Error('Socket.IO server has not been initialized.');
      });
      emitToOrderMock.mockImplementation(() => {
        throw new Error('Socket.IO server has not been initialized.');
      });
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const result = await markDelivered('d1', 'c1', {});

      expect(result.delivery).toMatchObject({ stage: 'DELIVERED' });
      // All three post-commit emits are independently guarded, so one
      // failing does not stop the others from being attempted.
      expect(emitToUserMock).toHaveBeenCalledTimes(2);
      expect(emitToOrderMock).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);

      consoleErrorSpy.mockRestore();
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

    const pickupLocation = { latitude: 21.03, longitude: 105.85, updatedAt: new Date() };

    it('hydrates each row with its Order, listing name, Donor company name and pickup address', async () => {
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
        {
          listingId: 'l1',
          listingName: 'Sourdough loaves',
          companyName: 'Fresh Foods',
          addressText: '5 Hang Bac',
          location: pickupLocation,
        },
      ]);

      const result = await listQueue({ page: 1, limit: 20 });

      expect(findOrdersByIdsMock).toHaveBeenCalledWith(['o1', 'o2']);
      expect(findDonorSummariesByListingIdsMock).toHaveBeenCalledWith(['l1']);
      expect(result.items[0]).toMatchObject({
        id: 'd1',
        order: { id: 'o1', quantity: 3, deliveryAddressText: '12 Le Loi' },
        listing: { name: 'Sourdough loaves' },
        donor: { companyName: 'Fresh Foods' },
        pickupAddressText: '5 Hang Bac',
        pickupAddressLocation: pickupLocation,
      });
      expect(result.total).toBe(2);
    });

    it('carries the real cash flag and delivery location through to a queue row', async () => {
      findQueueMock.mockResolvedValue({
        items: [first],
        page: 1,
        limit: 20,
        total: 1,
      });
      findOrdersByIdsMock.mockResolvedValue([
        {
          _id: 'o1',
          quantity: 3,
          deliveryAddressText: '12 Le Loi',
          deliveryLocation: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
          paymentMethod: 'CASH',
          listingId: 'l1',
        },
      ]);
      findDonorSummariesByListingIdsMock.mockResolvedValue([
        {
          listingId: 'l1',
          listingName: 'Sourdough loaves',
          companyName: 'Fresh Foods',
          addressText: '5 Hang Bac',
          location: pickupLocation,
        },
      ]);

      const result = await listQueue({ page: 1, limit: 20 });

      expect(result.items[0]).toMatchObject({
        requiresCashCollection: true,
        deliveryLocation: { latitude: 10.8, longitude: 106.6 },
      });
    });

    it('still lists a row whose Order could not be loaded, with no pickup pin', async () => {
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
        listing: { name: null },
        donor: { companyName: null },
      });
      expect(result.items[0].pickupAddressText).toBeUndefined();
      expect(result.items[0].pickupAddressLocation).toBeUndefined();
    });

    it('degrades the pickup pin when the Donor summary is missing but the Order loaded', async () => {
      findQueueMock.mockResolvedValue({
        items: [first],
        page: 1,
        limit: 20,
        total: 1,
      });
      findOrdersByIdsMock.mockResolvedValue([
        { _id: 'o1', quantity: 3, deliveryAddressText: '12 Le Loi', listingId: 'l1' },
      ]);
      findDonorSummariesByListingIdsMock.mockResolvedValue([]);

      const result = await listQueue({ page: 1, limit: 20 });

      expect(result.items[0]).toMatchObject({
        order: { id: 'o1', quantity: 3 },
        listing: { name: null },
        donor: { companyName: null },
      });
      expect(result.items[0].pickupAddressText).toBeUndefined();
      expect(result.items[0].pickupAddressLocation).toBeUndefined();
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

  describe('markPickedUp', () => {
    it('advances the Delivery and returns it with the pickup address', async () => {
      markPickedUpIfAssignedMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'PICKED_UP',
        createdAt: new Date(),
      });
      findOrderByIdMock.mockResolvedValue({
        _id: 'o1',
        listingId: 'l1',
        recipientId: 'r1',
      });
      getListingByIdMock.mockResolvedValue({
        listing: { _id: 'l1' },
        donor: {
          addressText: '123 Main St',
          location: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
        },
      });

      const result = await markPickedUp('d1', 'c1');

      expect(markPickedUpIfAssignedMock).toHaveBeenCalledWith(
        'd1',
        'c1',
        expect.any(Date),
      );
      expect(result.delivery).toMatchObject({ stage: 'PICKED_UP' });
      expect(result.pickupAddressText).toBe('123 Main St');
    });

    it('reports 409 when the Delivery is not currently assigned to this Courier', async () => {
      markPickedUpIfAssignedMock.mockResolvedValue(null);

      await expect(markPickedUp('d1', 'c1')).rejects.toMatchObject({
        statusCode: 409,
        message: 'Only an assigned Delivery can be picked up.',
      });
    });
  });

  describe('recordCourierLocation', () => {
    it('hands the position straight to the repository', async () => {
      const delivery = { _id: 'd1', orderId: 'o1', stage: 'PICKED_UP' };
      recordCourierLocationMock.mockResolvedValue(delivery);

      const result = await recordCourierLocation('c1', {
        latitude: 10.8,
        longitude: 106.6,
      });

      expect(recordCourierLocationMock).toHaveBeenCalledWith('c1', {
        latitude: 10.8,
        longitude: 106.6,
      });
      expect(result).toBe(delivery);
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

  describe('stage change events', () => {
    function prepareOrder() {
      findOrderByIdMock.mockResolvedValue({
        _id: 'o1',
        listingId: 'l1',
        recipientId: 'r1',
      });
      getListingByIdMock.mockResolvedValue({
        listing: { _id: 'l1' },
        donor: {
          addressText: '123 Main St',
          location: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
        },
      });
    }

    it('tells the Recipient when their Delivery is claimed', async () => {
      claimIfAvailableMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'ASSIGNED',
        createdAt: new Date(),
      });
      prepareOrder();

      await claimDelivery('d1', 'c1');

      expect(emitToUserMock).toHaveBeenCalledWith('r1', 'order:status_changed', {
        orderId: 'o1',
        stage: 'ASSIGNED',
      });
    });

    it('tells the Recipient when their Delivery is picked up', async () => {
      markPickedUpIfAssignedMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'PICKED_UP',
        createdAt: new Date(),
      });
      prepareOrder();

      await markPickedUp('d1', 'c1');

      expect(emitToUserMock).toHaveBeenCalledWith('r1', 'order:status_changed', {
        orderId: 'o1',
        stage: 'PICKED_UP',
      });
    });

    it('still resolves the claim when the realtime notification fails', async () => {
      claimIfAvailableMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'ASSIGNED',
        createdAt: new Date(),
      });
      prepareOrder();
      emitToUserMock.mockImplementationOnce(() => {
        throw new Error('Socket.IO server has not been initialized.');
      });
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const result = await claimDelivery('d1', 'c1');

      expect(result.delivery).toMatchObject({ stage: 'ASSIGNED' });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('still resolves the pickup when the realtime notification fails', async () => {
      markPickedUpIfAssignedMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'PICKED_UP',
        createdAt: new Date(),
      });
      prepareOrder();
      emitToUserMock.mockImplementationOnce(() => {
        throw new Error('Socket.IO server has not been initialized.');
      });
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const result = await markPickedUp('d1', 'c1');

      expect(result.delivery).toMatchObject({ stage: 'PICKED_UP' });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getDeliveryById', () => {
    function prepareDelivery() {
      findDeliveryByIdMock.mockResolvedValue({
        _id: 'd1',
        orderId: 'o1',
        courierId: 'c1',
        stage: 'PICKED_UP',
        createdAt: new Date(),
      });
      findOrderByIdMock.mockResolvedValue({
        _id: 'o1',
        listingId: 'l1',
        recipientId: 'r1',
      });
      getListingByIdMock.mockResolvedValue({
        listing: { _id: 'l1' },
        donor: {
          addressText: '123 Main St',
          location: { latitude: 10.8, longitude: 106.6, updatedAt: new Date() },
        },
      });
    }

    it('returns the Delivery to the Recipient who owns its Order', async () => {
      prepareDelivery();
      verifyOrderOwnershipMock.mockResolvedValue(true);

      const result = await getDeliveryById('d1', 'r1', 'RECIPIENT');

      expect(verifyOrderOwnershipMock).toHaveBeenCalledWith('o1', 'r1');
      expect(result.delivery).toMatchObject({ stage: 'PICKED_UP' });
      expect(result.pickupAddressText).toBe('123 Main St');
    });

    it('returns any Delivery to an Admin without an ownership check', async () => {
      prepareDelivery();

      const result = await getDeliveryById('d1', 'admin1', 'ADMIN');

      expect(verifyOrderOwnershipMock).not.toHaveBeenCalled();
      expect(result.delivery).toMatchObject({ _id: 'd1' });
    });

    it('reports 404, not 403, to a Recipient who does not own the Order', async () => {
      prepareDelivery();
      verifyOrderOwnershipMock.mockResolvedValue(false);

      await expect(
        getDeliveryById('d1', 'other-recipient', 'RECIPIENT'),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Delivery not found.' });
    });

    it('reports 404 when no such Delivery exists', async () => {
      findDeliveryByIdMock.mockResolvedValue(null);

      await expect(getDeliveryById('d1', 'r1', 'RECIPIENT')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Delivery not found.',
      });
    });
  });
});
