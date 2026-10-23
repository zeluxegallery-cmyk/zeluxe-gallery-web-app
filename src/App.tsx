import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import ScrollToTop from './components/ScrollToTop'; // আপনার আগের কম্পোনেন্ট
import { Loader2 } from 'lucide-react';

// ═══ ১. পেজগুলো Lazy Load করা (শুধু প্রয়োজনের সময় ডাউনলোড হবে) ═══
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Membership = lazy(() => import('./pages/Membership'));
const Pending = lazy(() => import('./pages/Pending'));
const ResellerDashboard = lazy(() => import('./pages/ResellerDashboard'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Orders = lazy(() => import('./pages/Orders'));
const CreateOrder = lazy(() => import('./pages/CreateOrder'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const Earnings = lazy(() => import('./pages/Earnings'));
const Landing = lazy(() => import('./pages/Landing'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Legal = lazy(() => import('./pages/Legal'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Support = lazy(() => import('./pages/Support'));
const Refer = lazy(() => import('./pages/Refer'));
const Withdraw = lazy(() => import('./pages/Withdraw'));

// Admin Pages
const AdminMemberships = lazy(() => import('./pages/AdminMemberships'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminResellers = lazy(() => import('./pages/admin/AdminResellers'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));

// Layouts
const Layout = lazy(() => import('./components/Layout'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));

// ═══ ২. লোডিং স্ক্রিন (Suspense Fallback) ═══
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-zeluxe-cream">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-zeluxe-gold" />
      <p className="text-sm font-medium text-gray-500">লোড হচ্ছে...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <>
      <BrowserRouter>
        <ScrollToTop />
        
        {/* Suspense দিয়ে সব পেজকে ঘিরে রাখা হলো */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ═══ Public Routes (লেআউট ছাড়া) ═══ */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/membership" element={<Membership />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/faq" element={<FAQ />} />

            {/* ═══ Reseller Routes (Layout এর ভেতরে) ═══ */}
            <Route element={<Layout />}>
              <Route path="/reseller-dashboard" element={<ResellerDashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/new" element={<CreateOrder />} />
              <Route path="/orders/:id" element={<OrderDetails />} />
              <Route path="/earnings" element={<Earnings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/refer" element={<Refer />} />
              <Route path="/support" element={<Support />} />
            </Route>

            {/* ═══ Admin Routes (AdminLayout এর ভেতরে) ═══ */}
            <Route element={<AdminLayout />}>
              <Route path="/admin-dashboard" element={<AdminOverview />} />
              <Route path="/admin/memberships" element={<AdminMemberships />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/resellers" element={<AdminResellers />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
              <Route path="/admin/reports" element={<AdminReports />} />
            </Route>

            {/* ═══ 404 Redirect ═══ */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: '#FFFFFF',
            border: '1px solid #EDE8DC',
            color: '#171717',
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
    </>
  );
}