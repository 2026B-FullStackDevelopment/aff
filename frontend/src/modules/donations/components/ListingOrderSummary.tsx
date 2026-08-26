import { Panel } from '@/shared/components/Panel/Panel';
import type {
  ListingDTO,
  ListingUnit,
} from '@/types/api';

interface ListingOrderSummaryProps {
  listing: ListingDTO;
}

interface SummaryFieldProps {
  label: string;
  value: string;
}

const UNIT_LABELS: Record<ListingUnit, string> = {
  KILOGRAM: 'Kilogram (kg)',
  GRAM: 'Gram (g)',
  LITER: 'Liter (L)',
  MILLILITER: 'Milliliter (mL)',
  UNIT: 'Unit',
  PER_REQUEST: 'Per Request',
};

function formatPrice(
  price: number,
): string {
  if (price === 0) {
    return 'Free';
  }

  return `${price.toLocaleString('en-US')} VND`;
}

function formatCategory(
  category: string,
): string {
  return category
    .toLowerCase()
    .split('_')
    .map(
      (word) =>
        word.charAt(0).toUpperCase()
        + word.slice(1),
    )
    .join(' ');
}

function SummaryField({
  label,
  value,
}: SummaryFieldProps) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-[#6B7280]">
        {label}
      </dt>

      <dd className="mt-1 break-words text-sm font-semibold text-[#1B1C1C]">
        {value}
      </dd>
    </div>
  );
}

// Displays the selected listing details above its C8 order table.
export function ListingOrderSummary({
  listing,
}: ListingOrderSummaryProps) {
  return (
    <Panel
      className="shadow-sm"
      contentClassName="p-5 sm:p-6"
    >
      <h2 className="sr-only">
        Selected listing details
      </h2>

      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryField
          label="Donation name"
          value={listing.name}
        />

        <SummaryField
          label="Measurement unit"
          value={UNIT_LABELS[listing.unit]}
        />

        <SummaryField
          label="Price"
          value={formatPrice(listing.price)}
        />

        <SummaryField
          label="Food category"
          value={formatCategory(
            listing.category,
          )}
        />
      </dl>
    </Panel>
  );
}

export default ListingOrderSummary;