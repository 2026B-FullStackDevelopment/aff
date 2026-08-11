import { describe, it, expect } from 'vitest';
import {
  registerRecipientSchema,
  registerDonorSchema,
  loginSchema,
} from '../../../src/modules/auth/auth.schemas.js';

const validRecipient = {
  username: 'john_doe',
  email: 'john@example.com',
  password: 'Str0ng!Pass',
  city: 'Hà Nội',
};

const validDonor = {
  companyName: 'Fresh Foods Ltd',
  email: 'donor@example.com',
  password: 'Str0ng!Pass',
  taxCode: '0123456789',
  city: 'Hà Nội',
  addressText: '12 Trần Hưng Đạo, Hà Nội',
  location: { latitude: 21.0278, longitude: 105.8342 },
};

function firstError(schema, value) {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0].message;
}

describe('auth.schemas', () => {
  describe('registerRecipientSchema', () => {
    it('accepts a valid recipient body', () => {
      expect(registerRecipientSchema.safeParse(validRecipient).success).toBe(true);
    });

    // Password strength rules, issue #47 Examples table.
    it.each([
      ['abc123!', 'Password must be at least 8 characters.'],
      ['abcdefgh!', 'Password must contain at least 1 number.'],
      ['abcdefgh1', 'Password must contain at least 1 special character, for example $ # @ !'],
      ['abcdefg1!', 'Password must contain at least 1 capitalized letter.'],
    ])('rejects the password %s', (password, message) => {
      expect(firstError(registerRecipientSchema, { ...validRecipient, password })).toBe(message);
    });

    // Email syntax rules, issue #47 Examples table.
    it.each([
      ['nameexample.com', 'Email must contain exactly one @ symbol.'],
      ['name@@example.com', 'Email must contain exactly one @ symbol.'],
      ['name@examplecom', 'Email must contain a . after the @ symbol.'],
      ['name @example.com', 'Email must not contain spaces or the characters ( ) ; :'],
      ['name(1)@example.com', 'Email must not contain spaces or the characters ( ) ; :'],
    ])('rejects the email %s', (email, message) => {
      expect(firstError(registerRecipientSchema, { ...validRecipient, email })).toBe(message);
    });

    it('rejects an email of 255 characters or more', () => {
      const email = `${'a'.repeat(250)}@example.com`;

      expect(firstError(registerRecipientSchema, { ...validRecipient, email })).toBe(
        'Email must be under 255 characters.'
      );
    });

    // Username syntax rule, issue #47 Examples table.
    it.each([['john doe'], ['john.doe'], ['jöhn'], ['john@doe']])(
      'rejects the username %s',
      (username) => {
        expect(firstError(registerRecipientSchema, { ...validRecipient, username })).toBe(
          'Username may only contain English letters, numbers, underscores, and hyphens.'
        );
      }
    );

    it('rejects a missing city', () => {
      expect(firstError(registerRecipientSchema, { ...validRecipient, city: '' })).toBe(
        'City is required.'
      );
    });

    it('strips a smuggled role field', () => {
      const parsed = registerRecipientSchema.parse({ ...validRecipient, role: 'ADMIN' });

      expect(parsed).not.toHaveProperty('role');
    });
  });

  describe('registerDonorSchema', () => {
    it('accepts a valid donor body', () => {
      expect(registerDonorSchema.safeParse(validDonor).success).toBe(true);
    });

    // Tax code rule, issue #48: 10 to 13 digits.
    it.each([['123456789'], ['12345678901234'], ['012345678a'], ['']])(
      'rejects the tax code %s',
      (taxCode) => {
        expect(firstError(registerDonorSchema, { ...validDonor, taxCode })).toBe(
          'Tax code must be 10 to 13 digits.'
        );
      }
    );

    it.each([['0123456789'], ['0123456789012']])('accepts the tax code %s', (taxCode) => {
      expect(registerDonorSchema.safeParse({ ...validDonor, taxCode }).success).toBe(true);
    });

    it('rejects an empty company name', () => {
      expect(firstError(registerDonorSchema, { ...validDonor, companyName: '' })).toBe(
        'Company name is required.'
      );
    });

    it('rejects an empty address', () => {
      expect(firstError(registerDonorSchema, { ...validDonor, addressText: '' })).toBe(
        'A pickup address is required.'
      );
    });

    it('rejects a missing location', () => {
      const { location, ...withoutLocation } = validDonor;

      expect(registerDonorSchema.safeParse(withoutLocation).success).toBe(false);
    });

    it.each([
      [{ latitude: 91, longitude: 105 }],
      [{ latitude: -91, longitude: 105 }],
      [{ latitude: 21, longitude: 181 }],
      [{ latitude: 21, longitude: -181 }],
    ])('rejects out-of-range coordinates %o', (location) => {
      expect(registerDonorSchema.safeParse({ ...validDonor, location }).success).toBe(false);
    });

    it('applies the same password rules as recipient registration', () => {
      expect(firstError(registerDonorSchema, { ...validDonor, password: 'abcdefgh1' })).toBe(
        'Password must contain at least 1 special character, for example $ # @ !'
      );
    });
  });

  describe('loginSchema', () => {
    it('accepts an email and password', () => {
      expect(loginSchema.safeParse({ email: 'john@example.com', password: 'anything' }).success).toBe(
        true
      );
    });

    it('does not apply strength rules to the login password', () => {
      expect(loginSchema.safeParse({ email: 'john@example.com', password: 'x' }).success).toBe(true);
    });

    it('rejects an empty password', () => {
      expect(firstError(loginSchema, { email: 'john@example.com', password: '' })).toBe(
        'Password is required.'
      );
    });

    it('rejects a malformed email', () => {
      expect(firstError(loginSchema, { email: 'nameexample.com', password: 'x' })).toBe(
        'Email must contain exactly one @ symbol.'
      );
    });
  });
});
