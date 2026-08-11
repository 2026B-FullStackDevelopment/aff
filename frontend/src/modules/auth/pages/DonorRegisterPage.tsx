import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const CITIES = [
  'Hồ Chí Minh City',
  'Hà Nội',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Biên Hòa',
  'Nha Trang',
  'Huế',
  'Vũng Tàu',
  'Buôn Ma Thuột',
];

type FormState = {
  companyName: string;
  taxCode: string;
  address: string;
  city: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type ErrorsState = Partial<Record<keyof FormState, string>>;

export function DonorRegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    companyName: '',
    taxCode: '',
    address: '',
    city: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ErrorsState>({});

  const requiredFields = ['companyName', 'taxCode', 'address', 'city', 'username', 'email', 'password', 'confirmPassword'] as const;
  const filledFields = requiredFields.filter(f => form[f].trim() !== '').length;
  const progressPercent = Math.round((filledFields / requiredFields.length) * 100);

  const getPwdStrength = () => {
    const p = form.password;
    if (!p) return { label: '', color: 'transparent', score: 0 };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    
    if (score <= 1) return { label: 'Too weak', color: '#DC2626', score };
    if (score === 2) return { label: 'Weak', color: '#F59E0B', score };
    if (score === 3) return { label: 'Good', color: '#10B981', score };
    return { label: 'Strong', color: '#059669', score };
  };
  const pwdStrength = getPwdStrength();

  const updateField = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: ErrorsState = {};
    (Object.keys(form) as Array<keyof FormState>).forEach((field) => {
      const value = form[field].trim();
      if (!value && field !== 'phone') {
        nextErrors[field] = 'This field is required.';
      }
    });

    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords don't match.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const result = await register({
      name: form.companyName,
      email: form.email,
      password: form.password,
      role: 'DONOR',
    });

    if (result.ok) {
      navigate('/login');
    }
  };

  return (
    <main className="auth-shell auth-shell--split auth-donor" style={{ flexDirection: 'column', alignItems: 'center' }}>
      
      <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
        <h1 className="auth-donor-title">AFF Portal</h1>
        <div className="auth-donor-subtitle">Institutional Donor Registration</div>
      </div>

      <section className="auth-panel auth-panel--form">
        <div>
          <div className="auth-donor-header-row">
            <div className="auth-donor-header-left">
              <h2>Create your account</h2>
              <p>Fields marked <span style={{color: '#DC2626'}}>*</span> are required.</p>
            </div>
            <div className="auth-donor-progress">
              <div className="auth-donor-progress-text">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="auth-donor-progress-bar">
                <div className="auth-donor-progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          <form className="auth-form auth-form--stacked" onSubmit={handleSubmit}>
            
            <div className="auth-donor-section-title">Organization Details</div>
            
            <div className="auth-grid">
            <label className="auth-field">
              <span>Company name <span className="required">*</span></span>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
                <input value={form.companyName} onChange={updateField('companyName')} placeholder="e.g., Global Initiatives Corp" />
              </div>
              <div className="helper-text">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Supports Vietnamese alphabets, numbers, and hyphens.
              </div>
              {errors.companyName ? <small>{errors.companyName}</small> : null}
            </label>

            <label className="auth-field no-icon">
              <span>Tax code <span className="required">*</span></span>
              <div className="input-wrapper">
                <input value={form.taxCode} onChange={updateField('taxCode')} placeholder="0123456789" />
              </div>
              <div className="helper-text">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Must be 10 to 13 digits.
              </div>
              {errors.taxCode ? <small>{errors.taxCode}</small> : null}
            </label>

            <label className="auth-field no-icon">
              <span>Address <span className="required">*</span></span>
              <div className="input-wrapper">
                <input value={form.address} onChange={updateField('address')} placeholder="e.g., Global Initiatives Corp" />
              </div>
              {errors.address ? <small>{errors.address}</small> : null}
            </label>

            <label className="auth-field no-icon">
              <span>Registration city <span className="required">*</span></span>
              <div className="input-wrapper">
                <select value={form.city} onChange={updateField('city')}>
                  <option value="">Select Municipality</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              {errors.city ? <small>{errors.city}</small> : null}
            </label>
          </div>

          <div className="auth-donor-section-title">Contact & Security</div>
          
          <div className="auth-grid">
            <label className="auth-field">
              <span>Username <span className="required">*</span></span>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <input value={form.username} onChange={updateField('username')} placeholder="Enter your username" />
              </div>
              {errors.username ? <small>{errors.username}</small> : null}
            </label>

            <label className="auth-field">
              <span>Email <span className="required">*</span></span>
              <div className="input-wrapper">
                 <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <input type="email" value={form.email} onChange={updateField('email')} placeholder="Email@organization.com" />
              </div>
              {errors.email ? <small>{errors.email}</small> : null}
            </label>

            <label className="auth-field">
              <span>Phone number</span>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <input type="tel" value={form.phone} onChange={updateField('phone')} placeholder="+84 900 000 000" />
              </div>
            </label>

            <div></div>

            <label className="auth-field">
              <span>Password <span className="required">*</span></span>
              <div className="input-wrapper auth-field__input">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField('password')} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '1.2rem', height: '1.2rem'}}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '1.2rem', height: '1.2rem'}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              {errors.password ? <small>{errors.password}</small> : null}
            </label>

            <label className="auth-field">
              <span>Confirm password <span className="required">*</span></span>
              <div className="input-wrapper auth-field__input">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={updateField('confirmPassword')} placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)}>
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '1.2rem', height: '1.2rem'}}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '1.2rem', height: '1.2rem'}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword ? <small>{errors.confirmPassword}</small> : null}
            </label>
          </div>
          
          <div className={`auth-donor-pwd-strength-wrapper ${form.password.length > 0 ? 'show' : ''}`}>
            <div className="auth-donor-pwd-strength">
              <div className="auth-donor-pwd-header">
                <span className="auth-donor-pwd-label">Password strength</span>
                <span className="auth-donor-pwd-status" style={{color: pwdStrength.color}}>{pwdStrength.label}</span>
              </div>
              <div className="auth-donor-pwd-bars">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="auth-donor-pwd-bar" style={{ background: i <= pwdStrength.score ? pwdStrength.color : '#E5E7EB' }}></div>
                ))}
              </div>
              <p className="auth-donor-pwd-desc">Min 8 characters, 1 uppercase, 1 number, 1 special character.</p>
            </div>
          </div>
        </form>
        </div>

        <div className="footer-box" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
            <p className="auth-link" style={{ margin: 0, textAlign: 'left' }}>
              Already registered? <Link to="/login">Log in to the portal</Link>
            </p>
            <p className="auth-link" style={{ margin: 0, textAlign: 'left' }}>
              Seeking resources? <Link to="/register/recipient">Switch to Recipient Registration</Link>
            </p>
          </div>
          <button className="auth-submit" style={{ margin: 0 }} onClick={(e) => {
             const formElem = e.currentTarget.closest('.auth-panel')?.querySelector('form');
             if (formElem) {
               formElem.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
             }
          }}>
            Complete Registration
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>

      </section>
    </main>
  );
}
export default DonorRegisterPage;