// Handles the root "/" route: redirects authenticated users to their role's
// home page, or unauthenticated users to /login.
import { Navigate } from 'react-router-dom';
import { ROLE_HOME } from '../shared/constants/roleHome';

export function RootRedirect() {
  const storedUser = localStorage.getItem('aff_user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const destination = ROLE_HOME[user.role] ?? '/login';
  return <Navigate to={destination} replace />;
}