// Protects frontend pages by checking whether the current user has an allowed role.
import { Navigate } from 'react-router-dom';
import { getStoredUser } from '../services/authStorage';

export function ProtectedRoute({ allowedRoles, children }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
