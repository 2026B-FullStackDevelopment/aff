import { describe, it, expect } from 'vitest';
import {
  toUserResponseDto,
  toRecipientResponseDto,
  toDonorResponseDto,
} from '../../../src/modules/users/user.dto.js';

const createdAt = new Date('2026-01-01T00:00:00.000Z');
const baseUser = {
  _id: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  role: 'RECIPIENT',
  country: 'VN',
  city: 'Hanoi',
  status: 'ACTIVE',
  avatarUrl: null,
  createdAt,
};

describe('toUserResponseDto', () => {
  it('returns null when given null', () => {
    expect(toUserResponseDto(null)).toBeNull();
  });

  it('maps a user document to the documented UserResponseDto shape', () => {
    expect(toUserResponseDto(baseUser)).toEqual({
      id: 'u1',
      username: 'alice',
      email: 'alice@example.com',
      role: 'RECIPIENT',
      country: 'VN',
      city: 'Hanoi',
      status: 'ACTIVE',
      avatarUrl: null,
      createdAt,
    });
  });
});

describe('toRecipientResponseDto', () => {
  it('maps base fields plus tier, notificationPreferences, and a derived hasStripeCard', () => {
    const recipient = { tier: 'PREMIUM', notificationPreferences: [], stripeCustomerId: 'cus_123' };

    expect(toRecipientResponseDto(baseUser, recipient)).toEqual({
      ...toUserResponseDto(baseUser),
      tier: 'PREMIUM',
      notificationPreferences: [],
      hasStripeCard: true,
    });
  });

  it('never leaks the raw stripeCustomerId', () => {
    const recipient = { tier: 'STANDARD', notificationPreferences: [], stripeCustomerId: 'cus_123' };

    expect(toRecipientResponseDto(baseUser, recipient)).not.toHaveProperty('stripeCustomerId');
  });

  it('defaults notificationPreferences to an empty array when absent', () => {
    const recipient = { tier: 'STANDARD' };

    expect(toRecipientResponseDto(baseUser, recipient).notificationPreferences).toEqual([]);
  });

  it('sets hasStripeCard to false when there is no Stripe customer', () => {
    const recipient = { tier: 'STANDARD', notificationPreferences: [] };

    expect(toRecipientResponseDto(baseUser, recipient).hasStripeCard).toBe(false);
  });
});

describe('toDonorResponseDto', () => {
  it('maps base fields plus the Donor company profile', () => {
    const donor = {
      companyName: 'Fresh Foods Ltd',
      taxCode: '0123456789',
      addressText: '12 Trần Hưng Đạo, Hà Nội',
      location: { latitude: 21.0278, longitude: 105.8342, updatedAt: createdAt },
    };

    expect(toDonorResponseDto(baseUser, donor)).toEqual({
      ...toUserResponseDto(baseUser),
      ...donor,
    });
  });
});
