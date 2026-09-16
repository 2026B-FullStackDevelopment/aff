import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { SelectField } from '@/shared/components/SelectField';
import { Input } from '@/shared/components/ui/input';
import type { UserDTO, UserRole } from '@/types/api';

interface UserDirectoryFiltersProps {
  search: string;
  role?: UserRole;
  status?: UserDTO['status'];
  onSearchChange: (search: string) => void;
  onRoleChange: (role?: UserRole) => void;
  onStatusChange: (status?: UserDTO['status']) => void;
  onClear: () => void;
}

const ROLE_OPTIONS = [
  { label: 'Recipient', value: 'RECIPIENT' },
  { label: 'Donor', value: 'DONOR' },
  { label: 'Courier', value: 'COURIER' },
  { label: 'Admin', value: 'ADMIN' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Deactivated', value: 'DEACTIVATED' },
];

/** Responsive, URL-backed controls for narrowing the Admin account directory. */
export function UserDirectoryFilters({
  search,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onClear,
}: UserDirectoryFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);
  const hasFilters = Boolean(search || role || status);

  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    const normalizedSearch = searchInput.trim();
    if (normalizedSearch === search) return;

    const timeoutId = window.setTimeout(() => onSearchChange(normalizedSearch), 300);
    return () => window.clearTimeout(timeoutId);
  }, [onSearchChange, search, searchInput]);

  return (
    <section
      aria-label="Filter user accounts"
      className="rounded-xl border border-admin-border/40 bg-admin-surface p-4 shadow-[0_2px_8px_rgba(0,35,111,0.06)] sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(18rem,1fr)_13rem_13rem_auto] lg:items-end">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="admin-user-search" className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Search accounts
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-admin-text-muted" aria-hidden="true" />
            <Input
              id="admin-user-search"
              type="search"
              value={searchInput}
              maxLength={100}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Username, email, or name"
              className="h-11 border-slate-200 bg-white pl-10 focus-visible:border-[#5b7bc0] focus-visible:ring-[#5b7bc0]/15"
            />
          </div>
        </div>

        <SelectField
          id="admin-user-role"
          name="role"
          label="Role"
          placeholder="All roles"
          options={ROLE_OPTIONS}
          value={role ?? ''}
          onChange={(event) => onRoleChange((event.target.value || undefined) as UserRole | undefined)}
        />

        <SelectField
          id="admin-user-status"
          name="status"
          label="Status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={status ?? ''}
          onChange={(event) => onStatusChange((event.target.value || undefined) as UserDTO['status'] | undefined)}
        />

        <Button
          type="button"
          variant="outline"
          disabled={!hasFilters}
          onClick={() => {
            setSearchInput('');
            onClear();
          }}
          className="h-11 gap-2 border-admin-border/60 px-4 text-admin-title hover:bg-[#eff4ff] sm:col-span-2 lg:col-span-1"
        >
          <X className="size-4" aria-hidden="true" />
          Clear
        </Button>
      </div>
    </section>
  );
}

export default UserDirectoryFilters;
