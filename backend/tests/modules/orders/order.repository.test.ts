// Import Vitest's utilities.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mocks before vi.mock() is evaluated.
// findMock represents Order.find().
// findOneMock represents Order.findOne().
// createMock represents Order.create().
// leanMock represents the .lean() method returned
const { findMock, findOneMock, createMock, existsMock, updateManyMock, findOneAndUpdateMock, aggregateMock, leanMock, sessionMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  const sessionMock = vi.fn(() => ({ lean: leanMock }));
  return {
    findMock: vi.fn(() => ({ lean: leanMock, session: sessionMock })),
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    createMock: vi.fn(),
    existsMock: vi.fn(),
    updateManyMock: vi.fn(),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    aggregateMock: vi.fn(),
    leanMock,
    sessionMock,
  };
});

vi.mock('../../../src/modules/orders/order.model.js', () => ({
  default: {
    find: findMock,
    findOne: findOneMock,
    create: createMock,
    exists: existsMock,
    updateMany: updateManyMock,
    findOneAndUpdate: findOneAndUpdateMock,
    aggregate: aggregateMock,
  },
}));

// Import the repository functions
import {
  findOrderByIdAndRecipient,
  createOrder,
  hasNonCancelledOrderForListing,
  cancelOrdersByIds,
  cancelOrderById,
  markOrderPaid,
  markOrderRefunded,
  markOrderRefundPending,
  setFeedback,
  findOrdersForRecipient,
  findOrdersByIds,
  findNonCancelledOrdersByListingIds,
} from '../../../src/modules/orders/order.repository.js';

describe('order.repository', () => {
  beforeEach(() => {
    findMock.mockClear();
    findOneMock.mockClear();
    createMock.mockClear();
    existsMock.mockClear();
    updateManyMock.mockClear();
    findOneAndUpdateMock.mockClear();
    aggregateMock.mockClear();
    leanMock.mockClear();
    sessionMock.mockClear();
    leanMock.mockResolvedValue([{ _id: 'o1' }]);
  });

  // Verify that ownership lookup includes both IDs in Order.findOne()
  it('findOrderByIdAndRecipient queries by order ID and recipient ID', async () => {
    const orderId = '507f1f77bcf86cd799439011';
    const recipientId = '507f191e810c19729de860ea';

    await findOrderByIdAndRecipient(orderId, recipientId);

    expect(findOneMock).toHaveBeenCalledWith({
      _id: orderId,
      recipientId,
    });
    expect(leanMock).toHaveBeenCalled();
  });

  // Verify that createOrder passes the full order data to Order.create().
  it('createOrder calls Order.create with the given data', async () => {
    createMock.mockResolvedValue({ _id: 'o1' });

    const deliveryLocation = { latitude: 21.0, longitude: 105.8, updatedAt: new Date('2026-01-01T00:00:00.000Z') };

    const result = await createOrder({
      recipientId: 'r1',
      listingId: 'l1',
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 0,
      paymentStatus: 'FREE',
      deliveryAddressText: '123 Main St',
      deliveryLocation,
    });

    expect(createMock).toHaveBeenCalledWith({
      recipientId: 'r1',
      listingId: 'l1',
      intakePath: 'RESERVATION',
      quantity: 2,
      amount: 0,
      paymentStatus: 'FREE',
      deliveryAddressText: '123 Main St',
      deliveryLocation,
    });
    expect(result).toEqual({ _id: 'o1' });
  });

  describe('findOrdersByIds', () => {
    it('loads every requested Order in one query, projecting payment and stock fields', async () => {
      leanMock.mockResolvedValue([{ _id: 'o1', recipientId: 'r1' }]);

      const result = await findOrdersByIds(['o1', 'o2']);

      expect(findMock).toHaveBeenCalledWith(
        { _id: { $in: ['o1', 'o2'] } },
        {
          _id: 1,
          recipientId: 1,
          quantity: 1,
          deliveryAddressText: 1,
          deliveryLocation: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          listingId: 1,
          amount: 1,
        },
      );
      expect(sessionMock).not.toHaveBeenCalled();
      expect(result).toEqual([{ _id: 'o1', recipientId: 'r1' }]);
    });

    it('scopes the query to the given session when provided', async () => {
      const session = { id: 'database-session' };

      await findOrdersByIds(['o1'], session as never);

      expect(sessionMock).toHaveBeenCalledWith(session);
    });

    it('skips the database entirely when asked for nothing', async () => {
      const result = await findOrdersByIds([]);

      expect(findMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findNonCancelledOrdersByListingIds', () => {
    it('loads only non-terminal Orders for the requested Listings', async () => {
      leanMock.mockResolvedValue([{ _id: 'o1', recipientId: 'r1', listingId: 'l1' }]);

      const result = await findNonCancelledOrdersByListingIds(['l1', 'l2']);

      expect(findMock).toHaveBeenCalledWith(
        {
          listingId: { $in: ['l1', 'l2'] },
          orderStatus: { $nin: ['CANCELLED', 'DELIVERED'] },
        },
        { _id: 1, recipientId: 1, listingId: 1 },
      );
      expect(result).toEqual([{ _id: 'o1', recipientId: 'r1', listingId: 'l1' }]);
    });

    it('skips the database when no Listing ids are supplied', async () => {
      const result = await findNonCancelledOrdersByListingIds([]);

      expect(findMock).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('hasNonCancelledOrderForListing', () => {
    it('returns true when a non-cancelled order exists for this listing and recipient', async () => {
      existsMock.mockResolvedValue({ _id: 'o1' });

      const result = await hasNonCancelledOrderForListing('l1', 'r1');

      expect(existsMock).toHaveBeenCalledWith({
        listingId: 'l1',
        recipientId: 'r1',
        orderStatus: { $ne: 'CANCELLED' },
      });
      expect(result).toBe(true);
    });

    it('returns false when no matching order exists', async () => {
      existsMock.mockResolvedValue(null);

      const result = await hasNonCancelledOrderForListing('l1', 'r1');

      expect(result).toBe(false);
    });
  });

  describe('cancelOrderById', () => {
    it('atomically cancels only a non-terminal Order', async () => {
      const cancelledAt = new Date('2026-01-01T00:00:00.000Z');
      leanMock.mockResolvedValue({
        _id: 'o1',
        orderStatus: 'CANCELLED',
        cancelledByUserId: 'r1',
        cancelledAt,
      });

      const result = await cancelOrderById('o1', 'r1', cancelledAt);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          _id: 'o1',
          orderStatus: { $nin: ['CANCELLED', 'DELIVERED'] },
        },
        {
          $set: {
            orderStatus: 'CANCELLED',
            cancelledByUserId: 'r1',
            cancelledAt,
          },
        },
        { new: true, runValidators: true, session: undefined },
      );
      expect(result).toMatchObject({ orderStatus: 'CANCELLED' });
    });

    it('returns null when the Order was already CANCELLED (race)', async () => {
      leanMock.mockResolvedValue(null);

      const result = await cancelOrderById('o1', 'r1', new Date());

      expect(result).toBeNull();
    });
  });

  describe('cancelOrdersByIds', () => {
    it('excludes delivered manual Orders from listing cancellation', async () => {
      updateManyMock.mockResolvedValue({ modifiedCount: 1 });
      const cancelledAt = new Date('2026-01-01T00:00:00.000Z');

      const result = await cancelOrdersByIds(
        ['o1', 'o2'],
        'd1',
        cancelledAt,
      );

      expect(updateManyMock).toHaveBeenCalledWith(
        {
          _id: { $in: ['o1', 'o2'] },
          orderStatus: { $nin: ['CANCELLED', 'DELIVERED'] },
        },
        {
          $set: {
            orderStatus: 'CANCELLED',
            cancelledByUserId: 'd1',
            cancelledAt,
          },
        },
        { session: undefined },
      );
      expect(result).toBe(1);
    });
  });

  describe('markOrderPaid', () => {
    it('marks a Stripe, PAYMENT_PENDING, non-CANCELLED Order as PAID/PREPARING', async () => {
      leanMock.mockResolvedValue({
        _id: 'o1',
        paymentStatus: 'PAID',
        orderStatus: 'PREPARING',
      });

      const result = await markOrderPaid('o1');

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          _id: 'o1',
          paymentMethod: 'STRIPE',
          paymentStatus: 'PAYMENT_PENDING',
          orderStatus: { $ne: 'CANCELLED' },
        },
        {
          $set: {
            paymentStatus: 'PAID',
            orderStatus: 'PREPARING',
          },
        },
        { new: true, runValidators: true, session: undefined },
      );
      expect(result).toMatchObject({ paymentStatus: 'PAID' });
    });

    it('does not mark a CANCELLED Order as PAID, even if paymentStatus is still PAYMENT_PENDING (late webhook race)', async () => {
      leanMock.mockResolvedValue(null);

      const result = await markOrderPaid('o1');

      expect(result).toBeNull();
    });
  });

  describe('markOrderRefundPending', () => {
    it('flips a PAID Order to REFUND_PENDING', async () => {
      leanMock.mockResolvedValue({
        _id: 'o1',
        recipientId: 'r1',
        paymentStatus: 'REFUND_PENDING',
      });

      const result = await markOrderRefundPending('o1');

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          _id: 'o1',
          paymentStatus: 'PAID',
        },
        {
          $set: {
            paymentStatus: 'REFUND_PENDING',
          },
        },
        { new: true, runValidators: true, session: undefined },
      );
      expect(result).toMatchObject({ paymentStatus: 'REFUND_PENDING' });
    });

    it('passes the session through when provided', async () => {
      const session = { id: 'database-session' };
      leanMock.mockResolvedValue({ _id: 'o1', paymentStatus: 'REFUND_PENDING' });

      await markOrderRefundPending('o1', session as never);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { new: true, runValidators: true, session },
      );
    });

    it('returns null when the Order was not PAID', async () => {
      leanMock.mockResolvedValue(null);

      const result = await markOrderRefundPending('o1');

      expect(result).toBeNull();
    });
  });

  describe('markOrderRefunded', () => {
    it('flips a REFUND_PENDING Order to REFUNDED', async () => {
      leanMock.mockResolvedValue({
        _id: 'o1',
        recipientId: 'r1',
        paymentStatus: 'REFUNDED',
      });

      const result = await markOrderRefunded('o1');

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          _id: 'o1',
          paymentStatus: 'REFUND_PENDING',
        },
        {
          $set: {
            paymentStatus: 'REFUNDED',
          },
        },
        { new: true, runValidators: true, session: undefined },
      );
      expect(result).toMatchObject({ paymentStatus: 'REFUNDED' });
    });

    it('returns null when the Order was not REFUND_PENDING', async () => {
      leanMock.mockResolvedValue(null);

      const result = await markOrderRefunded('o1');

      expect(result).toBeNull();
    });
  });

  describe('setFeedback', () => {
    it('sets feedback on a DELIVERED Order with no existing feedback', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      leanMock.mockResolvedValue({
        _id: 'o1',
        orderStatus: 'DELIVERED',
        feedback: { comment: 'Great donation!', createdAt },
      });

      const result = await setFeedback('o1', 'Great donation!', createdAt);

      expect(findOneAndUpdateMock).toHaveBeenCalledWith(
        {
          _id: 'o1',
          orderStatus: 'DELIVERED',
          feedback: { $exists: false },
        },
        {
          $set: {
            feedback: { comment: 'Great donation!', createdAt },
          },
        },
        { new: true, runValidators: true, session: undefined },
      );
      expect(result).toMatchObject({ feedback: { comment: 'Great donation!', createdAt } });
    });

    it('returns null when the Order is not DELIVERED', async () => {
      leanMock.mockResolvedValue(null);

      const result = await setFeedback('o1', 'Great donation!', new Date());

      expect(result).toBeNull();
    });

    it('returns null when feedback was already set (race)', async () => {
      leanMock.mockResolvedValue(null);

      const result = await setFeedback('o1', 'Great donation!', new Date());

      expect(result).toBeNull();
    });
  });

  describe('findOrdersForRecipient', () => {
    it('paginates, joins listing/donor/delivery, and returns the aggregation total', async () => {
      aggregateMock.mockResolvedValue([
        {
          items: [
            {
              _id: 'o1',
              recipientId: 'r1',
              listing: { id: 'l1', name: 'Bread', imageUrl: undefined, unit: 'UNIT' },
              donor: { id: 'd1', companyName: 'Acme Foods' },
              deliveryStage: 'ASSIGNED',
            },
          ],
          metadata: [{ total: 7 }],
        },
      ]);

      const result = await findOrdersForRecipient('507f191e810c19729de860ea', 2, 5);

      const pipeline = aggregateMock.mock.calls[0]?.[0];
      expect(pipeline).toEqual(expect.any(Array));
      expect(pipeline[0].$match).toMatchObject({ recipientId: expect.anything() });
      expect(pipeline).toContainEqual({ $sort: { createdAt: -1, _id: -1 } });
      expect(JSON.stringify(pipeline)).toContain('"$skip":5');
      expect(JSON.stringify(pipeline)).toContain('"$limit":5');

      const itemsStage = pipeline[2].$facet.items;
      expect(itemsStage).toContainEqual({
        $lookup: { from: 'listings', localField: 'listingId', foreignField: '_id', as: 'listingDoc' },
      });
      expect(itemsStage).toContainEqual({
        $lookup: { from: 'donors', localField: 'listingDoc.donorId', foreignField: 'userId', as: 'donorDoc' },
      });
      expect(itemsStage).toContainEqual({
        $lookup: { from: 'deliveries', localField: '_id', foreignField: 'orderId', as: 'deliveryDoc' },
      });

      expect(result).toEqual({
        items: [
          {
            order: { _id: 'o1', recipientId: 'r1' },
            listing: { id: 'l1', name: 'Bread', imageUrl: undefined, unit: 'UNIT' },
            donor: { id: 'd1', companyName: 'Acme Foods' },
            deliveryStage: 'ASSIGNED',
          },
        ],
        page: 2,
        limit: 5,
        total: 7,
      });
    });

    it('reports deliveryStage: null when no Delivery exists yet for the Order', async () => {
      aggregateMock.mockResolvedValue([
        {
          items: [
            {
              _id: 'o1',
              recipientId: 'r1',
              listing: { id: 'l1', name: 'Bread', imageUrl: undefined, unit: 'UNIT' },
              donor: { id: 'd1', companyName: 'Acme Foods' },
              deliveryStage: null,
            },
          ],
          metadata: [{ total: 1 }],
        },
      ]);

      const result = await findOrdersForRecipient('507f191e810c19729de860ea', 1, 20);

      expect(result.items[0]?.deliveryStage).toBeNull();
    });

    it('returns an empty page when the aggregation returns no results', async () => {
      aggregateMock.mockResolvedValue([]);

      const result = await findOrdersForRecipient('507f191e810c19729de860ea', 1, 20);

      expect(result).toEqual({ items: [], page: 1, limit: 20, total: 0 });
    });
  });
});
