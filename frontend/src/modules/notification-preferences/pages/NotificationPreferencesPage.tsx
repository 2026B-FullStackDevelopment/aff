import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award } from 'lucide-react';
import { toast } from 'sonner';
import { NavigationHeader } from '@/shared/components/NavigationHeader/NavigationHeader';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog/ConfirmationDialog';
import { WarningCallout } from '@/shared/components/WarningCallout/WarningCallout';
import { Button } from '@/shared/components/Button/Button';
import { useSubscription } from '@/modules/subscriptions/hooks/useSubscription';
import { PreferenceCard } from '../components/PreferenceCard';
import { AddPreferenceCard } from '../components/AddPreferenceCard';
import { PreferenceFormPanel } from '../components/PreferenceFormPanel';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import type { NotificationPreference } from '@/types/api';

type PanelState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; preference: NotificationPreference };

export function NotificationPreferencesPage() {
  // Tier is derived server-side from the latest SUBSCRIPTION row (F1 impl note #6).
  // Reading user.tier from localStorage is wrong — that value is written at login
  // and is never updated when a subscription upgrade happens mid-session.
  const { tier, isLoading: isTierLoading } = useSubscription();
  const isPremium = tier === 'PREMIUM';
  const navigate = useNavigate();

  const { preferences, isLoading: isPrefsLoading, error, reload, toggleActive, removePreference, upsertPreference } =
    useNotificationPreferences();

  const isLoading = isTierLoading || isPrefsLoading;

  const [panel, setPanel] = useState<PanelState>({ mode: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<NotificationPreference | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function openCreate() {
    setPanel({ mode: 'create' });
  }

  function openEdit(preference: NotificationPreference) {
    setPanel({ mode: 'edit', preference });
  }

  function closePanel() {
    setPanel({ mode: 'closed' });
  }

  function handleSaved(saved: NotificationPreference) {
    upsertPreference(saved);
    closePanel();
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);

    const success = await removePreference(pendingDelete.id);

    setIsDeleting(false);

    if (success) {
      setPendingDelete(null);
      closePanel();
    } else {
      toast.error('Could not delete this preference. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5faf7] to-[#e9f5ee]">
      <NavigationHeader backTo="/profile" backLabel="Profile" />

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1B1C1C]">
              Notification Preferences
            </h1>
            {isPremium && (
              <span className="flex items-center gap-1 rounded-full bg-[#e9f5ee] px-2.5 py-0.5 text-xs font-bold text-[#2E5A47]">
                <Award className="size-3.5" aria-hidden="true" />
                Premium
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7280]">
            Set up smart alerts to get notified the moment food that matches your needs is listed.
          </p>
        </div>

        {!isPremium && (
            <WarningCallout
                title="Upgrade to manage alerts"
                theme="recipient"
                className="mb-6"
                action={
                <Button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className="h-9 px-4 bg-[#3D6852] text-sm font-bold text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
                >
                    Upgrade to Premium
                </Button>
                }
            >
                You can view your saved preferences below, but creating, editing, or pausing alerts
                requires a Premium subscription.
            </WarningCallout>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {isLoading ? (
                <LoadingSkeleton count={3} />
            ) : error ? (
                <ErrorState message={error} onRetry={reload} />
            ) : preferences.length === 0 ? (
                <EmptyState
                    title="No notification preferences yet"
                    theme="recipient"
                    description={
                        isPremium
                        ? 'Create an alert to get notified the moment a matching listing goes live.'
                        : 'Upgrade to Premium to start creating smart alerts.'
                    }
                    action={
                        isPremium ? (
                        <Button
                            type="button"
                            onClick={openCreate}
                            className="h-10 px-4 bg-[#3D6852] text-white transition-all duration-200 ease-out hover:bg-[#2E5A47] hover:shadow-md active:scale-[0.98]"
                        >
                            Add Preference
                        </Button>
                        ) : undefined
                    }
                />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {preferences.map((preference) => (
                  <PreferenceCard
                    key={preference.id}
                    preference={preference}
                    isPremium={isPremium}
                    onEdit={() => openEdit(preference)}
                    onToggleActive={toggleActive}
                    onDelete={() => setPendingDelete(preference)}
                  />
                ))}

                {isPremium && <AddPreferenceCard onClick={openCreate} />}
              </div>
            )}
          </div>

          {panel.mode !== 'closed' && (
            <PreferenceFormPanel
              mode={panel.mode}
              preference={panel.mode === 'edit' ? panel.preference : undefined}
              onClose={closePanel}
              onSaved={handleSaved}
            />
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={pendingDelete !== null}
        title="Delete this preference?"
        description={
          pendingDelete
            ? `"${pendingDelete.preferenceTitle}" will stop matching new listings immediately. This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default NotificationPreferencesPage;
