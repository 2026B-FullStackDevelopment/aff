import { Panel } from '@/shared/components/Panel/Panel';
import {
  UNIT_LABELS,
  formatCategory,
  formatPrice,
} from '@/shared/utils/listingFormatting';
import type { ListingDTO } from '@/types/api';
import { ListingDetailField } from './ListingDetailField';

interface ListingOrderSummaryProps {
  listing: ListingDTO;
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
        <ListingDetailField
          label="Donation name"
          value={listing.name}
        />

        <ListingDetailField
          label="Measurement unit"
          value={UNIT_LABELS[listing.unit]}
        />

        <ListingDetailField
          label="Price"
          value={formatPrice(listing.price)}
        />

        <ListingDetailField
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