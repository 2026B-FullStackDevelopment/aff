import { useCallback, useEffect, useState } from 'react';
import { notificationPreferenceService } from '../services/notificationPreference.service';
import type { NotificationPreference } from '@/types/api';

interface UseNotificationPreferencesResult {
  preferences: NotificationPreference[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  toggleActive: (id: string) => Promise<void>;
  removePreference: (id: string) => Promise<boolean>;
  upsertPreference: (preference: NotificationPreference) => void;
}

export function useNotificationPreferences(): UseNotificationPreferencesResult {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        // No tier gate on GET — this runs for STANDARD recipients too.
        const response = await notificationPreferenceService.list();
        if (!isMounted) return;

        if (!response.ok || !response.data) {
          setError('Could not load your notification preferences. Please try again.');
          return;
        }

        setPreferences(response.data);
      } catch {
        if (isMounted) {
          setError('Could not load your notification preferences. Please try again.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  // Optimistic flip with rollback on failure. Only reachable for PREMIUM
  // recipients — the card hides/disables its switch for STANDARD tier
  // before this can be called, so a 403 here would indicate a stale UI
  // state rather than an expected path.
  const toggleActive = useCallback(async (id: string) => {
    let previous: NotificationPreference | undefined;

    setPreferences((current) =>
      current.map((pref) => {
        if (pref.id !== id) return pref;
        previous = pref;
        return { ...pref, isActive: !pref.isActive };
      }),
    );

    if (!previous) return;

    const response = await notificationPreferenceService.update(id, {
      isActive: !previous.isActive,
    });

    if (!response.ok || !response.data) {
      const rollbackTo = previous;
      setPreferences((current) =>
        current.map((pref) => (pref.id === id ? rollbackTo : pref)),
      );
    }
  }, []);

  const removePreference = useCallback(async (id: string) => {
    const response = await notificationPreferenceService.remove(id);
    if (!response.ok) return false;

    setPreferences((current) => current.filter((pref) => pref.id !== id));
    return true;
  }, []);

  // Used by PreferenceFormPanel's onSaved callback: merges a freshly
  // created/updated row into local state without a full refetch. Falls
  // back to append when the id isn't already present (create), otherwise
  // replaces in place (edit).
  const upsertPreference = useCallback((preference: NotificationPreference) => {
    setPreferences((current) => {
      const exists = current.some((p) => p.id === preference.id);
      return exists
        ? current.map((p) => (p.id === preference.id ? preference : p))
        : [...current, preference];
    });
  }, []);

  return {
    preferences,
    isLoading,
    error,
    reload,
    toggleActive,
    removePreference,
    upsertPreference,
  };
}

export default useNotificationPreferences;
