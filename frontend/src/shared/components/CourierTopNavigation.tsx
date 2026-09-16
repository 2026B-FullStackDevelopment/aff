import { useNavigate } from 'react-router-dom';
import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation';
import { useCourierSession } from '@/modules/delivery/hooks/useCourierSession';
import { useAuth } from '@/modules/auth/hooks/useAuth';

const COURIER_NAV_ITEMS: readonly PortalNavItem[] = [
  {
    label: 'Delivery Queue',
    to: '/deliveries/queue',
  },
  {
    label: 'Active Delivery',
    to: '/deliveries/active',
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
  const { logout } = useAuth();
  const navigate = useNavigate();

  // `/profile` is guarded for RECIPIENT/DONOR/ADMIN only — ProfilePage
  // branches on isDonor and has no Courier-shaped rendering (it would show a
  // Recipient badge/nav for a Courier's plain UserResponseDto). There is
  // deliberately no "Profile" nav item and no profile-linked avatar here, so
  // sign-out — the only thing ProfilePage offered a Courier anyway — lives
  // directly in this nav instead, reusing the same useAuth().logout() call.
  async function handleSignOut() {
    await logout();
    navigate('/login');
  }

  return (
    <PortalTopNavigation
      variant="courier"
      brandLabel="Courier Portal"
      brandTo="/deliveries/queue"
      navItems={COURIER_NAV_ITEMS}
      avatarUrl={avatarUrl}
      avatarAlt={avatarAlt}
      profileTo="/deliveries/queue"
      extraRightActions={
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Sign out
        </button>
      }
    />
  );
}

export default CourierTopNavigation;
