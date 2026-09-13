import { describe, it, expect } from 'vitest';
import { matchesPreference } from '../../../src/modules/listings/listing.premium-match.js';

function basePreference() {
  return {
    categories: [] as Array<'FRUIT' | 'VEGETABLE' | 'MEAT' | 'COOKED_DISH' | 'BAKED_GOODS' | 'DRINK'>,
    vegetarian: null as boolean | null,
    priceMin: null as number | null,
    priceMax: null as number | null,
    city: null as string | null,
  };
}

function baseListing() {
  return {
    category: 'BAKED_GOODS' as const,
    isVegetarian: true,
    price: 3,
    city: 'District 1',
  };
}

describe('matchesPreference', () => {
  it('matches when every set constraint agrees', () => {
    const preference = {
      ...basePreference(),
      categories: ['BAKED_GOODS' as const],
      vegetarian: true,
      priceMin: 0,
      priceMax: 5,
      city: 'District 1',
    };

    expect(matchesPreference(baseListing(), preference)).toBe(true);
  });

  it('treats an empty categories array and null fields as no filter', () => {
    const preference = { ...basePreference(), categories: ['MEAT' as const] };
    const listing = { category: 'MEAT' as const, isVegetarian: false, price: 999, city: 'Anywhere' };

    expect(matchesPreference(listing, preference)).toBe(true);
  });

  it('does not match a different category', () => {
    const preference = { ...basePreference(), categories: ['DRINK' as const] };
    const listing = { ...baseListing(), category: 'VEGETABLE' as const };

    expect(matchesPreference(listing, preference)).toBe(false);
  });

  it('does not match when vegetarian status disagrees', () => {
    const preference = { ...basePreference(), vegetarian: true };
    const listing = { ...baseListing(), isVegetarian: false };

    expect(matchesPreference(listing, preference)).toBe(false);
  });

  it('does not match when price is below priceMin', () => {
    const preference = { ...basePreference(), priceMin: 10 };

    expect(matchesPreference(baseListing(), preference)).toBe(false);
  });

  it('does not match when price is above priceMax', () => {
    const preference = { ...basePreference(), priceMax: 1 };

    expect(matchesPreference(baseListing(), preference)).toBe(false);
  });

  it('does not match when city disagrees', () => {
    const preference = { ...basePreference(), city: 'District 3' };

    expect(matchesPreference(baseListing(), preference)).toBe(false);
  });
});
