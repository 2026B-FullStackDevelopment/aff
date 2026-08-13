// Shapes the POST /media/upload-url response.
// Matches docs/api_design.md §5A.

/**
 * Response body for `POST /media/upload-url`. `uploadUrl`/`token` are used by
 * the client to `PUT` the raw image bytes directly to Supabase Storage;
 * `mediaUrl` is what the client persists afterward via `PATCH /users/me` or
 * `POST /listings`.
 */
interface UploadUrlResponseDto {
  uploadUrl: string;
  path: string;
  token: string;
  mediaUrl: string;
  expiresIn: number;
}

export type { UploadUrlResponseDto };
