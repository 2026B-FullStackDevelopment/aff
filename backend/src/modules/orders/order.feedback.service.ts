import { isValidObjectId } from 'mongoose';
// Contains the Recipient feedback path and uses other modules through interfaces only.
import * as orderRepository from './order.repository.js';
import { createHttpError } from './order.service.errors.js';

/**
 * Records a Recipient's one-shot feedback on their own delivered Order (D7).
 * @throws {Error} with statusCode = 404 if the Order doesn't exist or isn't this Recipient's
 * @throws {Error} with statusCode = 409 if the Order isn't `DELIVERED` yet
 * @throws {Error} with statusCode = 409, carrying `.feedback`, if feedback was already submitted
 */
async function submitFeedback(
  orderId: string,
  recipientId: string,
  comment: string,
) {
  if (!isValidObjectId(orderId)) {
    throw createHttpError(404, 'Order not found.');
  }

  const order = await orderRepository.findOrderByIdAndRecipient(
    orderId,
    recipientId,
  );

  if (!order) {
    throw createHttpError(404, 'Order not found.');
  }

  if (order.orderStatus !== 'DELIVERED') {
    throw createHttpError(409, "This order hasn't been delivered yet.");
  }

  if (order.feedback) {
    const alreadySubmitted = createHttpError(
      409,
      'Feedback has already been submitted for this order.',
    );
    alreadySubmitted.feedback = order.feedback;
    throw alreadySubmitted;
  }

  const createdAt = new Date();
  const updated = await orderRepository.setFeedback(
    orderId,
    comment,
    createdAt,
  );

  if (!updated) {
    // Lost a race between the reads above and the atomic write: the Order's status changed, or
    // another request's feedback landed first. Re-fetch so the 409 carries the real feedback.
    const current = await orderRepository.findOrderByIdAndRecipient(
      orderId,
      recipientId,
    );

    const alreadySubmitted = createHttpError(
      409,
      'Feedback has already been submitted for this order.',
    );
    if (current?.feedback) {
      alreadySubmitted.feedback = current.feedback;
    }
    throw alreadySubmitted;
  }

  return updated.feedback!;
}

export { submitFeedback };
