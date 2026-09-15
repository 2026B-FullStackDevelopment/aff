// Validates Donor-initiated donation request bodies.
import { z } from 'zod';
import { positiveQuantitySchema } from './listing.shared.schemas.js';

const donorInitiatedDonationSchema = z
  .object({
    recipientEmail: z
      .string({ message: 'Recipient email is required.' })
      .trim()
      .email({ message: 'Recipient email must be valid.' })
      .transform((email) => email.toLowerCase()),
    quantity: positiveQuantitySchema,
  })
  .strict();

export { donorInitiatedDonationSchema };
