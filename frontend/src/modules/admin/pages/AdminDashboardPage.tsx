// Admin dashboard page screen for admin-only system management.
import { UserTable } from '../components/UserTable/UserTable.jsx';

export function AdminDashboardPage() {
  return (
    <main>
      <h1>Admin Dashboard</h1>
      <UserTable users={[]} />
    </main>
  );
}
