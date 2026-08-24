// Field validators shared across modules (auth registration, profile edit). Messages
// match the acceptance criteria in issues #47 and #48.
import { z } from 'zod';

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

// Each rule is a separate check so every failure gets its own message.
const passwordSchema = z
  .string({ message: 'Password is required.' })
  .min(8, { message: 'Password must be at least 8 characters.' })
  .regex(/[0-9]/, { message: 'Password must contain at least 1 number.' })
  .regex(/[^A-Za-z0-9]/, {
    message: 'Password must contain at least 1 special character, for example $ # @ !',
  })
  .regex(/[A-Z]/, { message: 'Password must contain at least 1 capitalized letter.' })
  .max(72, { message: 'Password must be at most 72 characters.' });

// Four refinements rather than one regex, because each rule owns a distinct message.
// Trimmed first so incidental leading/trailing whitespace (e.g. pasted from another
// field) does not trip the "no spaces" refine below; case is normalised afterwards
// via .transform so the refinement messages above are unaffected.
const emailSchema = z
  .string({ message: 'Email is required.' })
  .trim()
  .refine((value) => value.split('@').length === 2, {
    message: 'Email must contain exactly one @ symbol.',
  })
  .refine((value) => value.split('@')[1]?.includes('.'), {
    message: 'Email must contain a . after the @ symbol.',
  })
  .refine((value) => value.length < 255, { message: 'Email must be under 255 characters.' })
  .refine((value) => !/[\s();:]/.test(value), {
    message: 'Email must not contain spaces or the characters ( ) ; :',
  })
  .transform((value) => value.toLowerCase());

export { usernameSchema, citySchema, locationSchema, passwordSchema, emailSchema };
