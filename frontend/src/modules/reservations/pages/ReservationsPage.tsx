import { Panel } from '@/shared/components/Panel/Panel';

// TODO(D5): implement the order-history list here (fetch GET /orders/mine,
// render each as a link to /orders/:id). OrderTrackingPage already links
// back to this route, but this page itself is still a placeholder.
export function ReservationsPage() {
  return (
    <div>
      <Panel>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1B1C1C]">
          Reservations History
        </h1>
      </Panel>
    </div>
  );
}