import { DonorTopNavigation } from '@/shared/components/DonorTopNavigation/DonorTopNavigation';
import { PageHeader } from '@/shared/components/PageHeader/PageHeader';
import { getStoredUser } from '@/services/authStorage';
import { CreateListingForm } from '../components/CreateListingForm/CreateListingForm';

// Renders the Donor New Food Listing route.
export function FoodListingCreationPage() {
  const storedUser = getStoredUser();

  const donor =
    storedUser?.role === 'DONOR'
      ? storedUser
      : null;

  return (
    <div className="min-h-screen bg-[#FBF9F8]">
      <DonorTopNavigation
        avatarUrl={donor?.avatarUrl}
        avatarAlt={
          donor
            ? `${donor.companyName} profile`
            : 'Donor profile'
        }
        hasUnreadNotifications={false}
        onNotificationsClick={() => {}}
      />

      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <PageHeader
          title="New Food Listing"
          description="Create a food listing for donation or affordable sale."
        />

        <div className="mt-6">
          <CreateListingForm />
        </div>
      </main>
    </div>
  );
}

export default FoodListingCreationPage;