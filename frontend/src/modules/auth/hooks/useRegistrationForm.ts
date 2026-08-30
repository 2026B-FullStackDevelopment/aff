import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePassword, validateUsername } from '../../../shared/utils/validation';
import { getResponseMessage } from '@/shared/utils/apiError';

type FieldErrors<T> = Partial<Record<keyof T, string>>;

interface PasswordFields {
  password: string;
  confirmPassword: string;
}

interface RegisterResult {
  ok: boolean;
  data: unknown;
}

interface UseRegistrationFormOptions<T extends PasswordFields> {
  initialState: T;
  requiredFields: readonly (keyof T)[];
  /** Which key in T holds the value that must satisfy validateUsername */
  usernameField: keyof T;
  buildPayload: (form: T) => unknown;
  registerFn: (payload: unknown) => Promise<RegisterResult>;
  /** Extra, form-specific checks (e.g. Donor's address/location pairing) */
  extraValidation?: (form: T) => FieldErrors<T>;
  successRedirect?: string;
}

export function useRegistrationForm<T extends PasswordFields>({
  initialState,
  requiredFields,
  usernameField,
  buildPayload,
  registerFn,
  extraValidation,
  successRedirect = '/login',
}: UseRegistrationFormOptions<T>) {
  const navigate = useNavigate();
  const [form, setForm] = useState<T>(initialState);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filledFields = requiredFields.filter(
    (field) => String(form[field] ?? '').trim() !== ''
  ).length;
  const progressPercent = Math.round((filledFields / requiredFields.length) * 100);

  const updateField = (field: keyof T) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors: FieldErrors<T> = {};

    requiredFields.forEach((field) => {
      const value = String(form[field] ?? '').trim();
      if (!value) {
        nextErrors[field] = 'This field is required.';
      }
    });

    const usernameValue = form[usernameField] as unknown as string;
    if (usernameValue) {
      const usernameValidation = validateUsername(usernameValue);
      if (!usernameValidation.isValid) {
        nextErrors[usernameField] = usernameValidation.errors[0];
      }
    }

    if (form.password) {
      const passwordValidation = validatePassword(form.password);
      if (!passwordValidation.isValid) {
        (nextErrors as FieldErrors<PasswordFields>).password = passwordValidation.errors[0];
      }
    }

    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      (nextErrors as FieldErrors<PasswordFields>).confirmPassword = "Passwords don't match.";
    }

    if (extraValidation) {
      Object.assign(nextErrors, extraValidation(form));
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    const result = await registerFn(buildPayload(form));

    if (result.ok) {
      navigate(successRedirect);
    } else {
      const message = getResponseMessage(result.data, 'Registration failed. Please try again.');
      setSubmitError(message);
    }

    setIsSubmitting(false);
  };

  return {
    form,
    setForm,
    errors,
    setErrors,
    isSubmitting,
    submitError,
    progressPercent,
    updateField,
    handleSubmit,
  };
}