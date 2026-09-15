import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findDeliveryByIdMock,
  claimIfAvailableMock,
  markPickedUpIfAssignedMock,
  recordCourierLocationMock,
  markDeliveredIfPickedUpMock,
  withTransactionMock,
  findOrderByIdMock,
  markOrderDeliveredMock,
  getListingByIdMock,
  emitToOrderMock,
  sendNotificationMock,
} = vi.hoisted(() => ({
  findDeliveryByIdMock: vi.fn(),
  claimIfAvailableMock: vi.fn(),
  markPickedUpIfAssignedMock: vi.fn(),
  recordCourierLocationMock: vi.fn(),
  markDeliveredIfPickedUpMock: vi.fn(),
  withTransactionMock: vi.fn(),
  findOrderByIdMock: vi.fn(),
  markOrderDeliveredMock: vi.fn(),
  getListingByIdMock: vi.fn(),
  emitToOrderMock: vi.fn(),
  sendNotificationMock: vi.fn(),
}));

vi.mock('../../../src/modules/delivery/delivery.queue.repository.js', () => ({
  findDeliveryById: findDeliveryByIdMock,
}));

vi.mock('../../../src/modules/delivery/delivery.courier.repository.js', () => ({
  claimIfAvailable: claimIfAvailableMock,
  markPickedUpIfAssigned: markPickedUpIfAssignedMock,
  recordCourierLocation: recordCourierLocationMock,
  markDeliveredIfPickedUp: markDeliveredIfPickedUpMock,
  withTransaction: withTransactionMock,
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

vi.mock('../../../src/realtime/socket.js', () => ({
  emitToOrder: emitToOrderMock,
}));

vi.mock('../../../src/modules/notifications/notification.interface.js', () => ({
  notificationInterface: {
    sendNotification: sendNotificationMock,
  },
}));

import {
  markPickedUp,
  recordCourierLocation,
  markDelivered,
  claimDelivery,
} from '../../../src/modules/delivery/delivery.courier.service.js';

describe('delivery.courier.service', () => {
  const databaseSession = { id: 'database-session' };

  beforeEach(() => {
    vi.clearAllMocks();
    withTransactionMock.mockImplementation(
      async (operation) => operation(databaseSession),
    );
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

      expect(sendNotificationMock).toHaveBeenCalledWith({
        userId: 'r1',
        type: 'DELIVERY_STATUS',
        event: 'order:status_changed',
        orderId: 'o1',
        persist: false,
        payload: { orderId: 'o1', stage: 'DELIVERED' },
      });
      expect(emitToOrderMock).toHaveBeenCalledWith(
        'o1',
        'delivery:delivered',
        expect.objectContaining({ orderId: 'o1' }),
      );
      expect(sendNotificationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'r1',
          type: 'DELIVERY_STATUS',
          event: 'delivery:delivered',
          orderId: 'o1',
        }),
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
        emittedDuringTransaction = sendNotificationMock.mock.calls.length > 0;
        return value;
      });

      await markDelivered('d1', 'c1', {});

      expect(emittedDuringTransaction).toBe(false);
      expect(sendNotificationMock).toHaveBeenCalled();
    });

    it('still completes the Delivery when every post-commit notification fails', async () => {
      preparePickedUpOrder('STRIPE');
      findOrderByIdMock.mockResolvedValue({
        _id: 'o1',
        listingId: 'l1',
        recipientId: 'r1',
        paymentMethod: 'STRIPE',
      });
      sendNotificationMock.mockImplementation(() => {
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
      expect(sendNotificationMock).toHaveBeenCalledTimes(2);
      expect(emitToOrderMock).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);

      consoleErrorSpy.mockRestore();
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

      expect(sendNotificationMock).toHaveBeenCalledWith({
        userId: 'r1',
        type: 'DELIVERY_STATUS',
        event: 'order:status_changed',
        orderId: 'o1',
        payload: { orderId: 'o1', stage: 'ASSIGNED' },
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

      expect(sendNotificationMock).toHaveBeenCalledWith({
        userId: 'r1',
        type: 'DELIVERY_STATUS',
        event: 'order:status_changed',
        orderId: 'o1',
        payload: { orderId: 'o1', stage: 'PICKED_UP' },
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
      sendNotificationMock.mockImplementationOnce(() => {
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
      sendNotificationMock.mockImplementationOnce(() => {
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
});
