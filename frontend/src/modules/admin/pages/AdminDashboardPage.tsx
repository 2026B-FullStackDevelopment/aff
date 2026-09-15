// Dashboard page component

import { Users } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { PageHeader } from '@/shared/components/PageHeader/PageHeader';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { UserTable } from '../components/UserTable/UserTable';
import { UserDirectoryFilters } from '../components/UserDirectoryFilters/UserDirectoryFilters';
import { useAdminUsers } from '../hooks/useAdminUsers';

/** Renders the paginated, role-aware Admin user directory. */
export function AdminDashboardPage() {
  const {
    users,
    page,
    pageSize,
    total,
    isLoading,
    error,
    role,
    status,
    search,
    hasActiveFilters,
    pendingUserIds,
    setRole,
    setStatus,
    setSearch,
    clearFilters,
    updateUserStatus,
    setPage,
    retry,
  } = useAdminUsers();

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        theme="admin"
        title="User Directory"
        description="View all Recipient, Donor, Courier, and Admin accounts."
      />

      <UserDirectoryFilters
        search={search}
        role={role}
        status={status}
        onSearchChange={setSearch}
        onRoleChange={setRole}
        onStatusChange={setStatus}
        onClear={clearFilters}
      />

      {isLoading && <LoadingSkeleton count={4} />}

      {!isLoading && error && <ErrorState message={error} onRetry={retry} />}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          theme="admin"
          icon={Users}
          title={hasActiveFilters ? 'No accounts match these filters' : 'No user accounts found'}
          description={
            hasActiveFilters
              ? 'Try a different search or clear the filters to view every account.'
              : 'Create the first Courier account or check your database connection.'
          }
          action={
            hasActiveFilters
              ? <Button type="button" onClick={clearFilters}>Clear filters</Button>
              : undefined
          }
        />
      )}

      {!isLoading && !error && users.length > 0 && (
        <section aria-label="User accounts">
          <UserTable
            users={users}
            pendingUserIds={pendingUserIds}
            onStatusChange={updateUserStatus}
          />
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
