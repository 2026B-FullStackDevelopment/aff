// Validates notification-preference request bodies and path parameters.
import { z } from 'zod';

const foodCategorySchema = z.enum(
  ['FRUIT', 'VEGETABLE', 'MEAT', 'COOKED_DISH', 'BAKED_GOODS', 'DRINK'],
  { message: 'Category must be FRUIT, VEGETABLE, MEAT, COOKED_DISH, BAKED_GOODS, or DRINK.' }
);

const objectIdSchema = z
  .string({ message: 'Preference ID is required.' })
  .regex(/^[0-9a-fA-F]{24}$/, { message: 'Preference ID must be a valid MongoDB ObjectId.' });

function priceRangeRefine(
  data: { priceMin?: number | null; priceMax?: number | null },
  context: z.RefinementCtx
) {
  if (data.priceMin != null && data.priceMax != null && data.priceMin > data.priceMax) {
    context.addIssue({
      code: 'custom',
      path: ['priceMin'],
      message: 'Minimum price cannot be greater than maximum price.',
    });
  }
}

// Defined once as a plain shape (not yet wrapped in z.object) so create and
// update can each build their own object from it — .strict()/.partial() are
// ZodObject methods, so the shape has to stay unwrapped until each call site
// decides which of those it needs.
const preferenceFieldsShape = {
  preferenceTitle: z
    .string({ message: 'Preference title is required.' })
    .trim()
    .min(1, { message: 'Preference title is required.' }),
  categories: z.array(foodCategorySchema).default([]),
  vegetarian: z.boolean({ message: 'Vegetarian status must be true or false.' }).nullable().optional(),
  priceMin: z
    .number({ message: 'Minimum price must be a number.' })
    .nonnegative({ message: 'Minimum price cannot be negative.' })
    .nullable()
    .optional(),
  priceMax: z
    .number({ message: 'Maximum price must be a number.' })
    .nonnegative({ message: 'Maximum price cannot be negative.' })
    .nullable()
    .optional(),
  city: z.string({ message: 'City must be text.' }).trim().min(1, { message: 'City must be text.' }).nullable().optional(),
  isActive: z.boolean({ message: 'isActive must be true or false.' }).optional(),
};

const createNotificationPreferenceSchema = z
  .object(preferenceFieldsShape)
  .strict()
  .superRefine(priceRangeRefine);

const updateNotificationPreferenceSchema = z
  .object(preferenceFieldsShape)
  .partial()
  .strict()
  .superRefine(priceRangeRefine);

const notificationPreferenceIdParamsSchema = z.object({ id: objectIdSchema }).strict();

type CreateNotificationPreferenceInput = z.infer<typeof createNotificationPreferenceSchema>;
type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;

export {
  foodCategorySchema,
  objectIdSchema,
  createNotificationPreferenceSchema,
  updateNotificationPreferenceSchema,
  notificationPreferenceIdParamsSchema,
};
export type { CreateNotificationPreferenceInput, UpdateNotificationPreferenceInput };
