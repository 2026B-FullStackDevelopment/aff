import { cn } from '@/shared/utils';

export type ThemeRole = 'admin' | 'recipient' | 'donor';

interface FormSectionHeaderProps {
  title: string;
  theme?: ThemeRole;
  className?: string;
}

const themeTitleStyles: Record<ThemeRole, string> = {
  admin: 'text-[#1e3a5f]',
  recipient: 'text-[#2E5A47]',
  donor: 'text-[#805300]',
};

export function FormSectionHeader({ title, theme = 'admin', className }: FormSectionHeaderProps) {
  return (
    <div
      className={cn(
        "text-[0.85rem] font-bold uppercase tracking-wider mb-4 flex items-center gap-4 after:flex-1 after:h-px after:bg-slate-200",
        themeTitleStyles[theme] || themeTitleStyles.admin,
        className
      )}
    >
      {title}
    </div>
  );
}

export default FormSectionHeader;
