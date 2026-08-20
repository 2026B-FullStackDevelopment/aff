// Import the shared navigation component. PortalTopNavigation contains the actual navigation bar layout
import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation/PortalTopNavigation';

// Define the links displayed in the Donor navigation bar
// redonly prevents the component from modifying the array's items
const DONOR_NAV_ITEMS: readonly PortalNavItem[] = [
  {
    label: 'New Listing', // navigation link label
    to: '/listing/create', // exact url path, defined in router.tsx
    end: true, // exact URL match > link = active
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

// information a parent page can passed into
interface DonorTopNavigationProps {
    avatarUrl?: string | null; // avatar url, ? = optional
    avatarAlt?: string; // optional description
    hasUnreadNotifications?: boolean;
    onNotificationsClick: () => void; // function called when notification button is selected
}

// This component gives donor-specific: branding, navigation links, color, avatar, notification information
export function DonorTopNavigation({
    avatarUrl,
    avatarAlt = 'Donor profile',
    hasUnreadNotifications = false,
    onNotificationsClick,
}: DonorTopNavigationProps) {
  return (
    <PortalTopNavigation
      variant="donor" // tell shared component to use Donor colors
      // Brand displayed on the left.
      brandLabel="Donor Portal"
      // URL opened by selecting the brand.
      brandTo="/donor/donations"
      navItems={DONOR_NAV_ITEMS} // navItems: use list above
      // Information received from the parent page.
      avatarUrl={avatarUrl}
      avatarAlt={avatarAlt}
      hasUnreadNotification={hasUnreadNotifications}
      onNotificationsClick={onNotificationsClick}
      // URL opened by selecting the avatar.
      profileTo="/profile"
    />
  );
}

// Allows another file to import this component without curly braces.
export default DonorTopNavigation;
