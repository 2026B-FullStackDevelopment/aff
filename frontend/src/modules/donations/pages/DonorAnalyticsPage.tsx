import {
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { DonorTopNavigation } from '@/shared/components/DonorTopNavigation';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton';
import { PageHeader } from '@/shared/components/PageHeader';
import { getStoredUser } from '@/services/authStorage';
import { DonorAnalyticsDashboard } from '../components/DonorAnalyticsDashboard';
import { useDonorAnalytics } from '../hooks/useDonorAnalytics';

export function DonorAnalyticsPage() {
  const storedUser = getStoredUser();

  const donor =
    storedUser?.role === 'DONOR'
      ? storedUser
      : null;

  const {
    snapshot,
    isLoading,
    error,
    refresh,
  } = useDonorAnalytics();

  const isEmpty =
    !isLoading
    && !error
    && snapshot.totalListings === 0;

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
          title="Donor Visual Analytics"
          description="A concise impact snapshot calculated securely from your listings and paid orders."
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={refresh}
              disabled={isLoading}
              className="h-11 border-[#C1C8C2] bg-white px-4 text-[#5B3A00] hover:border-[#805300] hover:bg-[#FFF6E3]"
            >
              <RefreshCw
                className="size-4"
                aria-hidden="true"
              />

              {isLoading
                ? 'Refreshing…'
                : 'Refresh'}
            </Button>
          }
        />

        <div className="mt-7">
          {isLoading && (
            <LoadingSkeleton count={4} />
          )}

          {!isLoading && error && (
            <ErrorState
              title="Unable to load analytics"
              message={error}
              retryLabel="Try Again"
              onRetry={refresh}
            />
          )}

          {isEmpty && (
            <EmptyState
              title="No analytics available"
              description="Create your first food listing to begin building an impact summary."
              icon={BarChart3}
            />
          )}

          {!isLoading
            && !error
            && !isEmpty && (
              <DonorAnalyticsDashboard
                snapshot={snapshot}
              />
            )}
        </div>
      </main>
    </div>
  );
}

export default DonorAnalyticsPage;
