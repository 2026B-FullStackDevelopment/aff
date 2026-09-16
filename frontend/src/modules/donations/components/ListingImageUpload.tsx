import { useRef, type ChangeEvent } from 'react';
import {
  ImagePlus,
  LoaderCircle,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { ACCEPTED_IMAGE_TYPES } from '@/shared/services/media.service';
import { cn } from '@/shared/utils';

interface ListingImageUploadProps {
  currentImageUrl?: string | null;
  previewUrl?: string | null;
  imageAlt?: string;
  helperText?: string;
  error?: string;
  isUploading?: boolean;
  readOnly?: boolean;
  className?: string;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
}

// Displays and optionally updates a food listing image.
export function ListingImageUpload({
  currentImageUrl = null,
  previewUrl = null,
  imageAlt = 'Food listing preview',
  helperText = 'PNG, JPEG or WebP image.',
  error,
  isUploading = false,
  readOnly = false,
  className,
  onFileSelected,
  onRemove,
}: ListingImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl ?? currentImageUrl;
  const isDisabled = isUploading || readOnly;

  const helperId = helperText
    ? 'listing-image-helper'
    : undefined;

  const errorId = error
    ? 'listing-image-error'
    : undefined;

  const describedBy = [helperId, errorId]
    .filter(Boolean)
    .join(' ') || undefined;

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file || readOnly) {
      return;
    }

    onFileSelected(file);

    // Allows the same file to be selected again.
    event.target.value = '';
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-3',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        aria-label="Upload food listing image"
        aria-describedby={describedBy}
        className="sr-only"
        disabled={isDisabled}
        onChange={handleFileChange}
      />

      {displayUrl && (
        <div
          className={cn(
            'relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-lg',
            'border border-[#E4E2E1] bg-slate-100',
          )}
        >
          <img
            src={displayUrl}
            alt={imageAlt}
            className="size-full object-cover"
          />

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <LoaderCircle
                className="size-7 animate-spin text-[#805300]"
                aria-hidden="true"
              />

              <span className="sr-only">
                Uploading listing image
              </span>
            </div>
          )}
        </div>
      )}

      {!displayUrl && (
        <div className="flex min-h-28 w-full max-w-md items-center justify-center rounded-lg border border-dashed border-[#C1C8C2] bg-slate-50">
          <ImagePlus
            className="size-8 text-slate-400"
            aria-hidden="true"
          />

          <span className="sr-only">
            No listing image
          </span>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'h-10 border-[#E4E2E1] bg-[#FFF6E3] px-4',
              'text-xs font-bold uppercase tracking-wider text-[#805300]',
              'transition-all duration-200 ease-out',
              'hover:border-[#805300] hover:bg-[#805300]/10 hover:shadow-md',
              'active:scale-[0.98]',
            )}
          >
            {isUploading ? (
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Upload
                className="size-4"
                aria-hidden="true"
              />
            )}

            {displayUrl
              ? 'Replace Picture'
              : 'Upload Picture'}
          </Button>

          {displayUrl && (
            <Button
              type="button"
              variant="ghost"
              disabled={isUploading}
              onClick={onRemove}
              className="h-10 px-3 text-red-700 transition-all duration-200 ease-out hover:bg-red-50 hover:text-red-800 active:scale-[0.98]"
            >
              <Trash2
                className="size-4"
                aria-hidden="true"
              />
              Remove
            </Button>
          )}
        </div>
      )}

      {helperText && (
        <p
          id={helperId}
          className="text-xs text-[#6B7280]"
        >
          {helperText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-xs font-semibold text-red-600 animate-in fade-in-50 duration-200"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default ListingImageUpload;