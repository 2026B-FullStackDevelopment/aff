import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getResponseMessage } from '@/shared/utils/apiError';
import { Button } from '@/shared/components/Button';
import { PasswordField } from '@/shared/components/PasswordField';
import { IconField } from '@/shared/components/IconField';
import { FormErrorAlert } from '@/shared/components/FormErrorAlert';
import { ROLE_HOME } from '@/shared/constants/roleHome';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await login({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });

    if (result.ok && result.data?.user) {
      const destination = ROLE_HOME[result.data.user.role] ?? '/';
      navigate(destination, { replace: true });
    } else {
      const message = getResponseMessage(result.data, 'Unable to sign in. Please try again.');
      setSubmitError(message);
    }

    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f0f4f8]">
      <div className="text-center mb-6 max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1e3a5f] mb-1">
          AFF Portal
        </h1>
        <div className="text-lg font-bold text-slate-800">
          Securing the supply chain for a sustainable future.
        </div>
        <p className="text-xs text-slate-500">
          Sign in to your Affordable Food Federation account to continue.
        </p>
      </div>

      <section className="w-full max-w-[480px] bg-white rounded-2xl border border-[#dce3ec] p-6 sm:p-8 shadow-xl">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          {/* Email field */}
          <IconField
            id="email"
            name="email"
            type="email"
            label="EMAIL"
            placeholder="name123@affordablefood.com"
            autoComplete="email"
            required
            icon={User}
            theme="admin"
          />

          {/* Password field */}
          <PasswordField
            id="password"
            name="password"
            label="PASSWORD"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            theme="admin"
          />

          <FormErrorAlert message={submitError} />

          <div className="mt-1">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-[#5b7bc0] hover:bg-[#4a6ab0] active:scale-[0.98] text-white font-bold rounded-lg text-base transition-all duration-200 ease-out hover:shadow-md"
            >
              {isSubmitting ? 'Signing in…' : 'Login →'}
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
          Don't have an account?
          <div className="mt-1.5 flex justify-center items-center gap-2 text-sm">
            <Link to="/register/recipient" className="font-bold text-slate-700 hover:text-slate-900 hover:underline transition-colors duration-150">
              Sign up as Recipient
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/register/donor" className="font-bold text-[#D97706] hover:text-[#B45309] hover:underline transition-colors duration-150">
              Sign up as Donor
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
