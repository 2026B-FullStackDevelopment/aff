import { Award, UserRound } from 'lucide-react';
import { DisplayField } from '@/shared/components/DisplayField/DisplayField';
import { getAvatarDisplayUrl } from '@/shared/utils/avatar';
import { cn } from '@/shared/utils';

interface ProfileViewProps {
  profile: any;
  isDonor: boolean;
  isPremium: boolean;
}

export function ProfileView({ profile, isDonor, isPremium }: ProfileViewProps) {
  return (
    <>
      {/* Avatar Section */}
      <div className="pb-8 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 size-24 rounded-full overflow-hidden ring-2 ring-slate-200 bg-slate-100 flex items-center justify-center">
            {profile.avatarUrl ? (
              <img
                src={getAvatarDisplayUrl(profile.avatarUrl)!}
                alt={`${profile.username}'s avatar`}
                className="size-full object-cover"
              />
            ) : (
              <UserRound className="size-10 text-slate-400" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#1B1C1C] truncate">{profile.username}</span>
            {!isDonor ? (
              <div className="flex items-center gap-2 ml-2">
                <span className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                  isPremium ? 'bg-[#3D6852]/15 text-[#3D6852]' : 'bg-slate-100 text-slate-600'
                )}>
                  {isPremium ? 'Premium Recipient' : 'Standard Recipient'}
                </span>
                {isPremium && <Award className="size-5 text-[#3D6852]" />}
              </div>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#805300]/10 text-[#805300] ml-2">
                Donor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form Fields Section */}
      <div className="py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DisplayField label="Username" value={profile.username} />
          <DisplayField label="Email Address" value={profile.email} />
        </div>

        {isDonor && (
          <div className="pt-2">
            <DisplayField label="Company Name" value={profile.role === 'DONOR' ? profile.companyName : ''} />
          </div>
        )}

        <div className="pt-2">
          <DisplayField label="Password" value="••••••••••••" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <DisplayField label="Country" value={profile.country || 'Vietnam'} />
          <DisplayField label="City" value={profile.city} />
        </div>

        {isDonor && (
          <div className="pt-2">
            <DisplayField
              label="Address"
              value={profile.role === 'DONOR' ? profile.addressText : ''}
            />
          </div>
        )}
      </div>
    </>
  );
}
