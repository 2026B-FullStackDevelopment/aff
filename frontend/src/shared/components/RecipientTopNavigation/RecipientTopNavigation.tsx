import { Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
                onClose={close}
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
          <div className="flex items-center justify-center size-9">
            <Award className="size-5 text-[#3D6852]" aria-label="Premium Recipient" />
          </div>
        ) : undefined
      }
    />
  );
}

export default RecipientTopNavigation;
