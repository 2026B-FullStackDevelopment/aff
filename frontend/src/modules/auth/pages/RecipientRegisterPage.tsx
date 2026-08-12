import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VIETNAM_PROVINCES } from '../../../shared/constants/locations';
import { PasswordStrength } from '../components/PasswordStrength';
import { validatePassword, validateUsername } from '../../../shared/utils/validation';
import { useAuth } from '../hooks/useAuth';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  password: string;
  confirmPassword: string;
};

type ErrorsState = Partial<Record<keyof FormState, string>>;

export function RecipientRegisterPage() {
  const { registerRecipient } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ErrorsState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const requiredFields = ['fullName', 'email', 'city', 'password', 'confirmPassword'] as const;
  const filledFields = requiredFields.filter(f => form[f].trim() !== '').length;
  const progressPercent = Math.round((filledFields / requiredFields.length) * 100);

  const updateField = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors: ErrorsState = {};
    (Object.keys(form) as Array<keyof FormState>).forEach((field) => {
      const value = form[field].trim();
      if (!value && field !== 'phone') {
        nextErrors[field] = 'This field is required.';
      }
    });

    if (form.fullName) {
      const usernameValidation = validateUsername(form.fullName);
      if (!usernameValidation.isValid) {
        nextErrors.fullName = usernameValidation.errors[0];
      }
    }

    if (form.password) {
      const passwordValidation = validatePassword(form.password);
      if (!passwordValidation.isValid) {
        nextErrors.password = passwordValidation.errors[0];
      }
    }

    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords don't match.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    
    const result = await registerRecipient({
      username: form.fullName,
      email: form.email,
      password: form.password,
      city: form.city,
    });

    if (result.ok) {
      navigate('/login');
    } else {
      const message = typeof result.data === 'object' && result.data && 'message' in result.data
        ? String((result.data as { message?: unknown }).message)
        : 'Registration failed. Please try again.';
      setSubmitError(message);
    }

    setIsSubmitting(false);
  };

  return (
    <main className="auth-shell auth-shell--split auth-recipient auth-shell--centered">
      
      <div className="auth-page-header">
        <h1 className="auth-recipient-title">AFF Portal</h1>
        <div className="auth-recipient-subtitle">Recipient Registration</div>
      </div>

      <section className="auth-panel auth-panel--form">
        <div>
          <div className="auth-recipient-header-row">
            <div className="auth-recipient-header-left">
              <h2>Create your account</h2>
              <p>Fields marked <span className="auth-required-mark">*</span> are required.</p>
            </div>
            <div className="auth-recipient-progress">
              <div className="auth-recipient-progress-text">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="auth-recipient-progress-bar">
                <div className="auth-recipient-progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          <form className="auth-form auth-form--stacked" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            
            <div className="auth-recipient-section-title">User Details</div>
            
            <div className="auth-grid">
              <label className="auth-field" htmlFor="fullName">
                <span>Username <span className="required">*</span></span>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <input id="fullName" name="fullName" value={form.fullName} onChange={updateField('fullName')} placeholder="Enter your username" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'fullName-error' : undefined} />
                </div>
                {errors.fullName ? <small id="fullName-error">{errors.fullName}</small> : null}
              </label>

              <label className="auth-field" htmlFor="email">
                <span>Email <span className="required">*</span></span>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  <input id="email" name="email" type="email" value={form.email} onChange={updateField('email')} placeholder="you@example.com" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
                </div>
                {errors.email ? <small id="email-error">{errors.email}</small> : null}
              </label>

              <label className="auth-field" htmlFor="phone">
                <span>Phone number</span>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <input id="phone" name="phone" type="tel" value={form.phone} onChange={updateField('phone')} placeholder="Enter your phone number" autoComplete="tel" />
                </div>
              </label>

              <label className="auth-field no-icon" htmlFor="city">
                <span>Registration city <span className="required">*</span></span>
                <div className="input-wrapper">
                  <select id="city" name="city" value={form.city} onChange={updateField('city')} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'city-error' : undefined}>
                    <option value="">Select Municipality</option>
                    {VIETNAM_PROVINCES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.city ? <small id="city-error">{errors.city}</small> : null}
              </label>
            </div>

            <div className="auth-recipient-section-title">Account Security</div>
            
            <div className="auth-grid">
              <label className="auth-field" htmlFor="password">
                <span>Password <span className="required">*</span></span>
                <div className="input-wrapper auth-field__input">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField('password')} placeholder="••••••••" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? (
                      <svg className="auth-eye-icon" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg className="auth-eye-icon" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
                {errors.password ? <small id="password-error">{errors.password}</small> : null}
              </label>

              <label className="auth-field" htmlFor="confirmPassword">
                <span>Confirm password <span className="required">*</span></span>
                <div className="input-wrapper auth-field__input">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={updateField('confirmPassword')} placeholder="••••••••" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined} />
                  <button type="button" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword((value) => !value)}>
                    {showConfirmPassword ? (
                      <svg className="auth-eye-icon" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg className="auth-eye-icon" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword ? <small id="confirmPassword-error">{errors.confirmPassword}</small> : null}
              </label>
            </div>
            
            <PasswordStrength password={form.password} variant="recipient" />

            {submitError ? (
              <p className="auth-form-feedback auth-form-feedback--error" role="alert">
                {submitError}
              </p>
            ) : null}

            <div className="auth-actions">    
              <div className="footer-box auth-footer-box">
                <div className="auth-footer-links">
                  <p className="auth-link auth-footer-link">
                    Already have an account? <Link to="/login">Login to Portal</Link>
                  </p>
                  <p className="auth-link auth-footer-link">
                    Seeking to donate? <Link to="/register/donor">Switch to Donor Registration</Link>
                  </p>
                </div>
              </div>
              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Complete Registration'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
export default RecipientRegisterPage;