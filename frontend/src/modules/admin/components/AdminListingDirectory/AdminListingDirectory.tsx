import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog/ConfirmationDialog';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import type { AdminListingDTO } from '@/types/api';
import { useAdminListings } from '../../hooks/useAdminListings';
import { AdminListingCard, AdminListingRow } from './AdminListingEntry';

/** Responsive directory for all Listings visible to an Admin. */
export function AdminListingDirectory() {
  const directory = useAdminListings();
  const [searchDraft, setSearchDraft] = useState('');
  const [selectedListing, setSelectedListing] = useState<AdminListingDTO | null>(null);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    directory.applySearch(searchDraft);
  }

  async function confirmCancellation() {
    if (!selectedListing) return;
    const succeeded = await directory.cancelListing(selectedListing);
    if (succeeded) setSelectedListing(null);
  }

  return (
    <section aria-labelledby="listing-directory-title">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 id="listing-directory-title" className="text-3xl font-extrabold tracking-tight text-[#1e3a5f]">
            Listing directory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search every listing and safely cancel listings that have no protected deliveries.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex w-full max-w-xl gap-2" role="search">
          <label htmlFor="admin-listing-search" className="sr-only">
            Search by Donor name, Donor ID, or listing ID
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="admin-listing-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Donor name, Donor ID, or listing ID"
              maxLength={100}
              className="h-10 w-full rounded-md border border-[#d1d9e0] bg-slate-50 pl-9 pr-3 text-sm text-[#1e3a5f] outline-none transition focus:border-[#5b7bc0] focus:ring-4 focus:ring-[rgba(91,123,192,0.15)]"
            />
          </div>
          <Button type="submit" className="bg-[#5b7bc0] text-white hover:bg-[#4a6ab0]">
            Search
          </Button>
        </form>
      </div>

      {directory.isLoading ? (
        <LoadingSkeleton count={4} />
      ) : directory.error ? (
        <ErrorState message={directory.error} onRetry={directory.retry} />
      ) : directory.items.length === 0 ? (
        <EmptyState
          theme="admin"
          title={directory.search ? 'No matching listings' : 'No listings yet'}
          description={
            directory.search
              ? `No listing or Donor matched “${directory.search}”.`
              : 'Listings will appear here as Donors create them.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(30,58,95,0.08)]">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1260px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Listing</th>
                  <th scope="col" className="px-4 py-3">Donor</th>
                  <th scope="col" className="px-4 py-3">Classification</th>
                  <th scope="col" className="px-4 py-3">Availability</th>
                  <th scope="col" className="px-4 py-3">Status / impact</th>
                  <th scope="col" className="px-4 py-3">Created</th>
                  <th scope="col" className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dce3ec]">
                {directory.items.map((listing) => (
                  <AdminListingRow key={listing.id} listing={listing} onCancel={setSelectedListing} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#dce3ec] md:hidden">
            {directory.items.map((listing) => (
              <AdminListingCard key={listing.id} listing={listing} onCancel={setSelectedListing} />
            ))}
          </div>

          <Pagination
            theme="admin"
            page={directory.page}
            pageSize={directory.pageSize}
            totalItems={directory.total}
            itemLabel="listings"
            isDisabled={directory.isLoading}
            onPageChange={directory.goToPage}
          />
        </div>
      )}

      <ConfirmationDialog
        open={selectedListing !== null}
        title="Cancel this listing?"
        tone="danger"
        confirmLabel="Cancel listing"
        isPending={selectedListing?.id === directory.cancellingId}
        onClose={() => setSelectedListing(null)}
        onConfirm={confirmCancellation}
        description={
          selectedListing ? (
            <p>
              <strong>{selectedListing.name}</strong> has{' '}
              <strong>{selectedListing.pendingOrderCount}</strong> cancellable pending{' '}
              {selectedListing.pendingOrderCount === 1 ? 'order' : 'orders'}. Affected Recipients will be notified. Assigned, picked-up, and delivered orders are protected.
            </p>
          ) : null
        }
      />
    </section>
  );
}

export default AdminListingDirectory;
