// Validates Recipient reservation request bodies.
import { z } from 'zod';
import { locationSchema } from '../../shared/validation/common-fields.schemas.js';
import {
  paymentMethodSchema,
  positiveQuantitySchema,
} from './listing.shared.schemas.js';

const reserveListingSchema = z
  .object({
    quantity: positiveQuantitySchema,
    deliveryAddressText: z
      .string({ message: 'Delivery address is required.' })
      .trim()
      .min(1, { message: 'Delivery address is required.' }),
    deliveryLocation: locationSchema,
    paymentMethod: paymentMethodSchema.optional(),
  })
  .strict();

export { reserveListingSchema };
