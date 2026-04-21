import { Routes, Route, Outlet, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/profile/ProfilePage';
import HomePage from './pages/home/HomePage';
import RestaurantDetailsPage from './pages/restaurant/RestaurantDetailsPage';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import CartFloatingBar from './components/specific/CartFloatingBar';
import PartnerGateway from './pages/partner/PartnerGateway';
import RestaurantPartnerPage from './pages/partner/RestaurantPartnerPage';
import DeliveryPartnerPage from './pages/partner/DeliveryPartnerPage';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import ManageRestaurants from './pages/owner/ManageRestaurants';
import MenuManager from './pages/owner/MenuManager';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import PartnerLayout from './components/layout/PartnerLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import CartPage from './pages/cart/CartPage';

import OrdersPage from './pages/orders/OrdersPage';
import OrderTrackingPage from './pages/orders/OrderTrackingPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// ── Consumer layout (with Navbar, Cart, Footer) ─────────────────────────────
const ConsumerLayout = () => (
  <div className="min-h-screen flex flex-col font-sans bg-[#FFFCF5] text-[#2A0800]">
    <Navbar />
    <CartFloatingBar />
    <main className="flex-1 flex flex-col">
      <Outlet />
    </main>
    <Footer />
  </div>
);

// ── Role-aware root redirect: owners/agents → their dashboard ─────────────
const RoleAwareHome = () => {
  const { isAuthenticated, role } = useAuthStore();
  if (isAuthenticated && role === 'RESTAURANT_OWNER') return <Navigate to="/owner/dashboard" replace />;
  if (isAuthenticated && role === 'DELIVERY_AGENT') return <Navigate to="/delivery/dashboard" replace />;
  if (isAuthenticated && role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <HomePage />;
};

// ── Redirect /orders/:id to /orders/:id/track ─────────────
const OrderTrackingRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/orders/${id}/track`} replace />;
};
function App() {
  return (
    <ErrorBoundary>
      <Routes>

      {/* ── Consumer App (Navbar + Footer) ─────────────────────────── */}
      <Route element={<ConsumerLayout />}>
        <Route path="/" element={<RoleAwareHome />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/restaurant/:id" element={<RestaurantDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Route>

      {/* ── Tracking Page ──────────────────────────────────────────────── */}
      <Route path="/orders/:id/track" element={<OrderTrackingPage />} />
      {/* Redirect /orders/:id to tracking page */}
      <Route path="/orders/:id" element={<OrderTrackingRedirect />} />

      {/* ── Auth & Partner Setup (no layout headers) ────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/partner-with-us" element={<PartnerGateway />} />
      <Route path="/partner/restaurant/register" element={<RestaurantPartnerPage />} />
      <Route path="/partner/delivery/register" element={<DeliveryPartnerPage />} />

      {/* ── Owner Business Suite ────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['RESTAURANT_OWNER']} />}>
        <Route element={<PartnerLayout />}>
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/restaurants" element={<ManageRestaurants />} />
          <Route path="/owner/restaurants/:restaurantId/menu" element={<MenuManager />} />
          {/* Owner profile reuses the main profile page */}
          <Route path="/owner/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* ── Delivery Agent Suite ────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['DELIVERY_AGENT']} />}>
        <Route element={<PartnerLayout />}>
          <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
          <Route path="/delivery/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* ── Admin Suite ─────────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<PartnerLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* ── Catch-all: 404 redirect to home ─────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
    </ErrorBoundary>
  );
}

export default App;
