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
});
