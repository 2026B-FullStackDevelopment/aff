import { describe, it, expect } from 'vitest';
import { toUserResponseDto } from '../../../src/modules/users/user.dto.js';

describe('toUserResponseDto', () => {
  it('returns null when given null', () => {
    expect(toUserResponseDto(null)).toBeNull();
  });

  it('maps a user document to the documented UserResponseDto shape', () => {
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

    expect(toUserResponseDto(user)).toEqual({
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
