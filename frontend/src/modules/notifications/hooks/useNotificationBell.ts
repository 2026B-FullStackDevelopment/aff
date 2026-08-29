import { useState } from 'react';

/**
 * Owns open/closed state for the top-nav bell dropdown. Deliberately
 * content-agnostic — what renders inside (Premium upsell today, a live
 * notification feed later) is decided by the caller, not this hook.
 *
 * `onToggle` is an optional passthrough for callers that want to know the
 * bell was clicked regardless of the resulting open state (e.g. future
 * mark-as-read / analytics) without this hook needing to know why.
 */
export function useNotificationBell(onToggle?: () => void) {
  const [isOpen, setIsOpen] = useState(false);

  function toggle() {
    setIsOpen((prev) => !prev);
    onToggle?.();
  }

  function close() {
    setIsOpen(false);
  }

  return { isOpen, toggle, close };
}
