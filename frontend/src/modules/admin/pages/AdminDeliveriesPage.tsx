import { AdminDeliveryDirectory } from '../components/AdminDeliveryDirectory/AdminDeliveryDirectory';

/** Admin route for read-only Delivery pipeline oversight. */
export function AdminDeliveriesPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#f0f4f8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminDeliveryDirectory />
      </div>
    </main>
  );
}

export default AdminDeliveriesPage;
