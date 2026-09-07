import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation/PortalTopNavigation';
import { useCourierSession } from '@/modules/delivery/hooks/useCourierSession';

const COURIER_NAV_ITEMS: readonly PortalNavItem[] = [
  {
    label: 'Delivery Queue',
    to: '/deliveries/queue',
  },
  {
    label: 'Active Delivery',
    to: '/deliveries/active',
  },
  {
    label: 'Profile',
    to: '/profile',
  },
];

interface CourierTopNavigationProps {
  avatarUrl?: string | null;
  avatarAlt?: string;
}

export function CourierTopNavigation({
  avatarUrl,
  avatarAlt = 'Courier profile',
}: CourierTopNavigationProps) {
  useCourierSession();

  return (
    <PortalTopNavigation
      variant="courier"
      brandLabel="Courier Portal"
      brandTo="/deliveries/queue"
      navItems={COURIER_NAV_ITEMS}
      avatarUrl={avatarUrl}
      avatarAlt={avatarAlt}
      profileTo="/profile"
    />
  );
}

export default CourierTopNavigation;
