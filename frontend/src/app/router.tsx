// Defines frontend routes and applies role guards to protected pages.
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { CourierLayout } from './CourierLayout';
import { GuestRoute } from './GuestRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RootRedirect } from './RootRedirect';
import { AdminDashboardPage } from '../modules/admin/pages/AdminDashboardPage';
import { DonorRegisterPage } from '../modules/auth/pages/DonorRegisterPage';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { RecipientRegisterPage } from '../modules/auth/pages/RecipientRegisterPage';
import { FoodListingsPage } from '../modules/browsing/pages/FoodListingsPage';
import { ListingDetailPage } from '../modules/browsing/pages/ListingDetailPage';
import { ActiveDeliveryPage } from '../modules/delivery/pages/ActiveDeliveryPage';
import { DeliveryQueuePage } from '../modules/delivery/pages/DeliveryQueuePage';
import { DonorDonationsPage } from '../modules/donations/pages/DonorDonationsPage';
import { DonorReservationsPage } from '../modules/donations/pages/DonorReservationsPage';
import { FoodListingCreationPage } from '../modules/donations/pages/FoodListingCreationPage';
import { ManualDonationPage } from '../modules/donations/pages/ManualDonationPage';
import { OrderTrackingPage } from '../modules/reservations/pages/OrderTrackingPage';
import { ReservationConfirmPage } from '../modules/reservations/pages/ReservationConfirmPage';
import { ReservationsPage } from '../modules/reservations/pages/ReservationsPage';
import { SubscriptionPage } from '../modules/subscriptions/pages/SubscriptionPage';
import { ProfilePage } from '../modules/users/pages/ProfilePage';
import { DonorAnalyticsPage } from '../modules/donations/pages/DonorAnalyticsPage';
import { Toaster } from '@/shared/components/ui/sonner';
import { NotificationPreferencesPage } from '@/modules/notification-preferences/pages/NotificationPreferencesPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={<RootRedirect />}
        />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        <Route
          path="/register/recipient"
          element={
            <GuestRoute>
              <RecipientRegisterPage />
            </GuestRoute>
          }
        />

        <Route
          path="/register/donor"
          element={
            <GuestRoute>
              <DonorRegisterPage />
            </GuestRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute
              allowedRoles={[
                'RECIPIENT',
                'DONOR',
                'ADMIN',
              ]}
            >
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marketplace"
          element={
            <ProtectedRoute
              allowedRoles={['RECIPIENT']}
            >
              <FoodListingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marketplace/:id"
          element={<ListingDetailPage />}
        />

        <Route
          path="/marketplace/:id/confirm"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT']}>
              <ReservationConfirmPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT']}>
              <OrderTrackingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reservations"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT']}>
              <ReservationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/subscription"
          element={
            <ProtectedRoute
              allowedRoles={['RECIPIENT']}
            >
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/notification-preferences"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT']}>
              <NotificationPreferencesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/listing/create"
          element={
            <ProtectedRoute
              allowedRoles={['DONOR']}
            >
              <FoodListingCreationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/donor/manual-donation"
          element={
            <ProtectedRoute
              allowedRoles={['DONOR']}
            >
              <ManualDonationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/donor/donations"
          element={
            <ProtectedRoute
              allowedRoles={['DONOR']}
            >
              <DonorDonationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/donor/reservations"
          element={
            <ProtectedRoute
              allowedRoles={['DONOR']}
            >
              <DonorReservationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/donor/analytics"
          element={
            <ProtectedRoute
              allowedRoles={['DONOR']}
            >
              <DonorAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/user-directory"
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN']}
            >
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute allowedRoles={['COURIER']}>
              <CourierLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/deliveries/queue"
            element={<DeliveryQueuePage />}
          />

          <Route
            path="/deliveries/active"
            element={<ActiveDeliveryPage />}
          />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}