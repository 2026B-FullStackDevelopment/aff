import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createSignedUploadUrlMock, getPublicUrlMock, fromMock, createClientMock } = vi.hoisted(() => {
  const createSignedUploadUrlMock = vi.fn();
  const getPublicUrlMock = vi.fn();
  const fromMock = vi.fn(() => ({
    createSignedUploadUrl: createSignedUploadUrlMock,
    getPublicUrl: getPublicUrlMock,
  }));
  const createClientMock = vi.fn(() => ({ storage: { from: fromMock } }));
  return { createSignedUploadUrlMock, getPublicUrlMock, fromMock, createClientMock };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

vi.mock('../../../src/config/env.js', () => ({
  env: { supabaseUrl: 'https://project.supabase.co', supabaseServiceKey: 'service-key' },
}));

import { createUploadUrl, getPublicUrl } from '../../../src/integrations/storage/storage.provider.js';

describe('createUploadUrl', () => {
  beforeEach(() => {
    createSignedUploadUrlMock.mockReset();
    fromMock.mockClear();
  });

  it('returns a signed upload URL and token for the given bucket/path', async () => {
    createSignedUploadUrlMock.mockResolvedValue({
      data: { path: 'user1.png', token: 'sign-token', signedUrl: 'https://project.supabase.co/storage/v1/upload/sign/avatars/user1.png?token=sign-token' },
      error: null,
    });

    const result = await createUploadUrl({ bucket: 'avatars', path: 'user1.png' });

    expect(fromMock).toHaveBeenCalledWith('avatars');
    expect(createSignedUploadUrlMock).toHaveBeenCalledWith('user1.png');
    expect(result).toEqual({
      provider: 'supabase',
      path: 'user1.png',
      uploadUrl: 'https://project.supabase.co/storage/v1/upload/sign/avatars/user1.png?token=sign-token',
      token: 'sign-token',
    });
  });

  it('throws when Supabase fails to create a signed upload URL', async () => {
    createSignedUploadUrlMock.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } });

    await expect(createUploadUrl({ bucket: 'avatars', path: 'user1.png' })).rejects.toThrow(/Bucket not found/);
  });
});

describe('getPublicUrl', () => {
  beforeEach(() => {
    getPublicUrlMock.mockReset();
    fromMock.mockClear();
  });

  it('returns the public URL for the given bucket/path', () => {
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://project.supabase.co/storage/v1/object/public/avatars/user1.png' },
    });

    const result = getPublicUrl({ bucket: 'avatars', path: 'user1.png' });

    expect(fromMock).toHaveBeenCalledWith('avatars');
    expect(getPublicUrlMock).toHaveBeenCalledWith('user1.png');
    expect(result).toEqual({
      provider: 'supabase',
      path: 'user1.png',
      url: 'https://project.supabase.co/storage/v1/object/public/avatars/user1.png',
    });
  });
});
