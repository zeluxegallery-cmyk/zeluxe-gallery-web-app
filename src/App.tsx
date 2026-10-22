import { useEffect } from 'react'; // ═══ নতুন ইমপোর্ট ═══
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // useLocation যোগ করুন
import { Toaster } from 'sonner';

// আপনার পেজগুলো ইমপোর্ট করুন (যেমনটা আগে ছিল)
import Login from './pages/Login';
import Register from './pages/Register';
import Membership from './pages/Membership';
import Pending from './pages/Pending';
import ResellerDashboard from './pages/ResellerDashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import CreateOrder from './pages/CreateOrder';
import OrderDetails from './pages/OrderDetails';
import Earnings from './pages/Earnings';
import Landing from './pages/Landing';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Legal from './pages/Legal';
import FAQ from './pages/FAQ';
import Support from './pages/Support';
import Refer from './pages/Refer';
import Withdraw from './pages/Withdraw';
import AdminMemberships from './pages/AdminMemberships';
import AdminOverview from './pages/admin/AdminOverview';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminResellers from './pages/admin/AdminResellers';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminReports from './pages/admin/AdminReports';

// ═══ নতুন ফাইল ছাড়াই স্ক্রল ফিক্স করার কম্পোনেন্ট ═══
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        {/* ═══ এখানে যুক্ত করা হলো ═══ */}
        <ScrollToTop /> 
        
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/support" element={<Support />} />
          <Route path="/refer" element={<Refer />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/pending" element={<Pending />} />
          <Route path="/reseller-dashboard" element={<ResellerDashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/new" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/admin-dashboard" element={<AdminOverview />} />
          <Route path="/admin/memberships" element={<AdminMemberships />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/resellers" element={<AdminResellers />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>

      {/* ═══ Toast Notifications ═══ */}
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
          className: 'font-sans',
        }}
      />
    </>
  );
}