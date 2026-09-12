import { useNotifications } from '../hooks/useNotifications';
import { NotificationListItem } from './NotificationListItem';

interface NotificationListProps {
  /** Called when the user clicks through to a notification's Order — used to close the bell panel. */
  onNavigate: () => void;
}

const PANEL_SURFACE = 'rounded-xl bg-white shadow-xl ring-1 ring-black/5';

/**
 * Renders the authenticated user's own notification history inside a bell
 * dropdown (H2).
 */
export function NotificationList({ onNavigate }: NotificationListProps) {
  const { items, isLoading, error, hasMore, loadMore } = useNotifications(true);

  if (isLoading && items.length === 0) {
    return (
      <div className={PANEL_SURFACE} role="status" aria-busy="true" aria-label="Loading notifications">
        <ul className="divide-y divide-slate-100 p-2">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="flex animate-pulse items-start gap-3 px-2 py-3" aria-hidden="true">
              <div className="size-8 shrink-0 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2 py-0.5">
                <div className="h-3 w-4/5 rounded bg-slate-100" />
                <div className="h-2.5 w-1/3 rounded bg-slate-100" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${PANEL_SURFACE} p-5`} role="alert">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`${PANEL_SURFACE} p-5 text-center`} role="status">
        <p className="text-sm text-slate-500">You have no notifications yet.</p>
      </div>
    );
  }

  return (
    <div className={PANEL_SURFACE}>
      <ul role="list" aria-label="Notifications" className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
        {items.map((notification) => (
          <NotificationListItem key={notification.id} notification={notification} onNavigate={onNavigate} />
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="w-full border-t border-slate-100 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          Load more
        </button>
      )}
    </div>
  );
}

export default NotificationList;
