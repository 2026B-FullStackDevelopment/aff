// Reusable modal component for confirmations, forms, and focused page actions.
import { Button } from '../Button/Button.jsx';
import './Modal.css';

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </header>
        {children}
      </section>
    </div>
  );
}
