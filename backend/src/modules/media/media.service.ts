// Contains the purpose -> bucket/path/role business rule and calls the storage provider.
// Matches docs/api_design.md §5A.
import { randomUUID } from 'node:crypto';
import { createUploadUrl, getPublicUrl } from '../../integrations/storage/storage.provider.js';
import type { Role } from '../users/user.model.js';
import type { UploadUrlRequest } from './media.schemas.js';
import type { UploadUrlResponseDto } from './media.dto.js';

const EXPIRES_IN_SECONDS = 60;

// Keyed by the zod-inferred contentType union, so adding a content type to
// media.schemas.ts without adding its extension here fails to compile.
const EXTENSION_BY_CONTENT_TYPE: Record<UploadUrlRequest['contentType'], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

interface RequestUploadUrlInput extends UploadUrlRequest {
  userId: string;
  role: Role;
}

function forbiddenError(message: string): Error {
  const error: Error = new Error(message);
  error.statusCode = 403;
  return error;
}

// The bucket name doubles as the path's leading folder, per api_design.md
// §5A's table (e.g. bucket `avatars`, path `avatars/<userId>/<uuid>.<ext>`).
function resolveBucket(purpose: UploadUrlRequest['purpose'], role: Role): string {
  if (purpose === 'LISTING_IMAGE') {
    if (role !== 'DONOR') {
      throw forbiddenError('Only Donors can upload listing images.');
    }
    return 'listings';
  }

  return 'avatars';
}

/**
 * Resolves a `purpose` to a Supabase Storage bucket/path (api_design.md
 * §5A's table), enforcing the Donor-only rule for `LISTING_IMAGE`, then
 * returns a signed upload URL plus the eventual public `mediaUrl` the caller
 * should persist (via `PATCH /users/me` or `POST /listings`) once the upload
 * completes.
 *
 * @throws {Error} with `.statusCode = 403` when `purpose` is `LISTING_IMAGE`
 * and `role` is not `DONOR`.
 */
async function requestUploadUrl({
  purpose,
  contentType,
  userId,
  role,
}: RequestUploadUrlInput): Promise<UploadUrlResponseDto> {
  const bucket = resolveBucket(purpose, role);
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
  const path = `${bucket}/${userId}/${randomUUID()}.${extension}`;

  const { uploadUrl, token, path: storedPath } = await createUploadUrl({ bucket, path });
  const { url: mediaUrl } = getPublicUrl({ bucket, path: storedPath });

  return { uploadUrl, path: storedPath, token, mediaUrl, expiresIn: EXPIRES_IN_SECONDS };
}

export { requestUploadUrl };
