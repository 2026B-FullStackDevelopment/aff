import { describe, it, expect } from 'vitest';
import { toErrorDto } from '../../../src/shared/dtos/error.dto.js';

describe('toErrorDto', () => {
  it('returns the error message', () => {
    expect(toErrorDto(new Error('Listing not found.'))).toEqual({
      message: 'Listing not found.',
    });
  });

  it('falls back to a generic message when the error has none', () => {
    const error = new Error();
    error.message = '';

    expect(toErrorDto(error)).toEqual({ message: 'Something went wrong.' });
  });

  it('passes lockedUntilSeconds through when the error carries it', () => {
    const error: Error = new Error('Too many failed attempts.');
    error.lockedUntilSeconds = 300;

    expect(toErrorDto(error)).toEqual({
      message: 'Too many failed attempts.',
      lockedUntilSeconds: 300,
    });
  });

  it('omits lockedUntilSeconds entirely when the error does not carry it', () => {
    expect(toErrorDto(new Error('Nope.'))).toEqual({ message: 'Nope.' });
  });
});
