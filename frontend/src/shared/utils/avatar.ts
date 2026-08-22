/**
 * Transforms a raw Supabase Storage object URL into a render URL with
 * on-the-fly resizing. Centralised here so every component that displays
 * an avatar uses the same transform rather than deriving it inline.
 */

export const AVATAR_DISPLAY_SIZE = 128;

/**
 * Returns a resized Supabase render URL, or null if `avatarUrl` is absent.
 *
 * @param avatarUrl - Raw `avatarUrl` from the user DTO (may be null).
 * @param size      - Pixel width/height for the square crop (default 128).
 */
export function getAvatarDisplayUrl(
  avatarUrl: string | null,
  size = AVATAR_DISPLAY_SIZE,
): string | null {
  if (!avatarUrl) return null;
  const transformed = avatarUrl.replace('/object/public/', '/render/image/public/');
  return `${transformed}?width=${size}&height=${size}&resize=cover`;
}
