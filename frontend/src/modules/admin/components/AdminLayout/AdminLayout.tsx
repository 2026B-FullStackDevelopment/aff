// A layout component shared by admin pages
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  AUTH_USER_UPDATED_EVENT,
  getStoredUser,
} from '@/services/authStorage';
import {
  PortalTopNavigation,
  type PortalNavItem,
} from '@/shared/components/PortalTopNavigation/PortalTopNavigation';
import type { AdminUserDTO } from '@/types/api';

const ADMIN_NAV_ITEMS: readonly PortalNavItem[] = [
  { label: 'Users', to: '/admin/user-directory', end: true },
  { label: 'Create Courier', to: '/admin/couriers/new', end: true },
  { label: 'Listings', disabled: true },
  { label: 'Profile', to: '/admin/profile', end: true },
];

/** Provides the persistent, responsive shell shared by Admin pages. */
export function AdminLayout() {
  const storedUser = getStoredUser();
  const [admin, setAdmin] = useState<AdminUserDTO | null>(
    storedUser?.role === 'ADMIN' ? storedUser : null,
  );

  useEffect(() => {
    function refreshAdmin() {
      const user = getStoredUser();
      setAdmin(user?.role === 'ADMIN' ? user : null);
    }

    window.addEventListener(AUTH_USER_UPDATED_EVENT, refreshAdmin);
    return () => window.removeEventListener(AUTH_USER_UPDATED_EVENT, refreshAdmin);
  }, []);

  return (
    <div className="min-h-screen bg-admin-bg">
      <PortalTopNavigation
        variant="admin"
        brandLabel="AFF Admin"
        brandTo="/admin/user-directory"
        navItems={ADMIN_NAV_ITEMS}
        avatarUrl={admin?.avatarUrl}
        avatarAlt={admin ? `${admin.username} profile` : 'Admin profile'}
        profileTo="/admin/profile"
        extraRightActions={
          <span className="hidden text-sm font-semibold text-white lg:inline">
            {admin?.username ?? 'Admin'}
          </span>
        }
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
