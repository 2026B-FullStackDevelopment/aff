import { useEffect, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/Button/Button';
import { Modal } from '@/shared/components/Modal/Modal';

type ConfirmationTone = 'default' | 'danger';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
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

  return (
    <Modal title={title} onClose={handleClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          {tone === 'danger' && (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
          )}

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
                : 'h-10 px-4 bg-[#805300] text-white transition-all duration-200 ease-out hover:bg-[#694400] hover:shadow-md active:scale-[0.98]'
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