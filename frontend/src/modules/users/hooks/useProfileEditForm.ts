import { useState, useEffect } from 'react';
import type { AnyUserDTO, UpdateProfilePayload } from '@/types/api';
import { validateUsername, validatePassword } from '@/shared/utils/validation';
import { userService } from '../services/user.service';
import { updateStoredUser } from '@/services/authStorage';
import { useAvatarUpload } from './useAvatarUpload';

// We map our form fields matching the UpdateProfilePayload
export interface ProfileFormData {
  username: string;
  email: string;
  password?: string;
  city: string;
  country: string;
  companyName: string;
  addressText: string;
  location: { latitude: number; longitude: number } | null;
}

export function useProfileEditForm(profile: AnyUserDTO | null) {
  const [form, setForm] = useState<ProfileFormData>({
    username: '',
    email: '',
    password: '',
    city: '',
    country: '',
    companyName: '',
    addressText: '',
    location: null,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Avatar upload sub-state
  const avatarUpload = useAvatarUpload();

  function buildFormFromProfile(profile: AnyUserDTO): ProfileFormData {
    const isDonor = profile.role === 'DONOR';
    return {
      username: profile.username || '',
      email: profile.email || '',
      password: '',
      city: profile.city || '',
      country: profile.country || '',
      companyName: isDonor ? (profile.companyName || '') : '',
      addressText: isDonor ? (profile.addressText || '') : '',
      location: isDonor && profile.location
        ? { latitude: profile.location.latitude, longitude: profile.location.longitude }
        : null,
    };
  }

  // Seed form on profile load
  useEffect(() => {
    if (profile) {
      setForm(buildFormFromProfile(profile));
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

  /**
   * Helper called when AddressAutocomplete returns a new address selection
   * with coordinates and optional resolved municipality/city.
   */
  function handleAddressSelect(data: { addressText: string; latitude: number; longitude: number; municipality?: string }) {
    setForm((prev) => ({
      ...prev,
      addressText: data.addressText,
      location: { latitude: data.latitude, longitude: data.longitude },
      city: data.municipality || prev.city,
    }));
    setErrors((prev) => ({ ...prev, addressText: undefined, city: undefined }));
    setSubmitError(null);
    setSubmitSuccess(false);
  }

  async function handleSubmit(onSuccess?: () => void) {
    if (!profile) return;

    // 1. Client-side validation
    const nextErrors: typeof errors = {};
    const usernameResult = validateUsername(form.username);
    if (!usernameResult.isValid) nextErrors.username = usernameResult.errors[0];

    const emailTrimmed = form.email.trim();
    if (!emailTrimmed) {
      nextErrors.email = 'Email is required';
    } else if (!emailTrimmed.includes('@') || !emailTrimmed.includes('.')) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (form.password && form.password.trim().length > 0) {
      const passwordResult = validatePassword(form.password);
      if (!passwordResult.isValid) {
        nextErrors.password = passwordResult.errors[0];
      }
    }

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
    if (form.email.trim().toLowerCase() !== profile.email.toLowerCase()) patch.email = form.email.trim().toLowerCase();
    if (form.password && form.password.trim().length > 0) patch.password = form.password;
    if (form.city !== profile.city) patch.city = form.city;
    if (form.country !== profile.country) patch.country = form.country;

    if (profile.role === 'DONOR') {
      if (form.companyName !== profile.companyName) patch.companyName = form.companyName;
      if (form.addressText !== profile.addressText) patch.addressText = form.addressText;
      if (
        form.location &&
        (!profile.location ||
          profile.location.latitude !== form.location.latitude ||
          profile.location.longitude !== form.location.longitude)
      ) {
        patch.location = form.location;
      }
    }

    // Handle avatar upload or removal
    if (avatarUpload.isRemoved) {
      if (profile.avatarUrl !== null) {
        patch.avatarUrl = null;
      }
    } else if (avatarUpload.mediaUrl) {
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
        // Clear password field after successful save
        setForm((prev) => ({ ...prev, password: '' }));
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

  function resetForm() {
    if (profile) {
      setForm(buildFormFromProfile(profile));
    }
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    avatarUpload.reset();
  }

  return {
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
  };
}



