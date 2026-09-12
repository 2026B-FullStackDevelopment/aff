import { describe, it, expect } from 'vitest';
import { toNotificationResponseDto } from '../../../src/modules/notifications/notification.dto.js';

describe('toNotificationResponseDto', () => {
  it('maps a Notification document to the documented DTO shape, stringifying ObjectId refs', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const notification = {
      _id: 'n1',
      userId: 'u1',
      type: 'SOLD_OUT',
      message: 'Your listing "Bread" just sold out.',
      orderId: null,
      listingId: 'l1',
      createdAt,
    };

    expect(toNotificationResponseDto(notification as never)).toEqual({
      id: 'n1',
      type: 'SOLD_OUT',
      message: 'Your listing "Bread" just sold out.',
      orderId: null,
      listingId: 'l1',
      createdAt,
    });
  });

  it('returns null for both orderId and listingId when neither is set', () => {
    const createdAt = new Date('2026-01-02T00:00:00.000Z');
    const notification = {
      _id: 'n2',
      userId: 'u1',
      type: 'PREMIUM_MATCH',
      message: 'A new listing matches your notification preferences.',
      orderId: null,
      listingId: null,
      createdAt,
    };

    expect(toNotificationResponseDto(notification as never)).toEqual({
      id: 'n2',
      type: 'PREMIUM_MATCH',
      message: 'A new listing matches your notification preferences.',
      orderId: null,
      listingId: null,
      createdAt,
    });
  });
});
