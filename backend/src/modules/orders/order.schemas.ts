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

export { orderIdParamsSchema, choosePaymentMethodSchema };
