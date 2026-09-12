import { describe, it, expect } from 'vitest';
import { toNotificationPreferenceResponseDto } from '../../../src/modules/notification-preferences/notification-preference.dto.js';

describe('toNotificationPreferenceResponseDto', () => {
  it('maps a NotificationPreference document to the documented DTO shape', () => {
    const preference = {
      _id: 'pref1',
      recipientId: 'user1',
      preferenceTitle: 'Vegetarian bakery under $5 in District 1',
      categories: ['BAKED_GOODS'],
      vegetarian: true,
      priceMin: null,
      priceMax: 5,
      city: 'District 1',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    expect(toNotificationPreferenceResponseDto(preference as never)).toEqual({
      id: 'pref1',
      preferenceTitle: 'Vegetarian bakery under $5 in District 1',
      categories: ['BAKED_GOODS'],
      vegetarian: true,
      priceMin: null,
      priceMax: 5,
      city: 'District 1',
      isActive: true,
    });
  });

  it('passes through all-null optional fields and a paused isActive unchanged', () => {
    const preference = {
      _id: 'pref2',
      recipientId: 'user1',
      preferenceTitle: 'Any MEAT listing',
      categories: ['MEAT'],
      vegetarian: null,
      priceMin: null,
      priceMax: null,
      city: null,
      isActive: false,
    };

    expect(toNotificationPreferenceResponseDto(preference as never)).toEqual({
      id: 'pref2',
      preferenceTitle: 'Any MEAT listing',
      categories: ['MEAT'],
      vegetarian: null,
      priceMin: null,
      priceMax: null,
      city: null,
      isActive: false,
    });
  });
});
