// Defines frontend page routes and applies role guards for protected pages.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestRoute } from './GuestRoute';
import { RootRedirect } from './RootRedirect';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { RecipientRegisterPage } from '../modules/auth/pages/RecipientRegisterPage';
import { DonorRegisterPage } from '../modules/auth/pages/DonorRegisterPage';
import { ProfilePage } from '../modules/users/pages/ProfilePage';
import { FoodListingsPage } from '../modules/browsing/pages/FoodListingsPage';
import { FoodListingCreationPage } from '../modules/donations/pages/FoodListingCreationPage'; 
import { MyReservationsPage } from '../modules/reservations/pages/MyReservationsPage';
import { SubscriptionPage } from '../modules/subscriptions/pages/SubscriptionPage';
import { AdminDashboardPage } from '../modules/admin/pages/AdminDashboardPage';
import { DeliveryQueuePage } from '../modules/delivery/pages/DeliveryQueuePage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect: authenticated → role home, unauthenticated → /login */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register/recipient" element={<GuestRoute><RecipientRegisterPage /></GuestRoute>} />
        <Route path="/register/donor" element={<GuestRoute><DonorRegisterPage /></GuestRoute>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT', 'DONOR', 'ADMIN']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/marketplace" 
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT']}>
              <FoodListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservations"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT']}>
              <MyReservationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT']}>
              <SubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/listing/create" 
          element={
            <ProtectedRoute allowedRoles={['DONOR']}>
              <FoodListingCreationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user-directory"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deliveries/queue"
          element={
            <ProtectedRoute allowedRoles={['COURIER']}>
              <DeliveryQueuePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
