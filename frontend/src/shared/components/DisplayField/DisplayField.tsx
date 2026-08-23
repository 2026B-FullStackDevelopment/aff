/**
 * DisplayField
 *
 * Read-only profile field used in view mode. Renders a labelled box
 * with an optional badge pill and helper text — no inputs or interactive
 * controls so users are never confused about editability.
 */
export interface DisplayFieldProps {
  label: string;
  value?: string | null;
  /** Short pill badge rendered on the right (e.g. "Fixed", "Locked") */
  badge?: string;
  helperText?: string;
}

export function DisplayField({ label, value, badge, helperText }: DisplayFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <span className="text-[0.75rem] font-bold uppercase tracking-wider text-slate-600 select-none">
        {label}
      </span>
      <div className="min-h-11 px-3.5 py-2.5 rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 text-sm font-medium flex items-center justify-between">
        <span className="truncate">{value || '—'}</span>
        {badge && (
          <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-600 shrink-0 ml-2">
            {badge}
          </span>
        )}
      </div>
      {helperText && (
        <span className="text-[0.75rem] text-slate-400 mt-0.5">{helperText}</span>
      )}
    </div>
  );
}

export default DisplayField;
