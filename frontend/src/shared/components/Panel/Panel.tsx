import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/utils';

interface PanelProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Panel({
  children,
  title,
  description,
  actions,
  className,
  contentClassName,
}: PanelProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        'rounded-xl border border-[#E4E2E1] bg-white',
        className,
      )}
    >
      {(title || description || actions) && (
        <header className="flex flex-col gap-3 border-b border-[#E4E2E1] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2
                id={headingId}
                className="text-lg font-bold text-[#1B1C1C]"
              >
                {title}
              </h2>
            )}

            {description && (
              <p className="mt-1 text-sm leading-5 text-[#6B7280]">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </header>
      )}

      <div className={cn('p-5', contentClassName)}>
        {children}
      </div>
    </section>
  );
}

export default Panel;