// Import Vitest's utilities.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mocks before vi.mock() is evaluated.
// findMock represents Order.find().
// findOneMock represents Order.findOne().
// createMock represents Order.create().
// leanMock represents the .lean() method returned
const { findMock, findOneMock, createMock, existsMock, findOneAndUpdateMock, aggregateMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    findMock: vi.fn(() => ({ lean: leanMock })),
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    createMock: vi.fn(),
    existsMock: vi.fn(),
    findOneAndUpdateMock: vi.fn(() => ({ lean: leanMock })),
    aggregateMock: vi.fn(),
    leanMock,
  };
});

vi.mock('../../../src/modules/orders/order.model.js', () => ({
  default: {
    find: findMock,
    findOne: findOneMock,
    create: createMock,
    exists: existsMock,
    findOneAndUpdate: findOneAndUpdateMock,
    aggregate: aggregateMock,
  },
}));

// Import the repository functions
import {
  findOrderByIdAndRecipient,
  createOrder,
  hasNonCancelledOrderForListing,
  cancelOrderById,
  markOrderPaid,
  markOrderRefunded,
  findOrdersForRecipient,
} from '../../../src/modules/orders/order.repository.js';

describe('order.repository', () => {
  beforeEach(() => {
    findMock.mockClear();
    findOneMock.mockClear();
    createMock.mockClear();
    existsMock.mockClear();
    findOneAndUpdateMock.mockClear();
    aggregateMock.mockClear();
    leanMock.mockClear();
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
    it('atomically cancels an Order not already CANCELLED', async () => {
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
          orderStatus: { $ne: 'CANCELLED' },
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
