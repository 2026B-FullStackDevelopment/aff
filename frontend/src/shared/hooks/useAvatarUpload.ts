import { useEffect, useState } from 'react';
import { mediaService, uploadFileToSignedUrl } from '@/shared/services/media.service';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Owns the shared signed-upload flow and immediate local avatar preview. */
export function useAvatarUpload() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();

  // Cleanup uploaded file URL when the component unmounts
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Handle file selection and upload
  async function selectFile(file: File) {
    setUploadError(undefined);
    setIsRemoved(false);

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Invalid file type. Please upload a PNG, JPEG, or WEBP image.');
      return;
    }

    // Create local preview URL for immediate display
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return localPreviewUrl;
    });
    setIsUploading(true);

    try {
      // Request upload URL from backend
      const response = await mediaService.requestUploadUrl('AVATAR', file.type);
      if (!response.ok || !response.data) {
        setUploadError('Failed to prepare image upload. Please try again.');
        return;
      }

      const uploaded = await uploadFileToSignedUrl(response.data.uploadUrl, file);
      if (!uploaded) {
        setUploadError('Failed to upload image. Please try again.');
        return;
      }

      setMediaUrl(response.data.mediaUrl);
    } catch {
      setUploadError('An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  }

  // Reset upload state
  function clear(removed: boolean) {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setMediaUrl(null);
    setIsRemoved(removed);
    setUploadError(undefined);
  }

  return {
    previewUrl,
    mediaUrl,
    isRemoved,
    isUploading,
    uploadError,
    selectFile,
    removeAvatar: () => clear(true),
    reset: () => clear(false),
  };
}

