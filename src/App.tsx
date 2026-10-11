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
import AdminDashboard from './pages/AdminDashboard';
import AdminMemberships from './pages/AdminMemberships';
import Landing from './pages/Landing';
import Earnings from './pages/Earnings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/pending" element={<Pending />} />
        <Route path="/reseller-dashboard" element={<ResellerDashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/new" element={<CreateOrder />} />
        <Route path="/orders/:id" element={<OrderDetails />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/profile" element={<div className="p-8">Profile Coming Soon</div>} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin/memberships" element={<AdminMemberships />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
