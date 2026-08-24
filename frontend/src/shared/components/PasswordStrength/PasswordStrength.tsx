import { PASSWORD_RULES } from '@/shared/utils/passwordRules';
import { cn } from '@/shared/utils';

type PasswordStrengthProps = {
  password: string;
  variant?: 'recipient' | 'donor' | 'admin';
};

type Tone = 'weak' | 'medium' | 'good' | 'strong';

type StrengthResult = {
  label: string;
  score: number;
  tone: Tone;
};

type PasswordRequirement = {
  label: string;
  isMet: boolean;
};

const toneTextStyles: Record<Tone, string> = {
  weak: 'text-red-600 font-bold',
  medium: 'text-amber-500 font-bold',
  good: 'text-emerald-500 font-bold',
  strong: 'text-emerald-600 font-bold',
};

const toneBarStyles: Record<Tone, string> = {
  weak: 'bg-red-600',
  medium: 'bg-amber-500',
  good: 'bg-emerald-500',
  strong: 'bg-emerald-600',
};

const variantCardStyles = {
  recipient: 'bg-[#f0f7f3] border-[#d1e2d8]',
  donor: 'bg-[#FFF6E3] border-[#E4E2E1]',
  admin: 'bg-[#f8fafc] border-[#d1d9e0]',
};

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return PASSWORD_RULES.map((rule) => ({
    label: rule.label,
    isMet: rule.test(password),
  }));
}

function getPasswordStrength(password: string): StrengthResult {
  if (!password) {
    return { label: '', score: 0, tone: 'weak' };
  }

  const score = PASSWORD_RULES.filter((rule) => rule.test(password)).length;

  if (score <= 1) return { label: 'Too weak', score, tone: 'weak' };
  if (score === 2) return { label: 'Weak', score, tone: 'medium' };
  if (score === 3) return { label: 'Good', score, tone: 'good' };
  return { label: 'Strong', score, tone: 'strong' };
}

export function PasswordStrength({ password, variant = 'recipient' }: PasswordStrengthProps) {
  const strength = getPasswordStrength(password);
  const requirements = getPasswordRequirements(password);
  const isVisible = password.length > 0;

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isVisible ? "max-h-80 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
      )}
    >
      <div className={cn('rounded-lg p-4 border transition-colors duration-200', variantCardStyles[variant])}>
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-slate-600 font-semibold">Password strength</span>
          <span className={cn("transition-colors duration-200", toneTextStyles[strength.tone])}>
            {strength.label}
          </span>
        </div>

        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={cn(
                'h-1 flex-1 rounded-sm bg-slate-200 transition-all duration-300 ease-out',
                index <= strength.score ? toneBarStyles[strength.tone] : ''
              )}
            />
          ))}
        </div>

        <p className="text-[0.75rem] text-slate-500 m-0">
          Password must meet all requirements below.
        </p>

        <ul className="list-none p-0 mt-3 mb-0 grid gap-1.5">
          {requirements.map((requirement) => (
            <li
              key={requirement.label}
              className={cn(
                'flex items-center gap-1.5 text-[0.75rem] transition-colors duration-200',
                requirement.isMet ? 'text-emerald-600 font-medium' : 'text-slate-500'
              )}
            >
              <span className="font-bold text-xs transition-transform duration-200">
                {requirement.isMet ? '✓' : '•'}
              </span>
              <span>{requirement.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
