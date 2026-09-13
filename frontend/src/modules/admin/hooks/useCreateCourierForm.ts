import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/shared/components/ui/sonner';
import { getResponseMessage } from '@/shared/utils/apiError';
import { validateEmail, validatePassword, validateUsername } from '@/shared/utils/validation';
import { adminService } from '../services/admin.service';

export interface CreateCourierFormState {
  fullName: string;
  username: string;
  email: string;
  tempPassword: string;
  confirmPassword: string;
}

type FormField = keyof CreateCourierFormState;
type FormErrors = Partial<Record<FormField, string>>;

const INITIAL_FORM: CreateCourierFormState = {
  fullName: '',
  username: '',
  email: '',
  tempPassword: '',
  confirmPassword: '',
};

const ALL_FIELDS = Object.keys(INITIAL_FORM) as FormField[];

function validateField(field: FormField, form: CreateCourierFormState): string | undefined {
  const value = form[field];
  if (!value.trim()) return 'This field is required.';

  if (field === 'username') {
    return validateUsername(value).errors[0];
  }

  if (field === 'email') {
    return validateEmail(value).errors[0];
  }

  if (field === 'tempPassword') {
    return validatePassword(value).errors[0];
  }

  if (field === 'confirmPassword' && value !== form.tempPassword) {
    return "Passwords don't match.";
  }

  return undefined;
}

/** Owns live validation and submission for the Admin Courier form. */
export function useCreateCourierForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = (field: FormField) => (event: ChangeEvent<HTMLInputElement>) => {
    const nextForm = { ...form, [field]: event.target.value };
    setForm(nextForm);
    setSubmitError(null);

    setErrors((current) => {
      const next = { ...current };

      if (touched[field]) {
        next[field] = validateField(field, nextForm);
      }

      if (field === 'tempPassword' && touched.confirmPassword) {
        next.confirmPassword = validateField('confirmPassword', nextForm);
      }

      return next;
    });
  };

  const blurField = (field: FormField) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validateField(field, form) }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = Object.fromEntries(
      ALL_FIELDS.map((field) => [field, validateField(field, form)]),
    ) as FormErrors;

    setTouched(Object.fromEntries(ALL_FIELDS.map((field) => [field, true])));
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    setIsSubmitting(true);

    try {
      const response = await adminService.createCourier({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        tempPassword: form.tempPassword,
      });

      if (!response.ok || !response.data) {
        const message = getResponseMessage(
          response.data,
          'Unable to create the Courier account. Please try again.',
        );

        if (response.status === 409) {
          setTouched((current) => ({ ...current, email: true }));
          setErrors((current) => ({ ...current, email: message }));
        } else {
          setSubmitError(message);
        }

        return;
      }

      toast.success('Courier account created', {
        description: `${response.data.fullName} can now sign in with the temporary password.`,
      });
      navigate('/admin/user-directory', { replace: true });
    } catch {
      setSubmitError('Unable to reach the server. Check that the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    errors,
    isSubmitting,
    submitError,
    updateField,
    blurField,
    handleSubmit,
  };
}
