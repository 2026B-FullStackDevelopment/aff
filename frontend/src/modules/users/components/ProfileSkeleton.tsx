/**
 * ProfileSkeleton
 *
 * Loading placeholder for ProfilePage, shaped to match ProfileView's real
 * layout (avatar circle + name/badge, a 2-column field grid, a full-width
 * password row, a second 2-column grid, and a bottom action-button row) so
 * swapping in real content doesn't cause a layout jump.
 *
 * `isDonor` controls two things: the card border color (must match the
 * theme the real card will render in) and whether to reserve space for the
 * Donor-only rows (Company Name, Address) — both are decided from the
 * cached session user (see ProfilePage.tsx) so this renders correctly on
 * first paint, before the fresh profile fetch resolves.
 */
import { cn } from '@/shared/utils';

interface ProfileSkeletonProps {
  isDonor: boolean;
  className?: string;
}

function FieldPlaceholder() {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="h-11 w-full rounded-lg border border-slate-100 bg-slate-50" />
    </div>
  );
}

export function ProfileSkeleton({ isDonor, className }: ProfileSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-6 shadow-sm sm:p-8',
        isDonor ? 'border-[#E4E2E1]' : 'border-[#e9f5ee]',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="animate-pulse">
        {/* Avatar section */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-8">
          <div className="size-24 shrink-0 rounded-full bg-slate-200" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="h-6 w-28 rounded-full bg-slate-100" />
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-6 py-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FieldPlaceholder />
            <FieldPlaceholder />
          </div>

          {isDonor && (
            <div className="pt-2">
              <FieldPlaceholder />
            </div>
          )}

          <div className="pt-2">
            <FieldPlaceholder />
          </div>

          <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
            <FieldPlaceholder />
            <FieldPlaceholder />
          </div>

          {isDonor && (
            <div className="pt-2">
              <FieldPlaceholder />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-4 border-t border-slate-100 pt-6">
          <div className="h-10 w-28 rounded-lg bg-slate-100" />
          <div className="h-10 w-32 rounded-lg bg-slate-100" />
        </div>
      </div>

      <span className="sr-only">Loading profile…</span>
    </div>
  );
}

export default ProfileSkeleton;
