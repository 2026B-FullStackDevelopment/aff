// Defines validation primitives shared by Listing HTTP request schemas.
import { z } from 'zod';

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
};
