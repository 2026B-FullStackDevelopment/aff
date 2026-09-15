// Media upload types.
// Corresponds to API Design §5A (Media Module — POST /media/upload-url).

export type UploadMediaPurpose = 'AVATAR' | 'LISTING_IMAGE';

export interface UploadUrlResponseDto {
  uploadUrl: string;
  path: string;
  token: string;
  mediaUrl: string;
  expiresIn: number;
}
