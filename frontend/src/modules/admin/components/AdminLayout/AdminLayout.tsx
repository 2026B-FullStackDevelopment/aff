// A layout component shared by admin pages
import { Outlet } from 'react-router-dom';
import { getStoredUser } from '@/services/authStorage';
import { PortalTopNavigation } from '@/shared/components/PortalTopNavigation/PortalTopNavigation';

const ADMIN_NAV_ITEMS = [
  { label: 'Users', to: '/admin/user-directory', end: true },
  { label: 'Create Courier', to: '/admin/couriers/new', end: true },
] as const;

/** Provides the persistent, responsive shell shared by Admin pages. */
export function AdminLayout() {
  const user = getStoredUser();
  const admin = user?.role === 'ADMIN' ? user : null;

  return (
    <div className="min-h-screen bg-admin-bg">
      <PortalTopNavigation
        variant="admin"
        brandLabel="AFF Admin"
        brandTo="/admin/user-directory"
        navItems={ADMIN_NAV_ITEMS}
        avatarUrl={admin?.avatarUrl}
        avatarAlt={admin ? `${admin.username} profile` : 'Admin profile'}
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
