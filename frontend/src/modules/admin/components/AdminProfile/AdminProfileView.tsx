import { UserRound } from 'lucide-react';
import { DisplayField } from '@/shared/components/DisplayField/DisplayField';
import { getAvatarDisplayUrl } from '@/shared/utils/avatar';
import type { AdminUserDTO } from '@/types/api';

interface AdminProfileViewProps {
  profile: AdminUserDTO;
}
/** Displays an Admin profile without Recipient subscription affordances. */
export function AdminProfileView({ profile }: AdminProfileViewProps) {
  const avatarUrl = getAvatarDisplayUrl(profile.avatarUrl);

  return (
    <>
      <div className="flex flex-col items-center gap-4 border-b border-admin-border/40 pb-8 sm:flex-row">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-admin-primary/5 ring-2 ring-admin-primary/15">
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${profile.username}'s avatar`} className="size-full object-cover" />
          ) : (
            <UserRound aria-hidden="true" className="size-10 text-admin-primary/55" />
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-3 sm:justify-start">
          <span className="truncate text-xl font-bold text-admin-text">{profile.username}</span>
          <span className="rounded-full bg-admin-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-admin-primary">
            Admin
          </span>
        </div>
      </div>

      <div className="space-y-6 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DisplayField label="Username" value={profile.username} />
          <DisplayField label="Email Address" value={profile.email} />
        </div>
        <DisplayField label="Password" value="••••••••••••" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DisplayField label="Country" value={profile.country} />
          <DisplayField label="City" value={profile.city} />
        </div>
      </div>
    </>
  );
}
