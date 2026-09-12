import { describe, it, expect } from 'vitest';
import {
  toAuthDto,
  toRecipientAuthDto,
  toDonorAuthDto,
} from '../../../src/modules/auth/auth.dto.js';

const user = {
  _id: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  role: 'RECIPIENT',
  country: 'Vietnam',
  city: 'Hà Nội',
  status: 'ACTIVE',
  avatarUrl: null,
  passwordHash: 'super-secret-hash',
  failedLoginCount: 3,
  createdAt: new Date('2026-08-11T10:00:00.000Z'),
};

const session = { accessToken: 't1', jti: 'j1', expiresAt: new Date(), user };

describe('auth.dto', () => {
  it('toAuthDto returns the base user and token', () => {
    const dto = toAuthDto(session);

    expect(dto.token).toBe('t1');
    expect(dto.user.id).toBe('u1');
    expect(dto.user.email).toBe('alice@example.com');
  });

  it('toAuthDto never leaks the password hash or lockout counters', () => {
    const dto = toAuthDto(session);

    expect(dto.user).not.toHaveProperty('passwordHash');
    expect(dto.user).not.toHaveProperty('failedLoginCount');
    expect(dto.user).not.toHaveProperty('lockedUntil');
  });

  it('toRecipientAuthDto always reports tier STANDARD (a brand-new Recipient can\'t have a subscription yet)', () => {
    const dto = toRecipientAuthDto(session, {
      stripeCustomerId: 'cus_123',
    });

    expect(dto.user.tier).toBe('STANDARD');
    expect(dto.user.email).toBe('alice@example.com');
  });

  it('toRecipientAuthDto reports hasStripeCard instead of the Stripe id', () => {
    const withCard = toRecipientAuthDto(session, { tier: 'STANDARD', stripeCustomerId: 'cus_123' });
    const withoutCard = toRecipientAuthDto(session, { tier: 'STANDARD', stripeCustomerId: null });

    expect(withCard.user.hasStripeCard).toBe(true);
    expect(withCard.user).not.toHaveProperty('stripeCustomerId');
    expect(withoutCard.user.hasStripeCard).toBe(false);
  });

  it('toDonorAuthDto adds the company profile and location', () => {
    const location = { latitude: 21.0278, longitude: 105.8342, updatedAt: new Date() };
    const dto = toDonorAuthDto(session, {
      companyName: 'Fresh Foods Ltd',
      taxCode: '0123456789',
      addressText: '12 Trần Hưng Đạo',
      location,
    });

    expect(dto.user.companyName).toBe('Fresh Foods Ltd');
    expect(dto.user.taxCode).toBe('0123456789');
    expect(dto.user.addressText).toBe('12 Trần Hưng Đạo');
    expect(dto.user.location).toEqual(location);
    expect(dto.token).toBe('t1');
  });
});
