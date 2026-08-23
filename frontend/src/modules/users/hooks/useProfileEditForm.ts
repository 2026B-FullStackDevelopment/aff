import { useState, useEffect } from 'react';
import type { AnyUserDTO, UpdateProfilePayload } from '@/types/api';
import { validateUsername } from '@/shared/utils/validation';
import { userService } from '../services/user.service';
import { updateStoredUser } from '@/services/authStorage';
import { useAvatarUpload } from './useAvatarUpload';

// We map our form fields matching the UpdateProfilePayload
export interface ProfileFormData {
  username: string;
  city: string;
  country: string;
  companyName: string;
  addressText: string;
}

export function useProfileEditForm(profile: AnyUserDTO | null) {
  const [form, setForm] = useState<ProfileFormData>({
    username: '',
    city: '',
    country: '',
    companyName: '',
    addressText: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Avatar upload sub-state
  const avatarUpload = useAvatarUpload();

  // Seed form on profile load
  useEffect(() => {
    if (profile) {
      setForm({
        username: profile.username || '',
        city: profile.city || '',
        country: profile.country || '',
        companyName: profile.role === 'DONOR' ? (profile.companyName || '') : '',
        addressText: profile.role === 'DONOR' ? (profile.addressText || '') : '',
      });
      avatarUpload.reset(); // clear any stale blob URL if profile re-fetches
    }
    // We intentionally don't put avatarUpload in the dependency array to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function updateField<K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSubmitError(null);
    setSubmitSuccess(false);
  }

  async function handleSubmit(onSuccess?: () => void) {
    if (!profile) return;

    // 1. Client-side validation
    const nextErrors: typeof errors = {};
    const usernameResult = validateUsername(form.username);
    if (!usernameResult.isValid) nextErrors.username = usernameResult.errors[0];
    if (!form.city.trim()) nextErrors.city = 'City is required';
    if (!form.country.trim()) nextErrors.country = 'Country is required';

    if (profile.role === 'DONOR') {
      if (!form.companyName.trim()) nextErrors.companyName = 'Company Name is required';
      if (!form.addressText.trim()) nextErrors.addressText = 'Address is required';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // 2. Build payload with only what changed to minimize patch size
    const patch: UpdateProfilePayload = {};
    if (form.username !== profile.username) patch.username = form.username;
    if (form.city !== profile.city) patch.city = form.city;
    if (form.country !== profile.country) patch.country = form.country;

    if (profile.role === 'DONOR') {
      if (form.companyName !== profile.companyName) patch.companyName = form.companyName;
      if (form.addressText !== profile.addressText) patch.addressText = form.addressText;
    }

    // Add mediaUrl if a new avatar was uploaded successfully
    if (avatarUpload.mediaUrl) {
      patch.avatarUrl = avatarUpload.mediaUrl;
    }

    if (Object.keys(patch).length === 0) {
      // Nothing changed. Treat as success.
      onSuccess?.();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await userService.updateProfile(patch);
      if (response.ok && response.data) {
        // Success: update local cache and call success handler
        updateStoredUser(response.data);
        setSubmitSuccess(true);
        onSuccess?.();
      } else {
        setSubmitError((response.data as any)?.message || 'Failed to update profile. Please try again.');
      }
    } catch (err) {
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
    submitSuccess,
    updateField,
    handleSubmit,
    avatarUpload,
  };
}
