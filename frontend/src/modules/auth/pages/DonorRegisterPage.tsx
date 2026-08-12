import { Link } from 'react-router-dom';
import { Building2, User, Mail, ArrowRight } from 'lucide-react';
import { VIETNAM_PROVINCES } from '@/shared/constants/locations';
import { resolveProvince } from '@/shared/utils/resolveProvince';
import { PasswordStrength } from '../components/PasswordStrength';
import { PasswordField } from '@/shared/components/PasswordField/PasswordField';
import { AddressAutocomplete, LocationData } from '@/shared/components/AddressAutocomplete/AddressAutocomplete';
import { Button } from '@/shared/components/Button/Button';
import { IconField } from '@/shared/components/IconField/IconField';
import { SelectField } from '@/shared/components/SelectField/SelectField';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert/FormErrorAlert';
import { FormSectionHeader } from '@/shared/components/FormSectionHeader/FormSectionHeader';
import { useAuth } from '../hooks/useAuth';
import { useRegistrationForm } from '../hooks/useRegistrationForm';

type FormState = {
  companyName: string;
  taxCode: string;
  address: string;
  city: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  location: { latitude: number; longitude: number } | null;
};

const REQUIRED_FIELDS = [
  'companyName', 'taxCode', 'address', 'city', 'username', 'email', 'password', 'confirmPassword',
] as const;

export function DonorRegisterPage() {
  const { registerDonor } = useAuth();

  const {
    form, setForm, errors, setErrors, isSubmitting, submitError, progressPercent, updateField, handleSubmit,
  } = useRegistrationForm<FormState>({
    initialState: {
      companyName: '', taxCode: '', address: '', city: '',
      username: '', email: '', password: '', confirmPassword: '',
      location: null,
    },
    requiredFields: REQUIRED_FIELDS,
    usernameField: 'username',
    buildPayload: (f) => ({
      username: f.username,
      companyName: f.companyName,
      taxCode: f.taxCode,
      addressText: f.address,
      city: f.city,
      location: f.location,
      email: f.email,
      password: f.password,
    }),
    registerFn: registerDonor,
    extraValidation: (f) =>
      !f.location || !f.address
        ? { address: 'Please search and select a valid address from the list.' }
        : {},
  });

  const handleAddressSelect = ({ addressText, latitude, longitude, municipality, rawAddress }: LocationData) => {
    const detectedProvince = municipality || resolveProvince(rawAddress, latitude, longitude);

    setForm((current) => ({
      ...current,
      address: addressText,
      city: detectedProvince,
      location: { latitude, longitude },
    }));

    if (errors.address) {
      setErrors((prev) => ({ ...prev, address: undefined }));
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-[#FDF9F3] to-[#FFFDF8]">
      <div className="text-center mb-6 max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#996515] mb-1">
          AFF Portal
        </h1>
        <div className="text-lg font-bold text-slate-800">
          Institutional Donor Registration
        </div>
      </div>

      <section className="w-full max-w-[800px] bg-white border border-[#f4efe8] rounded-xl lg:rounded-2xl p-6 sm:p-8 lg:p-10 shadow-sm lg:shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Create your account</h2>
            <p className="text-sm text-slate-500 mt-1">
              Fields marked <span className="text-red-600 font-bold">*</span> are required.
            </p>
          </div>
          <div className="w-full sm:w-auto text-right">
            <div className="flex justify-between sm:justify-end gap-4 text-xs text-slate-500 mb-1.5">
              <span>Progress</span>
              <span className="font-bold text-[#996515] transition-all duration-300">{progressPercent}%</span>
            </div>
            <div className="w-full sm:w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F59E0B] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          {/* Section 1: Organization Details */}
          <div>
            <FormSectionHeader title="Organization Details" theme="donor" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <IconField
                id="companyName"
                name="companyName"
                label="Company name"
                required
                icon={Building2}
                value={form.companyName}
                onChange={updateField('companyName')}
                placeholder="e.g., Global Initiatives Corp"
                error={errors.companyName}
                helperText="Supports Vietnamese alphabets, numbers, and hyphens."
                theme="donor"
              />

              <IconField
                id="taxCode"
                name="taxCode"
                label="Tax code"
                required
                value={form.taxCode}
                onChange={updateField('taxCode')}
                placeholder="0123456789"
                error={errors.taxCode}
                helperText="Must be 10 to 13 digits."
                theme="donor"
              />

              <AddressAutocomplete
                value={form.address}
                onSelect={handleAddressSelect}
                error={errors.address}
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
                theme="donor"
              />
            </div>
          </div>

          {/* Section 2: Contact & Security */}
          <div>
            <FormSectionHeader title="Contact & Security" theme="donor" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <IconField
                id="username"
                name="username"
                label="Username"
                required
                icon={User}
                value={form.username}
                onChange={updateField('username')}
                placeholder="Enter your username"
                error={errors.username}
                theme="donor"
              />

              <IconField
                id="donorEmail"
                name="donorEmail"
                type="email"
                label="Email"
                required
                icon={Mail}
                value={form.email}
                onChange={updateField('email')}
                placeholder="Email@organization.com"
                autoComplete="email"
                error={errors.email}
                theme="donor"
              />

              <PasswordField
                id="donorPassword"
                name="donorPassword"
                label="Password"
                required
                value={form.password}
                onChange={updateField('password')}
                error={errors.password}
                theme="donor"
              />

              <PasswordField
                id="donorConfirmPassword"
                name="donorConfirmPassword"
                label="Confirm password"
                required
                value={form.confirmPassword}
                onChange={updateField('confirmPassword')}
                error={errors.confirmPassword}
                theme="donor"
              />
            </div>

            <PasswordStrength password={form.password} variant="donor" />
          </div>

          <FormErrorAlert message={submitError} />

          {/* Footer Box & Submit */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#FDF9F3] p-4 sm:p-6 rounded-xl border border-[#f4efe8]">
            <div className="flex flex-col gap-1 text-sm text-slate-600">
              <p>
                Already registered?{' '}
                <Link to="/login" className="font-bold text-[#F59E0B] hover:text-[#D97706] hover:underline transition-colors duration-150">
                  Log in to the portal
                </Link>
              </p>
              <p>
                Seeking resources?{' '}
                <Link to="/register/recipient" className="font-bold text-slate-700 hover:text-slate-900 hover:underline transition-colors duration-150">
                  Switch to Recipient Registration
                </Link>
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-12 px-6 bg-[#F59E0B] hover:bg-[#D97706] active:scale-[0.98] text-white font-bold rounded-lg text-base flex items-center justify-center gap-2 transition-all duration-200 ease-out hover:shadow-md shrink-0"
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

export default DonorRegisterPage;