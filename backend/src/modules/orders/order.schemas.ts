import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/validation/pagination.schemas.js';

const orderIdParamsSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, {
      message: 'Order id must be valid.',
    }),
  })
  .strict();

const choosePaymentMethodSchema = z
  .object({
    paymentMethod: z.enum(['STRIPE', 'CASH']),
  })
  .strict();

/**
 * Validates `POST /orders/:id/feedback` request bodies (D7). The 500-char cap matches the
 * frontend mock's existing MAX_COMMENT_LENGTH, so behavior doesn't change for a user who
 * already saw that limit.
 */
const submitFeedbackSchema = z
  .object({
    comment: z
      .string()
      .trim()
      .min(1, { message: 'Feedback comment is required.' })
      .max(500, { message: 'Feedback comment cannot exceed 500 characters.' }),
  })
  .strict();

/**
 * Validates `GET /orders/mine` query parameters.
 */
const mineOrdersQuerySchema = paginationQuerySchema.strict();

export {
  orderIdParamsSchema,
  choosePaymentMethodSchema,
  mineOrdersQuerySchema,
  submitFeedbackSchema,
};
