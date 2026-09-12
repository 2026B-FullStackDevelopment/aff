// Validates Admin account-management request bodies, parameters, and queries.
import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  usernameSchema,
} from '../../shared/validation/common-fields.schemas.js';
import { paginationQuerySchema } from '../../shared/validation/pagination.schemas.js';

const roleSchema = z.enum(['RECIPIENT', 'DONOR', 'ADMIN', 'COURIER']);
const accountStatusSchema = z.enum(['ACTIVE', 'DEACTIVATED']);

const accountSearchSchema = z
  .string({ message: 'Search must be text.' })
  .trim()
  .max(100, { message: 'Search cannot exceed 100 characters.' })
  .optional();

const adminUsersQuerySchema = paginationQuerySchema
  .extend({
    role: roleSchema.optional(),
    status: accountStatusSchema.optional(),
    search: accountSearchSchema,
  })
  .strict();

const adminCouriersQuerySchema = paginationQuerySchema
  .extend({
    status: accountStatusSchema.optional(),
    search: accountSearchSchema,
  })
  .strict();

const createCourierSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    tempPassword: passwordSchema,
    fullName: z
      .string({ message: 'Full name is required.' })
      .trim()
      .min(1, { message: 'Full name is required.' })
      .max(100, { message: 'Full name cannot exceed 100 characters.' }),
  })
  .strict();

const adminUserIdParamsSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, {
      message: 'User ID must be a valid MongoDB ObjectId.',
    }),
  })
  .strict();

const updateUserStatusSchema = z
  .object({
    status: accountStatusSchema,
  })
  .strict();

export {
  adminUsersQuerySchema,
  adminCouriersQuerySchema,
  createCourierSchema,
  adminUserIdParamsSchema,
  updateUserStatusSchema,
};

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminCouriersQuery = z.infer<typeof adminCouriersQuerySchema>;
export type CreateCourierInput = z.infer<typeof createCourierSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
