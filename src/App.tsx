import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import ScrollToTop from './components/ScrollToTop';

// মূল পেজগুলো
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Membership from './pages/Membership';
import Pending from './pages/Pending';
import ResellerDashboard from './pages/ResellerDashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import CreateOrder from './pages/CreateOrder';
import OrderDetails from './pages/OrderDetails';
import Earnings from './pages/Earnings';
import Profile from './pages/Profile';
import Legal from './pages/Legal';
import FAQ from './pages/FAQ';
import Support from './pages/Support';
import Refer from './pages/Refer';
import Withdraw from './pages/Withdraw';

// Layouts
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Admin পেজগুলো Lazy Load
const AdminMemberships = lazy(() => import('./pages/AdminMemberships'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminResellers = lazy(() => import('./pages/admin/AdminResellers'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
  </div>
);

// 🛡️ এডমিন প্রোটেক্টেড রুট: শুধু ভেরিফায়েড এডমিন ঢুকতে পারবে
function AdminProtectedRoute() {
  const [status, setStatus] = useState<'loading' | 'admin' | 'reseller' | 'unauth'>('loading');

  useEffect(() => {
    const checkRole = async () => {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) {
        setStatus('unauth');
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setStatus('admin');
        } else {
          setStatus('reseller');
        }
      } catch {
        setStatus('reseller');
      }
    };

    void checkRole();
  }, []);

  if (status === 'loading') return <PageLoader />;
  if (status === 'unauth') return <Navigate to="/login" replace />;
  if (status === 'reseller') return <Navigate to="/reseller-dashboard" replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <AdminLayout />
    </Suspense>
  );
}

// 🛡️ রিসেলার প্রোটেক্টেড রুট: এডমিন ঢুকতে চাইলে অটোমেটিক /admin-dashboard এ চলে যাবে
function ResellerProtectedRoute() {
  const [status, setStatus] = useState<'loading' | 'admin' | 'reseller' | 'unauth'>('loading');

  useEffect(() => {
    const checkRole = async () => {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) {
        setStatus('unauth');
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setStatus('admin'); // এডমিন আইডি হলে চিহ্নিত করা
        } else {
          setStatus('reseller');
        }
      } catch {
        setStatus('reseller');
      }
    };

    void checkRole();
  }, []);

  if (status === 'loading') return <PageLoader />;
  if (status === 'unauth') return <Navigate to="/login" replace />;
  // এডমিন একাউন্ট থাকলে রিসেলার ড্যাশবোর্ড নয়, সরাসরি এডমিন ড্যাশবোর্ডে পাঠাবে
  if (status === 'admin') return <Navigate to="/admin-dashboard" replace />;

  return <Layout />;
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <ScrollToTop />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/pending" element={<Pending />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/faq" element={<FAQ />} />

          {/* Reseller Protected Routes */}
          <Route element={<ResellerProtectedRoute />}>
            <Route path="/reseller-dashboard" element={<ResellerDashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/new" element={<CreateOrder />} />
            <Route path="/checkout" element={<CreateOrder />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/earnings" element={<Earnings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/support" element={<Support />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<AdminProtectedRoute />}>
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

          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
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
