import type { LucideIcon } from 'lucide-react';
import { PackageOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  theme?: ThemeRole;
  className?: string;
}

const themeIconStyles: Record<ThemeRole, string> = {
  admin: 'bg-[#eff4ff] text-admin-primary',
  recipient: 'bg-[#e9f5ee] text-[#3D6852]',
  donor: 'bg-[#FFF6E3] text-[#805300]',
};

export function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  action,
  theme = 'donor', // default preserves current look for any existing callers
  className,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-[#C1C8C2] bg-white px-6 py-12 text-center',
        className,
      )}
      role="status"
    >
      <div className={cn('flex size-12 items-center justify-center rounded-full', themeIconStyles[theme])}>
        <Icon className="size-6" aria-hidden="true" />
      </div>

      <h2 className="mt-4 text-lg font-bold text-[#1B1C1C]">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-[#6B7280]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}

export default EmptyState;
