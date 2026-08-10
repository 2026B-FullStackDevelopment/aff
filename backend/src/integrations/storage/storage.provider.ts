// Uploads avatar/listing images to Supabase Storage and returns their public URL.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

let client: SupabaseClient | undefined;

function getClient() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    throw new Error('Supabase storage is not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceKey);
  }
  return client;
}

async function uploadFile(file: { bucket: string; path: string; buffer: Buffer; contentType?: string }) {
  const bucket = getClient().storage.from(file.bucket);

  const { error } = await bucket.upload(file.path, file.buffer, {
    contentType: file.contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
  }

  const { data } = bucket.getPublicUrl(file.path);

  return {
    provider: 'supabase',
    path: file.path,
    url: data.publicUrl,
  };
}

export { uploadFile };
