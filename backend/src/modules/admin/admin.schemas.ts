// Validates admin request bodies and query strings. See docs/api_design.md §11.
import { z } from 'zod';
import {
  usernameSchema,
  emailSchema,
  passwordSchema,
  paginationQuerySchema,
} from '../../shared/validation/common-fields.schemas.js';
import type { UpdateUserStatusRequestDto } from './admin.dto.js';

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
 * Validates the composable filters on `GET /admin/users` (G1). An omitted
 * filter includes every value; `search` matches username, email, or the
 * role-specific display name in the users repository.
 */

// Validates the filter request  `GET /admin/users`
// The req sent has role, status, search according to filter options
// Used by parsedBody to check req
const adminUsersQuerySchema = paginationQuerySchema
  .extend({
    role: z
      .enum(['RECIPIENT', 'DONOR', 'ADMIN', 'COURIER'], {
        message: 'Role must be a valid account role.',
      })
      .optional(),
    status: z
      .enum(['ACTIVE', 'DEACTIVATED'], {
        message: 'Status must be ACTIVE or DEACTIVATED.',
      })
      .optional(),
    search: z
      .string({ message: 'Search must be text.' })
      .trim()
      .max(100, { message: 'Search cannot be greater than 100 characters.' })
      .optional(),
  })
  .strict();

// Validate ids at the HTTP boundary so malformed values never reach Mongoose.
const adminUserIdParamsSchema = z
  .object({
    id: z
      .string({ message: 'User ID is required.' })
      .regex(/^[0-9a-fA-F]{24}$/, {
        message: 'User ID must be a valid MongoDB ObjectId.',
      }),
  })
  .strict();

/** Validates the only two account states accepted by `PATCH /admin/users/:id/status`. */
const updateUserStatusSchema: z.ZodType<UpdateUserStatusRequestDto> = z
  .object({
    status: z.enum(['ACTIVE', 'DEACTIVATED'], {
      message: 'Status must be ACTIVE or DEACTIVATED.',
    }),
  })
  .strict();

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

type CreateCourierPayload = z.infer<typeof createCourierSchema>;
type AdminCouriersQuery = z.infer<typeof adminCouriersQuerySchema>;
type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
type AdminUserIdParams = z.infer<typeof adminUserIdParamsSchema>;
type AdminDeliveriesQuery = z.infer<typeof adminDeliveriesQuerySchema>;

export {
  createCourierSchema,
  adminCouriersQuerySchema,
  adminUsersQuerySchema,
  adminUserIdParamsSchema,
  updateUserStatusSchema,
  adminDeliveriesQuerySchema,
};
export type {
  CreateCourierPayload,
  AdminCouriersQuery,
  AdminUsersQuery,
  AdminUserIdParams,
  AdminDeliveriesQuery,
};
