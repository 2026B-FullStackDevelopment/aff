// Login page screen for recipient, donor, and admin sign-in.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../shared/components/Button/Button';
import '../style/AuthPages.css';

export function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    login({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });
  }

  return (
    <main className="auth-shell auth-shell--split auth-login" style={{ flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
        <h1 className="auth-login-title">AFF Portal</h1>
        <div className="auth-login-subtitle">Securing the supply chain for a sustainable future.</div>
        <p className="auth-login-tagline">Sign in to your Affordable Food Federation account to continue.</p>
      </div>
      <section className="auth-panel auth-panel--form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">EMAIL</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input id="email" name="email" type="email" placeholder="name123@affordablefood.com" required />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">PASSWORD</label>
            <div className="input-wrapper auth-field__input">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3"/>
                <path d="M8 11.5A5 5 0 0 0 3 16.5V19h18v-2.5a5 5 0 0 0-5-5H8z"/>
              </svg>
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" required />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? (
                  /* Eye-open icon: password is visible, click to hide */
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '1.2rem', height: '1.2rem'}}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  /* Eye-off icon: password is hidden, click to show */
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: '1.2rem', height: '1.2rem'}}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="auth-actions">
            <Button className="auth-submit" type="submit">Login →</Button>
          </div>
        </form>

        <p className="auth-link auth-link--stacked">
          Don't have an account? {' '}
          <br />
          Sign up {' '}
          <Link to="/register/recipient" className="auth-link--recipient">as a Recipient</Link>
          {' '} or {' '}
          <Link to="/register/donor" className="auth-link--donor">as a Donor</Link>
        </p>
      </section>
    </main>
  );
}
