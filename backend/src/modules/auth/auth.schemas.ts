// Validates auth request bodies. Messages match the acceptance criteria in issues #47 and #48.
import { z } from 'zod';

// Each rule is a separate check so every failure gets its own message.
const passwordSchema = z
  .string({ message: 'Password is required.' })
  .min(8, { message: 'Password must be at least 8 characters.' })
  .regex(/[0-9]/, { message: 'Password must contain at least 1 number.' })
  .regex(/[^A-Za-z0-9]/, {
    message: 'Password must contain at least 1 special character, for example $ # @ !',
  })
  .regex(/[A-Z]/, { message: 'Password must contain at least 1 capitalized letter.' });

// Four refinements rather than one regex, because each rule owns a distinct message.
const emailSchema = z
  .string({ message: 'Email is required.' })
  .refine((value) => value.split('@').length === 2, {
    message: 'Email must contain exactly one @ symbol.',
  })
  .refine((value) => value.split('@')[1]?.includes('.'), {
    message: 'Email must contain a . after the @ symbol.',
  })
  .refine((value) => value.length < 255, { message: 'Email must be under 255 characters.' })
  .refine((value) => !/[\s();:]/.test(value), {
    message: 'Email must not contain spaces or the characters ( ) ; :',
  });

const usernameSchema = z
  .string({ message: 'Username is required.' })
  .min(1, { message: 'Username is required.' })
  .regex(/^[A-Za-z0-9_-]+$/, {
    message: 'Username may only contain English letters, numbers, underscores, and hyphens.',
  });

const citySchema = z
  .string({ message: 'City is required.' })
  .min(1, { message: 'City is required.' });

// Coordinates come from the client's OSM Nominatim selection; only the range is checked here.
const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const registerRecipientSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  city: citySchema,
});

const registerDonorSchema = z.object({
  companyName: z
    .string({ message: 'Company name is required.' })
    .min(1, { message: 'Company name is required.' })
    .max(200, { message: 'Company name must be under 200 characters.' }),
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
const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ message: 'Password is required.' })
    .min(1, { message: 'Password is required.' }),
});

export { registerRecipientSchema, registerDonorSchema, loginSchema };
