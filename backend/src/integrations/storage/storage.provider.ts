// Wraps future image/file storage providers for avatars and food listing photos.
async function uploadFile(file) {
  return {
    provider: 'placeholder-storage-provider',
    url: file?.url || '',
  };
}

export { uploadFile };
