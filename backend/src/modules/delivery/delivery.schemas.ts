import { z } from 'zod';

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

type MarkDeliveredPayload = z.infer<typeof markDeliveredSchema>;

export { deliveryIdParamsSchema, markDeliveredSchema };
export type { MarkDeliveredPayload };
