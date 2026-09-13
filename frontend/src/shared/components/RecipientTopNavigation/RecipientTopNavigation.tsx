import { Award } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation/PortalTopNavigation';
import { NotificationBellPanel } from '@/shared/components/NotificationBellPanel/NotificationBellPanel';
import { PremiumUpsellPanel } from '@/modules/notifications/components/PremiumUpsellPanel';
import { NotificationList } from '@/modules/notifications/components/NotificationList';
import { useNotificationBell } from '@/modules/notifications/hooks/useNotificationBell';

const RECIPIENT_NAV_ITEMS: readonly PortalNavItem[] = [
  {
    label: 'Marketplace',
    to: '/marketplace',
  },
  {
    label: 'History',
    to: '/reservations',
  },
  {
    label: 'Profile',
    to: '/profile',
  },
];

interface RecipientTopNavigationProps {
    avatarUrl?: string | null;
    avatarAlt?: string;
    hasUnreadNotifications?: boolean;
    onNotificationsClick?: () => void;
    isPremium?: boolean;
}

export function RecipientTopNavigation({
    avatarUrl,
    avatarAlt = 'Recipient profile',
    hasUnreadNotifications = false,
    onNotificationsClick,
    isPremium = false,
}: RecipientTopNavigationProps) {
  const navigate = useNavigate();
  const { isOpen, toggle, close } = useNotificationBell(onNotificationsClick);

  return (
    <PortalTopNavigation
      variant="recipient"
      brandLabel="AFF"
      brandTo="/marketplace"
      navItems={RECIPIENT_NAV_ITEMS}
      avatarUrl={avatarUrl}
      avatarAlt={avatarAlt}
      hasUnreadNotification={hasUnreadNotifications}
      onNotificationsClick={toggle}
      isNotificationPanelOpen={isOpen}
      notificationPanel={
        <NotificationBellPanel open={isOpen} onClose={close}>
          <div className="flex flex-col gap-2">
            <NotificationList onNavigate={close} />
            {!isPremium && (
              <PremiumUpsellPanel
                onUpgrade={() => {
                  close();
                  navigate('/subscription');
                }}
              />
            )}
          </div>
        </NotificationBellPanel>
      }
      profileTo="/profile"
      extraRightActions={
        isPremium ? (
          <Link
            to="/subscription"
            title="Premium subscription"
            className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-[#e9f5ee]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9f5ee]"
          >
            <Award className="size-5 text-[#e9f5ee]" aria-label="Premium Recipient" />
          </Link>
        ) : undefined
      }
    />
  );
}

export default RecipientTopNavigation;
