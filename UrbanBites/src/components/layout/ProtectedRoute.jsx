import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * ProtectedRoute — blocks unauthenticated access and enforces role-based routing.
 *
 * Usage:
 *   <Route element={<ProtectedRoute allowedRoles={['RESTAURANT_OWNER']} />}>
 *     <Route path="/owner/dashboard" element={<OwnerDashboard />} />
 *   </Route>
 *
 * - If not authenticated → redirect to /login
 * - If authenticated but wrong role → redirect to their correct dashboard
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    // Not logged in at all → send to login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Logged in but WRONG role (e.g. customer trying /owner/dashboard)
    // Send them to their correct home
    const redirectMap = {
      RESTAURANT_OWNER: '/owner/dashboard',
      DELIVERY_AGENT: '/delivery/dashboard',
      ADMIN: '/admin/dashboard',
      CUSTOMER: '/',
    };
    return <Navigate to={redirectMap[role] || '/'} replace />;
  }

  return <Outlet />;
}
