// Validates Listing creation, cloning, and lifecycle command requests.
import { z } from 'zod';
import {
  donationLimitSchema,
  foodCategorySchema,
  listingPriceSchema,
  measurementUnitSchema,
  positiveWholeNumberSchema,
} from './listing.shared.schemas.js';

const createListingSchema = z
  .object({
    name: z
      .string({ message: 'Listing name is required.' })
      .trim()
      .min(1, { message: 'Listing name is required.' }),
    description: z.string({ message: 'Description must be text.' }).trim().optional(),
    imageUrl: z
      .string({ message: 'Image URL must be text.' })
      .trim()
      .url({ message: 'Image URL must be a valid URL.' })
      .optional(),
    unit: measurementUnitSchema,
    category: foodCategorySchema,
    isVegetarian: z.boolean({
      message: 'Vegetarian status must be true or false.',
    }),
    price: listingPriceSchema,
    donationLimit: donationLimitSchema,
    rationLimitPerPerson: positiveWholeNumberSchema.optional(),
  })
  .strict();

const updateListingStatusSchema = z
  .object({
    status: z.enum(['PAUSED', 'ACTIVE', 'CANCELLED'], {
      message: 'Status must be PAUSED, ACTIVE, or CANCELLED.',
    }),
  })
  .strict();

type CreateListingPayload = z.infer<typeof createListingSchema>;

export { createListingSchema, updateListingStatusSchema };
export type { CreateListingPayload };
