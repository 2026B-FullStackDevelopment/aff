import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findQueueMock,
  listForAdminMock,
  findActiveByCourierMock,
  findDeliveryByIdMock,
  findOrderByIdMock,
  findOrdersByIdsMock,
  findDonorSummariesByListingIdsMock,
  getListingByIdMock,
  verifyOrderOwnershipMock,
} = vi.hoisted(() => ({
  findQueueMock: vi.fn(),
  listForAdminMock: vi.fn(),
  findActiveByCourierMock: vi.fn(),
  findDeliveryByIdMock: vi.fn(),
  findOrderByIdMock: vi.fn(),
  findOrdersByIdsMock: vi.fn(),
  findDonorSummariesByListingIdsMock: vi.fn(),
  getListingByIdMock: vi.fn(),
  verifyOrderOwnershipMock: vi.fn(),
}));

vi.mock('../../../src/modules/delivery/delivery.queue.repository.js', () => ({
  findQueue: findQueueMock,
  listForAdmin: listForAdminMock,
  findActiveByCourier: findActiveByCourierMock,
  findDeliveryById: findDeliveryByIdMock,
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    findOrderById: findOrderByIdMock,
    findOrdersByIds: findOrdersByIdsMock,
    verifyOrderOwnership: verifyOrderOwnershipMock,
  },
}));

vi.mock('../../../src/modules/listings/listing.interface.js', () => ({
  listingInterface: {
    getListingById: getListingByIdMock,
    findDonorSummariesByListingIds: findDonorSummariesByListingIdsMock,
  },
}));

import {
  listForAdmin,
  listQueue,
  getActiveDelivery,
  getDeliveryById,
} from '../../../src/modules/delivery/delivery.queue.service.js';

describe('delivery.queue.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it('hydrates each row with its listing, both ends of the trip, and the Donor company name', async () => {
      const deliveryLocation = { latitude: 10.8, longitude: 106.6, updatedAt: new Date() };
      findQueueMock.mockResolvedValue({
        items: [first, second],
        page: 1,
        limit: 20,
        total: 2,
      });
      findOrdersByIdsMock.mockResolvedValue([
        {
          _id: 'o1',
          quantity: 3,
          deliveryAddressText: '12 Le Loi',
          deliveryLocation,
          listingId: 'l1',
          amount: 50000,
          paymentMethod: 'CASH',
        },
        {
          _id: 'o2',
          quantity: 1,
          deliveryAddressText: '9 Tran Phu',
          listingId: 'l1',
          amount: 0,
          paymentMethod: 'STRIPE',
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

      expect(findOrdersByIdsMock).toHaveBeenCalledWith(['o1', 'o2']);
      expect(findDonorSummariesByListingIdsMock).toHaveBeenCalledWith(['l1']);
      expect(result.items[0]).toEqual({
        id: 'd1',
        createdAt: first.createdAt,
        listing: {
          name: 'Sourdough loaves',
          pickupAddressText: '5 Hang Bac',
          pickupAddressLocation: pickupLocation,
        },
        order: {
          quantity: 3,
          deliveryAddressText: '12 Le Loi',
          deliveryLocation,
          amount: 50000,
          requiresCashCollection: true,
        },
        donor: { companyName: 'Fresh Foods' },
      });
      expect(result.total).toBe(2);
    });

    it('still lists a row whose Order could not be loaded, every block nulled', async () => {
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
      expect(result.items[0]).toEqual({
        id: 'd1',
        createdAt: first.createdAt,
        listing: { name: null, pickupAddressText: null, pickupAddressLocation: null },
        order: {
          quantity: null,
          deliveryAddressText: null,
          deliveryLocation: null,
          amount: null,
          requiresCashCollection: false,
        },
        donor: { companyName: null },
      });
    });

    it('nulls the listing block when the Donor summary is missing but the Order loaded', async () => {
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
        order: { quantity: 3, deliveryAddressText: '12 Le Loi' },
        listing: { name: null, pickupAddressText: null, pickupAddressLocation: null },
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
