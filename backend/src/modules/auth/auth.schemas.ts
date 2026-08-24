// Validates auth request bodies. Messages match the acceptance criteria in issues #47 and #48.
import { z } from 'zod';
import {
  usernameSchema,
  citySchema,
  locationSchema,
  passwordSchema,
  emailSchema,
} from '../../shared/validation/common-fields.schemas.js';

/**
 * Validates a recipient registration request: `{ username, email, password, city }`.
 * Every failure message matches the acceptance criteria in issue #47 exactly.
 */
const registerRecipientSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  city: citySchema,
});

/**
 * Validates a donor registration request: `{ companyName, email, password,
 * taxCode, city, addressText, location }`. `location` is only range-checked
 * here — the client is responsible for resolving it via an OSM Nominatim
 * address search before submitting. Messages match issue #48.
 */
const registerDonorSchema = z.object({
  username: usernameSchema,
  companyName: z
    .string({ message: 'Company name is required.' })
    .min(1, { message: 'Company name is required.' }),
  email: emailSchema,
  password: passwordSchema,
  taxCode: z
    .string({ message: 'Tax code must be 10 to 13 digits.' })
    .regex(/^\d{10,13}$/, { message: 'Tax code must be 10 to 13 digits.' }),
  city: citySchema,
  addressText: z
    .string({ message: 'A pickup address is required.' })
    .min(1, { message: 'A pickup address is required.' }),
  location: locationSchema,
});

// Login checks presence only. Strength rules would lock out anyone whose
// password predates them, and would leak which rules the account satisfies.
/**
 * Validates a login request: `{ email, password }`. Deliberately does not
 * apply password strength rules — see the comment above.
 */
const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ message: 'Password is required.' })
    .min(1, { message: 'Password is required.' }),
});

export { registerRecipientSchema, registerDonorSchema, loginSchema };
