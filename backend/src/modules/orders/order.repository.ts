// Contains order database queries so services do not call Mongoose directly.
import Order, { type OrderDocument, type IntakePath, type PaymentMethod, type PaymentStatus } from './order.model.js';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';
import type { Types } from 'mongoose';

interface CreateOrderInput {
  recipientId: string | Types.ObjectId;
  listingId: string | Types.ObjectId;
  intakePath: IntakePath;
  quantity: number;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddressText: string;
  deliveryLocation: GeoLocation;
}

function findOrdersByRecipient(recipientId: string | Types.ObjectId) {
  return Order.find({ recipientId }).lean<OrderDocument[]>();
}

function createOrder(data: CreateOrderInput) {
  return Order.create(data);
}

function findOrderByIdAndRecipient(
  orderId: string | Types.ObjectId, 
  recipientId: string | Types.ObjectId
) 
{
  return Order.findOne({
    _id: orderId,
    recipientId
  }).lean<OrderDocument>()
}

export { findOrdersByRecipient, findOrderByIdAndRecipient, createOrder };
