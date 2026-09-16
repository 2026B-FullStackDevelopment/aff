import { useEffect, useRef } from 'react';
import { Award } from 'lucide-react';
import AvatarUpload, { ThemeRole } from '@/shared/components/AvatarUpload';
import AddressAutocomplete from '@/shared/components/AddressAutocomplete';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert';
import { IconField } from '@/shared/components/IconField';
import { PasswordField } from '@/shared/components/PasswordField';
import { PasswordStrength } from '@/shared/components/PasswordStrength';
import { SelectField } from '@/shared/components/SelectField';
import { VIETNAM_PROVINCES } from '@/shared/constants/locations';
import { cn } from '@/shared/utils';
import WarningCallout from '@/shared/components/WarningCallout';

import type { AnyUserDTO } from '@/types/api';
import type { ProfileFormData } from '../hooks/useProfileEditForm';
import type { useAvatarUpload } from '@/shared/hooks/useAvatarUpload';

interface ProfileEditFormProps {
  profile: AnyUserDTO;
  form: ProfileFormData;
  errors: Partial<Record<keyof ProfileFormData, string>>;
  isSubmitting: boolean;
  submitError: string | null;
  updateField: <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => void;
  handleAddressSelect: (data: { addressText: string; latitude: number; longitude: number; municipality?: string }) => void;
  avatarUpload: ReturnType<typeof useAvatarUpload>;
  theme: ThemeRole;
  isDonor: boolean;
  isPremium: boolean;
}

export function ProfileEditForm({
  profile,
  form,
  errors,
  isSubmitting,
  submitError,
  updateField,
  handleAddressSelect,
  avatarUpload,
  theme,
  isDonor,
  isPremium,
}: ProfileEditFormProps) {
  const errorAlertRef = useRef<HTMLDivElement>(null);

  // Focus management: focus first input on mount
  useEffect(() => {
    const usernameInput = document.getElementById('username');
    usernameInput?.focus();
  }, []);

  // Focus management: move focus to error alert on submission error
  useEffect(() => {
    if (submitError && errorAlertRef.current) {
      errorAlertRef.current.focus();
    }
  }, [submitError]);

  return (
    <>
      {submitError && (
        <div ref={errorAlertRef} tabIndex={-1} className="mb-6 outline-none">
          <FormErrorAlert message={submitError} />
        </div>
      )}

      {/* Avatar Section */}
      <div className="pb-8 border-b border-slate-100">
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
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
                    isPremium ? 'bg-[#3D6852]/15 text-[#3D6852]' : 'bg-slate-100 text-slate-600'
                  )}
                >
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

        {/* Password Warning Banner */}
        {!!form.password?.trim() && (
          <WarningCallout
            title="Changing your password will end your active session."
            children="If you change your password, you will be redirected to the login page to sign in with the new one."
          />
        )}

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
              theme={theme}
            />
          </div>
        )}
      </div>
    </>
  );
}
