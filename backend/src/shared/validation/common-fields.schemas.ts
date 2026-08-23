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

export { usernameSchema, citySchema, locationSchema };
