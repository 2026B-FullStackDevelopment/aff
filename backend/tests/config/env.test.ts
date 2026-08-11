import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const validVars = {
  MONGO_URI: 'mongodb://127.0.0.1:27017/aff',
  JWT_SECRET: 'super-secret',
};

describe('loadEnv', () => {
  it('throws when MONGO_URI is missing', () => {
    expect(() => loadEnv({ JWT_SECRET: 'super-secret' })).toThrow(/MONGO_URI/);
  });

  it('throws when JWT_SECRET is missing', () => {
    expect(() => loadEnv({ MONGO_URI: 'mongodb://127.0.0.1:27017/aff' })).toThrow(/JWT_SECRET/);
  });

  it('returns parsed values when required vars are present', () => {
    const env = loadEnv(validVars);

    expect(env.mongoUri).toBe('mongodb://127.0.0.1:27017/aff');
    expect(env.jwtSecret).toBe('super-secret');
    expect(env.port).toBe(5000);
    expect(env.nodeEnv).toBe('development');
  });

  it('applies overrides from provided vars over defaults', () => {
    const env = loadEnv({ ...validVars, PORT: '4000', NODE_ENV: 'production' });

    expect(env.port).toBe(4000);
    expect(env.nodeEnv).toBe('production');
  });

  it('defaults the security tuning values when they are not set', () => {
    const config = loadEnv({ MONGO_URI: 'mongodb://localhost/aff', JWT_SECRET: 'secret' });

    expect(config.bcryptRounds).toBe(12);
    expect(config.loginMaxAttempts).toBe(5);
    expect(config.loginWindowSeconds).toBe(60);
    expect(config.lockoutMinutes).toBe(5);
  });

  it('reads the security tuning values from the environment as numbers', () => {
    const config = loadEnv({
      MONGO_URI: 'mongodb://localhost/aff',
      JWT_SECRET: 'secret',
      BCRYPT_ROUNDS: '4',
      LOGIN_MAX_ATTEMPTS: '3',
      LOGIN_WINDOW_SECONDS: '30',
      LOCKOUT_MINUTES: '1',
    });

    expect(config.bcryptRounds).toBe(4);
    expect(config.loginMaxAttempts).toBe(3);
    expect(config.loginWindowSeconds).toBe(30);
    expect(config.lockoutMinutes).toBe(1);
  });

  // Issue: a non-numeric value used to silently produce NaN, which made
  // `failedLoginCount >= NaN` always false and disabled the lockout with no symptom.
  describe('numberVar', () => {
    it.each([
      ['LOGIN_MAX_ATTEMPTS', 'five'],
      ['LOCKOUT_MINUTES', 'NaN'],
      ['LOGIN_WINDOW_SECONDS', 'sixty'],
      ['BCRYPT_ROUNDS', 'twelve'],
      ['PORT', 'eighty'],
      ['EMAIL_PORT', 'five-eighty-seven'],
    ])('throws naming the key when %s is not a number', (key, value) => {
      expect(() => loadEnv({ ...validVars, [key]: value })).toThrow(
        new RegExp(`${key} must be a number, got "${value}"`)
      );
    });

    it('falls back to the default when the value is an empty string', () => {
      const config = loadEnv({ ...validVars, LOGIN_MAX_ATTEMPTS: '' });

      expect(config.loginMaxAttempts).toBe(5);
    });

    it('parses a valid numeric value', () => {
      const config = loadEnv({ ...validVars, LOGIN_MAX_ATTEMPTS: '7' });

      expect(config.loginMaxAttempts).toBe(7);
    });
  });
});
