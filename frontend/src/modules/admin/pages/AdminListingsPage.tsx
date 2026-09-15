import { AdminListingDirectory } from '../components/AdminListingDirectory/AdminListingDirectory';

/** Admin route for searchable Listing oversight and cancellation. */
export function AdminListingsPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#f0f4f8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminListingDirectory />
      </div>
    </main>
  );
}

export default AdminListingsPage;
