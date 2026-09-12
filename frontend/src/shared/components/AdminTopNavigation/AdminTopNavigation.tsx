import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation/PortalTopNavigation';

const ADMIN_NAV_ITEMS: readonly PortalNavItem[] = [
  { label: 'Accounts', to: '/admin/user-directory' },
  { label: 'Listings', to: '/admin/listings' },
  { label: 'Deliveries', to: '/admin/deliveries' },
  { label: 'Profile', to: '/profile' },
];

interface AdminTopNavigationProps {
  avatarUrl?: string | null;
  avatarAlt?: string;
}

/** Shared navigation for every Admin management view. */
export function AdminTopNavigation({
  avatarUrl,
  avatarAlt = 'Admin profile',
}: AdminTopNavigationProps) {
  return (
    <PortalTopNavigation
      variant="admin"
      brandLabel="Admin Portal"
      brandTo="/admin/user-directory"
      navItems={ADMIN_NAV_ITEMS}
      avatarUrl={avatarUrl}
      avatarAlt={avatarAlt}
      profileTo="/profile"
    />
  );
}

export default AdminTopNavigation;
