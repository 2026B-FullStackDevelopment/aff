// Reusable modal component for confirmations, forms, and focused page actions.
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    // Backdrop: fixed full-screen overlay with semi-transparent scrim
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
      role="presentation"
    >
      <section
        className="w-[min(92vw,36rem)] rounded-lg bg-white p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
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
