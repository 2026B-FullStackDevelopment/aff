// Defines frontend routes and applies role guards to protected pages.
import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';
import { GuestRoute } from './GuestRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { RootRedirect } from './RootRedirect';
import { AdminDashboardPage } from '../modules/admin/pages/AdminDashboardPage';
import { DonorRegisterPage } from '../modules/auth/pages/DonorRegisterPage';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { RecipientRegisterPage } from '../modules/auth/pages/RecipientRegisterPage';
import { FoodListingsPage } from '../modules/browsing/pages/FoodListingsPage';
import { ListingDetailPage } from '@/modules/browsing/pages/ListingDetailPage';
import { DeliveryQueuePage } from '../modules/delivery/pages/DeliveryQueuePage';
import { DonorDonationsPage } from '../modules/donations/pages/DonorDonationsPage';
import { DonorReservationsPage } from '../modules/donations/pages/DonorReservationsPage';
import { FoodListingCreationPage } from '../modules/donations/pages/FoodListingCreationPage';
import { ManualDonationPage } from '../modules/donations/pages/ManualDonationPage';
import { MyReservationsPage } from '../modules/reservations/pages/MyReservationsPage';
import { SubscriptionPage } from '../modules/subscriptions/pages/SubscriptionPage';
import { ProfilePage } from '../modules/users/pages/ProfilePage';
import { DonorSoldOutAlerts } from '../modules/donations/components/DonorSoldOutAlerts';
import { DonorAnalyticsPage } from '../modules/donations/pages/DonorAnalyticsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <DonorSoldOutAlerts />
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
          path="/reservations"
          element={
            <ProtectedRoute
              allowedRoles={['RECIPIENT']}
            >
              <MyReservationsPage />
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
          path="/deliveries/queue"
          element={
            <ProtectedRoute
              allowedRoles={['COURIER']}
            >
              <DeliveryQueuePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}