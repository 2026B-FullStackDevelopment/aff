import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/components/ui/sonner';
import { getResponseMessage } from '@/shared/utils/apiError';
import type { AnyUserDTO, PaginatedData, UserDTO, UserRole } from '@/types/api';
import { adminService } from '../services/admin.service';

const PAGE_SIZE = 10;
const ROLES: UserRole[] = ['RECIPIENT', 'DONOR', 'ADMIN', 'COURIER'];
const STATUSES: UserDTO['status'][] = ['ACTIVE', 'DEACTIVATED'];

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseOption<T extends string>(value: string | null, options: T[]): T | undefined {
  return value && options.includes(value as T) ? (value as T) : undefined;
}

function withUserStatus(
  result: PaginatedData<AnyUserDTO> | null,
  userId: string,
  status: UserDTO['status'],
) {
  if (!result) return result;

  return {
    ...result,
    items: result.items.map((user) => user.id === userId ? { ...user, status } : user),
  };
}

/** Loads and mutates the URL-backed Admin account directory. */
export function useAdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const role = parseOption(searchParams.get('role'), ROLES);
  const status = parseOption(searchParams.get('status'), STATUSES);
  const search = (searchParams.get('search') ?? '').slice(0, 100);
  const [result, setResult] = useState<PaginatedData<AnyUserDTO> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingUserIds, setPendingUserIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let isCurrent = true;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await adminService.listUsers({
          page,
          limit: PAGE_SIZE,
          role,
          status,
          search: search || undefined,
        });

        if (!isCurrent) return;

        if (!response.ok || !response.data) {
          setError(getResponseMessage(response.data, 'Unable to load the user directory. Please try again.'));
          return;
        }

        setResult(response.data);
      } catch {
        if (isCurrent) {
          setError('Unable to reach the server. Check that the backend is running.');
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadUsers();

    return () => {
      isCurrent = false;
    };
  }, [page, reloadKey, role, search, status]);

  const setFilter = useCallback((name: 'role' | 'status' | 'search', value?: string) => {
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);

      if (value) nextParams.set(name, value);
      else nextParams.delete(name);

      nextParams.delete('page');
      return nextParams;
    });
  }, [setSearchParams]);

  const setPage = useCallback((nextPage: number) => {
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      nextParams.set('page', String(nextPage));
      return nextParams;
    });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams((current) => {
      const nextParams = new URLSearchParams(current);
      nextParams.delete('page');
      nextParams.delete('role');
      nextParams.delete('status');
      nextParams.delete('search');
      return nextParams;
    });
  }, [setSearchParams]);

  const updateUserStatus = useCallback(async (
    userId: string,
    nextStatus: UserDTO['status'],
  ) => {
    const previousStatus = result?.items.find((user) => user.id === userId)?.status;
    if (!previousStatus || previousStatus === nextStatus) return;

    setPendingUserIds((current) => new Set(current).add(userId));
    setResult((current) => withUserStatus(current, userId, nextStatus));

    try {
      const response = await adminService.updateUserStatus(userId, { status: nextStatus });

      if (!response.ok || !response.data) {
        setResult((current) => withUserStatus(current, userId, previousStatus));
        toast.error(getResponseMessage(response.data, 'Unable to update the account status.'));
        return;
      }

      const persistedStatus = response.data.status;
      setResult((current) => withUserStatus(current, userId, persistedStatus));
      toast.success(nextStatus === 'ACTIVE' ? 'Account reactivated' : 'Account deactivated');
    } catch {
      setResult((current) => withUserStatus(current, userId, previousStatus));
      toast.error('Unable to reach the server. Check that the backend is running.');
    } finally {
      setPendingUserIds((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
    }
  }, [result]);

  const retry = useCallback(() => setReloadKey((current) => current + 1), []);
  const setRole = useCallback(
    (nextRole?: UserRole) => setFilter('role', nextRole),
    [setFilter],
  );
  const setStatus = useCallback(
    (nextStatus?: UserDTO['status']) => setFilter('status', nextStatus),
    [setFilter],
  );
  const setSearch = useCallback(
    (nextSearch: string) => setFilter('search', nextSearch),
    [setFilter],
  );

  return {
    users: result?.items ?? [],
    page: result?.page ?? page,
    pageSize: result?.limit ?? PAGE_SIZE,
    total: result?.total ?? 0,
    isLoading,
    error,
    role,
    status,
    search,
    hasActiveFilters: Boolean(role || status || search),
    pendingUserIds,
    setRole,
    setStatus,
    setSearch,
    clearFilters,
    updateUserStatus,
    setPage,
    retry,
  };
}
