import { useEffect, useRef, type ReactNode } from 'react';

interface NotificationBellPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Generic anchored dropdown shell for the top-nav bell button.
 * PortalTopNavigation wraps the bell in a `relative` container and renders
 * this as a sibling, so it positions itself off that wrapper.
 *
 * Deliberately unopinionated about content: closes on outside click /
 * Escape, otherwise just renders `children`. This is what lets the
 * Premium upsell today and a live notification feed later (SRS 5.3.2)
 * share the same mechanics without either one owning them.
 */
export function NotificationBellPanel({ open, onClose, children }: NotificationBellPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!panelRef.current) return;

      // Ignore clicks for panel instances that are hidden in the DOM (e.g. responsive desktop/mobile duplicates)
      if (
        panelRef.current.offsetParent === null &&
        panelRef.current.getClientRects().length === 0
      ) {
        return;
      }

      const target = event.target as Node | null;
      if (!target) return;

      // Ignore clicks inside the panel itself
      if (panelRef.current.contains(target)) {
        return;
      }

      // Ignore clicks on the trigger / container so the bell button's onClick toggles cleanly
      const container = panelRef.current.closest('.relative');
      if (container && container.contains(target)) {
        return;
      }

      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 sm:w-96"
    >
      {children}
    </div>
  );
}

export default NotificationBellPanel;
