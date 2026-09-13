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
  const errors: string[] = [];

  if (!allRulesMet) {
    errors.push('Please fulfill all password requirements below.');
  }

  if (password.length > 72) {
    errors.push('Password cannot be greater than 72 characters.');
  }

  return { isValid: errors.length === 0, errors };
}

/** Mirrors the backend's shared email schema for immediate form feedback. */
export function validateEmail(email: string): ValidationResult {
  const value = email.trim();
  const errors: string[] = [];

  if (value.split('@').length !== 2) {
    errors.push('Email must contain exactly one @ symbol.');
  } else if (!value.split('@')[1]?.includes('.')) {
    errors.push('Email must contain a . after the @ symbol.');
  } else if (value.length >= 255) {
    errors.push('Email must be under 255 characters.');
  } else if (/[\s();:]/.test(value)) {
    errors.push('Email must not contain spaces or the characters ( ) ; :');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateTaxCode(taxCode: string): ValidationResult {
  const errors: string[] = [];
  const value = taxCode.trim();

  if (!/^\d{10,13}$/.test(value)) {
    errors.push('Tax code must be 10 to 13 digits.');
  }

  return { isValid: errors.length === 0, errors };
}
