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
});
