import { Truck } from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState/ErrorState';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton/LoadingSkeleton';
import { Pagination } from '@/shared/components/Pagination/Pagination';
import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import type { AdminDeliveryDTO, DeliveryStage } from '@/types/api';
import { useAdminDeliveries } from '../../hooks/useAdminDeliveries';

const DELIVERY_STAGES: readonly DeliveryStage[] = [
  'AWAITING_COURIER',
  'ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function DeliveryDetails({ delivery }: { delivery: AdminDeliveryDTO }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <dt className="text-xs text-slate-500">Courier</dt>
        <dd className="font-medium text-slate-800">{delivery.courier?.fullName || 'Unassigned'}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Recipient ID</dt>
        <dd className="font-mono text-xs text-slate-700" title={delivery.order.recipientId ?? undefined}>
          {delivery.order.recipientId ? shortId(delivery.order.recipientId) : 'Unavailable'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Created</dt>
        <dd>{formatDate(delivery.createdAt)}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">Picked up</dt>
        <dd>{formatDate(delivery.pickedUpAt)}</dd>
      </div>
      <div className="col-span-2">
        <dt className="text-xs text-slate-500">Delivered</dt>
        <dd>{formatDate(delivery.deliveredAt)}</dd>
      </div>
    </dl>
  );
}

/** Responsive, deliberately read-only Delivery oversight directory. */
export function AdminDeliveryDirectory() {
  const directory = useAdminDeliveries();

  return (
    <section aria-labelledby="delivery-directory-title">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="delivery-directory-title" className="text-3xl font-extrabold tracking-tight text-[#1e3a5f]">
            Delivery oversight
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor every delivery stage. Assignment remains with the Courier workflow.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <label htmlFor="admin-delivery-stage" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Delivery stage
          </label>
          <select
            id="admin-delivery-stage"
            value={directory.stage}
            onChange={(event) => directory.changeStage(event.target.value as DeliveryStage | '')}
            className="h-10 w-full rounded-md border border-[#d1d9e0] bg-slate-50 px-3 text-sm text-[#1e3a5f] outline-none transition focus:border-[#5b7bc0] focus:ring-4 focus:ring-[rgba(91,123,192,0.15)]"
          >
            <option value="">All stages</option>
            {DELIVERY_STAGES.map((stage) => (
              <option key={stage} value={stage}>{stage.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {directory.isLoading ? (
        <LoadingSkeleton count={4} />
      ) : directory.error ? (
        <ErrorState message={directory.error} onRetry={directory.retry} />
      ) : directory.items.length === 0 ? (
        <EmptyState
          theme="admin"
          icon={Truck}
          title={directory.stage ? 'No deliveries at this stage' : 'No deliveries yet'}
          description={
            directory.stage
              ? `There are no ${directory.stage.replaceAll('_', ' ').toLowerCase()} deliveries.`
              : 'Deliveries will appear here as Recipient orders enter the Courier queue.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(30,58,95,0.08)]">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Delivery / order</th>
                  <th scope="col" className="px-5 py-3">Stage</th>
                  <th scope="col" className="px-5 py-3">Courier</th>
                  <th scope="col" className="px-5 py-3">Recipient ID</th>
                  <th scope="col" className="px-5 py-3">Created</th>
                  <th scope="col" className="px-5 py-3">Picked up</th>
                  <th scope="col" className="px-5 py-3">Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dce3ec]">
                {directory.items.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs text-[#1e3a5f]" title={delivery.id}>Delivery {shortId(delivery.id)}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500" title={delivery.order.id}>Order {shortId(delivery.order.id)}</p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={delivery.stage} /></td>
                    <td className="px-5 py-4 text-slate-800">{delivery.courier?.fullName || 'Unassigned'}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600" title={delivery.order.recipientId ?? undefined}>
                      {delivery.order.recipientId ? shortId(delivery.order.recipientId) : 'Unavailable'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(delivery.createdAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(delivery.pickedUpAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(delivery.deliveredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#dce3ec] md:hidden">
            {directory.items.map((delivery) => (
              <article key={delivery.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-mono text-sm font-semibold text-[#1e3a5f]" title={delivery.id}>
                      Delivery {shortId(delivery.id)}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-slate-500" title={delivery.order.id}>
                      Order {shortId(delivery.order.id)}
                    </p>
                  </div>
                  <StatusBadge status={delivery.stage} />
                </div>
                <DeliveryDetails delivery={delivery} />
              </article>
            ))}
          </div>

          <Pagination
            theme="admin"
            page={directory.page}
            pageSize={directory.pageSize}
            totalItems={directory.total}
            itemLabel="deliveries"
            isDisabled={directory.isLoading}
            onPageChange={directory.goToPage}
          />
        </div>
      )}
    </section>
  );
}

export default AdminDeliveryDirectory;
