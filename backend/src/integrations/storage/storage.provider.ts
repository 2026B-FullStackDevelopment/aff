// Generates Supabase Storage presigned upload URLs for avatars/listing images.
// Clients upload bytes directly to Supabase using the returned URL — they never pass through the backend.
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

async function createUploadUrl({ bucket, path }: { bucket: string; path: string }) {
  const { data, error } = await getClient().storage.from(bucket).createSignedUploadUrl(path);

  if (error) {
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }

  return {
    provider: 'supabase',
    path: data.path,
    uploadUrl: data.signedUrl,
    token: data.token,
  };
}

function getPublicUrl({ bucket, path }: { bucket: string; path: string }) {
  const { data } = getClient().storage.from(bucket).getPublicUrl(path);

  return {
    provider: 'supabase',
    path,
    url: data.publicUrl,
  };
}

export { createUploadUrl, getPublicUrl };
