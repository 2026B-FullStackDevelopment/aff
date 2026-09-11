import { describe, expect, it } from 'vitest';
import {
  createNotificationPreferenceSchema,
  updateNotificationPreferenceSchema,
  notificationPreferenceIdParamsSchema,
  foodCategorySchema,
} from '../../../src/modules/notification-preferences/notification-preference.schemas.js';

const validPreference = {
  preferenceTitle: 'Vegetarian bakery under $5 in District 1',
  categories: ['BAKED_GOODS'],
  vegetarian: true,
  priceMin: null,
  priceMax: 5,
  city: 'District 1',
};

describe('notification-preference.schemas', () => {
  describe('foodCategorySchema', () => {
    it.each(['FRUIT', 'VEGETABLE', 'MEAT', 'COOKED_DISH', 'BAKED_GOODS', 'DRINK'])(
      'accepts food category %s',
      (category) => {
        expect(foodCategorySchema.safeParse(category).success).toBe(true);
      },
    );

    it('rejects an unsupported food category', () => {
      expect(foodCategorySchema.safeParse('SEAFOOD').success).toBe(false);
    });
  });

  describe('createNotificationPreferenceSchema', () => {
    it('accepts a complete valid preference', () => {
      expect(createNotificationPreferenceSchema.safeParse(validPreference).success).toBe(true);
    });

    it('accepts optional fields left unset, defaulting categories to an empty array', () => {
      const parsed = createNotificationPreferenceSchema.parse({
        preferenceTitle: 'Any MEAT listing',
      });

      expect(parsed).toEqual({
        preferenceTitle: 'Any MEAT listing',
        categories: [],
      });
    });

    it('accepts explicit nulls on vegetarian/priceMin/priceMax/city', () => {
      const parsed = createNotificationPreferenceSchema.parse({
        ...validPreference,
        vegetarian: null,
        priceMin: null,
        priceMax: null,
        city: null,
      });

      expect(parsed.vegetarian).toBeNull();
      expect(parsed.priceMax).toBeNull();
    });

    it('accepts an explicit isActive value', () => {
      const parsed = createNotificationPreferenceSchema.parse({ ...validPreference, isActive: false });
      expect(parsed.isActive).toBe(false);
    });

    it('rejects an empty preference title', () => {
      expect(
        createNotificationPreferenceSchema.safeParse({ ...validPreference, preferenceTitle: '   ' }).success,
      ).toBe(false);
    });

    it('rejects a missing preference title', () => {
      const { preferenceTitle: _preferenceTitle, ...rest } = validPreference;
      expect(createNotificationPreferenceSchema.safeParse(rest).success).toBe(false);
    });

    it('rejects an invalid category', () => {
      expect(
        createNotificationPreferenceSchema.safeParse({ ...validPreference, categories: ['SEAFOOD'] }).success,
      ).toBe(false);
    });

    it('rejects priceMin greater than priceMax', () => {
      expect(
        createNotificationPreferenceSchema.safeParse({ ...validPreference, priceMin: 10, priceMax: 5 }).success,
      ).toBe(false);
    });

    it('accepts priceMin equal to priceMax', () => {
      expect(
        createNotificationPreferenceSchema.safeParse({ ...validPreference, priceMin: 5, priceMax: 5 }).success,
      ).toBe(true);
    });

    it('accepts a price bound when the other bound is null', () => {
      expect(
        createNotificationPreferenceSchema.safeParse({ ...validPreference, priceMin: 5, priceMax: null }).success,
      ).toBe(true);
    });

    it('rejects a negative priceMin', () => {
      expect(createNotificationPreferenceSchema.safeParse({ ...validPreference, priceMin: -1 }).success).toBe(false);
    });

    it('rejects unknown fields', () => {
      expect(
        createNotificationPreferenceSchema.safeParse({ ...validPreference, matchedPreferenceId: 'x' }).success,
      ).toBe(false);
    });

    it('trims the preference title and city', () => {
      const parsed = createNotificationPreferenceSchema.parse({
        ...validPreference,
        preferenceTitle: '  Vegetarian bakery  ',
        city: '  District 1  ',
      });

      expect(parsed.preferenceTitle).toBe('Vegetarian bakery');
      expect(parsed.city).toBe('District 1');
    });
  });

  describe('updateNotificationPreferenceSchema', () => {
    it('accepts an empty body (no-op update)', () => {
      expect(updateNotificationPreferenceSchema.safeParse({}).success).toBe(true);
    });

    it('accepts just isActive to toggle pause state', () => {
      expect(updateNotificationPreferenceSchema.safeParse({ isActive: false }).success).toBe(true);
    });

    it('accepts just a price range update', () => {
      expect(updateNotificationPreferenceSchema.safeParse({ priceMin: 1, priceMax: 2 }).success).toBe(true);
    });

    it('rejects priceMin greater than priceMax even as a partial update', () => {
      expect(updateNotificationPreferenceSchema.safeParse({ priceMin: 10, priceMax: 5 }).success).toBe(false);
    });

    it('rejects an invalid category', () => {
      expect(updateNotificationPreferenceSchema.safeParse({ categories: ['SEAFOOD'] }).success).toBe(false);
    });

    it('rejects unknown fields', () => {
      expect(updateNotificationPreferenceSchema.safeParse({ recipientId: 'someone-else' }).success).toBe(false);
    });
  });

  describe('notificationPreferenceIdParamsSchema', () => {
    it('accepts a valid MongoDB ObjectId', () => {
      expect(notificationPreferenceIdParamsSchema.safeParse({ id: '507f1f77bcf86cd799439011' }).success).toBe(true);
    });

    it.each(['short-id', '507f1f77bcf86cd79943901z', ''])('rejects preference ID %s', (id) => {
      expect(notificationPreferenceIdParamsSchema.safeParse({ id }).success).toBe(false);
    });
  });
});
