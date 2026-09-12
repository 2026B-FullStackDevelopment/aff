// Validates the page and limit query parameters shared by paginated endpoints.
// The admin user stories require paginated directories with bounded record
// counts, so every endpoint must interpret these inputs in the same way.
// The project already has shared pagination support in other layers:
// - shared/http/response.ts formats paginated API responses; and
// - the frontend Pagination component renders pagination controls.
// Those files handle output formatting and presentation. They do not validate
// untrusted page and limit query strings. This schema owns that separate input
// validation concern and prevents each backend module from duplicating it.

import { z } from 'zod';

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

type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export { paginationQuerySchema };
export type { PaginationQuery };
