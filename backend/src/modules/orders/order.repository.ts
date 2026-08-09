// Contains order database queries so services do not call Mongoose directly.
import Order from './order.model.js';

function findOrdersByRecipient(recipientId) {
  return Order.find({ recipientId }).lean();
}

function createOrder(data) {
  return Order.create(data);
}

export { findOrdersByRecipient, createOrder };
