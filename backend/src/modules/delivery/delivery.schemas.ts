import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/validation/common-fields.schemas.js';

/** Validates the Delivery id used by `PATCH /deliveries/:id/deliver`. */
const deliveryIdParamsSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, {
      message: 'Delivery id must be valid.',
    }),
  })
  .strict();

/**
 * Validates delivery completion input. Cash confirmation is conditionally
 * required by the service after it loads the related Order.
 */
const markDeliveredSchema = z
  .object({
    cashConfirmed: z.boolean().optional(),
  })
  .strict();

/**
 * Validates `GET /deliveries/queue`. Pagination only — no sort or order
 * parameter is accepted, because the oldest-first ordering is fixed
 * server-side so no Courier can cherry-pick out of turn (E2).
 */
const deliveryQueueQuerySchema = paginationQuerySchema.strict();

type MarkDeliveredPayload = z.infer<typeof markDeliveredSchema>;
type DeliveryQueueQuery = z.infer<typeof deliveryQueueQuerySchema>;

export { deliveryIdParamsSchema, markDeliveredSchema, deliveryQueueQuerySchema };
export type { MarkDeliveredPayload, DeliveryQueueQuery };
