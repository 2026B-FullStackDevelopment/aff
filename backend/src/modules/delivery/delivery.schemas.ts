import { z } from 'zod';

// PATCH /deliveries/:id/deliver
const deliveryIdParamsSchema = z
    .object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: 'Delivery id must be valid.'})
    })
    .strict();

const markDeliveredSchema = z
    .object({
        // check cashConfirmed only when paymentMethod === 'CASH'
        cashConfirmed: z.boolean().optional(),
    })
    .strict();

export { deliveryIdParamsSchema, markDeliveredSchema }