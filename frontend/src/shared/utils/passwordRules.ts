export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'At least 1 uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'At least 1 number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least 1 special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];