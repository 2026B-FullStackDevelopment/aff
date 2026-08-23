import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Award, Medal, UserRound, CheckCircle2, Bell } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useProfileEditForm } from '../hooks/useProfileEditForm';
import { Button } from '@/shared/components/Button/Button';
import RecipientTopNavigation from '@/shared/components/RecipientTopNavigation/RecipientTopNavigation';
import DonorTopNavigation from '@/shared/components/DonorTopNavigation/DonorTopNavigation';
import AvatarUpload from '@/shared/components/AvatarUpload/AvatarUpload';
import AddressAutocomplete from '@/shared/components/AddressAutocomplete/AddressAutocomplete';
import { getAvatarDisplayUrl } from '@/shared/utils/avatar';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { IconField } from '@/shared/components/IconField/IconField';
import { PasswordField } from '@/shared/components/PasswordField/PasswordField';
import { PasswordStrength } from '@/shared/components/PasswordStrength/PasswordStrength';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import { DisplayField } from '@/shared/components/DisplayField/DisplayField';
import { cn } from '@/shared/utils';
import type { ThemeRole } from '@/shared/components/AvatarUpload/AvatarUpload';
import { VIETNAM_PROVINCES } from '@/shared/constants/locations';

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, isLoading, error: loadError, refetch } = useProfile();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

  const isDonor = profile?.role === 'DONOR';
  const [isEditing, setIsEditing] = useState(false);

  const {
    form,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    updateField,
    handleAddressSelect,
    handleSubmit,
    resetForm,
    avatarUpload,
  } = useProfileEditForm(profile);

  async function handleSignOut() {
    await logout();
    navigate('/login');
  }

  function handleSave() {
    handleSubmit(() => {
      refetch(); // hydrate any tier/backend-transformed fields
      setIsEditing(false); // return to view mode on success for all roles
    });
  }

  function handleCancel() {
    resetForm();
    setIsEditing(false);
  }

  // --- Render helpers ---

  const theme: ThemeRole = isDonor ? 'donor' : 'recipient';

  const isPremium = profile?.role === 'RECIPIENT' && profile.tier === 'PREMIUM';

  // THE LOADING AND ERROR STATES SHOULD BE MOVED INTO 
  // THE SHARED LOADING COMPONENT AND ERROR COMPONENT
  // BUT HAVE TO WAIT FOR DONOR TO FINISH FIRST

  // THE UPDATE SUCCESS AND ERROR SHOULD BE CHANGED TO TOAST LATER
  // CURRENTLY USING THE AlertSuccess and AlertError COMPONENTS
  
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
              <Bell className="size-4 mr-2" />
              Create Notification Preference
            </Button>
          )}
        </div>

        {/* Profile Card */}
        <div className={cn(
          'bg-white rounded-xl shadow-sm p-6 sm:p-8 border',
          isDonor ? 'border-[#E4E2E1]' : 'border-[#e9f5ee]'
        )}>
          {submitSuccess && (
            <div className="mb-6 rounded-lg bg-emerald-50 p-4 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm font-medium">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

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
                isRemoved={avatarUpload.isRemoved}
                username={profile.username}
                tierBadge={
                  isDonor ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#805300]/10 text-[#805300]">
                      Donor
                    </span>
                  ) : (
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
                onRemove={avatarUpload.removeAvatar}
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
                  {!isDonor ? (
                    <div className="flex items-center gap-2 ml-2">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                        isPremium ? 'bg-[#3D6852]/15 text-[#3D6852]' : 'bg-slate-100 text-slate-600'
                      )}>
                        {isPremium ? 'Premium Recipient' : 'Standard Recipient'}
                      </span>
                      {isPremium && <Medal className="size-5 text-[#3D6852]" />}
                    </div>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#805300]/10 text-[#805300] ml-2">
                      Donor
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Fields Section */}
          <div className="py-8 space-y-6">
            {!isEditing ? (
              /* --- VIEW MODE: Clean, non-interactive static display --- */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <DisplayField label="Username" value={profile.username} />
                  <DisplayField
                    label="Email Address"
                    value={profile.email}
                  />
                </div>

                {isDonor && (
                  <div className="pt-2">
                    <DisplayField label="Company Name" value={profile.role === 'DONOR' ? profile.companyName : ''} />
                  </div>
                )}

                <div className="pt-2">
                  <DisplayField
                    label="Password"
                    value="••••••••••••"
                  />
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
              </>

            ) : (
              /* --- EDIT MODE: Form controls for core editable contact info --- */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <IconField
                    id="username"
                    name="username"
                    label="Username"
                    type="text"
                    theme={theme}
                    value={form.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    error={errors.username}
                    disabled={isSubmitting}
                  />

                  <IconField
                    id="email"
                    name="email"
                    label="Email Address"
                    type="email"
                    theme={theme}
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    error={errors.email}
                    disabled={isSubmitting}
                  />

                  {isDonor && (
                    <IconField
                      id="companyName"
                      name="companyName"
                      label="Company Name"
                      type="text"
                      theme={theme}
                      value={form.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      error={errors.companyName}
                      disabled={isSubmitting}
                    />
                  )}
                </div>

                <div className="pt-2">
                  <PasswordField
                    id="password"
                    name="password"
                    label="Password"
                    theme={theme}
                    value={form.password || ''}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Enter new password (leave blank to keep current)"
                    error={errors.password}
                  />
                </div>

                <PasswordStrength password={form.password} variant={theme} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <IconField
                    id="country"
                    name="country"
                    label="Country"
                    type="text"
                    theme={theme}
                    value="Vietnam"
                    disabled
                    readOnly
                    helperText="Country is fixed to Vietnam"
                  />
                  <SelectField
                    id="city"
                    name="city"
                    label="City"
                    theme={theme}
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    options={VIETNAM_PROVINCES}
                    error={errors.city}
                    disabled={isSubmitting}
                  />
                </div>

                {isDonor && (
                  <div className="pt-2">
                    <AddressAutocomplete
                      value={form.addressText}
                      onSelect={handleAddressSelect}
                      error={errors.addressText}
                    />
                  </div>
                )}
              </>
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

