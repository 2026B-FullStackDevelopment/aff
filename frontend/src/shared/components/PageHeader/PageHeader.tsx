import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  theme?: 'default' | 'admin';
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  theme = 'default',
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            'text-3xl font-extrabold tracking-tight',
            theme === 'admin' ? 'text-admin-title sm:text-4xl' : 'text-[#1B1C1C]',
          )}
        >
          {title}
        </h1>

        {description && (
          <p
            className={cn(
              'mt-1 text-sm',
              theme === 'admin' ? 'text-admin-text-muted' : 'text-[#6B7280]',
            )}
          >
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
  );
}

export default PageHeader;
