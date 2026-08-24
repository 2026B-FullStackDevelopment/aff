import { useRef } from 'react';
import { Upload, UserRound } from 'lucide-react';
import { cn } from '@/shared/utils';
import { getAvatarDisplayUrl } from '@/shared/utils/avatar';

export type ThemeRole = 'recipient' | 'donor';

interface AvatarUploadProps {
  /** Current persisted avatar URL from the profile DTO */
  currentAvatarUrl: string | null;
  /** Blob URL produced by useAvatarUpload for live preview */
  previewUrl: string | null;
  /** True if the user clicked remove avatar */
  isRemoved?: boolean;
  /** Display name shown next to the avatar */
  username: string;
  /** Badge element (e.g. "PREMIUM RECIPIENT" pill) rendered beside the username */
  tierBadge?: React.ReactNode;
  /** Called when the user selects a valid file via the file input */
  onFileSelected: (file: File) => void;
  /** Called when the user clicks "Remove" */
  onRemove: () => void;
  /** True while the file is being uploaded to Supabase */
  isUploading: boolean;
  /** Inline error from useAvatarUpload (invalid type, upload failure, etc.) */
  uploadError?: string;
  /** Colour theme — drives Upload button and focus ring colour */
  theme: ThemeRole;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const themeUploadStyles: Record<ThemeRole, string> = {
  recipient:
    'border-[#3D6852] text-[#3D6852] hover:bg-[#3D6852]/10 focus-visible:ring-[#3D6852]/30',
  donor:
    'border-[#805300] text-[#805300] hover:bg-[#805300]/10 focus-visible:ring-[#805300]/30',
};

/**
 * Presentational avatar editor — renders the current/preview image, an
 * "Upload Profile Image" trigger, and a "Remove" button.
 *
 * State (selected file, upload progress, preview URL) lives in the parent's
 * useAvatarUpload hook; this component is purely a display layer.
 */
export function AvatarUpload({
  currentAvatarUrl,
  previewUrl,
  isRemoved = false,
  username,
  tierBadge,
  onFileSelected,
  onRemove,
  isUploading,
  uploadError,
  theme,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displaySrc = isRemoved ? null : (previewUrl ?? getAvatarDisplayUrl(currentAvatarUrl));


  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelected(file);
    // Reset so re-selecting the same file still fires onChange
    e.target.value = '';
  }

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
      {/* Avatar circle */}
      <div
        className={cn(
          'relative shrink-0 size-24 rounded-full overflow-hidden ring-2 ring-slate-200 bg-slate-100 flex items-center justify-center',
          isUploading && 'opacity-60',
        )}
        aria-hidden="true"
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={`${username}'s avatar`}
            className="size-full object-cover"
          />
        ) : (
          <UserRound className="size-10 text-slate-400" />
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <svg
              className="size-6 animate-spin text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Name + controls */}
      <div className="flex flex-col gap-2 min-w-0 items-center sm:items-start">
        {/* Username + optional tier badge */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="text-xl font-bold text-[#1B1C1C] truncate">{username}</span>
          {tierBadge}
        </div>

        {/* Hidden native file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          aria-label="Upload profile image"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {/* Visible upload trigger + remove row */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ease-out',
              'focus-visible:outline-none focus-visible:ring-2',
              themeUploadStyles[theme],
              isUploading && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Upload className="size-3.5" aria-hidden="true" />
            Upload Profile Image
          </button>

          {(displaySrc) && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isUploading}
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          )}
        </div>

        {/* Upload error */}
        {uploadError && (
          <p className="text-xs font-semibold text-red-600 animate-in fade-in-50 duration-200">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}

export default AvatarUpload;
