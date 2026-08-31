// Validates Listing-module request bodies, path parameters, and query
// Zod is a typescript library to validate data while app running

import { z } from 'zod';
import { locationSchema } from '../../shared/validation/common-fields.schemas.js';
// Runtime values allowed by the LISTING measurement-unit enum.
const measurementUnitSchema = z.enum(
  [
    'KILOGRAM',
    'GRAM',
    'LITER',
    'MILLILITER',
    'UNIT',
    'PER_REQUEST',
  ],
  {
    message:
      'Unit must be KILOGRAM, GRAM, LITER, MILLILITER, UNIT, or PER_REQUEST.',
  },
);

// Runtime values allowed by the LISTING food-category enum.
const foodCategorySchema = z.enum(
  [
    'FRUIT',
    'VEGETABLE',
    'MEAT',
    'COOKED_DISH',
    'BAKED_GOODS',
    'DRINK',
  ],
  {
    message:
      'Category must be FRUIT, VEGETABLE, MEAT, COOKED_DISH, BAKED_GOODS, or DRINK.',
  },
);

// Payment methods supported by tracked, priced Orders.
const paymentMethodSchema = z.enum(['STRIPE', 'CASH'], {
  message: 'Payment method must be STRIPE or CASH.',
});

// Validate MongoDB ObjectId strings before passing them to Mongoose.
const objectIdSchema = z
  .string({ message: 'Listing ID is required.' })
  .regex(/^[0-9a-fA-F]{24}$/, {
    message: 'Listing ID must be a valid MongoDB ObjectId.',
  });

// Shared validation for positive quantities.
//
// Quantities are not restricted to integers because units such as kilograms
// and litres may reasonably use decimal values.
const positiveQuantitySchema = z
  .number({ message: 'Quantity must be a number.' })
  .finite({ message: 'Quantity must be a finite number.' })
  .positive({ message: 'Quantity must be greater than 0.' });

// Listing prices must be free or greater than or equal to 15000 VND.
const listingPriceSchema = z
  .number({ message: 'Price must be a number.' })
  .finite({ message: 'Price must be a finite number.' })
  .nonnegative({ message: 'Price cannot be negative.' })
  .refine((price) => price === 0 || price >= 15000, {
    message: 'Price must be 0 or greater than or equal to 15000 VND.',
  });

// Validates `POST /listings`, the http request to create a listing
const createListingSchema = z
  .object({
    name: z
      .string({ message: 'Listing name is required.' })
      .trim()
      .min(1, { message: 'Listing name is required.' }),

    description: z
      .string({ message: 'Description must be text.' })
      .trim()
      .optional(),

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

    donationLimit: positiveQuantitySchema,

    // The field is optional, but it must be greater than zero when supplied.
    // An omitted value means that the listing has no per-person ration limit.
    rationLimitPerPerson: positiveQuantitySchema.optional(),
  })
  .strict(); // Reject the entire object if it contains any property that was not explicitly declared.

// Shared pagination validation
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

// Validate a date query value without changing it into a Date object.
// The repository/service can decide how the date is used in its query.
const dateQuerySchema = z
  .string({ message: 'Date must be text.' })
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Date must be a valid ISO 8601 date.',
  });

/**
 * Validates `GET /listings/mine` query parameters.
 */
const mineListingsQuerySchema = paginationQuerySchema
  .extend({
    status: z.enum(['ACTIVE', 'PAST'], {
      message: 'Status grouping must be ACTIVE or PAST.',
    }),

    search: z
      .string({ message: 'Search must be text.' })
      .trim()
      .optional(),

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
    // If both dates are present, the starting date cannot follow the ending
    // date.
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

type MineListingsQuery = z.infer<typeof mineListingsQuerySchema>;

/**
 * Validates `GET /listings` query parameters — the public active-listings
 * browse endpoint. `.strict()` rejects unknown params, including a
 * client-supplied `status` (always hard-coded `ACTIVE` server-side) and
 * Epic F proximity-ranking fields such as `rank`/`lat`/`lng`. D6 adds
 * `search`/`city`/`category`/`priceMin`/`priceMax`/`sort`/`order` on top of
 * D1's base pagination fields.
 */
const listingsQuerySchema = paginationQuerySchema
  .extend({
    search: z
      .string({ message: 'Search must be text.' })
      .trim()
      .optional(),

    city: z
      .string({ message: 'City must be text.' })
      .trim()
      .optional(),

    category: foodCategorySchema.optional(),

    priceMin: z.coerce
      .number({ message: 'Minimum price must be a number.' })
      .nonnegative({ message: 'Minimum price cannot be negative.' })
      .optional(),

    priceMax: z.coerce
      .number({ message: 'Maximum price must be a number.' })
      .nonnegative({ message: 'Maximum price cannot be negative.' })
      .optional(),

    sort: z.enum(['price'], {
      message: 'Sort must be price.',
    }).optional(),

    order: z.enum(['asc', 'desc'], {
      message: 'Order must be asc or desc.',
    }).optional(),
  })
  .strict()
  .superRefine((query, context) => {
    // If both price bounds are present, the minimum cannot exceed the
    // maximum.
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

type ListingsQuery = z.infer<typeof listingsQuerySchema>;

/**
 * Validates `:id` for Listing routes such as:
 *
 * - POST /listings/:id/clone
 * - PATCH /listings/:id/status
 * - GET /listings/:id/orders
 * - POST /listings/:id/donations
 */
const listingIdParamsSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

/**
 * Validates `PATCH /listings/:id/status`.
 *
 * `SOLD_OUT` is not accepted here because it is a server-controlled
 * transition that occurs when quantityRemaining reaches zero.
 */
const updateListingStatusSchema = z
  .object({
    status: z.enum(['PAUSED', 'ACTIVE', 'CANCELLED'], {
      message: 'Status must be PAUSED, ACTIVE, or CANCELLED.',
    }),
  })
  .strict();

/**
 * Validates `POST /listings/:id/donations`.
 */
const deliveryLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});


// data validation: ensure data's format is valid
const donorInitiatedDonationSchema = z
  // the value coming in has to be a JS object
  .object({
    recipientEmail: z
      .string({ message: 'Recipient email is required.' }) // must be string
      .trim() // no whitespace
      .email({ message: 'Recipient email must be valid.' }) // function auto check email structure
      .transform((email) => email.toLowerCase()), // transform input to lowercase

    quantity: positiveQuantitySchema,

    deliveryAddressText: z
      .string({ message: 'Delivery address is required.' })
      .trim()
      .min(1, { message: 'Delivery address is required.' }),

    deliveryLocation: deliveryLocationSchema,
  })
  .strict();

/**
 * Validates pagination for `GET /listings/:id/orders`.
 */
const listingOrdersQuerySchema = paginationQuerySchema.strict();

type ListingOrdersQuery = z.infer<typeof listingOrdersQuerySchema>;

/**
 * Validates `POST /listings/:id/reserve`.
 *
 * No price-based refinement here (e.g. requiring `paymentMethod` when the
 * listing is priced) — that needs the listing's `price`, which this schema
 * has no way to see. That check lives in `listingService.reserveListing`.
 */
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

export {
  measurementUnitSchema,
  foodCategorySchema,
  paymentMethodSchema,
  objectIdSchema,
  positiveQuantitySchema,
  listingPriceSchema,
  createListingSchema,
  paginationQuerySchema,
  mineListingsQuerySchema,
  listingsQuerySchema,
  listingIdParamsSchema,
  updateListingStatusSchema,
  donorInitiatedDonationSchema,
  listingOrdersQuerySchema,
  reserveListingSchema,
};

export type { MineListingsQuery, ListingsQuery, ListingOrdersQuery };
