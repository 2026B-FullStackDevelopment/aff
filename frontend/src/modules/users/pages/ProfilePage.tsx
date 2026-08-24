import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Bell } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useProfileEditForm } from '../hooks/useProfileEditForm';
import { ProfileView } from '../components/ProfileView';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { Button } from '@/shared/components/Button/Button';
import RecipientTopNavigation from '@/shared/components/RecipientTopNavigation/RecipientTopNavigation';
import DonorTopNavigation from '@/shared/components/DonorTopNavigation/DonorTopNavigation';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { getAvatarDisplayUrl } from '@/shared/utils/avatar';
import { cn } from '@/shared/utils';
import type { ThemeRole } from '@/shared/components/AvatarUpload/AvatarUpload';

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, isLoading, error: loadError, refetch } = useProfile();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const isDonor = profile?.role === 'DONOR';
  const isPremium = profile?.role === 'RECIPIENT' && profile.tier === 'PREMIUM';
  const theme: ThemeRole = isDonor ? 'donor' : 'recipient';

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
      refetch();
      setIsEditing(false);
    });
  }

  function handleCancel() {
    resetForm();
    setIsEditing(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F8]">
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

  return (
    <div className={cn('min-h-screen', isDonor ? 'bg-[#FBF9F8]' : 'bg-gradient-to-b from-[#f5faf7] to-[#e9f5ee]')}>
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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1B1C1C]">Profile Management</h1>
            <p className="text-slate-600 mt-1">
              Update your details and manage how you appear in the AFF community.
            </p>
          </div>
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

          {!isEditing ? (
            <ProfileView profile={profile} isDonor={isDonor} isPremium={isPremium} />
          ) : (
            <ProfileEditForm
              profile={profile}
              form={form}
              errors={errors}
              isSubmitting={isSubmitting}
              submitError={submitError}
              updateField={updateField}
              handleAddressSelect={handleAddressSelect}
              avatarUpload={avatarUpload}
              theme={theme}
              isDonor={isDonor}
              isPremium={isPremium}
            />
          )}

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
