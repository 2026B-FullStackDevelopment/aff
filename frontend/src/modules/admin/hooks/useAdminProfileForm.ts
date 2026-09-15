import { useEffect, useState } from 'react';
import { clearSession, updateStoredUser } from '@/services/authStorage';
import { useAvatarUpload } from '@/shared/hooks/useAvatarUpload';
import { getResponseMessage } from '@/shared/utils/apiError';
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/shared/utils/validation';
import type { AdminUserDTO, UpdateProfilePayload } from '@/types/api';
import { userService } from '@/modules/users/services/user.service';

export interface AdminProfileFormData {
  username: string;
  email: string;
  password: string;
  country: string;
  city: string;
}

type AdminProfileErrors = Partial<Record<keyof AdminProfileFormData, string>>;

function formFromProfile(profile: AdminUserDTO): AdminProfileFormData {
  return {
    username: profile.username,
    email: profile.email,
    password: '',
    country: profile.country ?? '',
    city: profile.city ?? '',
  };
}

function validateField<K extends keyof AdminProfileFormData>(
  field: K,
  value: AdminProfileFormData[K],
): string | undefined {
  const trimmed = value.trim();
  if (field === 'password' && !trimmed) return undefined;
  if (!trimmed) return `${field.charAt(0).toUpperCase()}${field.slice(1)} is required`;
  if (field === 'username') return validateUsername(value).errors[0];
  if (field === 'email') return validateEmail(value).errors[0];
  if (field === 'password') return validatePassword(value).errors[0];
  return undefined;
}

/** Owns live validation and persistence for the Admin-only profile form. */
export function useAdminProfileForm(
  profile: AdminUserDTO | null,
  onProfileUpdated: (profile: AdminUserDTO) => void,
) {
  const [form, setForm] = useState<AdminProfileFormData>({
    username: '',
    email: '',
    password: '',
    country: '',
    city: '',
  });
  const [errors, setErrors] = useState<AdminProfileErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const avatarUpload = useAvatarUpload();

  useEffect(() => {
    if (!profile) return;
    setForm(formFromProfile(profile));
    setErrors({});
    setSubmitError(null);
    avatarUpload.reset();
    // Reset only when the authoritative profile changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function updateField<K extends keyof AdminProfileFormData>(
    field: K,
    value: AdminProfileFormData[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
    setSubmitError(null);
  }

  function resetForm() {
    if (profile) setForm(formFromProfile(profile));
    setErrors({});
    setSubmitError(null);
    avatarUpload.reset();
  }

  async function handleSubmit(onSuccess: () => void) {
    if (!profile) return;

    const nextErrors: AdminProfileErrors = {};
    (Object.keys(form) as (keyof AdminProfileFormData)[]).forEach((field) => {
      const error = validateField(field, form[field]);
      if (error) nextErrors[field] = error;
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const patch: UpdateProfilePayload = {};
    if (form.username.trim() !== profile.username) patch.username = form.username.trim();
    if (form.city.trim() !== profile.city) patch.city = form.city.trim();
    if (form.country.trim() !== profile.country) patch.country = form.country.trim();
    if (avatarUpload.isRemoved && profile.avatarUrl !== null) patch.avatarUrl = null;
    if (!avatarUpload.isRemoved && avatarUpload.mediaUrl) patch.avatarUrl = avatarUpload.mediaUrl;

    const email = form.email.trim();
    const emailChanged = email.toLowerCase() !== profile.email.toLowerCase();
    const passwordChanged = Boolean(form.password.trim());
    if (!Object.keys(patch).length && !emailChanged && !passwordChanged) {
      onSuccess();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    let latestProfile = profile;

    try {
      if (Object.keys(patch).length) {
        const response = await userService.updateProfile(patch);
        if (!response.ok || response.data?.role !== 'ADMIN') {
          setSubmitError(getResponseMessage(response.data, 'Failed to update profile.'));
          return;
        }
        latestProfile = response.data;
        updateStoredUser(latestProfile);
      }

      if (emailChanged) {
        const response = await userService.updateEmail({ newEmail: email });
        if (!response.ok || response.data?.role !== 'ADMIN') {
          setSubmitError(getResponseMessage(response.data, 'Failed to update email.'));
          return;
        }
        latestProfile = response.data;
        updateStoredUser(latestProfile);
      }

      if (passwordChanged) {
        const response = await userService.updatePassword({ newPassword: form.password.trim() });
        if (!response.ok) {
          setSubmitError(getResponseMessage(response.data, 'Failed to update password.'));
          return;
        }
        clearSession();
        window.location.assign('/login');
        return;
      }

      onProfileUpdated(latestProfile);
      onSuccess();
    } catch {
      setSubmitError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    errors,
    isSubmitting,
    submitError,
    avatarUpload,
    updateField,
    resetForm,
    handleSubmit,
  };
}
