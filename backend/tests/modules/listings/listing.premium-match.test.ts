import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  listActivePreferencesForMatchingMock,
  isPremiumRecipientMock,
  sendNotificationMock,
} = vi.hoisted(() => ({
  listActivePreferencesForMatchingMock: vi.fn(),
  isPremiumRecipientMock: vi.fn(),
  sendNotificationMock: vi.fn(),
}));

vi.mock('../../../src/modules/notification-preferences/notification-preference.interface.js', () => ({
  notificationPreferenceInterface: {
    listActivePreferencesForMatching: listActivePreferencesForMatchingMock,
  },
}));

vi.mock('../../../src/modules/subscriptions/subscription.interface.js', () => ({
  subscriptionInterface: {
    isPremiumRecipient: isPremiumRecipientMock,
  },
}));

vi.mock('../../../src/modules/notifications/notification.interface.js', () => ({
  notificationInterface: {
    sendNotification: sendNotificationMock,
  },
}));

import { matchesPreference, notifyPremiumMatches } from '../../../src/modules/listings/listing.premium-match.js';

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

describe('notifyPremiumMatches', () => {
  const listing = {
    _id: 'l1',
    name: 'Fresh Bread',
    category: 'BAKED_GOODS',
    isVegetarian: true,
    price: 3,
    city: 'District 1',
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends PREMIUM_MATCH to a matching, still-Premium Recipient', async () => {
    listActivePreferencesForMatchingMock.mockResolvedValue([
      {
        _id: 'pref1',
        recipientId: 'r1',
        preferenceTitle: 'Vegetarian Bakery',
        categories: ['BAKED_GOODS'],
        vegetarian: null,
        priceMin: null,
        priceMax: null,
        city: null,
      },
    ]);
    isPremiumRecipientMock.mockResolvedValue(true);

    await notifyPremiumMatches(listing);

    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendNotificationMock).toHaveBeenCalledWith({
      userId: 'r1',
      type: 'PREMIUM_MATCH',
      listingId: 'l1',
      payload: {
        listingId: 'l1',
        name: 'Fresh Bread',
        preferenceTitle: 'Vegetarian Bakery',
      },
    });
  });

  it('does not send when the matching Recipient has lapsed to STANDARD', async () => {
    listActivePreferencesForMatchingMock.mockResolvedValue([
      {
        _id: 'pref1',
        recipientId: 'r1',
        categories: ['BAKED_GOODS'],
        vegetarian: null,
        priceMin: null,
        priceMax: null,
        city: null,
      },
    ]);
    isPremiumRecipientMock.mockResolvedValue(false);

    await notifyPremiumMatches(listing);

    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it('does not send for a non-matching preference, and never checks its tier', async () => {
    listActivePreferencesForMatchingMock.mockResolvedValue([
      {
        _id: 'pref1',
        recipientId: 'r1',
        categories: ['DRINK'],
        vegetarian: null,
        priceMin: null,
        priceMax: null,
        city: null,
      },
    ]);

    await notifyPremiumMatches(listing);

    expect(isPremiumRecipientMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it('sends once per matching preference when one Recipient has two matches', async () => {
    listActivePreferencesForMatchingMock.mockResolvedValue([
      {
        _id: 'pref1',
        recipientId: 'r1',
        preferenceTitle: 'Vegetarian Bakery',
        categories: ['BAKED_GOODS'],
        vegetarian: null,
        priceMin: null,
        priceMax: null,
        city: null,
      },
      {
        _id: 'pref2',
        recipientId: 'r1',
        preferenceTitle: 'Any Vegetarian Item',
        categories: [],
        vegetarian: true,
        priceMin: null,
        priceMax: null,
        city: null,
      },
    ]);
    isPremiumRecipientMock.mockResolvedValue(true);

    await notifyPremiumMatches(listing);

    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ preferenceTitle: 'Vegetarian Bakery' }) }),
    );
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ preferenceTitle: 'Any Vegetarian Item' }) }),
    );
  });

  it('resolves without throwing when loading preferences fails', async () => {
    listActivePreferencesForMatchingMock.mockRejectedValue(new Error('db down'));

    await expect(notifyPremiumMatches(listing)).resolves.toBeUndefined();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it('resolves without throwing, and still processes other candidates, when one candidate errors', async () => {
    listActivePreferencesForMatchingMock.mockResolvedValue([
      {
        _id: 'pref1',
        recipientId: 'r1',
        categories: [],
        vegetarian: null,
        priceMin: null,
        priceMax: null,
        city: null,
      },
      {
        _id: 'pref2',
        recipientId: 'r2',
        categories: [],
        vegetarian: null,
        priceMin: null,
        priceMax: null,
        city: null,
      },
    ]);
    isPremiumRecipientMock.mockImplementation((recipientId: string) =>
      recipientId === 'r1' ? Promise.reject(new Error('lookup failed')) : Promise.resolve(true),
    );

    await expect(notifyPremiumMatches(listing)).resolves.toBeUndefined();

    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'r2' }),
    );
  });
});
