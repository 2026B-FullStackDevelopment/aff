// Validates PATCH /users/me request bodies. .strict() rejects unknown keys (e.g.
// taxCode, email) with 400 — those fields aren't editable post-signup.
import { z } from 'zod';
import { usernameSchema, citySchema, locationSchema } from '../../shared/validation/common-fields.schemas.js';

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

export { updateUserSchema };
export type { UpdateUserRequestDto };
