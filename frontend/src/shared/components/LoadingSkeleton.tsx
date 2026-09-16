import { cn } from '@/shared/utils';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  count = 3,
  className,
}: LoadingSkeletonProps) {
  return (
    <div
      className={cn('flex flex-col gap-4', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading content"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-[#E4E2E1] bg-white p-5"
          aria-hidden="true"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>

            <div className="h-6 w-16 rounded-full bg-slate-100" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }, (_, fieldIndex) => (
              <div key={fieldIndex} className="space-y-2">
                <div className="h-2.5 w-16 rounded bg-slate-100" />
                <div className="h-3.5 w-20 rounded bg-slate-200" />
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <div className="h-9 w-28 rounded-lg bg-slate-100" />
            <div className="h-9 w-20 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}

      <span className="sr-only">Loading content…</span>
    </div>
  );
}

export default LoadingSkeleton;
