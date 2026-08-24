import { describe, it, expect } from 'vitest';
import {
  updateUserSchema,
  changePasswordSchema,
  changeEmailSchema,
} from '../../../src/modules/users/user.schemas.js';

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

  // Password change is not part of this endpoint's contract (docs/api_design.md §5) —
  // it has its own dedicated PATCH /users/me/password endpoint (see changePasswordSchema below).
  it('rejects password as an unknown field', () => {
    expect(updateUserSchema.safeParse({ password: 'NewStr0ng!Pass' }).success).toBe(false);
  });

  it('rejects password even alongside otherwise-valid fields', () => {
    expect(
      updateUserSchema.safeParse({ username: 'new_username', password: 'sneaky' }).success
    ).toBe(false);
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

describe('changePasswordSchema', () => {
  it('accepts a strong newPassword', () => {
    expect(changePasswordSchema.safeParse({ newPassword: 'Str0ng!Pass' }).success).toBe(true);
  });

  it('rejects a missing newPassword', () => {
    expect(changePasswordSchema.safeParse({}).success).toBe(false);
  });

  it.each([
    ['short1!A', 'Password must be at least 8 characters.', 'short1!'],
    ['no digit', 'Password must contain at least 1 number.', 'NoDigit!Pass'],
    ['no special char', 'Password must contain at least 1 special character, for example $ # @ !', 'NoSpecial1Pass'],
    ['no uppercase', 'Password must contain at least 1 capitalized letter.', 'no0uppercase!'],
  ])('rejects %s', (_label, expectedMessage, newPassword) => {
    const result = changePasswordSchema.safeParse({ newPassword });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(expectedMessage);
    }
  });

  // No currentPassword field exists per docs/api_design.md §5 — the session
  // token is treated as sufficient proof of identity, so .strict() rejects
  // one if a client accidentally sends it.
  it('rejects an unexpected currentPassword field', () => {
    expect(
      changePasswordSchema.safeParse({ newPassword: 'Str0ng!Pass', currentPassword: 'OldPass1!' }).success
    ).toBe(false);
  });
});

describe('changeEmailSchema', () => {
  it('accepts a valid newEmail', () => {
    expect(changeEmailSchema.safeParse({ newEmail: 'new@example.com' }).success).toBe(true);
  });

  it('lowercases newEmail', () => {
    const result = changeEmailSchema.safeParse({ newEmail: 'New@Example.com' });
    expect(result.success && result.data.newEmail).toBe('new@example.com');
  });

  it('rejects a missing newEmail', () => {
    expect(changeEmailSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a malformed newEmail', () => {
    expect(changeEmailSchema.safeParse({ newEmail: 'not-an-email' }).success).toBe(false);
  });

  // No currentPassword confirmation is required per docs/api_design.md §5.
  it('rejects an unexpected currentPassword field', () => {
    expect(
      changeEmailSchema.safeParse({ newEmail: 'new@example.com', currentPassword: 'OldPass1!' }).success
    ).toBe(false);
  });
});
