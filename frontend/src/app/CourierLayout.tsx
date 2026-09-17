// Layout route for the Courier pages. Renders CourierTopNavigation once and
// an <Outlet /> for /deliveries/queue and /deliveries/active, so navigating
// between them no longer unmounts/remounts the nav.
//
// This is load-bearing, not stylistic: CourierTopNavigation calls
// useCourierSession(), which owns the realtime socket connection that the
// ping loop (spec D2) depends on. Before this layout existed, each page
// rendered its own <CourierTopNavigation>, so a Courier-to-Courier
// navigation unmounted one instance and mounted another — tearing down and
// rebuilding the socket (and the position-broadcast timer with it) on every
// nav click, mid-delivery or not. Mounting the nav once here, above both
// routes, keeps its lifetime (and the socket's) tied to the Courier's
// session rather than to whichever page happens to be showing.
import { Outlet } from 'react-router-dom';
import { CourierTopNavigation } from '@/shared/components/CourierTopNavigation';
import { getStoredUser } from '@/services/authStorage';

export function CourierLayout() {
  const storedUser = getStoredUser();
  const courier = storedUser?.role === 'COURIER' ? storedUser : null;

  return (
    <>
      <CourierTopNavigation
        avatarUrl={courier?.avatarUrl}
        avatarAlt={courier ? `${courier.fullName} profile` : 'Courier profile'}
      />
      <Outlet />
    </>
  );
}

export default CourierLayout;
