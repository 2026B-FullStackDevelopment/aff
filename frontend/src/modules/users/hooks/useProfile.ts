// Loads the authenticated user's profile while keeping API state out of ProfilePage.
import { useEffect, useState } from 'react';
import type { AnyUserDTO } from '../../../types/api';
import { userService } from '../services/user.service';

export function useProfile() {
  const [profile, setProfile] = useState<AnyUserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const response = await userService.getMyProfile();

      if (!isMounted) return;

      if (response.ok) {
        setProfile(response.data);
      } else {
        setError('Unable to load your profile.');
      }

      setIsLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return { profile, isLoading, error };
}
