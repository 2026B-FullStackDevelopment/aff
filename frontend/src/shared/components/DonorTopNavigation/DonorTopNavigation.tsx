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
    label: 'Donation Management', 
    to: '/donor/manual-donation',
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

