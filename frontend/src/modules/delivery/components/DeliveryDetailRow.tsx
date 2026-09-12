import type { ReactNode } from 'react';

interface DeliveryDetailRowProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

/**
 * A labelled key/value pair used across the Courier delivery screens
 * (e.g. "Collect from", "Deliver to", "Quantity"). The label follows the
 * design system's "Field label" type step (`docs/design_system.md` →
 * Typography Scale).
 */
export function DeliveryDetailRow({ label, value, icon }: DeliveryDetailRowProps) {
  return (
    <div>
      <p className="text-[0.75rem] font-bold uppercase tracking-wider text-courier-text-muted">
        {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-courier-text">
        {icon ? (
          <span className="text-courier-text-muted [&>svg]:size-4">{icon}</span>
        ) : null}
        {value}
      </p>
    </div>
  );
}
