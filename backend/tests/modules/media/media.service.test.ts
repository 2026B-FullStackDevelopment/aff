import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createUploadUrlMock, getPublicUrlMock } = vi.hoisted(() => ({
  createUploadUrlMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
}));

vi.mock('../../../src/integrations/storage/storage.provider.js', () => ({
  createUploadUrl: createUploadUrlMock,
  getPublicUrl: getPublicUrlMock,
}));

import { requestUploadUrl } from '../../../src/modules/media/media.service.js';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

describe('media.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUploadUrlMock.mockImplementation(async ({ bucket, path }: { bucket: string; path: string }) => ({
      provider: 'supabase',
      path,
      uploadUrl: `https://project.supabase.co/storage/v1/upload/sign/${bucket}/${path}?token=sign-token`,
      token: 'sign-token',
    }));
    getPublicUrlMock.mockImplementation(({ bucket, path }: { bucket: string; path: string }) => ({
      provider: 'supabase',
      path,
      url: `https://project.supabase.co/storage/v1/object/public/${bucket}/${path}`,
    }));
  });

  describe('requestUploadUrl', () => {
    it('builds an avatars/<userId>/<uuid>.<ext> path for AVATAR from any role', async () => {
      const result = await requestUploadUrl({
        purpose: 'AVATAR',
        contentType: 'image/png',
        userId: 'user1',
        role: 'RECIPIENT',
      });

      expect(createUploadUrlMock).toHaveBeenCalledTimes(1);
      const { bucket, path } = createUploadUrlMock.mock.calls[0][0];
      expect(bucket).toBe('avatars');
      expect(path).toMatch(new RegExp(`^avatars/user1/${UUID_RE.source}\\.png$`));
      expect(result).toEqual({
        uploadUrl: expect.stringContaining('avatars'),
        path,
        token: 'sign-token',
        mediaUrl: expect.stringContaining('avatars'),
        expiresIn: 60,
      });
    });

    it('builds a listings/<donorId>/<uuid>.<ext> path for LISTING_IMAGE from a DONOR', async () => {
      const result = await requestUploadUrl({
        purpose: 'LISTING_IMAGE',
        contentType: 'image/webp',
        userId: 'donor1',
        role: 'DONOR',
      });

      const { bucket, path } = createUploadUrlMock.mock.calls[0][0];
      expect(bucket).toBe('listings');
      expect(path).toMatch(new RegExp(`^listings/donor1/${UUID_RE.source}\\.webp$`));
      expect(result.expiresIn).toBe(60);
    });

    it('rejects LISTING_IMAGE from a non-Donor with a 403, without calling the storage provider', async () => {
      await expect(
        requestUploadUrl({ purpose: 'LISTING_IMAGE', contentType: 'image/png', userId: 'user1', role: 'RECIPIENT' }),
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(createUploadUrlMock).not.toHaveBeenCalled();
      expect(getPublicUrlMock).not.toHaveBeenCalled();
    });

    it.each([
      ['image/png', 'png'],
      ['image/jpeg', 'jpg'],
      ['image/webp', 'webp'],
    ])('maps contentType %s to a .%s extension', async (contentType, ext) => {
      await requestUploadUrl({
        purpose: 'AVATAR',
        contentType: contentType as 'image/png' | 'image/jpeg' | 'image/webp',
        userId: 'user1',
        role: 'RECIPIENT',
      });

      const { path } = createUploadUrlMock.mock.calls[0][0];
      expect(path.endsWith(`.${ext}`)).toBe(true);
    });
  });
});
