import { useCallback, useEffect, useState } from 'react';
import type { AnyUserDTO } from '@/types/api';
import { userService } from '../services/user.service';

export function useProfile() {
  const [profile, setProfile] = useState<AnyUserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await userService.getMyProfile();

    if (response.ok) {
      setProfile(response.data);
    } else {
      setError('Unable to load your profile.');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, isLoading, error, refetch: loadProfile };
}
