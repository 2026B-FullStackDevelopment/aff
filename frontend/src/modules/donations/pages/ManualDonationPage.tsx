import { DonorTopNavigation } from '@/shared/components/DonorTopNavigation/DonorTopNavigation';
import { PageHeader } from '@/shared/components/PageHeader/PageHeader';
import { getStoredUser } from '@/services/authStorage';
import { ManualDonationForm } from '../components/ManualDonationForm';

// Renders the Donor-initiated donation route.
export function ManualDonationPage() {
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
          title="Manual Donation Log"
          description="Record food assigned directly to a registered AFF Recipient."
        />

        <div className="mx-auto mt-6 max-w-[880px]">
          <ManualDonationForm />
        </div>
      </main>
    </div>
  );
}

export default ManualDonationPage;