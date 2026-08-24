import { useState } from 'react';
import { mediaService, uploadFileToSignedUrl } from '@/shared/services/media.service';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function useAvatarUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>();

  async function selectFile(file: File) {
    setUploadError(undefined);
    setIsRemoved(false);

    // 1. Client-side validation
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Please upload a PNG, JPEG, or WEBP image.');
      return;
    }

    // 2. Live preview immediately
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    setIsUploading(true);

    try {
      // 3. Upload flow
      const response = await mediaService.requestUploadUrl('AVATAR', file.type);
      if (!response.ok || !response.data) {
        setUploadError('Failed to prepare image upload. Please try again.');
        return;
      }

      const { uploadUrl, mediaUrl: pendingMediaUrl } = response.data;

      const uploadSuccess = await uploadFileToSignedUrl(uploadUrl, file);
      
      if (uploadSuccess) {
        // Store for parent form to grab on save
        setMediaUrl(pendingMediaUrl);
      } else {
        setUploadError('Failed to upload image. Please try again.');
      }
    } catch (err) {
      setUploadError('An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  }

  function clear(removed: boolean) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMediaUrl(null);
    setIsRemoved(removed);
    setUploadError(undefined);
  }

  const removeAvatar = () => clear(true);
  const reset = () => clear(false);

  return {
    previewUrl,
    mediaUrl,
    isRemoved,
    isUploading,
    uploadError,
    selectFile,
    removeAvatar,
    reset,
  };
}
