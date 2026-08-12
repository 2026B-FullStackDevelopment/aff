export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates username syntax:
 * - Allows only English alphabets, numbers, underscore (_), and hyphen (-)
 */
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];
  const value = username.trim();

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(value)) {
    errors.push('Username can only contain English letters, numbers, underscores (_), and hyphens (-).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates password strength:
 * a) At least 8 characters
 * b) At least 1 number
 * c) At least 1 special character
 * d) At least 1 capitalized letter
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if ((password.length < 8) || (!/[A-Z]/.test(password)) 
    || (!/[0-9]/.test(password)) || (!/[^A-Za-z0-9]/.test(password))) {
    errors.push('Please fulfill all password requirements below.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}