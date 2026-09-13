import { describe, expect, it } from 'vitest';
import { NOTIFICATION_REGISTRY } from './notificationRegistry';

describe('notification registry', () => {
  it('uses actor-neutral fallback copy for a listing cancellation', () => {
    const entry = NOTIFICATION_REGISTRY.find(
      (candidate) => candidate.event === 'notification:admin_cancel',
    );

    expect(entry).toBeDefined();
    expect(entry!.toast({})).toMatchObject({
      variant: 'error',
      title: 'Order cancelled',
      description: 'Your order was cancelled because its listing was closed.',
    });
  });
});
