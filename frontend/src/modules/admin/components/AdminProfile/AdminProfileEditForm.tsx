import { useEffect, useRef } from 'react';
import { AvatarUpload } from '@/shared/components/AvatarUpload';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert';
import { IconField } from '@/shared/components/IconField';
import { PasswordField } from '@/shared/components/PasswordField';
import { PasswordStrength } from '@/shared/components/PasswordStrength';
import WarningCallout from '@/shared/components/WarningCallout';
import type { AdminUserDTO } from '@/types/api';
import type { useAdminProfileForm } from '../../hooks/useAdminProfileForm';

interface AdminProfileEditFormProps {
  profile: AdminUserDTO;
  state: ReturnType<typeof useAdminProfileForm>;
}

/** Renders the Admin-specific profile form with live field validation. */
export function AdminProfileEditForm({ profile, state }: AdminProfileEditFormProps) {
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const { form, errors, isSubmitting, submitError, avatarUpload, updateField } = state;

  useEffect(() => {
    document.getElementById('admin-profile-username')?.focus();
  }, []);

  useEffect(() => {
    if (submitError) errorAlertRef.current?.focus();
  }, [submitError]);

  return (
    <>
      {submitError && (
        <div ref={errorAlertRef} tabIndex={-1} className="mb-6 outline-none">
          <FormErrorAlert message={submitError} />
        </div>
      )}

      <div className="border-b border-admin-border/40 pb-8">
        <AvatarUpload
          currentAvatarUrl={profile.avatarUrl}
          previewUrl={avatarUpload.previewUrl}
          isRemoved={avatarUpload.isRemoved}
          username={form.username || profile.username}
          tierBadge={
            <span className="rounded-full bg-admin-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-admin-primary">
              Admin
            </span>
          }
          onFileSelected={avatarUpload.selectFile}
          onRemove={avatarUpload.removeAvatar}
          isUploading={avatarUpload.isUploading}
          uploadError={avatarUpload.uploadError}
          theme="admin"
        />
      </div>

      <div className="space-y-6 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <IconField
            id="admin-profile-username"
            name="username"
            label="Username"
            theme="admin"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            error={errors.username}
            disabled={isSubmitting}
            required
          />
          <IconField
            id="admin-profile-email"
            name="email"
            label="Email Address"
            type="email"
            theme="admin"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            error={errors.email}
            disabled={isSubmitting}
            required
          />
        </div>

        {Boolean(form.password.trim()) && (
          <WarningCallout
            theme="admin"
            title="Changing your password will end your active session."
          >
            You will be redirected to login and must sign in with the new password.
          </WarningCallout>
        )}
        <PasswordField
          id="admin-profile-password"
          name="password"
          label="New Password"
          theme="admin"
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          placeholder="Leave blank to keep your current password"
          error={errors.password}
        />
        <PasswordStrength password={form.password} variant="admin" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <IconField
            id="admin-profile-country"
            name="country"
            label="Country"
            theme="admin"
            value={form.country}
            onChange={(event) => updateField('country', event.target.value)}
            error={errors.country}
            disabled={isSubmitting}
            required
          />
          <IconField
            id="admin-profile-city"
            name="city"
            label="City"
            theme="admin"
            value={form.city}
            onChange={(event) => updateField('city', event.target.value)}
            error={errors.city}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>
    </>
  );
}

