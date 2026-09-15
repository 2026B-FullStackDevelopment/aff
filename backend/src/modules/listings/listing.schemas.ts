// Validates Listing route parameters, request bodies, and query strings.
import { z } from 'zod';
import { locationSchema } from '../../shared/validation/common-fields.schemas.js';

const measurementUnitSchema = z.enum(
  ['KILOGRAM', 'GRAM', 'LITER', 'MILLILITER', 'UNIT', 'PER_REQUEST'],
  {
    message: 'Unit must be KILOGRAM, GRAM, LITER, MILLILITER, UNIT, or PER_REQUEST.',
  },
);

const foodCategorySchema = z.enum(
  ['FRUIT', 'VEGETABLE', 'MEAT', 'COOKED_DISH', 'BAKED_GOODS', 'DRINK'],
  {
    message: 'Category must be FRUIT, VEGETABLE, MEAT, COOKED_DISH, BAKED_GOODS, or DRINK.',
  },
);

const paymentMethodSchema = z.enum(['STRIPE', 'CASH'], {
  message: 'Payment method must be STRIPE or CASH.',
});

const objectIdSchema = z
  .string({ message: 'Listing ID is required.' })
  .regex(/^[0-9a-fA-F]{24}$/, {
    message: 'Listing ID must be a valid MongoDB ObjectId.',
  });

const listingIdParamsSchema = z.object({ id: objectIdSchema }).strict();

const positiveQuantitySchema = z
  .number({ message: 'Quantity must be a number.' })
  .finite({ message: 'Quantity must be a finite number.' })
  .positive({ message: 'Quantity must be greater than 0.' });

const donationLimitSchema = z
  .number({ message: 'Donation limit must be a number.' })
  .finite({ message: 'Donation limit must be a finite number.' })
  .int({ message: 'Donation limit must be a whole number.' })
  .positive({ message: 'Donation limit must be greater than 0.' });

const positiveWholeNumberSchema = z
  .number({ message: 'Ration limit must be a number.' })
  .finite({ message: 'Ration limit must be a finite number.' })
  .int({ message: 'Ration limit must be a whole number.' })
  .positive({ message: 'Ration limit must be greater than 0.' });

const listingPriceSchema = z
  .number({ message: 'Price must be a number.' })
  .finite({ message: 'Price must be a finite number.' })
  .nonnegative({ message: 'Price cannot be negative.' })
  .refine((price) => price === 0 || price >= 15000, {
    message: 'Price must be 0 or greater than or equal to 15000 VND.',
  });

const paginationQuerySchema = z.object({
  page: z.coerce
    .number({ message: 'Page must be a number.' })
    .int({ message: 'Page must be a whole number.' })
    .min(1, { message: 'Page must be at least 1.' })
    .default(1),
  limit: z.coerce
    .number({ message: 'Limit must be a number.' })
    .int({ message: 'Limit must be a whole number.' })
    .min(1, { message: 'Limit must be at least 1.' })
    .max(100, { message: 'Limit cannot be greater than 100.' })
    .default(20),
});

const dateQuerySchema = z
  .string({ message: 'Date must be text.' })
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Date must be a valid ISO 8601 date.',
  });

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

const mineListingsQuerySchema = paginationQuerySchema
  .extend({
    status: z.enum(['ACTIVE', 'PAST'], {
      message: 'Status grouping must be ACTIVE or PAST.',
    }),
    search: z.string({ message: 'Search must be text.' }).trim().optional(),
    category: foodCategorySchema.optional(),
    from: dateQuerySchema.optional(),
    to: dateQuerySchema.optional(),
    sort: z.enum(['createdAt', 'revenue'], {
      message: 'Sort must be createdAt or revenue.',
    }).optional(),
    order: z.enum(['asc', 'desc'], {
      message: 'Order must be asc or desc.',
    }).optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (
      query.from &&
      query.to &&
      new Date(query.from).getTime() > new Date(query.to).getTime()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['from'],
        message: 'From date cannot be later than to date.',
      });
    }
  });

const listingsQuerySchema = paginationQuerySchema
  .extend({
    search: z.string({ message: 'Search must be text.' }).trim().optional(),
    city: z.string({ message: 'City must be text.' }).trim().optional(),
    category: foodCategorySchema.optional(),
    priceMin: z.coerce
      .number({ message: 'Minimum price must be a number.' })
      .nonnegative({ message: 'Minimum price cannot be negative.' })
      .optional(),
    priceMax: z.coerce
      .number({ message: 'Maximum price must be a number.' })
      .nonnegative({ message: 'Maximum price cannot be negative.' })
      .optional(),
    sort: z.enum(['price'], { message: 'Sort must be price.' }).optional(),
    order: z.enum(['asc', 'desc'], {
      message: 'Order must be asc or desc.',
    }).optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (
      query.priceMin !== undefined &&
      query.priceMax !== undefined &&
      query.priceMin > query.priceMax
    ) {
      context.addIssue({
        code: 'custom',
        path: ['priceMin'],
        message: 'Minimum price cannot be greater than maximum price.',
      });
    }
  });

const listingOrdersQuerySchema = paginationQuerySchema.strict();

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

type CreateListingPayload = z.infer<typeof createListingSchema>;
type MineListingsQuery = z.infer<typeof mineListingsQuerySchema>;
type ListingsQuery = z.infer<typeof listingsQuerySchema>;
type ListingOrdersQuery = z.infer<typeof listingOrdersQuerySchema>;

export {
  measurementUnitSchema,
  foodCategorySchema,
  paymentMethodSchema,
  objectIdSchema,
  listingIdParamsSchema,
  positiveQuantitySchema,
  donationLimitSchema,
  positiveWholeNumberSchema,
  listingPriceSchema,
  paginationQuerySchema,
  dateQuerySchema,
  createListingSchema,
  updateListingStatusSchema,
  mineListingsQuerySchema,
  listingsQuerySchema,
  listingOrdersQuerySchema,
  donorInitiatedDonationSchema,
  reserveListingSchema,
};

export type {
  CreateListingPayload,
  MineListingsQuery,
  ListingsQuery,
  ListingOrdersQuery,
};
