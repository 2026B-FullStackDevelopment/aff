// Defines frontend page routes and applies role guards for protected pages.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { RegisterPage } from '../modules/auth/pages/RegisterPage';
import { ProfilePage } from '../modules/users/pages/ProfilePage';
import { FoodListingsPage } from '../modules/food/pages/FoodListingsPage';
import { MyReservationsPage } from '../modules/reservations/pages/MyReservationsPage';
import { SubscriptionPage } from '../modules/subscriptions/pages/SubscriptionPage';
import { AdminDashboardPage } from '../modules/admin/pages/AdminDashboardPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/food" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['RECIPIENT', 'DONOR', 'ADMIN']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/food" element={<FoodListingsPage />} />
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
          path="/admin"
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
