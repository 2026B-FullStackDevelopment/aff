import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation/PortalTopNavigation';
import { useSoldOutNotifications } from '@/modules/donations/hooks/useSoldOutNotifications';

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
      label: 'Reservations',
      to: '/donor/reservations',
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
  hasUnreadNotifications?: boolean;
  onNotificationsClick: () => void;
}

export function DonorTopNavigation({
  avatarUrl,
  avatarAlt = 'Donor profile',
  hasUnreadNotifications = false,
  onNotificationsClick,
}: DonorTopNavigationProps) {
  useSoldOutNotifications();

  return (
    <PortalTopNavigation
      variant="donor"
      brandLabel="Donor Portal"
      brandTo="/donor/donations"
      navItems={DONOR_NAV_ITEMS}
      avatarUrl={avatarUrl}
      avatarAlt={avatarAlt}
      hasUnreadNotification={
        hasUnreadNotifications
      }
      onNotificationsClick={
        onNotificationsClick
      }
      profileTo="/profile"
    />
  );
}

export default DonorTopNavigation;