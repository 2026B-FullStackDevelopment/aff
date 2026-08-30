import { Link } from 'react-router-dom';
import { User, Mail, ArrowRight } from 'lucide-react';
import { VIETNAM_PROVINCES } from '@/shared/constants/locations';
import { PasswordStrength } from '@/shared/components/PasswordStrength/PasswordStrength';
import { PasswordField } from '@/shared/components/PasswordField/PasswordField';
import { Button } from '@/shared/components/Button/Button';
import { IconField } from '@/shared/components/IconField/IconField';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { FormSectionHeader } from '@/shared/components/FormSectionHeader/FormSectionHeader';
import { useAuth } from '../hooks/useAuth';
import { useRegistrationForm } from '../hooks/useRegistrationForm';

type FormState = {
  fullName: string;
  email: string;
  city: string;
  password: string;
  confirmPassword: string;
};

const REQUIRED_FIELDS = ['fullName', 'email', 'city', 'password', 'confirmPassword'] as const;

export function RecipientRegisterPage() {
  const { registerRecipient } = useAuth();

  const { form, errors, isSubmitting, submitError, updateField, handleSubmit } =
    useRegistrationForm<FormState>({
      initialState: { fullName: '', email: '', city: '', password: '', confirmPassword: '' },
      requiredFields: REQUIRED_FIELDS,
      usernameField: 'fullName',
      buildPayload: (f) => ({
        username: f.fullName,
        email: f.email,
        password: f.password,
        city: f.city,
      }),
      registerFn: registerRecipient,
    });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-[#f5faf7] to-[#e9f5ee]">
      <div className="text-center mb-6 max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#2E5A47] mb-1">
          AFF Portal
        </h1>
        <div className="text-lg font-bold text-slate-800">
          Recipient Registration
        </div>
      </div>

      <section className="w-full max-w-[800px] bg-white border border-[#e9f5ee] rounded-xl lg:rounded-2xl p-6 sm:p-8 lg:p-10 shadow-sm lg:shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Create your account</h2>
            <p className="text-sm text-slate-500 mt-1">
              Fields marked <span className="text-red-600 font-bold">*</span> are required.
            </p>
          </div>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          {/* User Details */}
          <div>
            <FormSectionHeader title="User Details" theme="recipient" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <IconField
                id="fullName"
                name="fullName"
                label="Username"
                required
                icon={User}
                value={form.fullName}
                onChange={updateField('fullName')}
                placeholder="Enter your username"
                error={errors.fullName}
                theme="recipient"
              />

              <IconField
                id="email"
                name="email"
                type="email"
                label="Email"
                required
                icon={Mail}
                value={form.email}
                onChange={updateField('email')}
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email}
                theme="recipient"
              />

              <SelectField
                id="city"
                name="city"
                label="Registration city"
                required
                options={VIETNAM_PROVINCES}
                placeholder="Select Municipality"
                value={form.city}
                onChange={updateField('city')}
                error={errors.city}
                theme="recipient"
                className="md:col-span-2"
              />
            </div>
          </div>

          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PasswordField
                id="password"
                name="password"
                label="Password"
                required
                value={form.password}
                onChange={updateField('password')}
                error={errors.password}
                theme="recipient"
              />
              <PasswordField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm password"
                required
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                error={errors.confirmPassword}
                theme="recipient"
              />
            </div>

            <PasswordStrength password={form.password} variant="recipient" />
          </div>

          <FormErrorAlert message={submitError} />

          {/* Footer Box & Submit */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#f0f7f3] p-4 sm:p-6 rounded-xl border border-[#d1e2d8]">
            <div className="flex flex-col gap-1 text-sm text-slate-600">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-[#3D6852] hover:text-[#2E5A47] hover:underline transition-colors duration-150">
                  Login to Portal
                </Link>
              </p>
              <p>
                Seeking to donate?{' '}
                <Link to="/register/donor" className="font-bold text-[#D97706] hover:text-[#B45309] hover:underline transition-colors duration-150">
                  Switch to Donor Registration
                </Link>
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-12 px-6 bg-[#3D6852] hover:bg-[#2E5A47] active:scale-[0.98] text-white font-bold rounded-lg text-base flex items-center justify-center gap-2 transition-all duration-200 ease-out hover:shadow-md shrink-0"
            >
              <span>{isSubmitting ? 'Creating account…' : 'Complete Registration'}</span>
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default RecipientRegisterPage;