/** Loading placeholder shaped like the Admin profile card. */
export function AdminProfileSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Admin profile"
      className="animate-pulse rounded-xl border border-admin-border/60 bg-admin-surface p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-center gap-4 border-b border-admin-border/40 pb-8">
        <div className="size-24 rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-5 w-36 rounded bg-slate-200" />
          <div className="h-6 w-20 rounded-full bg-admin-primary/10" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 py-8 sm:grid-cols-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={index === 2 ? 'sm:col-span-2' : ''}>
            <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
            <div className="h-11 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
