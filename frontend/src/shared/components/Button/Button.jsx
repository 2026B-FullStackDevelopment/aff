// Reusable button component for common AFF actions across pages.
import './Button.css';

export function Button({ children, type = 'button', variant = 'primary', ...props }) {
  return (
    <button className={`button button-${variant}`} type={type} {...props}>
      {children}
    </button>
  );
}
