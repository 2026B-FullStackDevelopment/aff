import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock, findByUserIdMock, emitToUserMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  emitToUserMock: vi.fn(),
}));

vi.mock('../../../src/modules/notifications/notification.repository.js', () => ({
  create: createMock,
  findByUserId: findByUserIdMock,
}));

vi.mock('../../../src/realtime/socket.js', () => ({
  emitToUser: emitToUserMock,
}));

import { sendNotification, listMyNotifications } from '../../../src/modules/notifications/notification.service.js';

describe('notification.service', () => {
  beforeEach(() => {
    createMock.mockReset();
    findByUserIdMock.mockReset();
    emitToUserMock.mockReset();
  });

  describe('sendNotification', () => {
    it('emits the default event for SOLD_OUT and persists a matching message', async () => {
      createMock.mockResolvedValue({ _id: 'n1' });

      await sendNotification({
        userId: 'd1',
        type: 'SOLD_OUT',
        listingId: 'l1',
        payload: { listingId: 'l1', name: 'Bread' },
      });

      expect(emitToUserMock).toHaveBeenCalledWith('d1', 'listing:sold_out', { listingId: 'l1', name: 'Bread' });
      expect(createMock).toHaveBeenCalledWith({
        userId: 'd1',
        type: 'SOLD_OUT',
        message: 'Your listing "Bread" just sold out.',
        orderId: undefined,
        listingId: 'l1',
      });
    });

    it('emits the default event for PAYMENT_SUCCESS and persists a matching message', async () => {
      createMock.mockResolvedValue({ _id: 'n1' });

      await sendNotification({
        userId: 'r1',
        type: 'PAYMENT_SUCCESS',
        orderId: 'o1',
        payload: { orderId: 'o1' },
      });

      expect(emitToUserMock).toHaveBeenCalledWith('r1', 'payment:success', { orderId: 'o1' });
      expect(createMock).toHaveBeenCalledWith({
        userId: 'r1',
        type: 'PAYMENT_SUCCESS',
        message: 'Your payment for order #o1 was successful.',
        orderId: 'o1',
        listingId: undefined,
      });
    });

    it('builds a distinct message for each DELIVERY_STATUS event, using the caller-supplied event', async () => {
      createMock.mockResolvedValue({ _id: 'n1' });

      await sendNotification({
        userId: 'r1',
        type: 'DELIVERY_STATUS',
        event: 'order:status_changed',
        orderId: 'o1',
        payload: { orderId: 'o1', stage: 'ASSIGNED' },
      });

      expect(emitToUserMock).toHaveBeenCalledWith('r1', 'order:status_changed', { orderId: 'o1', stage: 'ASSIGNED' });
      expect(createMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: "Your order's delivery status changed to ASSIGNED." }),
      );

      await sendNotification({
        userId: 'r1',
        type: 'DELIVERY_STATUS',
        event: 'delivery:delivered',
        orderId: 'o1',
        payload: { orderId: 'o1' },
      });

      expect(emitToUserMock).toHaveBeenCalledWith('r1', 'delivery:delivered', { orderId: 'o1' });
      expect(createMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: 'Your order has been delivered.' }),
      );
    });

    it('logs and swallows without emitting or persisting when DELIVERY_STATUS has no explicit event', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await sendNotification({
        userId: 'r1',
        type: 'DELIVERY_STATUS',
        orderId: 'o1',
        payload: { orderId: 'o1' },
      });

      expect(emitToUserMock).not.toHaveBeenCalled();
      expect(createMock).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('logs and returns without persisting when the emit itself throws', async () => {
      emitToUserMock.mockImplementation(() => {
        throw new Error('Socket.IO server has not been initialized.');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await sendNotification({ userId: 'd1', type: 'SOLD_OUT', payload: { name: 'Bread' } });

      expect(createMock).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('never throws when the persistence write fails — the live event has already fired', async () => {
      createMock.mockRejectedValue(new Error('DB unavailable'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await expect(
        sendNotification({ userId: 'd1', type: 'SOLD_OUT', payload: { name: 'Bread' } }),
      ).resolves.toBeUndefined();

      expect(emitToUserMock).toHaveBeenCalledWith('d1', 'listing:sold_out', { name: 'Bread' });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('emits the default event for PREMIUM_MATCH and persists a matching message', async () => {
      createMock.mockResolvedValue({ _id: 'n1' });

      await sendNotification({
        userId: 'u1',
        type: 'PREMIUM_MATCH',
        payload: { listingId: 'l1' },
      });

      expect(emitToUserMock).toHaveBeenCalledWith('u1', 'notification:premium_match', { listingId: 'l1' });
      expect(createMock).toHaveBeenCalledWith({
        userId: 'u1',
        type: 'PREMIUM_MATCH',
        message: 'A new listing matches your notification preferences.',
        orderId: undefined,
        listingId: undefined,
      });
    });

    it('emits the default event for ADMIN_CANCEL and persists a matching message', async () => {
      createMock.mockResolvedValue({ _id: 'n1' });

      await sendNotification({
        userId: 'r1',
        type: 'ADMIN_CANCEL',
        orderId: 'o1',
        payload: { orderId: 'o1' },
      });

      expect(emitToUserMock).toHaveBeenCalledWith('r1', 'notification:admin_cancel', { orderId: 'o1' });
      expect(createMock).toHaveBeenCalledWith({
        userId: 'r1',
        type: 'ADMIN_CANCEL',
        message: 'Your order was cancelled by an admin.',
        orderId: 'o1',
        listingId: undefined,
      });
    });
  });

  describe('listMyNotifications', () => {
    it('delegates to the repository with the given page and limit', async () => {
      findByUserIdMock.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

      const result = await listMyNotifications('u1', 1, 20);

      expect(findByUserIdMock).toHaveBeenCalledWith('u1', 1, 20);
      expect(result).toEqual({ items: [], page: 1, limit: 20, total: 0 });
    });
  });
});
