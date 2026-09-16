import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { DonorTopNavigation } from '@/shared/components/DonorTopNavigation';
import { PageHeader } from '@/shared/components/PageHeader';
import { getStoredUser } from '@/services/authStorage';
import { CloneListingForm } from '../components/CloneListingForm';
import { CreateListingForm } from '../components/CreateListingForm';

// Renders new-listing and C2 duplicate-review modes.
export function FoodListingCreationPage() {
  const navigate = useNavigate();
  const [searchParameters] = useSearchParams();
  const storedUser = getStoredUser();

  const donor =
    storedUser?.role === 'DONOR'
      ? storedUser
      : null;

  const cloneFrom =
    searchParameters.get('cloneFrom');

  const isCloneMode = Boolean(cloneFrom);

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
        <PageHeader
          title={
            isCloneMode
              ? 'Duplicate Food Listing'
              : 'New Food Listing'
          }
          description={
            isCloneMode
              ? 'Review the source listing before creating an independent active copy.'
              : 'Create a food listing for donation or affordable sale.'
          }
        />

        <div className="mt-6">
          {cloneFrom ? (
            <CloneListingForm
              listingId={cloneFrom}
              onBack={() =>
                navigate('/donor/donations')
              }
            />
          ) : (
            <CreateListingForm />
          )}
        </div>
      </main>
    </div>
  );
}

export default FoodListingCreationPage;