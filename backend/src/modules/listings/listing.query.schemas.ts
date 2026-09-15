// Validates public and Donor-facing Listing query strings.
import { z } from 'zod';
import {
  dateQuerySchema,
  foodCategorySchema,
  paginationQuerySchema,
} from './listing.shared.schemas.js';

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

type MineListingsQuery = z.infer<typeof mineListingsQuerySchema>;
type ListingsQuery = z.infer<typeof listingsQuerySchema>;
type ListingOrdersQuery = z.infer<typeof listingOrdersQuerySchema>;

export { mineListingsQuerySchema, listingsQuerySchema, listingOrdersQuerySchema };
export type { MineListingsQuery, ListingsQuery, ListingOrdersQuery };
