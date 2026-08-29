import {
  CheckCircle2,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { IconField } from '@/shared/components/IconField/IconField';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { Panel } from '@/shared/components/Panel/Panel';
import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import { cn } from '@/shared/utils';
import { UNIT_LABELS, formatCategory } from '@/shared/utils/listingFormatting';
import type {
  ListingGroup,
  ManagedListingDTO,
} from '../types';

interface ReservationListingPickerProps {
  listings: ManagedListingDTO[];
  selectedListingId: string | null;
  search: string;
  group: ListingGroup;
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onGroupChange: (group: ListingGroup) => void;
  onPageChange: (page: number) => void;
  onSelect: (listing: ManagedListingDTO) => void;
  onRetry: () => void;
}

function ListingChoice({
  listing,
  isSelected,
  onSelect,
}: {
  listing: ManagedListingDTO;
  isSelected: boolean;
  onSelect: (
    listing: ManagedListingDTO,
  ) => void;
}) {
  const supportsOrders =
    listing.unit !== 'PER_REQUEST';

  return (
    <li>
      <button
        type="button"
        aria-pressed={isSelected}
        aria-disabled={!supportsOrders}
        onClick={() => {
          if (supportsOrders) {
            onSelect(listing);
          }
        }}
        className={cn(
          'flex w-full items-center gap-4 rounded-lg border p-4 text-left',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#805300]/20',
          isSelected
            ? 'border-[#805300] bg-[#FFF6E3]'
            : 'border-[#E4E2E1] bg-white',
          supportsOrders
            ? 'cursor-pointer hover:border-[#805300] hover:bg-[#FFF6E3]/60 hover:shadow-sm active:scale-[0.995]'
            : 'cursor-not-allowed opacity-70',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-[#1B1C1C]">
              {listing.name}
            </h3>

            <StatusBadge
              status={listing.status}
            />
          </div>

          <p className="mt-1 truncate text-xs text-[#6B7280]">
            {formatCategory(listing.category)}
            {' · '}
            {UNIT_LABELS[listing.unit]}
            {' · '}
            ID {listing.id}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-[#805300]">
          {!supportsOrders ? (
            <span className="max-w-28 text-right">
              No tracked orders
            </span>
          ) : isSelected ? (
            <>
              <CheckCircle2
                className="size-4"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                Selected
              </span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">
                View orders
              </span>
              <ChevronRight
                className="size-4"
                aria-hidden="true"
              />
            </>
          )}
        </div>
      </button>
    </li>
  );
}

// Lets Donors select the listing whose tracked orders they want to review.
export function ReservationListingPicker({
  listings,
  selectedListingId,
  search,
  group,
  page,
  pageSize,
  total,
  isLoading,
  error,
  onSearchChange,
  onGroupChange,
  onPageChange,
  onSelect,
  onRetry,
}: ReservationListingPickerProps) {
  const emptyTitle =
    group === 'ACTIVE'
      ? 'No active listings found'
      : 'No past listings found';

  const emptyDescription = search.trim()
    ? 'Try another listing name or clear the search.'
    : group === 'ACTIVE'
      ? 'Active and paused listings will appear here.'
      : 'Sold-out and cancelled listings will appear here.';

  return (
    <Panel
      title="Choose a food listing"
      description="Select one of your listings to view its tracked Recipient donations and reservations."
      className="shadow-sm"
      contentClassName="p-0"
      actions={
        <div
          className="flex rounded-lg border border-[#E4E2E1] bg-white p-1"
          role="group"
          aria-label="Listing group"
        >
          <Button
            type="button"
            variant={
              group === 'ACTIVE'
                ? 'default'
                : 'ghost'
            }
            aria-pressed={
              group === 'ACTIVE'
            }
            onClick={() =>
              onGroupChange('ACTIVE')
            }
            className={cn(
              'h-9 px-4 text-sm font-bold',
              group === 'ACTIVE'
                ? 'bg-[#805300] text-white hover:bg-[#694400]'
                : 'text-[#414844] hover:bg-[#FFF6E3]',
            )}
          >
            Active
          </Button>

          <Button
            type="button"
            variant={
              group === 'PAST'
                ? 'default'
                : 'ghost'
            }
            aria-pressed={
              group === 'PAST'
            }
            onClick={() =>
              onGroupChange('PAST')
            }
            className={cn(
              'h-9 px-4 text-sm font-bold',
              group === 'PAST'
                ? 'bg-[#805300] text-white hover:bg-[#694400]'
                : 'text-[#414844] hover:bg-[#FFF6E3]',
            )}
          >
            Past
          </Button>
        </div>
      }
    >
      <div className="border-b border-[#E4E2E1] p-4 sm:p-5">
        <IconField
          id="reservationListingSearch"
          name="reservationListingSearch"
          type="search"
          label="Search listing name"
          icon={Search}
          value={search}
          onChange={(event) =>
            onSearchChange(
              event.target.value,
            )
          }
          placeholder="Search your listings..."
          autoComplete="off"
          theme="donor"
          className="h-11 border-[#C1C8C2] bg-[#FBF9F8]"
        />
      </div>

      <div className="p-4 sm:p-5">
        {isLoading && (
          <LoadingSkeleton count={3} />
        )}

        {!isLoading && error && (
          <ErrorState
            title="Unable to load listings"
            message={error}
            retryLabel="Try Again"
            onRetry={onRetry}
          />
        )}

        {!isLoading
          && !error
          && listings.length === 0 && (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
            />
          )}

        {!isLoading
          && !error
          && listings.length > 0 && (
            <ul
              className="grid grid-cols-1 gap-3 lg:grid-cols-2"
              aria-label={`${group === 'ACTIVE' ? 'Active' : 'Past'} food listings`}
            >
              {listings.map((listing) => (
                <ListingChoice
                  key={listing.id}
                  listing={listing}
                  isSelected={
                    listing.id
                    === selectedListingId
                  }
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )}
      </div>

      {!error && total > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={total}
          itemLabel="listings"
          isDisabled={isLoading}
          onPageChange={onPageChange}
          className="rounded-b-xl border-x-0 border-b-0"
        />
      )}
    </Panel>
  );
}

export default ReservationListingPicker;