import { Award } from 'lucide-react';
import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation/PortalTopNavigation';

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
    onNotificationsClick: () => void;
    isPremium?: boolean;
}

export function RecipientTopNavigation({
    avatarUrl,
    avatarAlt = 'Recipient profile',
    hasUnreadNotifications = false,
    onNotificationsClick,
    isPremium = false,
}: RecipientTopNavigationProps) {
  return (
    <PortalTopNavigation
      variant="recipient"
      brandLabel="AFF"
      brandTo="/marketplace"
      navItems={RECIPIENT_NAV_ITEMS}
      avatarUrl={avatarUrl}
      avatarAlt={avatarAlt}
      hasUnreadNotification={hasUnreadNotifications}
      onNotificationsClick={onNotificationsClick}
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
