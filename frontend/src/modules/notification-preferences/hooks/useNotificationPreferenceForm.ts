import { useState } from 'react';
import type {
  FoodCategory,
  NotificationPreference,
  CreateNotificationPreferencePayload,
} from '@/types/api';

export interface PreferenceFormState {
  preferenceTitle: string;
  categories: FoodCategory[];
  // UI-level flag: maps to vegetarian: true (on) | null (off) on submit.
  // There's no "non-vegetarian only" mode in this form, so `false` is
  // never a value this state holds.
  vegetarianOnly: boolean;
  priceMin: string;
  priceMax: string;
  city: string | null;
}

const EMPTY_FORM: PreferenceFormState = {
  preferenceTitle: '',
  categories: [],
  vegetarianOnly: false,
  priceMin: '',
  priceMax: '',
  city: null,
};

function toFormState(preference: NotificationPreference): PreferenceFormState {
  return {
    preferenceTitle: preference.preferenceTitle,
    categories: preference.categories,
    vegetarianOnly: preference.vegetarian === true,
    priceMin: preference.priceMin !== null ? String(preference.priceMin) : '',
    priceMax: preference.priceMax !== null ? String(preference.priceMax) : '',
    city: preference.city,
  };
}

export function useNotificationPreferenceForm(initial?: NotificationPreference) {
  const [form, setForm] = useState<PreferenceFormState>(
    initial ? toFormState(initial) : EMPTY_FORM,
  );
  const [error, setError] = useState<string | null>(null);

  function setTitle(preferenceTitle: string) {
    setForm((prev) => ({ ...prev, preferenceTitle }));
  }

  function toggleCategory(category: FoodCategory) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }

  function setPriceMin(priceMin: string) {
    setForm((prev) => ({ ...prev, priceMin }));
  }

  function setPriceMax(priceMax: string) {
    setForm((prev) => ({ ...prev, priceMax }));
  }

  function setCity(city: string | null) {
    setForm((prev) => ({ ...prev, city }));
  }

  function setVegetarianOnly(vegetarianOnly: boolean) {
    setForm((prev) => ({ ...prev, vegetarianOnly }));
  }

  function reset() {
    setForm(initial ? toFormState(initial) : EMPTY_FORM);
    setError(null);
  }

  function validate(): string | null {
    if (!form.preferenceTitle.trim()) {
      return 'Preference title is required.';
    }

    const min = form.priceMin.trim() === '' ? null : Number(form.priceMin);
    const max = form.priceMax.trim() === '' ? null : Number(form.priceMax);

    if (min !== null && (Number.isNaN(min) || min < 0)) {
      return 'Minimum price must be a non-negative number.';
    }
    if (max !== null && (Number.isNaN(max) || max < 0)) {
      return 'Maximum price must be a non-negative number.';
    }
    if (min !== null && max !== null && min > max) {
      return 'Minimum price cannot be greater than maximum price.';
    }

    return null;
  }

  function toPayload(): CreateNotificationPreferencePayload {
    return {
      preferenceTitle: form.preferenceTitle.trim(),
      categories: form.categories,
      vegetarian: form.vegetarianOnly ? true : null,
      priceMin: form.priceMin.trim() === '' ? null : Number(form.priceMin),
      priceMax: form.priceMax.trim() === '' ? null : Number(form.priceMax),
      city: form.city,
    };
  }

  // Single entry point the panel calls on submit: validates, sets `error`
  // for FormErrorAlert if invalid, otherwise returns the ready-to-send body.
  function validateAndBuildPayload(): CreateNotificationPreferencePayload | null {
    const validationError = validate();
    setError(validationError);
    return validationError ? null : toPayload();
  }

  return {
    form,
    error,
    setTitle,
    toggleCategory,
    setPriceMin,
    setPriceMax,
    setCity,
    setVegetarianOnly,
    reset,
    validateAndBuildPayload,
  };
}

export default useNotificationPreferenceForm;
