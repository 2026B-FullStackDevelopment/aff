import { useEffect, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import type { ThemeRole } from '@/shared/components/WarningCallout';

type ConfirmationTone = 'default' | 'danger';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
  theme?: ThemeRole;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Go Back',
  tone = 'default',
  theme = 'donor',
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPending) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPending, onClose, open]);

  if (!open) return null;

  function handleClose() {
    if (!isPending) {
      onClose();
    }
  }

  const themeStyles = {
    admin: {
      icon: 'bg-[#eef2fa] text-[#5b7bc0]',
      confirm: 'bg-[#5b7bc0] hover:bg-[#4d6eaf]',
    },
    recipient: {
      icon: 'bg-[#f0f7f3] text-[#3D6852]',
      confirm: 'bg-[#3D6852] hover:bg-[#2E5A47]',
    },
    donor: {
      icon: 'bg-[#FFF6E3] text-[#805300]',
      confirm: 'bg-[#805300] hover:bg-[#694400]',
    },
  } satisfies Record<ThemeRole, { icon: string; confirm: string }>;

  const styles = themeStyles[theme];

  return (
    <Modal title={title} onClose={handleClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
              tone === 'danger' ? 'bg-red-50 text-red-700' : styles.icon
            }`}
          >
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>

          <div className="text-sm leading-6 text-[#414844]">
            {description}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleClose}
            className="h-10 px-4 border-[#C1C8C2] text-[#414844] transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            disabled={isPending}
            onClick={() => void onConfirm()}
            className={
              tone === 'danger'
                ? 'h-10 px-4 bg-red-700 text-white transition-all duration-200 ease-out hover:bg-red-800 hover:shadow-md active:scale-[0.98]'
                : `h-10 px-4 ${styles.confirm} text-white transition-all duration-200 ease-out hover:shadow-md active:scale-[0.98]`
            }
          >
            {isPending ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmationDialog;
