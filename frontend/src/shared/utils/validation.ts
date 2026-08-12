import { PASSWORD_RULES } from './passwordRules';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];
  const value = username.trim();

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(value)) {
    errors.push('Username can only contain English letters, numbers, underscores (_), and hyphens (-).');
  }

  return { isValid: errors.length === 0, errors };
}

export function validatePassword(password: string): ValidationResult {
  const allRulesMet = PASSWORD_RULES.every((rule) => rule.test(password));
  const errors = allRulesMet ? [] : ['Please fulfill all password requirements below.'];

  return { isValid: errors.length === 0, errors };
}