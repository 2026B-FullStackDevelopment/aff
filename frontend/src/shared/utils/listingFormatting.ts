// Shared display formatters for listing UI.
import { CATEGORY_OPTIONS } from '@/shared/constants/categories';
import { UNIT_OPTIONS } from '@/shared/constants/units';

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
);

export const UNIT_LABELS: Record<string, string> = Object.fromEntries(
  UNIT_OPTIONS.map((option) => [option.value, option.label]),
);

export function formatCategory(category?: string | null): string {
  if (!category) return '';
  return (
    CATEGORY_LABELS[category] ??
    category
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

export function shortCityLabel(city: string): string {
  return city.replace(/^(Thành phố|Tỉnh)\s+/i, '');
}

export function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `${price.toLocaleString('en-US')} VND`;
}

interface FormatDateOptions {
  /** Include the time of day alongside the date (e.g. Donor listing management views). */
  withTime?: boolean;
}

export function formatDate(iso: string, options?: FormatDateOptions): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  if (options?.withTime) {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
