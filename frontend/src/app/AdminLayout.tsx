import { Outlet } from 'react-router-dom';
import { getStoredUser } from '@/services/authStorage';
import { AdminTopNavigation } from '@/shared/components/AdminTopNavigation/AdminTopNavigation';

/** Keeps Admin navigation mounted while switching between oversight views. */
export function AdminLayout() {
  const storedUser = getStoredUser();
  const admin = storedUser?.role === 'ADMIN' ? storedUser : null;

  return (
    <>
      <AdminTopNavigation
        avatarUrl={admin?.avatarUrl}
        avatarAlt={admin ? `${admin.username} profile` : 'Admin profile'}
      />
      <Outlet />
    </>
  );
}

export default AdminLayout;
