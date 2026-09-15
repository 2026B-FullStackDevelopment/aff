import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { Button } from '@/shared/components/Button/Button';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { toast } from '@/shared/components/ui/sonner';
import { AdminProfileEditForm } from '../components/AdminProfile/AdminProfileEditForm';
import { AdminProfileSkeleton } from '../components/AdminProfile/AdminProfileSkeleton';
import { AdminProfileView } from '../components/AdminProfile/AdminProfileView';
import { useAdminProfile } from '../hooks/useAdminProfile';
import { useAdminProfileForm } from '../hooks/useAdminProfileForm';

/** Admin-owned profile screen using the Admin portal's visual language. */
export function AdminProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, isLoading, error, refetch, setProfile } = useAdminProfile();
  const [isEditing, setIsEditing] = useState(false);
  const formState = useAdminProfileForm(profile, setProfile);

  async function handleSignOut() {
    await logout();
    navigate('/login');
  }

  function handleCancel() {
    formState.resetForm();
    setIsEditing(false);
  }

  function handleSave() {
    void formState.handleSubmit(() => {
      setIsEditing(false);
      toast.success('Admin profile updated successfully');
    });
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-admin-primary">
          Account settings
        </p>
        <h1 className="mt-1 text-2xl font-bold text-admin-title sm:text-3xl">
          Admin Profile
        </h1>
        <p className="mt-2 text-sm text-admin-text-muted sm:text-base">
          Update your account details and profile image.
        </p>
      </header>

      {isLoading ? (
        <AdminProfileSkeleton />
      ) : error || !profile ? (
        <ErrorState
          title="Unable to load profile"
          message={error ?? 'Admin profile data is unavailable.'}
          retryLabel="Try Again"
          onRetry={refetch}
        />
      ) : (
        <div className="rounded-xl border border-admin-border/60 bg-admin-surface p-6 shadow-sm sm:p-8">
          {isEditing ? (
            <AdminProfileEditForm profile={profile} state={formState} />
          ) : (
            <AdminProfileView profile={profile} />
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-admin-border/40 pt-6 sm:flex-row sm:justify-end">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={formState.isSubmitting || formState.avatarUpload.isUploading}
                  className="border-admin-border font-bold text-admin-text"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={formState.isSubmitting || formState.avatarUpload.isUploading}
                  className="bg-admin-primary font-bold text-admin-on-primary hover:bg-admin-primary-hover"
                >
                  {formState.isSubmitting ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={handleSignOut} className="border-admin-border font-bold">
                  Sign out
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-admin-primary font-bold text-admin-on-primary hover:bg-admin-primary-hover"
                >
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminProfilePage;
