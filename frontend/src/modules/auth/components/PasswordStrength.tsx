type PasswordStrengthProps = {
  password: string;
  variant?: 'recipient' | 'donor';
};

type StrengthResult = {
  label: string;
  score: number;
  tone: 'weak' | 'medium' | 'good' | 'strong';
};

type PasswordRequirement = {
  label: string;
  isMet: boolean;
};

function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: 'At least 8 characters', isMet: password.length >= 8 },
    { label: 'At least 1 uppercase letter', isMet: /[A-Z]/.test(password) },
    { label: 'At least 1 number', isMet: /[0-9]/.test(password) },
    { label: 'At least 1 special character', isMet: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getPasswordStrength(password: string): StrengthResult {
  if (!password) {
    return { label: '', score: 0, tone: 'weak' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { label: 'Too weak', score, tone: 'weak' };
  }
  if (score === 2) {
    return { label: 'Weak', score, tone: 'medium' };
  }
  if (score === 3) {
    return { label: 'Good', score, tone: 'good' };
  }

  return { label: 'Strong', score, tone: 'strong' };
}

export function PasswordStrength({ password, variant = 'recipient' }: PasswordStrengthProps) {
  const strength = getPasswordStrength(password);
  const requirements = getPasswordRequirements(password);
  const prefix = variant === 'donor' ? 'auth-donor-pwd' : 'auth-recipient-pwd';
  const wrapperClassName = [
    `${prefix}-strength-wrapper`,
    password.length > 0 ? 'show' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClassName}>
      <div className={`${prefix}-strength`}>
        <div className={`${prefix}-header`}>
          <span className={`${prefix}-label`}>Password strength</span>
          <span className={`${prefix}-status ${prefix}-status--${strength.tone}`}>
            {strength.label}
          </span>
        </div>
        <div className={`${prefix}-bars`}>
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className={`${prefix}-bar ${index <= strength.score ? `${prefix}-bar--active ${prefix}-bar--${strength.tone}` : ''}`}
            />
          ))}
        </div>
        <p className={`${prefix}-desc`}>Password must meet all requirements below.</p>
        <ul className={`${prefix}-requirements`}>
          {requirements.map((requirement) => (
            <li
              key={requirement.label}
              className={`${prefix}-requirement ${requirement.isMet ? 'is-met' : ''}`}
            >
              <span className={`${prefix}-requirement-icon`}>{requirement.isMet ? '✓' : '•'}</span>
              <span>{requirement.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
