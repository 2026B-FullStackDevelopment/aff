// Defines frontend page routes and applies role guards for protected pages.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RootRedirect } from './RootRedirect';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { RecipientRegisterPage } from '../modules/auth/pages/RecipientRegisterPage';
import { DonorRegisterPage } from '../modules/auth/pages/DonorRegisterPage';
import { ProfilePage } from '../modules/users/pages/ProfilePage';
import { FoodListingsPage } from '../modules/browsing/pages/FoodListingsPage';
import { MyReservationsPage } from '../modules/reservations/pages/MyReservationsPage';
import { SubscriptionPage } from '../modules/subscriptions/pages/SubscriptionPage';
import { AdminDashboardPage } from '../modules/admin/pages/AdminDashboardPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect: authenticated → role home, unauthenticated → /login */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register/recipient" element={<RecipientRegisterPage />} />
        <Route path="/register/donor" element={<DonorRegisterPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT', 'DONOR', 'ADMIN']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/marketplace" element={<FoodListingsPage />} />
        <Route path="/listing/create" element={<FoodListingsPage />} />
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
          path="/admin/user-directory"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
