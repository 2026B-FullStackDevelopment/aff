// Dashboard page component

import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { buttonVariants } from '@/shared/components/Button/Button';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { PageHeader } from '@/shared/components/PageHeader/PageHeader';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { cn } from '@/shared/utils';
import { UserTable } from '../components/UserTable/UserTable';
import { useAdminUsers } from '../hooks/useAdminUsers';

/** Renders the paginated, role-aware Admin user directory. */
export function AdminDashboardPage() {
  const { users, page, pageSize, total, isLoading, error, setPage, retry } = useAdminUsers();

  const createCourierButton = (
    <Link
      to="/admin/couriers/new"
      className={cn(
        buttonVariants({ size: 'lg' }),
        'h-10 bg-admin-primary px-4 text-white hover:bg-admin-primary-hover',
      )}
    >
      <Plus aria-hidden="true" />
      Create Courier
    </Link>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        theme="admin"
        title="User Directory"
        description="View all Recipient, Donor, Courier, and Admin accounts."
        actions={createCourierButton}
      />

      {isLoading && <LoadingSkeleton count={4} />}

      {!isLoading && error && <ErrorState message={error} onRetry={retry} />}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          theme="admin"
          icon={Users}
          title="No user accounts found"
          description="Create the first Courier account or check your database connection."
          action={createCourierButton}
        />
      )}

      {!isLoading && !error && users.length > 0 && (
        <section aria-label="User accounts">
          <UserTable users={users} />
          <Pagination
            theme="admin"
            page={page}
            pageSize={pageSize}
            totalItems={total}
            itemLabel="accounts"
            onPageChange={setPage}
            className="rounded-b-xl"
          />
        </section>
      )}
    </div>
  );
}
