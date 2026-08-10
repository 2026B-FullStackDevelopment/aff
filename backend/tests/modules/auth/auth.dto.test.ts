import { describe, it, expect } from 'vitest';
import { toAuthDto } from '../../../src/modules/auth/auth.dto.js';

describe('toAuthDto', () => {
  it('maps a session to { user, token }, not { user, accessToken }', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const user = {
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

    const result = toAuthDto({ accessToken: 'demo-token-for-u1', user });

    expect(result).toEqual({
      user: {
        id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        role: 'RECIPIENT',
        country: 'VN',
        city: 'Hanoi',
        status: 'ACTIVE',
        avatarUrl: null,
        createdAt,
      },
      token: 'demo-token-for-u1',
    });
    expect(result).not.toHaveProperty('accessToken');
  });
});
