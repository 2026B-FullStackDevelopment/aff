// Import Vitest's utilities.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mocks before vi.mock() is evaluated.
// findMock represents Order.find().
// findOneMock represents Order.findOne().
// createMock represents Order.create().
// leanMock represents the .lean() method returned
const { findMock, findOneMock, createMock, leanMock } = vi.hoisted(() => {
  const leanMock = vi.fn();
  return {
    findMock: vi.fn(() => ({ lean: leanMock })),
    findOneMock: vi.fn(() => ({ lean: leanMock })),
    createMock: vi.fn(),
    leanMock,
  };
});

vi.mock('../../../src/modules/orders/order.model.js', () => ({
  default: {
    find: findMock,
    findOne: findOneMock,
    create: createMock,
  },
}));

// Import the repository functions
import { findOrdersByRecipient, findOrderByIdAndRecipient, createOrder } from '../../../src/modules/orders/order.repository.js';

describe('order.repository', () => {
  beforeEach(() => {
    findMock.mockClear();
    findOneMock.mockClear();
    createMock.mockClear();
    leanMock.mockClear();
    leanMock.mockResolvedValue([{ _id: 'o1' }]);
  });

  // Verify that recipient orders are queried using recipientId.
  it('findOrdersByRecipient queries by recipientId and returns lean documents', async () => {
    await findOrdersByRecipient('r1');

    expect(findMock).toHaveBeenCalledWith({ recipientId: 'r1' });
    expect(leanMock).toHaveBeenCalled();
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
});
