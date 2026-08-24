import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type { UploadMediaPurpose, UploadUrlResponseDto } from '@/types/api';

export const mediaService = {
  /**
   * Requests a short-lived signed URL for uploading a file directly to Supabase.
   */
  requestUploadUrl: (purpose: UploadMediaPurpose, contentType: string) =>
    httpClient.post<UploadUrlResponseDto>(API_ROUTES.media.uploadUrl, {
      purpose,
      contentType,
    }),
};

/**
 * Uploads a file directly to a signed URL.
 * Bypasses httpClient because Supabase expects raw bytes (not JSON)
 * and rejects our JWT.
 */
export async function uploadFileToSignedUrl(
  uploadUrl: string,
  file: File,
): Promise<boolean> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  return response.ok;
}
