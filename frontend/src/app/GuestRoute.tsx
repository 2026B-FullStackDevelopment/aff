// Guards "public-only" pages (login, register) so an already-authenticated
// user can't navigate back to them — mirror of ProtectedRoute.
import { Navigate } from 'react-router-dom';
import { ROLE_HOME } from '../shared/constants/roleHome';

export function GuestRoute({ children }) {
  const storedUser = localStorage.getItem('aff_user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (user) {
    const destination = ROLE_HOME[user.role] ?? '/';
    return <Navigate to={destination} replace />;
  }

  return children;
}