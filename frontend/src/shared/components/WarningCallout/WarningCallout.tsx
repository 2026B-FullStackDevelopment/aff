import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/utils';

interface WarningCalloutProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function WarningCallout({
  title,
  children,
  action,
  className,
}: WarningCalloutProps) {
  return (
    <aside
      className={cn(
        'rounded-lg border border-[#805300] bg-[#FFF6E3] p-4',
        className,
      )}
      role="note"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-[#805300]"
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#5B3A00]">
            {title}
          </h3>

          <div className="mt-1 text-sm leading-6 text-[#414844]">
            {children}
          </div>

          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default WarningCallout;