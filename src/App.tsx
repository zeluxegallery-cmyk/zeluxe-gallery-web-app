import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Membership from './pages/Membership';
import Pending from './pages/Pending';
import ResellerDashboard from './pages/ResellerDashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import CreateOrder from './pages/CreateOrder';
import OrderDetails from './pages/OrderDetails';
import Earnings from './pages/Earnings';
import Landing from './pages/Landing';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Legal from './pages/Legal';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/pending" element={<Pending />} />
        <Route path="/reseller-dashboard" element={<ResellerDashboard />} />
        <Route path="/products" element={<Products />} />
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
  );
}
