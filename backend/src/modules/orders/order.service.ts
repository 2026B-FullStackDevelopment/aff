// Contains order rules and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';

async function listOrdersForRecipient(recipientId: string) {
  return orderRepository.findOrdersByRecipient(recipientId);
}

// Check whether the order belongs to the recipient
async function verifyOrderOwnership(
  orderId: string,
  recipientId: string
): Promise<boolean> {
  const order = await orderRepository.findOrderByIdAndRecipient(orderId, recipientId);
  return Boolean(order);
};

export { listOrdersForRecipient };
