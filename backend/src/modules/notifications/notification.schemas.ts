import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/validation/common-fields.schemas.js';

const notificationsQuerySchema = paginationQuerySchema.strict();

type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

export { notificationsQuerySchema };
export type { NotificationsQuery };
