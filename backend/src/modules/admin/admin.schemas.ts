// Validates admin request bodies and query strings. See docs/api_design.md §11.
import { z } from 'zod';
import {
  usernameSchema,
  emailSchema,
  passwordSchema,
  paginationQuerySchema,
} from '../../shared/validation/common-fields.schemas.js';

/**
 * Validates `POST /admin/couriers`. `tempPassword` reuses the shared
 * `passwordSchema` deliberately: the Admin sets the Courier's first password
 * by hand (E1), so it is held to exactly the same strength rules a Recipient
 * or Donor would face at registration.
 */
const createCourierSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    tempPassword: passwordSchema,
    fullName: z
      .string({ message: 'Full name is required.' })
      .trim()
      .min(1, { message: 'Full name is required.' }),
  })
  .strict();

/** Validates the pagination on `GET /admin/couriers`. */
const adminCouriersQuerySchema = paginationQuerySchema.strict();

/**
 * Validates `GET /admin/deliveries`. `stage` is optional — omitting it returns
 * every stage. `CANCELLED` is filterable like any other: an Admin overseeing
 * the pipeline needs to see cascade-cancelled deliveries too.
 */
const adminDeliveriesQuerySchema = paginationQuerySchema
  .extend({
    stage: z
      .enum(['AWAITING_COURIER', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'], {
        message: 'Stage must be a valid Delivery stage.',
      })
      .optional(),
  })
  .strict();

/** Validates search and pagination for the complete Admin Listing directory. */
const adminListingsQuerySchema = paginationQuerySchema
  .extend({
    search: z
      .string({ message: 'Search must be text.' })
      .trim()
      .max(100, { message: 'Search must be at most 100 characters.' })
      .optional(),
  })
  .strict();

/** Validates Listing ids before an Admin cancellation reaches Mongoose. */
const adminListingParamsSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, {
      message: 'Listing ID must be a valid MongoDB ObjectId.',
    }),
  })
  .strict();

type CreateCourierPayload = z.infer<typeof createCourierSchema>;
type AdminCouriersQuery = z.infer<typeof adminCouriersQuerySchema>;
type AdminDeliveriesQuery = z.infer<typeof adminDeliveriesQuerySchema>;
type AdminListingsQuery = z.infer<typeof adminListingsQuerySchema>;

export {
  createCourierSchema,
  adminCouriersQuerySchema,
  adminDeliveriesQuerySchema,
  adminListingsQuerySchema,
  adminListingParamsSchema,
};
export type {
  CreateCourierPayload,
  AdminCouriersQuery,
  AdminDeliveriesQuery,
  AdminListingsQuery,
};
