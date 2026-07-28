// Reusable status label for AFF states such as Available, Reserved, Active, or Pending.
import './StatusBadge.css';

export function StatusBadge({ status }) {
  return <span className="status-badge">{status}</span>;
}
