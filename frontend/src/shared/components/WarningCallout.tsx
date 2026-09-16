import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface WarningCalloutProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  theme?: ThemeRole;
  className?: string;
}

const themeStyles: Record<ThemeRole, { border: string; bg: string; icon: string; title: string }> = {
  admin: {
    border: 'border-[#5b7bc0]',
    bg: 'bg-[#eef2fa]',
    icon: 'text-[#5b7bc0]',
    title: 'text-[#1e3a5f]',
  },
  recipient: {
    border: 'border-[#3D6852]',
    bg: 'bg-[#f0f7f3]',
    icon: 'text-[#3D6852]',
    title: 'text-[#2E5A47]',
  },
  donor: {
    border: 'border-[#805300]',
    bg: 'bg-[#FFF6E3]',
    icon: 'text-[#805300]',
    title: 'text-[#5B3A00]',
  },
};

export function WarningCallout({
  title,
  children,
  action,
  theme = 'donor', // default preserves current look for any existing callers
  className,
}: WarningCalloutProps) {
  const styles = themeStyles[theme];

  return (
    <aside
      className={cn('rounded-lg border p-4', styles.border, styles.bg, className)}
      role="note"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('mt-0.5 size-5 shrink-0', styles.icon)} aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <h3 className={cn('text-sm font-bold', styles.title)}>{title}</h3>
          <div className="mt-1 text-sm leading-6 text-[#414844]">{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </aside>
  );
}

export default WarningCallout;
