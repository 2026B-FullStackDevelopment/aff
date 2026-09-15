// Reusable modal component for confirmations, forms, and focused page actions.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ title, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = dialogRef.current;
    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusableElements = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);

    (focusableElements()[0] ?? dialog)?.focus();

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialog) return;

      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', trapFocus);

    return () => {
      document.removeEventListener('keydown', trapFocus);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    // Backdrop: fixed full-screen overlay with semi-transparent scrim
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
      role="presentation"
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="w-[min(92vw,36rem)] rounded-lg bg-white p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="flex items-center justify-between gap-4 mb-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-800">{title}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X />
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}
