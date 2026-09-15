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
  it('maps base fields plus the given tier and a derived hasStripeCard', () => {
    const recipient = { stripeCustomerId: 'cus_123' };

    expect(toRecipientResponseDto(baseUser, recipient, 'PREMIUM')).toEqual({
      ...toUserResponseDto(baseUser),
      tier: 'PREMIUM',
      hasStripeCard: true,
    });
  });

  it('uses the passed-in tier, not recipient.tier (tier is derived, never stored writable)', () => {
    const recipient = { tier: 'PREMIUM', stripeCustomerId: 'cus_123' };

    expect(toRecipientResponseDto(baseUser, recipient, 'STANDARD').tier).toBe('STANDARD');
  });

  it('never leaks the raw stripeCustomerId', () => {
    const recipient = { stripeCustomerId: 'cus_123' };

    expect(toRecipientResponseDto(baseUser, recipient, 'STANDARD')).not.toHaveProperty('stripeCustomerId');
  });

  it('sets hasStripeCard to false when there is no Stripe customer', () => {
    expect(toRecipientResponseDto(baseUser, {}, 'STANDARD').hasStripeCard).toBe(false);
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
