import { describe, it, expect } from 'vitest';
import { uploadUrlRequestSchema } from '../../../src/modules/media/media.schemas.js';

function firstError(value: unknown) {
  const result = uploadUrlRequestSchema.safeParse(value);
  return result.success ? null : result.error.issues[0].message;
}

describe('media.schemas', () => {
  describe('uploadUrlRequestSchema', () => {
    it('accepts a valid AVATAR body', () => {
      expect(uploadUrlRequestSchema.safeParse({ purpose: 'AVATAR', contentType: 'image/png' }).success).toBe(true);
    });

    it('accepts a valid LISTING_IMAGE body', () => {
      expect(uploadUrlRequestSchema.safeParse({ purpose: 'LISTING_IMAGE', contentType: 'image/webp' }).success).toBe(
        true,
      );
    });

    it.each([['image/png'], ['image/jpeg'], ['image/webp']])('accepts contentType %s', (contentType) => {
      expect(uploadUrlRequestSchema.safeParse({ purpose: 'AVATAR', contentType }).success).toBe(true);
    });

    it('rejects a missing purpose', () => {
      expect(firstError({ contentType: 'image/png' })).toBe('purpose must be AVATAR or LISTING_IMAGE.');
    });

    it('rejects an invalid purpose', () => {
      expect(firstError({ purpose: 'BANNER', contentType: 'image/png' })).toBe(
        'purpose must be AVATAR or LISTING_IMAGE.',
      );
    });

    it('rejects a missing contentType', () => {
      expect(firstError({ purpose: 'AVATAR' })).toBe(
        'contentType must be one of image/png, image/jpeg, image/webp.',
      );
    });

    it('rejects an unsupported contentType', () => {
      expect(firstError({ purpose: 'AVATAR', contentType: 'image/gif' })).toBe(
        'contentType must be one of image/png, image/jpeg, image/webp.',
      );
    });
  });
});
