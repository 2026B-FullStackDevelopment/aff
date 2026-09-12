import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, ChevronRight, PackageX, RotateCcw, Sparkles, Truck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { NotificationDTO } from '@/types/api';

interface NotificationListItemProps {
  notification: NotificationDTO;
  /** Called after navigating to the notification's Order or Listing — closes the bell panel. */
  onNavigate: () => void;
}

// Reuses the app's own palette rather than inventing new colors: the
// recipient-premium badge matches PremiumUpsellPanel/EmptyState's existing
// `#3D6852` accent, and ADMIN_CANCEL reuses ErrorState's red.
const TYPE_PRESENTATION: Record<NotificationDTO['type'], { icon: LucideIcon; badge: string }> = {
  SOLD_OUT: { icon: PackageX, badge: 'bg-amber-50 text-amber-700' },
  PAYMENT_SUCCESS: { icon: CheckCircle2, badge: 'bg-emerald-50 text-emerald-700' },
  PAYMENT_REFUNDED: { icon: RotateCcw, badge: 'bg-blue-50 text-blue-700' },
  DELIVERY_STATUS: { icon: Truck, badge: 'bg-sky-50 text-sky-700' },
  PREMIUM_MATCH: { icon: Sparkles, badge: 'bg-[#e9f5ee] text-[#3D6852]' },
  ADMIN_CANCEL: { icon: XCircle, badge: 'bg-red-50 text-red-700' },
};

/**
 * One row in the notification bell dropdown (H2). `orderId` takes priority
 * over `listingId` (order tracking is the more specific destination);
 * `listingId` alone (e.g. a Donor's SOLD_OUT alert) links to the public
 * listing detail page, which already renders sensibly for a non-Recipient
 * viewer (hides the reserve control, still shows the "Sold Out" badge).
 *
 * A linked row gets a trailing chevron as its "this goes somewhere" cue.
 * The cue is deliberately NOT hover-only: a background-tint-on-hover alone
 * blends into the row at rest and gives no signal on touch devices (no
 * hover state at all), so a quick scan of the list can't tell which rows
 * are interactive. The chevron sits at the natural reading end of the row
 * (standard settings-list convention) without competing with the message.
 */
export function NotificationListItem({ notification, onNavigate }: NotificationListItemProps) {
  const { icon: Icon, badge } = TYPE_PRESENTATION[notification.type];

  const timestamp = new Date(notification.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const linkTo = notification.orderId
    ? `/orders/${notification.orderId}`
    : notification.listingId
      ? `/marketplace/${notification.listingId}`
      : null;

  const content = (
    <>
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${badge}`}>
        <Icon className="size-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800">{notification.message}</p>
        <p className="mt-0.5 text-xs text-slate-400">{timestamp}</p>
      </div>
    </>
  );

  if (!linkTo) {
    return (
      <li className="flex items-start gap-3 px-4 py-3">
        {content}
      </li>
    );
  }

  return (
    <li>
      <Link
        to={linkTo}
        onClick={onNavigate}
        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
      >
        {content}
        <ChevronRight className="mt-1 size-4 shrink-0 text-slate-300" aria-hidden="true" />
      </Link>
    </li>
  );
}

export default NotificationListItem;
