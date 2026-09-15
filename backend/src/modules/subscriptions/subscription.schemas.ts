import { z } from 'zod';

/**
 * Validates `PATCH /subscriptions/me` request bodies (F5). `true` cancels at period end,
 * `false` resumes — one schema covers both directions.
 */
const updateSubscriptionSchema = z
  .object({
    cancelAtPeriodEnd: z.boolean(),
  })
  .strict();

export { updateSubscriptionSchema };
