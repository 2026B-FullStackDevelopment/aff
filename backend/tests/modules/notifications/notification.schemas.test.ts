import { describe, expect, it } from 'vitest';
import { notificationsQuerySchema } from '../../../src/modules/notifications/notification.schemas.js';

describe('notificationsQuerySchema', () => {
  it('defaults pagination when the caller sends no query', () => {
    expect(notificationsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('rejects an unknown field, since only pagination is accepted', () => {
    const result = notificationsQuerySchema.safeParse({ sort: 'createdAt' });

    expect(result.success).toBe(false);
  });

  it('rejects a limit above the max of 100', () => {
    const result = notificationsQuerySchema.safeParse({ limit: 101 });

    expect(result.success).toBe(false);
  });
});
