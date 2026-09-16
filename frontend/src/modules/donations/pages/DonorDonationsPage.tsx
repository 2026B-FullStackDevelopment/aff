import { useSearchParams } from 'react-router-dom';
import { DonorTopNavigation } from '@/shared/components/DonorTopNavigation';
import { getStoredUser } from '@/services/authStorage';
import { DonorListingOrdersPanel } from '../components/DonorListingOrdersPanel';
import { DonorListingResults } from '../components/DonorListingResults';
import type { ManagedListingDTO } from '../types';

// Renders the Donor listing search and management route.
export function DonorDonationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storedUser = getStoredUser();
  const donor = storedUser?.role === 'DONOR' ? storedUser : null;
  const listingId = searchParams.get('listingId')?.trim() || null;

  function openListingOrders(listing: ManagedListingDTO) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('listingId', listing.id);
      return next;
    });
  }

  function closeListingOrders() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('listingId');
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#FBF9F8]">
      <DonorTopNavigation
        avatarUrl={donor?.avatarUrl}
        avatarAlt={
          donor
            ? `${donor.companyName} profile`
            : 'Donor profile'
        }
      />

      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {listingId ? (
          <DonorListingOrdersPanel listingId={listingId} onBack={closeListingOrders} />
        ) : (
          <DonorListingResults onViewOrders={openListingOrders} />
        )}
      </main>
    </div>
  );
}

export default DonorDonationsPage;
