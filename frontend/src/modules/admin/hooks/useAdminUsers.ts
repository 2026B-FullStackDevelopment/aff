import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getResponseMessage } from '@/shared/utils/apiError';
import type { AnyUserDTO, PaginatedData } from '@/types/api';
import { adminService } from '../services/admin.service';

const PAGE_SIZE = 10;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** Loads the current Admin directory page and keeps its page in the URL. */
export function useAdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const [result, setResult] = useState<PaginatedData<AnyUserDTO> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await adminService.listUsers({ page, limit: PAGE_SIZE });

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
  }, [page, reloadKey]);

  const setPage = useCallback((nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const retry = useCallback(() => setReloadKey((current) => current + 1), []);

  return {
    users: result?.items ?? [],
    page: result?.page ?? page,
    pageSize: result?.limit ?? PAGE_SIZE,
    total: result?.total ?? 0,
    isLoading,
    error,
    setPage,
    retry,
  };
}
