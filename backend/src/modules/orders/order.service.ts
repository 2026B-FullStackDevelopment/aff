// Contains order rules and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';

async function listOrdersForRecipient(recipientId: string) {
  return orderRepository.findOrdersByRecipient(recipientId);
}

export { listOrdersForRecipient };
