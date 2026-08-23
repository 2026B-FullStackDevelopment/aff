import { describe, it, expect } from 'vitest';
import { updateUserSchema } from '../../../src/modules/users/user.schemas.js';

function firstError(schema, value) {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0].message;
}

describe('updateUserSchema', () => {
  it('accepts an empty patch', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a valid partial update of base fields', () => {
    expect(
      updateUserSchema.safeParse({ username: 'new_name', city: 'Da Nang', country: 'Vietnam' }).success
    ).toBe(true);
  });

  it('accepts a valid Donor field patch', () => {
    expect(
      updateUserSchema.safeParse({
        companyName: 'Fresh Foods Ltd',
        addressText: '12 Trần Hưng Đạo',
        location: { latitude: 21.0278, longitude: 105.8342 },
      }).success
    ).toBe(true);
  });

  // .strict() rejects fields that aren't editable post-signup (e.g. taxCode, email).
  it('rejects an unknown field', () => {
    expect(updateUserSchema.safeParse({ taxCode: '0123456789' }).success).toBe(false);
  });

  it('rejects email as an unknown field', () => {
    expect(updateUserSchema.safeParse({ email: 'new@example.com' }).success).toBe(false);
  });

  it.each([['john doe'], ['john.doe'], ['jöhn'], ['john@doe']])(
    'rejects the username %s',
    (username) => {
      expect(firstError(updateUserSchema, { username })).toBe(
        'Username may only contain English letters, numbers, underscores, and hyphens.'
      );
    }
  );

  it('rejects an empty city', () => {
    expect(firstError(updateUserSchema, { city: '' })).toBe('City is required.');
  });

  it('rejects an empty country', () => {
    expect(firstError(updateUserSchema, { country: '' })).toBe('Country is required.');
  });

  it('accepts avatarUrl set to null', () => {
    expect(updateUserSchema.safeParse({ avatarUrl: null }).success).toBe(true);
  });

  it('rejects a non-URL avatarUrl', () => {
    expect(firstError(updateUserSchema, { avatarUrl: 'not-a-url' })).toBe('avatarUrl must be a valid URL.');
  });

  it('rejects an empty company name', () => {
    expect(firstError(updateUserSchema, { companyName: '' })).toBe('Company name is required.');
  });

  it('rejects an empty address', () => {
    expect(firstError(updateUserSchema, { addressText: '' })).toBe('A pickup address is required.');
  });

  it.each([
    [{ latitude: 91, longitude: 105 }],
    [{ latitude: -91, longitude: 105 }],
    [{ latitude: 21, longitude: 181 }],
    [{ latitude: 21, longitude: -181 }],
  ])('rejects out-of-range coordinates %o', (location) => {
    expect(updateUserSchema.safeParse({ location }).success).toBe(false);
  });
});
