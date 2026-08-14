// Validates the shared media upload request body.
// Matches docs/api_design.md §5A.
import { z } from 'zod';

/**
 * Validates a `POST /media/upload-url` request body: `{ purpose, contentType }`.
 * `purpose` decides the bucket, path, and required role server-side (see
 * `media.service.ts`) — the client never picks a bucket directly. `contentType`
 * is restricted to the image types this endpoint's Supabase Storage buckets
 * accept.
 */
const uploadUrlRequestSchema = z.object({
  purpose: z.enum(['AVATAR', 'LISTING_IMAGE'], {
    message: 'purpose must be AVATAR or LISTING_IMAGE.',
  }),
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp'], {
    message: 'contentType must be one of image/png, image/jpeg, image/webp.',
  }),
});

type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;

export { uploadUrlRequestSchema };
export type { UploadUrlRequest };
