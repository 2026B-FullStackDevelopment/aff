import type { ListingUnit } from "@/types/api";

export const UNIT_OPTIONS: { label: string; value: ListingUnit }[] = [
  { label: 'Kilogram', value: 'KILOGRAM' },
  { label: 'Gram', value: 'GRAM' },
  { label: 'Liter', value: 'LITER' },
  { label: 'Milliliter', value: 'MILLILITER' },
  { label: 'Unit', value: 'UNIT' },
  { label: 'Per Request', value: 'PER_REQUEST' },
];

export const UNIT_LABELS: Record<ListingUnit, string> = {
  KILOGRAM: 'kg',
  GRAM: 'g',
  LITER: 'L',
  MILLILITER: 'mL',
  UNIT: 'units',
  PER_REQUEST: 'Per request',
};

export function formatUnit(unit: ListingUnit): string {
  return UNIT_LABELS[unit] ?? unit;
}

