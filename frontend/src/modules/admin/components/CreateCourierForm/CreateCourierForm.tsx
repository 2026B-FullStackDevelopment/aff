import { AtSign, BadgeCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/shared/components/Button/Button';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { FormSectionHeader } from '@/shared/components/FormSectionHeader/FormSectionHeader';
import { IconField } from '@/shared/components/IconField/IconField';
import { PasswordField } from '@/shared/components/PasswordField/PasswordField';
import { PasswordStrength } from '@/shared/components/PasswordStrength/PasswordStrength';
import { cn } from '@/shared/utils';
import { useCreateCourierForm } from '../../hooks/useCreateCourierForm';

/** Admin-only Courier form composed from the shared account fields. */
export function CreateCourierForm() {
  const {
    form,
    errors,
    isSubmitting,
    submitError,
    updateField,
    blurField,
    handleSubmit,
  } = useCreateCourierForm();

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="space-y-7">
      <FormErrorAlert message={submitError} />

      <section aria-labelledby="courier-profile-heading">
        <FormSectionHeader title="Courier profile" theme="admin" />
        <h2 id="courier-profile-heading" className="sr-only">Courier profile</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <IconField
            id="fullName"
            name="fullName"
            label="Full name"
            required
            icon={BadgeCheck}
            value={form.fullName}
            onChange={updateField('fullName')}
            onBlur={() => blurField('fullName')}
            error={errors.fullName}
            placeholder="Nguyen Van A"
            autoComplete="name"
            theme="admin"
          />

          <IconField
            id="username"
            name="username"
            label="Username"
            required
            icon={UserRound}
            value={form.username}
            onChange={updateField('username')}
            onBlur={() => blurField('username')}
            error={errors.username}
            helperText="English letters, numbers, underscores, and hyphens only."
            placeholder="courier_01"
            autoComplete="username"
            theme="admin"
          />

          <div className="sm:col-span-2">
            <IconField
              id="email"
              name="email"
              type="email"
              label="Email address"
              required
              icon={AtSign}
              value={form.email}
              onChange={updateField('email')}
              onBlur={() => blurField('email')}
              error={errors.email}
              placeholder="courier@aff.com"
              autoComplete="email"
              theme="admin"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="courier-password-heading">
        <FormSectionHeader title="Sign-in password" theme="admin" />
        <h2 id="courier-password-heading" className="sr-only">Sign-in password</h2>
        <p className="-mt-2 mb-4 text-sm leading-6 text-admin-text-muted">
          Give this password securely to the Courier so they can sign in to their account.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <PasswordField
              id="tempPassword"
              name="tempPassword"
              label="Password"
              required
              value={form.tempPassword}
              onChange={updateField('tempPassword')}
              onBlur={() => blurField('tempPassword')}
              error={errors.tempPassword}
              autoComplete="new-password"
              theme="admin"
            />
            <PasswordStrength password={form.tempPassword} variant="admin" />
          </div>

          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            required
            value={form.confirmPassword}
            onChange={updateField('confirmPassword')}
            onBlur={() => blurField('confirmPassword')}
            error={errors.confirmPassword}
            autoComplete="new-password"
            theme="admin"
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-admin-border/40 pt-6 sm:flex-row sm:justify-end">
        <Link
          to="/admin/user-directory"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-10 px-5')}
        >
          Cancel
        </Link>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="h-10 bg-admin-primary px-5 text-white hover:bg-admin-primary-hover"
        >
          {isSubmitting ? 'Creating Courier…' : 'Create Courier account'}
        </Button>
      </div>
    </form>
  );
}

export default CreateCourierForm;
