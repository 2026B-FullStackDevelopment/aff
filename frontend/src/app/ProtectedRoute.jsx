// Protects frontend pages by checking whether the current user has an allowed role.
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ allowedRoles, children }) {
  const storedUser = localStorage.getItem('aff_user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/food" replace />;
  }

  return children;
}
