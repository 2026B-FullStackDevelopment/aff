import { useCallback, useEffect, useState } from 'react';
import { userService } from '@/modules/users/services/user.service';
import type { AdminUserDTO } from '@/types/api';

/** Loads and refreshes the authenticated Admin's base user profile. */
export function useAdminProfile() {
  const [profile, setProfile] = useState<AdminUserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    async function loadProfile() {
      const response = await userService.getMyProfile();
      if (!active) return;

      if (response.ok && response.data?.role === 'ADMIN') {
        setProfile(response.data);
      } else {
        setProfile(null);
        setError(
          response.ok
            ? 'This profile is not an Admin account.'
            : 'Unable to load the Admin profile.',
        );
      }

      setIsLoading(false);
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return { profile, isLoading, error, refetch, setProfile };
}

