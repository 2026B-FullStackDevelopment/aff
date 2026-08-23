import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Award, Medal, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useProfileEditForm } from '../hooks/useProfileEditForm';
import { Button } from '@/shared/components/Button/Button';
import RecipientTopNavigation from '@/shared/components/RecipientTopNavigation/RecipientTopNavigation';
import DonorTopNavigation from '@/shared/components/DonorTopNavigation/DonorTopNavigation';
import AvatarUpload from '@/shared/components/AvatarUpload/AvatarUpload';
import { getAvatarDisplayUrl } from '@/shared/utils/avatar';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { IconField } from '@/shared/components/IconField/IconField';
import { PasswordField } from '@/shared/components/PasswordField/PasswordField';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import { cn } from '@/shared/utils';
import type { ThemeRole } from '@/shared/components/AvatarUpload/AvatarUpload';
import { VIETNAM_PROVINCES } from '@/shared/constants/locations';

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, isLoading, error: loadError, refetch } = useProfile();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

  // For Recipients, default to view mode. For Donors, the design implies edit mode directly.
  const isDonor = profile?.role === 'DONOR';
  const [isEditing, setIsEditing] = useState(isDonor);

  const {
    form,
    errors,
    isSubmitting,
    submitError,
    updateField,
    handleSubmit,
    avatarUpload,
  } = useProfileEditForm(profile);

  async function handleSignOut() {
    await logout();
    navigate('/login');
  }

  function handleSave() {
    handleSubmit(() => {
      refetch(); // hydrate any tier/backend-transformed fields
      if (!isDonor) {
        setIsEditing(false); // return to view mode on success
      }
    });
  }

  function handleCancel() {
    avatarUpload.reset();
    // seed form back to original profile state
    if (profile) {
      updateField('username', profile.username || '');
      updateField('city', profile.city || '');
      updateField('country', profile.country || '');
      updateField('companyName', profile.role === 'DONOR' ? (profile.companyName || '') : '');
      updateField('addressText', profile.role === 'DONOR' ? (profile.addressText || '') : '');
    }
    if (!isDonor) setIsEditing(false);
  }

  // --- Render helpers ---

  const theme: ThemeRole = isDonor ? 'donor' : 'recipient';

  const isPremium = profile?.role === 'RECIPIENT' && profile.tier === 'PREMIUM';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F8]">
        {/* Basic nav skeleton */}
        <header className="h-16 border-b bg-white" />
        <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="h-64 rounded-xl border border-slate-200 bg-white" />
          </div>
        </main>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="min-h-screen bg-[#FBF9F8]">
        <header className="h-16 border-b bg-white" />
        <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
          <FormErrorAlert message={loadError || 'Profile data is unavailable.'} />
        </main>
      </div>
    );
  }

  // --- Render proper view ---

  return (
    <div className={cn('min-h-screen', isDonor ? 'bg-[#FBF9F8]' : 'bg-gradient-to-b from-[#f5faf7] to-[#e9f5ee]')}>
      {/* Navigation */}
      {isDonor ? (
        <DonorTopNavigation
          avatarUrl={avatarUpload.previewUrl ?? getAvatarDisplayUrl(profile.avatarUrl)}
          avatarAlt={profile.username}
          onNotificationsClick={() => {}}
        />
      ) : (
        <RecipientTopNavigation
          avatarUrl={avatarUpload.previewUrl ?? getAvatarDisplayUrl(profile.avatarUrl)}
          avatarAlt={profile.username}
          onNotificationsClick={() => {}}
          isPremium={isPremium}
        />
      )}

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Optional Upgrade Banner for Standard Recipient in View mode */}
        {!isEditing && !isPremium && !isDonor && showUpgradeBanner && (
          <div className="bg-[#2E5A47] text-white p-6 sm:p-8 rounded-xl relative shadow-sm">
            <div className="pr-8">
              <div className="mb-2">
                <span className="inline-block bg-white/20 px-2 py-0.5 rounded text-xs font-semibold tracking-wider uppercase">
                  Premium Advantage
                </span>
              </div>
              <h2 className="text-xl font-bold mb-1">Upgrade to Premium</h2>
              <p className="text-[#e9f5ee] mb-4">Unlock priority access to donations and detailed impact reports.</p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">$5.00</span>
                <span className="text-[#e9f5ee] text-sm">/month</span>
                <Button
                  variant="outline"
                  className="ml-auto bg-white text-[#2E5A47] hover:bg-slate-50 border-white hover:text-[#2E5A47]"
                  onClick={() => navigate('/subscription')}
                >
                  UPGRADE NOW
                </Button>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradeBanner(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
              aria-label="Dismiss banner"
            >
              <X className="size-5" />
            </button>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1B1C1C]">Profile Management</h1>
            <p className="text-slate-600 mt-1">
              Update your details and manage how you appear in the AFF community.
            </p>
          </div>
          {/* Notification Preference button for Premium Recipient view mode */}
          {!isEditing && isPremium && (
            <Button
              variant="outline"
              className="bg-[#3D6852]/10 text-[#3D6852] hover:bg-[#3D6852]/20 border-transparent font-semibold h-10"
              onClick={() => navigate('/subscription')}
            >
              <BellIcon className="size-4 mr-2" />
              Create Notification Preference
            </Button>
          )}
        </div>

        {/* Profile Card */}
        <div className={cn(
          'bg-white rounded-xl shadow-sm p-6 sm:p-8 border',
          isDonor ? 'border-[#E4E2E1]' : 'border-[#e9f5ee]'
        )}>
          {submitError && (
            <div className="mb-6">
              <FormErrorAlert message={submitError} />
            </div>
          )}

          {/* Avatar Section */}
          <div className="pb-8 border-b border-slate-100">
            {isEditing ? (
              <AvatarUpload
                currentAvatarUrl={profile.avatarUrl}
                previewUrl={avatarUpload.previewUrl}
                username={profile.username}
                tierBadge={
                  !isDonor && (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                        isPremium ? 'bg-[#3D6852]/15 text-[#3D6852]' : 'bg-slate-100 text-slate-600'
                      )}>
                        {isPremium ? 'Premium Recipient' : 'Standard Recipient'}
                      </span>
                      {isPremium && <Award className="size-5 text-[#3D6852]" />}
                    </div>
                  )
                }
                onFileSelected={avatarUpload.selectFile}
                onRemove={avatarUpload.reset}
                isUploading={avatarUpload.isUploading}
                uploadError={avatarUpload.uploadError}
                theme={theme}
              />
            ) : (
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
                  {!isDonor && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                        isPremium ? 'bg-[#3D6852]/15 text-[#3D6852]' : 'bg-slate-100 text-slate-600'
                      )}>
                        {isPremium ? 'Premium Recipient' : 'Standard Recipient'}
                      </span>
                      {isPremium && <Medal className="size-5 text-[#3D6852]" />}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Fields Section */}
          <div className="py-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <IconField
                id="username"
                name="username"
                label="Username"
                type="text"
                theme={theme}
                value={isEditing ? form.username : profile.username}
                onChange={(e) => updateField('username', e.target.value)}
                error={errors.username}
                disabled={!isEditing || isSubmitting}
                readOnly={!isEditing}
              />

              {isDonor && (
                <IconField
                  id="companyName"
                  name="companyName"
                  label="Company Name"
                  type="text"
                  theme={theme}
                  value={isEditing ? form.companyName : (profile.role === 'DONOR' ? profile.companyName : '')}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  error={errors.companyName}
                  disabled={!isEditing || isSubmitting}
                  readOnly={!isEditing}
                />
              )}

              <IconField
                id="email"
                name="email"
                label="Email Address"
                type="email"
                theme={theme}
                value={profile.email}
                disabled
                readOnly
              />
            </div>

            <div className="pt-2">
              <PasswordField
                id="password"
                name="password"
                label="Password"
                theme={theme}
                value="••••••••••••"
                onChange={() => {}}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <SelectField
                id="country"
                name="country"
                label="Country"
                theme={theme}
                value={isEditing ? form.country : profile.country}
                onChange={(e) => updateField('country', e.target.value)}
                options={['Vietnam']}
                error={errors.country}
                disabled={!isEditing || isSubmitting}
              />
              <SelectField
                id="city"
                name="city"
                label="City"
                theme={theme}
                value={isEditing ? form.city : profile.city}
                onChange={(e) => updateField('city', e.target.value)}
                options={VIETNAM_PROVINCES}
                error={errors.city}
                disabled={!isEditing || isSubmitting}
              />
            </div>
            
            {isDonor && (
              <div className="pt-2">
                 <IconField
                    id="addressText"
                    name="addressText"
                    label="Address"
                    type="text"
                    theme={theme}
                    value={isEditing ? form.addressText : (profile.role === 'DONOR' ? profile.addressText : '')}
                    onChange={(e) => updateField('addressText', e.target.value)}
                    error={errors.addressText}
                    disabled={!isEditing || isSubmitting}
                    readOnly={!isEditing}
                  />
              </div>
            )}
          </div>

          {/* CTA Row */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting || avatarUpload.isUploading}
                  className="font-bold border-slate-300 text-[#1B1C1C] hover:bg-slate-50 min-w-24 h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting || avatarUpload.isUploading}
                  className={cn(
                    'font-bold min-w-36 h-10',
                    isDonor 
                      ? 'bg-[#805300] hover:bg-[#694400] text-white' 
                      : 'bg-[#3D6852] hover:bg-[#2E5A47] text-white'
                  )}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleSignOut}
                  className="font-bold bg-red-600 hover:bg-red-700 text-white min-w-28 h-10"
                >
                  Sign out
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    'font-bold min-w-32 h-10 text-white',
                    isDonor
                      ? 'bg-[#805300] hover:bg-[#694400]'
                      : 'bg-[#3D6852] hover:bg-[#2E5A47]'
                  )}
                >
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
