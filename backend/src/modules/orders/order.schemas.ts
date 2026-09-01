import { z } from 'zod';

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

// Shared pagination validation (mirrors listing.schemas.ts#paginationQuerySchema;
// duplicated locally since it isn't shared cross-module elsewhere either).
const paginationQuerySchema = z.object({
  page: z.coerce
    .number({ message: 'Page must be a number.' })
    .int({ message: 'Page must be a whole number.' })
    .min(1, { message: 'Page must be at least 1.' })
    .default(1),

  limit: z.coerce
    .number({ message: 'Limit must be a number.' })
    .int({ message: 'Limit must be a whole number.' })
    .min(1, { message: 'Limit must be at least 1.' })
    .max(100, { message: 'Limit cannot be greater than 100.' })
    .default(20),
});

/**
 * Validates `GET /orders/mine` query parameters.
 */
const mineOrdersQuerySchema = paginationQuerySchema.strict();

export { orderIdParamsSchema, choosePaymentMethodSchema, mineOrdersQuerySchema };
