import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  findAvailableListingsMock,
  createListingMock,
  findListingByIdMock,
  findMyListingsWithStatsMock,
  updateListingStatusIfCurrentMock,
  decrementStockAtomicallyMock,
  decrementStockForReserveAtomicallyMock,
  withTransactionMock,
  getUserByIdMock,
  getDonorByUserIdMock,
  findUserByEmailMock,
  createOrderMock,
  listOrdersForListingMock,
  createForOrderMock,
  findNonCancelledOrderIdsByListingMock,
  hasNonCancelledOrderForListingMock,
  cancelOrdersByIdsMock,
  findProtectedOrderIdsMock,
  cancelAwaitingDeliveriesByOrderIdsMock,
  emitToUserMock,
  sendNotificationMock,
} = vi.hoisted(() => ({
  findAvailableListingsMock: vi.fn(),
  createListingMock: vi.fn(),
  findListingByIdMock: vi.fn(),
  findMyListingsWithStatsMock: vi.fn(),
  updateListingStatusIfCurrentMock: vi.fn(),
  decrementStockAtomicallyMock: vi.fn(),
  decrementStockForReserveAtomicallyMock: vi.fn(),
  withTransactionMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  getDonorByUserIdMock: vi.fn(),
  findUserByEmailMock: vi.fn(),
  createOrderMock: vi.fn(),
  listOrdersForListingMock: vi.fn(),
  createForOrderMock: vi.fn(),
  findNonCancelledOrderIdsByListingMock: vi.fn(),
  hasNonCancelledOrderForListingMock: vi.fn(),
  cancelOrdersByIdsMock: vi.fn(),
  findProtectedOrderIdsMock: vi.fn(),
  cancelAwaitingDeliveriesByOrderIdsMock: vi.fn(),
  emitToUserMock: vi.fn(),
  sendNotificationMock: vi.fn(),
}));

vi.mock('../../../src/modules/listings/listing.query.repository.js', () => ({
  findAvailableListings: findAvailableListingsMock,
  findListingById: findListingByIdMock,
  findMyListingsWithStats: findMyListingsWithStatsMock,
}));

vi.mock('../../../src/modules/listings/listing.command.repository.js', () => ({
  createListing: createListingMock,
  updateListingStatusIfCurrent: updateListingStatusIfCurrentMock,
}));

vi.mock('../../../src/modules/listings/listing.stock.repository.js', () => ({
  decrementStockAtomically: decrementStockAtomicallyMock,
  decrementStockForReserveAtomically: decrementStockForReserveAtomicallyMock,
}));

vi.mock('../../../src/modules/listings/listing.transaction.repository.js', () => ({
  withTransaction: withTransactionMock,
}));
// replace real User module with test mocks, prevent tests from affecting database
vi.mock('../../../src/modules/users/user.interface.js', () => ({
  userInterface: {
    getUserById: getUserByIdMock,
    getDonorByUserId: getDonorByUserIdMock,
    findUserByEmail: findUserByEmailMock,
  },
}));

vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    createOrder: createOrderMock,
    listOrdersForListing: listOrdersForListingMock,
    findNonCancelledOrderIdsByListing:
      findNonCancelledOrderIdsByListingMock,
    hasNonCancelledOrderForListing: hasNonCancelledOrderForListingMock,
    cancelOrdersByIds: cancelOrdersByIdsMock,
  },
}));

vi.mock('../../../src/modules/delivery/delivery.interface.js', () => ({
  deliveryInterface: {
    createForOrder: createForOrderMock,
    findProtectedOrderIds: findProtectedOrderIdsMock,
    cancelAwaitingDeliveriesByOrderIds:
      cancelAwaitingDeliveriesByOrderIdsMock,
  },
}));

vi.mock('../../../src/realtime/socket.js', () => ({
  emitToUser: emitToUserMock,
}));

vi.mock('../../../src/modules/notifications/notification.interface.js', () => ({
  notificationInterface: {
    sendNotification: sendNotificationMock,
  },
}));

import {
  listMyListings,
  listAvailableListings,
  getListingById,
} from '../../../src/modules/listings/listing.query.service.js';
import {
  createListing,
  cloneListing,
  updateListingStatus,
} from '../../../src/modules/listings/listing.command.service.js';
import {
  listListingOrders,
  createDonorInitiatedDonation,
} from '../../../src/modules/listings/listing.donation.service.js';
import { reserveListing } from '../../../src/modules/listings/listing.reservation.service.js';

// reusable example location, one shared object keeps test data consistent
const location = {
  latitude: 21.0278,
  longitude: 105.8342,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function prepareDonorMocks() {
  getUserByIdMock.mockResolvedValue({
    _id: 'd1',
    city: 'Hanoi',
  });

  getDonorByUserIdMock.mockResolvedValue({
    userId: 'd1',
    companyName: 'Fresh Bakery',
    taxCode: 'TAX-123',
    addressText: '123 Example Street, Hanoi',
    location,
  });
}

// group all tests together
describe('Listing services', () => {
  const databaseSession = { id: 'database-session' };

  beforeEach(() => {
    vi.clearAllMocks();
    hasNonCancelledOrderForListingMock.mockResolvedValue(false);
    withTransactionMock.mockImplementation(
      async (operation) => operation(databaseSession),
    );
  });

  describe('listAvailableListings', () => {
    it('delegates to the repository and enriches Listings with Donor data', async () => {
      const listing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        city: 'Hanoi',
      };

      findAvailableListingsMock.mockResolvedValue({
        items: [listing],
        page: 1,
        limit: 20,
        total: 1,
      });
      prepareDonorMocks();

      const query = { page: 1, limit: 20 };
      const result = await listAvailableListings(query);

      expect(findAvailableListingsMock).toHaveBeenCalledWith(query);
      expect(getUserByIdMock).toHaveBeenCalledWith('d1');
      expect(getDonorByUserIdMock).toHaveBeenCalledWith('d1');
      expect(result).toEqual({
        items: [
          {
            listing,
            donor: {
              id: 'd1',
              companyName: 'Fresh Bakery',
              city: 'Hanoi',
              addressText: '123 Example Street, Hanoi',
              location,
            },
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });
    });

    it('returns an empty page without performing Donor lookups', async () => {
      findAvailableListingsMock.mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      const query = { page: 1, limit: 20 };
      const result = await listAvailableListings(query);

      expect(findAvailableListingsMock).toHaveBeenCalledWith(query);
      expect(getUserByIdMock).not.toHaveBeenCalled();
      expect(getDonorByUserIdMock).not.toHaveBeenCalled();
      expect(result).toEqual({ items: [], page: 1, limit: 20, total: 0 });
    });
  });

  describe('createListing', () => {
    it('fetches the donor, maps the payload, and defaults quantityRemaining to donationLimit', async () => {
      const createdListing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        city: 'Hanoi',
      };

      prepareDonorMocks();
      createListingMock.mockResolvedValue(createdListing);

      const result = await createListing('d1', {
        name: 'Bread',
        unit: 'UNIT',
        category: 'BAKED_GOODS',
        isVegetarian: true,
        price: 0,
        donationLimit: 10,
      });

      expect(getUserByIdMock).toHaveBeenCalledWith('d1');
      expect(getDonorByUserIdMock).toHaveBeenCalledWith('d1');
      expect(createListingMock).toHaveBeenCalledWith({
        donorId: 'd1',
        name: 'Bread',
        description: undefined,
        imageUrl: undefined,
        unit: 'UNIT',
        category: 'BAKED_GOODS',
        isVegetarian: true,
        price: 0,
        city: 'Hanoi',
        donationLimit: 10,
        rationLimitPerPerson: undefined,
        quantityRemaining: 10,
      });

      expect(result).toEqual({
        listing: createdListing,
        donor: {
          id: 'd1',
          companyName: 'Fresh Bakery',
          city: 'Hanoi',
          addressText: '123 Example Street, Hanoi',
          location,
        },
      });
    });

    it('copies optional Listing fields into the repository input', async () => {
      prepareDonorMocks();
      createListingMock.mockResolvedValue({
        _id: 'l1',
        donorId: 'd1',
      });

      await createListing('d1', {
        name: 'Vegetable Box',
        description: 'A box of vegetables',
        imageUrl: 'https://example.com/vegetables.jpg',
        unit: 'KILOGRAM',
        category: 'VEGETABLE',
        isVegetarian: true,
        price: 5000,
        donationLimit: 20,
        rationLimitPerPerson: 2,
      });

      expect(createListingMock).toHaveBeenCalledWith({
        donorId: 'd1',
        name: 'Vegetable Box',
        description: 'A box of vegetables',
        imageUrl: 'https://example.com/vegetables.jpg',
        unit: 'KILOGRAM',
        category: 'VEGETABLE',
        isVegetarian: true,
        price: 5000,
        city: 'Hanoi',
        donationLimit: 20,
        rationLimitPerPerson: 2,
        quantityRemaining: 20,
      });
    });

    it('rejects creation when the Donor city is missing', async () => {
      getUserByIdMock.mockResolvedValue({
        _id: 'd1',
        city: undefined,
      });
      getDonorByUserIdMock.mockResolvedValue({
        userId: 'd1',
        companyName: 'Fresh Bakery',
        addressText: '123 Example Street, Hanoi',
        location,
      });

      await expect(
        createListing('d1', {
          name: 'Bread',
          unit: 'UNIT',
          category: 'BAKED_GOODS',
          isVegetarian: true,
          price: 0,
          donationLimit: 10,
        }),
      ).rejects.toMatchObject({
        message: 'Donor city is missing.',
        statusCode: 500,
      });

      expect(createListingMock).not.toHaveBeenCalled();
    });
  });

  describe('getListingById', () => {
    it('throws a 404 without Donor lookups when the Listing does not exist', async () => {
      findListingByIdMock.mockResolvedValue(null);

      await expect(getListingById('missing-listing')).rejects.toMatchObject({
        message: 'Listing not found.',
        statusCode: 404,
      });

      expect(findListingByIdMock).toHaveBeenCalledWith('missing-listing');
      expect(getUserByIdMock).not.toHaveBeenCalled();
      expect(getDonorByUserIdMock).not.toHaveBeenCalled();
    });

    it('delegates to the repository and enriches the Listing with Donor data', async () => {
      const listing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        city: 'Hanoi',
      };

      findListingByIdMock.mockResolvedValue(listing);
      prepareDonorMocks();

      const result = await getListingById('l1');

      expect(findListingByIdMock).toHaveBeenCalledWith('l1');
      expect(getUserByIdMock).toHaveBeenCalledWith('d1');
      expect(getDonorByUserIdMock).toHaveBeenCalledWith('d1');
      expect(result).toEqual({
        listing,
        donor: {
          id: 'd1',
          companyName: 'Fresh Bakery',
          city: 'Hanoi',
          addressText: '123 Example Street, Hanoi',
          location,
        },
      });
    });
  });

  describe('listMyListings', () => {
    it('preserves filters, statistics, and pagination from the repository', async () => {
      const query = {
        status: 'PAST' as const,
        search: 'bread',
        category: 'BAKED_GOODS' as const,
        sort: 'revenue' as const,
        order: 'desc' as const,
        page: 2,
        limit: 5,
      };
      findMyListingsWithStatsMock.mockResolvedValue({
        items: [
          {
            _id: 'l1',
            donorId: 'd1',
            name: 'Bread',
            donatedQuantity: 8,
            revenue: 12000,
          },
        ],
        page: 2,
        limit: 5,
        total: 7,
      });
      prepareDonorMocks();

      const result = await listMyListings('d1', query);

      expect(findMyListingsWithStatsMock).toHaveBeenCalledWith(
        'd1',
        query,
      );
      expect(result).toMatchObject({
        page: 2,
        limit: 5,
        total: 7,
        items: [
          {
            donatedQuantity: 8,
            revenue: 12000,
          },
        ],
      });
    });
  });

  describe('cloneListing', () => {
    it('copies reusable fields but resets lifecycle and stock', async () => {
      findListingByIdMock.mockResolvedValue({
        _id: 'source',
        donorId: 'd1',
        name: 'Bread',
        description: 'Fresh bread',
        imageUrl: 'https://example.com/bread.jpg',
        unit: 'UNIT',
        category: 'BAKED_GOODS',
        isVegetarian: true,
        price: 3000,
        status: 'SOLD_OUT',
        donationLimit: 10,
        rationLimitPerPerson: 2,
        quantityRemaining: 0,
      });
      prepareDonorMocks();
      createListingMock.mockResolvedValue({ _id: 'clone', donorId: 'd1' });

      await cloneListing('source', 'd1');

      expect(createListingMock).toHaveBeenCalledWith(
        expect.objectContaining({
          donorId: 'd1',
          status: 'ACTIVE',
          donationLimit: 10,
          quantityRemaining: 10,
        }),
      );
      expect(createListingMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'source' }),
      );
    });
  });

  describe('updateListingStatus', () => {
    it('cancels only unprotected Orders and awaiting Deliveries in one transaction', async () => {
      findListingByIdMock.mockResolvedValue({
        _id: 'l1',
        donorId: 'd1',
        status: 'ACTIVE',
      });
      findNonCancelledOrderIdsByListingMock.mockResolvedValue(['o1', 'o2']);
      findProtectedOrderIdsMock.mockResolvedValue(['o2']);
      cancelAwaitingDeliveriesByOrderIdsMock.mockResolvedValue(1);
      cancelOrdersByIdsMock.mockResolvedValue(1);
      updateListingStatusIfCurrentMock.mockResolvedValue({
        _id: 'l1',
        donorId: 'd1',
        status: 'CANCELLED',
      });
      prepareDonorMocks();

      const result = await updateListingStatus(
        'l1',
        'd1',
        'CANCELLED',
      );

      expect(cancelAwaitingDeliveriesByOrderIdsMock).toHaveBeenCalledWith(
        ['o1'],
        expect.any(Date),
        databaseSession,
      );
      expect(cancelOrdersByIdsMock).toHaveBeenCalledWith(
        ['o1'],
        'd1',
        expect.any(Date),
        databaseSession,
      );
      expect(result.cancelledOrderCount).toBe(1);
    });

    it('rejects an invalid status transition', async () => {
      findListingByIdMock.mockResolvedValue({
        _id: 'l1',
        donorId: 'd1',
        status: 'CANCELLED',
      });

      await expect(
        updateListingStatus('l1', 'd1', 'ACTIVE'),
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(updateListingStatusIfCurrentMock).not.toHaveBeenCalled();
    });
  });

  describe('listListingOrders', () => {
    const query = { page: 2, limit: 10 };

    it('returns no Orders for a PER_REQUEST Listing', async () => {
      findListingByIdMock.mockResolvedValue({
        _id: 'l1',
        donorId: 'd1',
        unit: 'PER_REQUEST',
      });

      const result = await listListingOrders('l1', 'd1', query);

      expect(result).toEqual({ items: [], page: 2, limit: 10, total: 0 });
      expect(listOrdersForListingMock).not.toHaveBeenCalled();
    });

    it('adds the owned Listing summary to each Order result', async () => {
      const listing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        imageUrl: 'https://example.com/bread.jpg',
        unit: 'UNIT',
        category: 'BAKED_GOODS',
      };
      const order = { _id: 'o1' };
      const recipient = { _id: 'r1' };
      findListingByIdMock.mockResolvedValue(listing);
      listOrdersForListingMock.mockResolvedValue({
        items: [{ order, recipient }],
        page: 2,
        limit: 10,
        total: 11,
      });

      const result = await listListingOrders('l1', 'd1', query);

      expect(listOrdersForListingMock).toHaveBeenCalledWith('l1', 2, 10);
      expect(result).toEqual({
        items: [
          {
            order,
            recipient,
            listing: {
              id: 'l1',
              name: 'Bread',
              imageUrl: 'https://example.com/bread.jpg',
              unit: 'UNIT',
              category: 'BAKED_GOODS',
            },
          },
        ],
        page: 2,
        limit: 10,
        total: 11,
      });
    });
  });

  describe('createDonorInitiatedDonation', () => {
    const payload = {
      recipientEmail: 'recipient@example.com',
      quantity: 2,
    };

    function prepareDonation(options: {
      price?: number;
      unit?: 'UNIT' | 'PER_REQUEST';
      status?: 'ACTIVE' | 'PAUSED';
      quantityRemaining?: number;
      rationLimitPerPerson?: number;
      updatedStatus?: 'ACTIVE' | 'SOLD_OUT';
    } = {}) {
      const listing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        price: options.price ?? 0,
        unit: options.unit ?? 'UNIT',
        status: options.status ?? 'ACTIVE',
        quantityRemaining: options.quantityRemaining ?? 10,
        rationLimitPerPerson: options.rationLimitPerPerson,
      };
      const order = {
        _id: 'o1',
        recipientId: 'r1',
        listingId: 'l1',
        amount: listing.price * payload.quantity,
      };

      findUserByEmailMock.mockResolvedValue({
        _id: 'r1',
        role: 'RECIPIENT',
        status: 'ACTIVE',
      });
      findListingByIdMock.mockResolvedValue(listing);
      decrementStockAtomicallyMock.mockResolvedValue({
        ...listing,
        quantityRemaining: listing.quantityRemaining - payload.quantity,
        status: options.updatedStatus ?? 'ACTIVE',
      });
      createOrderMock.mockResolvedValue(order);
      createForOrderMock.mockResolvedValue({ _id: 'delivery-1' });

      return { listing, order };
    }

    it('creates a free, delivered Order without a Delivery', async () => {
      prepareDonation();

      const result = await createDonorInitiatedDonation(
        'l1',
        'd1',
        payload,
      );

      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'r1',
          listingId: 'l1',
          intakePath: 'DONOR_INITIATED',
          quantity: 2,
          amount: 0,
          paymentStatus: 'FREE',
          orderStatus: 'DELIVERED',
        }),
        databaseSession,
      );
      expect(createForOrderMock).not.toHaveBeenCalled();
      expect(emitToUserMock).not.toHaveBeenCalledWith(
        'r1',
        'notification:payment_requested',
        expect.anything(),
      );
      expect(result).toMatchObject({ _id: 'o1' });
    });

    it('creates a priced cash-paid, delivered Order without a Delivery or payment request', async () => {
      prepareDonation({ price: 15000 });

      await createDonorInitiatedDonation('l1', 'd1', payload);

      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          intakePath: 'DONOR_INITIATED',
          amount: 30000,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          orderStatus: 'DELIVERED',
        }),
        databaseSession,
      );
      expect(createForOrderMock).not.toHaveBeenCalled();
      expect(emitToUserMock).not.toHaveBeenCalledWith(
        'r1',
        'notification:payment_requested',
        expect.anything(),
      );
    });

    it('rejects a missing or non-Recipient account', async () => {
      findUserByEmailMock.mockResolvedValue({
        _id: 'd2',
        role: 'DONOR',
        status: 'ACTIVE',
      });

      await expect(
        createDonorInitiatedDonation('l1', 'd1', payload),
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(withTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects another Donor\'s Listing', async () => {
      prepareDonation();
      findListingByIdMock.mockResolvedValue({
        _id: 'l1',
        donorId: 'other-donor',
        status: 'ACTIVE',
      });

      await expect(
        createDonorInitiatedDonation('l1', 'd1', payload),
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(decrementStockAtomicallyMock).not.toHaveBeenCalled();
    });

    it('rejects PER_REQUEST Listings', async () => {
      prepareDonation({ unit: 'PER_REQUEST' });

      await expect(
        createDonorInitiatedDonation('l1', 'd1', payload),
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(createOrderMock).not.toHaveBeenCalled();
    });

    it('rejects a Recipient who already has a non-cancelled Order for the Listing', async () => {
      prepareDonation();
      hasNonCancelledOrderForListingMock.mockResolvedValue(true);

      await expect(
        createDonorInitiatedDonation('l1', 'd1', payload),
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'This Recipient already has an order for this listing.',
      });

      expect(hasNonCancelledOrderForListingMock).toHaveBeenCalledWith(
        'l1',
        'r1',
        databaseSession,
      );
      expect(decrementStockAtomicallyMock).not.toHaveBeenCalled();
      expect(createOrderMock).not.toHaveBeenCalled();
    });

    it('rejects quantities above the ration or available stock', async () => {
      prepareDonation({ rationLimitPerPerson: 1 });

      await expect(
        createDonorInitiatedDonation('l1', 'd1', payload),
      ).rejects.toMatchObject({ statusCode: 422 });

      prepareDonation({ quantityRemaining: 1 });

      await expect(
        createDonorInitiatedDonation('l1', 'd1', payload),
      ).rejects.toMatchObject({ statusCode: 422 });
      expect(createOrderMock).not.toHaveBeenCalled();
    });

    it('rejects a request that loses the atomic stock race', async () => {
      prepareDonation();
      decrementStockAtomicallyMock.mockResolvedValue(null);

      await expect(
        createDonorInitiatedDonation('l1', 'd1', payload),
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'The requested stock is no longer available.',
      });

      expect(createOrderMock).not.toHaveBeenCalled();
    });

    it('emits the sold-out event exactly once when concurrent requests race for the final stock', async () => {
      prepareDonation({ quantityRemaining: 2 });
      decrementStockAtomicallyMock
        .mockResolvedValueOnce({
          _id: 'l1',
          donorId: 'd1',
          status: 'SOLD_OUT',
          quantityRemaining: 0,
        })
        .mockResolvedValueOnce(null);

      const outcomes = await Promise.allSettled([
        createDonorInitiatedDonation('l1', 'd1', payload),
        createDonorInitiatedDonation('l1', 'd1', payload),
      ]);

      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
      expect(sendNotificationMock).toHaveBeenCalledTimes(1);
      expect(sendNotificationMock).toHaveBeenCalledWith({
        userId: 'd1',
        type: 'SOLD_OUT',
        listingId: 'l1',
        payload: { listingId: 'l1', name: 'Bread' },
      });
    });
  });

  describe('reserveListing', () => {
    const payload = {
      quantity: 2,
      deliveryAddressText: '1 Recipient Street',
      deliveryLocation: {
        latitude: 10.8,
        longitude: 106.7,
      },
    };

    function prepareReservation(options: {
      price?: number;
      unit?: 'UNIT' | 'PER_REQUEST';
      status?: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'SOLD_OUT';
      quantityRemaining?: number;
      rationLimitPerPerson?: number;
      updatedStatus?: 'ACTIVE' | 'SOLD_OUT';
      hasExistingOrder?: boolean;
    } = {}) {
      const listing = {
        _id: 'l1',
        donorId: 'd1',
        name: 'Bread',
        price: options.price ?? 0,
        unit: options.unit ?? 'UNIT',
        status: options.status ?? 'ACTIVE',
        quantityRemaining: options.quantityRemaining ?? 10,
        rationLimitPerPerson: options.rationLimitPerPerson,
      };
      const order = {
        _id: 'o1',
        recipientId: 'r1',
        listingId: 'l1',
        amount: listing.price * payload.quantity,
      };

      findListingByIdMock.mockResolvedValue(listing);
      hasNonCancelledOrderForListingMock.mockResolvedValue(
        options.hasExistingOrder ?? false,
      );
      decrementStockForReserveAtomicallyMock.mockResolvedValue({
        ...listing,
        quantityRemaining: listing.quantityRemaining - payload.quantity,
        status: options.updatedStatus ?? 'ACTIVE',
      });
      createOrderMock.mockResolvedValue(order);
      createForOrderMock.mockResolvedValue({ _id: 'delivery-1' });

      return { listing, order };
    }

    it('creates a free Order with PREPARING status and creates a Delivery immediately', async () => {
      prepareReservation();

      const result = await reserveListing('l1', 'r1', payload);

      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'r1',
          listingId: 'l1',
          intakePath: 'RESERVATION',
          quantity: 2,
          amount: 0,
          paymentMethod: undefined,
          paymentStatus: 'FREE',
          orderStatus: 'PREPARING',
          deliveryAddressText: '1 Recipient Street',
        }),
        databaseSession,
      );
      expect(createForOrderMock).toHaveBeenCalledWith('o1', databaseSession);
      expect(result).toMatchObject({ _id: 'o1' });
    });

    it('creates a cash Order that enters the queue immediately despite pending payment', async () => {
      prepareReservation({ price: 5000 });

      await reserveListing('l1', 'r1', { ...payload, paymentMethod: 'CASH' });

      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'CASH',
          paymentStatus: 'PAYMENT_PENDING',
          orderStatus: 'PREPARING',
        }),
        databaseSession,
      );
      expect(createForOrderMock).toHaveBeenCalledWith('o1', databaseSession);
    });

    it('creates a Stripe Order that stays out of the Delivery queue until checkout completes', async () => {
      prepareReservation({ price: 5000 });

      await reserveListing('l1', 'r1', { ...payload, paymentMethod: 'STRIPE' });

      expect(createOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'STRIPE',
          paymentStatus: 'PAYMENT_PENDING',
          orderStatus: 'PENDING_PAYMENT',
        }),
        databaseSession,
      );
      expect(createForOrderMock).not.toHaveBeenCalled();
    });

    it.each(['PAUSED', 'CANCELLED', 'SOLD_OUT'] as const)(
      'rejects a %s listing',
      async (status) => {
        prepareReservation({ status });

        await expect(
          reserveListing('l1', 'r1', payload),
        ).rejects.toMatchObject({ statusCode: 422 });

        expect(createOrderMock).not.toHaveBeenCalled();
      },
    );

    it('rejects PER_REQUEST listings', async () => {
      prepareReservation({ unit: 'PER_REQUEST' });

      await expect(
        reserveListing('l1', 'r1', payload),
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(createOrderMock).not.toHaveBeenCalled();
    });

    it('rejects a missing payment method on a priced listing', async () => {
      prepareReservation({ price: 5000 });

      await expect(
        reserveListing('l1', 'r1', payload),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(withTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects a duplicate non-cancelled order on the same listing', async () => {
      prepareReservation({ hasExistingOrder: true });

      await expect(
        reserveListing('l1', 'r1', payload),
      ).rejects.toMatchObject({ statusCode: 422 });

      expect(withTransactionMock).not.toHaveBeenCalled();
    });

    it('rejects quantities above the ration or available stock', async () => {
      prepareReservation({ rationLimitPerPerson: 1 });

      await expect(
        reserveListing('l1', 'r1', payload),
      ).rejects.toMatchObject({ statusCode: 422 });

      prepareReservation({ quantityRemaining: 1 });

      await expect(
        reserveListing('l1', 'r1', payload),
      ).rejects.toMatchObject({ statusCode: 422 });
      expect(createOrderMock).not.toHaveBeenCalled();
    });

    it('rejects a request that loses the atomic stock race', async () => {
      prepareReservation();
      decrementStockForReserveAtomicallyMock.mockResolvedValue(null);

      await expect(
        reserveListing('l1', 'r1', payload),
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'The requested stock is no longer available.',
      });

      expect(createOrderMock).not.toHaveBeenCalled();
    });

    it("emits the sold-out event to the listing's Donor when stock hits zero", async () => {
      prepareReservation({ updatedStatus: 'SOLD_OUT' });

      await reserveListing('l1', 'r1', payload);

      expect(sendNotificationMock).toHaveBeenCalledWith({
        userId: 'd1',
        type: 'SOLD_OUT',
        listingId: 'l1',
        payload: { listingId: 'l1', name: 'Bread' },
      });
    });

    it('notifies the Recipient when the reservation is priced', async () => {
      prepareReservation({ price: 5000 });

      await reserveListing('l1', 'r1', { ...payload, paymentMethod: 'CASH' });

      expect(emitToUserMock).toHaveBeenCalledWith(
        'r1',
        'notification:payment_requested',
        {
          orderId: 'o1',
          listingName: 'Bread',
          amount: 10000,
        },
      );
    });
  });
});
