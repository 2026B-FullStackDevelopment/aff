// Validates PATCH /users/me request bodies. .strict() rejects unknown keys (e.g.
// taxCode, email) with 400 — those fields aren't editable post-signup.
import { z } from 'zod';
import {
  usernameSchema,
  citySchema,
  locationSchema,
  passwordSchema,
  emailSchema,
} from '../../shared/validation/common-fields.schemas.js';

const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    city: citySchema.optional(),
    country: z.string().min(1, { message: 'Country is required.' }).optional(),
    avatarUrl: z.string().url({ message: 'avatarUrl must be a valid URL.' }).nullable().optional(),
    companyName: z.string().min(1, { message: 'Company name is required.' }).optional(),
    addressText: z.string().min(1, { message: 'A pickup address is required.' }).optional(),
    location: locationSchema.optional(),
  })
  .strict();

type UpdateUserRequestDto = z.infer<typeof updateUserSchema>;

/**
 * Validates `PATCH /users/me/password` request bodies: `{ newPassword }` only.
 * No `currentPassword` — the session token is treated as sufficient proof of
 * identity (`docs/api_design.md` §5). `.strict()` rejects any other key,
 * including an accidentally-sent `currentPassword`.
 */
const changePasswordSchema = z.object({ newPassword: passwordSchema }).strict();

type ChangePasswordRequestDto = z.infer<typeof changePasswordSchema>;

/**
 * Validates `PATCH /users/me/email` request bodies: `{ newEmail }` only.
 * Same trust model as `changePasswordSchema` above — no `currentPassword`.
 */
const changeEmailSchema = z.object({ newEmail: emailSchema }).strict();

type ChangeEmailRequestDto = z.infer<typeof changeEmailSchema>;

export { updateUserSchema, changePasswordSchema, changeEmailSchema };
export type { UpdateUserRequestDto, ChangePasswordRequestDto, ChangeEmailRequestDto };
