import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import About from './pages/About';
import Providers from './pages/Providers';
import ProviderDetails from './pages/ProviderDetails';
import FavoritesPage from './pages/FavoritesPage';
import RequestsPage from './pages/RequestsPage';
import RequestDetails from './pages/RequestDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AIAssistant from './pages/AIAssistant';
import CustomerDashboard from './pages/customer/Dashboard';
import Favorites from './pages/customer/Favorites';
import CustomerRequests from './pages/customer/Requests';
import Profile from './pages/customer/Profile';
import ProviderDashboard from './pages/provider/Dashboard';
import ProviderProfile from './pages/provider/Profile';
import ProviderRequests from './pages/provider/Requests';
import ProviderReviews from './pages/provider/Reviews';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProviders from './pages/admin/Providers';
import AdminCategories from './pages/admin/Categories';
import AdminReviews from './pages/admin/Reviews';
import AdminRequests from './pages/admin/Requests';
import NotFound from './pages/NotFound';

const customerLinks = [
  { to: '/dashboard/customer', label: 'Overview', end: true },
  { to: '/dashboard/customer/favorites', label: 'Favorites' },
  { to: '/dashboard/customer/requests', label: 'Requests' },
  { to: '/dashboard/customer/profile', label: 'Profile' },
];

const providerLinks = [
  { to: '/dashboard/provider', label: 'Overview', end: true },
  { to: '/dashboard/provider/profile', label: 'My services' },
  { to: '/dashboard/provider/requests', label: 'Requests' },
  { to: '/dashboard/provider/reviews', label: 'Reviews' },
  { to: '/dashboard/provider/account', label: 'Account' },
];

const adminLinks = [
  { to: '/dashboard/admin', label: 'Overview', end: true },
  { to: '/dashboard/admin/users', label: 'Users' },
  { to: '/dashboard/admin/providers', label: 'Providers' },
  { to: '/dashboard/admin/categories', label: 'Categories' },
  { to: '/dashboard/admin/reviews', label: 'Reviews' },
  { to: '/dashboard/admin/requests', label: 'Requests' },
];

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="providers" element={<Providers />} />
        <Route path="providers/:id" element={<ProviderDetails />} />
        <Route path="search" element={<Navigate to="/providers" replace />} />
        <Route
          path="favorites"
          element={
            <ProtectedRoute>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="requests"
          element={
            <ProtectedRoute>
              <RequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="requests/:id"
          element={
            <ProtectedRoute>
              <RequestDetails />
            </ProtectedRoute>
          }
        />
        <Route path="ai" element={<AIAssistant />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />

        {/* Task 2 role dashboards */}
        <Route
          path="dashboard/customer"
          element={
            <ProtectedRoute roles={['customer']}>
              <DashboardLayout title="Customer dashboard" links={customerLinks} />
            </ProtectedRoute>
          }
        >
          <Route index element={<CustomerDashboard />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="requests" element={<CustomerRequests />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route
          path="dashboard/provider"
          element={
            <ProtectedRoute roles={['provider']}>
              <DashboardLayout title="Provider dashboard" links={providerLinks} />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProviderDashboard />} />
          <Route path="profile" element={<ProviderProfile />} />
          <Route path="requests" element={<ProviderRequests />} />
          <Route path="reviews" element={<ProviderReviews />} />
          <Route path="account" element={<Profile />} />
        </Route>

        <Route
          path="dashboard/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <DashboardLayout title="Admin dashboard" links={adminLinks} />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="providers" element={<AdminProviders />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="requests" element={<AdminRequests />} />
        </Route>

        {/* Backward-compatible redirects */}
        <Route path="dashboard" element={<Navigate to="/dashboard/customer" replace />} />
        <Route path="dashboard/favorites" element={<Navigate to="/dashboard/customer/favorites" replace />} />
        <Route path="dashboard/requests" element={<Navigate to="/dashboard/customer/requests" replace />} />
        <Route path="dashboard/profile" element={<Navigate to="/dashboard/customer/profile" replace />} />
        <Route path="provider" element={<Navigate to="/dashboard/provider" replace />} />
        <Route path="provider/profile" element={<Navigate to="/dashboard/provider/profile" replace />} />
        <Route path="provider/requests" element={<Navigate to="/dashboard/provider/requests" replace />} />
        <Route path="provider/reviews" element={<Navigate to="/dashboard/provider/reviews" replace />} />
        <Route path="admin" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="admin/users" element={<Navigate to="/dashboard/admin/users" replace />} />
        <Route path="admin/providers" element={<Navigate to="/dashboard/admin/providers" replace />} />
        <Route path="admin/categories" element={<Navigate to="/dashboard/admin/categories" replace />} />
        <Route path="admin/reviews" element={<Navigate to="/dashboard/admin/reviews" replace />} />
        <Route path="admin/requests" element={<Navigate to="/dashboard/admin/requests" replace />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
