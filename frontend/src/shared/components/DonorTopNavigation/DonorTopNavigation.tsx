import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation/PortalTopNavigation';
import { NotificationBellPanel } from '@/shared/components/NotificationBellPanel/NotificationBellPanel';
import { NotificationList } from '@/modules/notifications/components/NotificationList';
import { useNotificationBell } from '@/modules/notifications/hooks/useNotificationBell';

const DONOR_NAV_ITEMS:
  readonly PortalNavItem[] = [
    {
      label: 'New Listing',
      to: '/listing/create',
      end: true,
    },
    {
      label: 'Manual Donation',
      to: '/donor/manual-donation',
    },
    {
      label: 'Donation Management',
      to: '/donor/donations',
    },
    {
      label: 'Analytics',
      to: '/donor/analytics',
    },
    {
      label: 'Profile',
      to: '/profile',
    },
  ];

interface DonorTopNavigationProps {
  avatarUrl?: string | null;
  avatarAlt?: string;
}

export function DonorTopNavigation({
  avatarUrl,
  avatarAlt = 'Donor profile',
}: DonorTopNavigationProps) {
  const { isOpen, toggle, close } = useNotificationBell();

  return (
    <PortalTopNavigation
      variant="donor"
      brandLabel="Donor Portal"
      brandTo="/donor/donations"
      navItems={DONOR_NAV_ITEMS}
      avatarUrl={avatarUrl}
      avatarAlt={avatarAlt}
      onNotificationsClick={toggle}
      isNotificationPanelOpen={isOpen}
      notificationPanel={
        <NotificationBellPanel open={isOpen} onClose={close}>
          <NotificationList onNavigate={close} />
        </NotificationBellPanel>
      }
      profileTo="/profile"
    />
  );
}

export default DonorTopNavigation;
