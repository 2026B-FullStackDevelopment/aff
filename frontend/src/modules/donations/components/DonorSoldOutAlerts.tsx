import { Toast } from '@/shared/components/Toast/Toast';
import { useSoldOutNotifications } from '../hooks/useSoldOutNotifications';

// Displays live C9 alerts without creating a persisted notification inbox.
export function DonorSoldOutAlerts() {
  const {
    alerts,
    dismissAlert,
  } = useSoldOutNotifications();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Sold-out listing alerts"
      className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6"
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto"
        >
          <Toast
            variant="warning"
            title="Listing sold out"
            message={`${alert.name} has no remaining quantity and was moved to Past Donations.`}
            onClose={() =>
              dismissAlert(alert.id)
            }
            className="max-w-none border-[#D5B77D] shadow-xl"
          />
        </div>
      ))}
    </aside>
  );
}

export default DonorSoldOutAlerts;