import { useState } from 'react';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog';
import { cn } from '@/shared/utils';
import type { AnyUserDTO, UserDTO } from '@/types/api';

interface AccountStatusControlProps {
  user: AnyUserDTO;
  isPending: boolean;
  onStatusChange: (userId: string, status: UserDTO['status']) => Promise<void>;
}

/** Accessible account-state toggle with a required deactivation confirmation. */
export function AccountStatusControl({
  user,
  isPending,
  onStatusChange,
}: AccountStatusControlProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const isActive = user.status === 'ACTIVE';

  async function applyStatus(status: UserDTO['status']) {
    await onStatusChange(user.id, status);
    setIsConfirming(false);
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-busy={isPending}
        aria-label={`${isActive ? 'Deactivate' : 'Reactivate'} ${user.username}`}
        disabled={isPending}
        onClick={() => {
          if (isActive) setIsConfirming(true);
          else void applyStatus('ACTIVE');
        }}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[#eff4ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-admin-primary/20 disabled:cursor-wait disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={cn(
            'relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors',
            isActive ? 'bg-emerald-600' : 'bg-slate-400',
          )}
        >
          <span
            className={cn(
              'absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform',
              isActive ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </span>
        <span className="sr-only">
          {isPending ? 'Updating account status' : isActive ? 'Active account' : 'Deactivated account'}
        </span>
      </button>

      <ConfirmationDialog
        open={isConfirming}
        title="Deactivate account?"
        description={
          <>
            <strong className="text-slate-900">{user.username}</strong> will no longer be
            able to sign in. Their account data will not be deleted.
          </>
        }
        confirmLabel="Deactivate"
        tone="danger"
        isPending={isPending}
        onConfirm={() => applyStatus('DEACTIVATED')}
        onClose={() => setIsConfirming(false)}
      />
    </>
  );
}

export default AccountStatusControl;
