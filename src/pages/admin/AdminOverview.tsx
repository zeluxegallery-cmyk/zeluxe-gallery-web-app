import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import {
  Users,
  UserCheck,
  Clock,
  Package,
  ShoppingBag,
  AlertCircle,
  FolderTree,
  Bell,
  TrendingUp,
  ArrowRight,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { db } from '../../firebase';

type Stats = {
  totalResellers: number;
  pendingMemberships: number;
  activeResellers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
};

type RecentOrder = {
  id: string;
  customerName: string;
  total: number;
  status: string;
};

type NewReseller = {
  id: string;
  name: string;
  accountStatus: string;
};

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    totalResellers: 0,
    pendingMemberships: 0,
    activeResellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [newResellers, setNewResellers] = useState<NewReseller[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [usersSnap, productsSnap, ordersSnap, requestsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'orders')),
          getDocs(query(collection(db, 'membershipRequests'), where('status', '==', 'pending'))),
        ]);

        // Users
        const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const resellers = users.filter((u) => u.role === 'reseller');
        const activeResellers = resellers.filter((u) => u.accountStatus === 'active');
        const pendingUsers = resellers.filter((u) => u.accountStatus === 'pending_membership');

        // Products
        const products = productsSnap.docs;

        // Orders
        const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'shipped');

        // Sort orders client-side
        orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        const recent = orders.slice(0, 5).map((o) => ({
          id: o.id,
          customerName: typeof o.customerName === 'string' ? o.customerName : 'Unknown',
          total: typeof o.total === 'number' ? o.total : 0,
          status: typeof o.status === 'string' ? o.status : 'pending',
        }));

        // Sort new resellers client-side
        const sortedResellers = [...resellers].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        const newest = sortedResellers.slice(0, 5).map((r) => ({
          id: r.id,
          name: typeof r.name === 'string' ? r.name : 'Unknown',
          accountStatus: typeof r.accountStatus === 'string' ? r.accountStatus : 'pending',
        }));

        setStats({
          totalResellers: resellers.length,
          pendingMemberships: pendingUsers.length,
          activeResellers: activeResellers.length,
          totalProducts: products.length,
          totalOrders: orders.length,
          pendingOrders: pendingOrders.length,
        });
        setRecentOrders(recent);
        setNewResellers(newest);
        setPendingCount(requestsSnap.size);
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    void loadAll();
  }, []);

  const summaryCards = [
    { label: 'Total Resellers', value: stats.totalResellers, icon: Users, color: 'blue' },
    { label: 'Pending Memberships', value: stats.pendingMemberships, icon: Clock, color: 'yellow' },
    { label: 'Active Resellers', value: stats.activeResellers, icon: UserCheck, color: 'green' },
    { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'gold' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'blue' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: AlertCircle, color: 'yellow' },
  ];

  const colorStyles: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    gold: { bg: 'bg-zeluxe-gold/10', text: 'text-zeluxe-gold' },
  };

  const quickLinks = [
    { label: 'Memberships', path: '/admin/memberships', icon: UserCheck },
    { label: 'Resellers', path: '/admin/resellers', icon: Users },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      shipped: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700',
      active: 'bg-green-100 text-green-700',
      pending_membership: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl">
        {/* ═══ HEADER ═══ */}
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-zeluxe-black via-gray-900 to-black p-6 text-white">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-zeluxe-gold/20 blur-2xl"></div>
          <div className="relative">
            <p className="text-xs text-gray-400">Admin Panel</p>
            <h1 className="mt-1 text-2xl font-bold">Zeluxe Gallery</h1>
            <p className="mt-1 text-sm text-gray-300">
              সব রিসেলার, অর্ডার ও পেমেন্ট একনজরে
            </p>
          </div>
        </div>

        {/* ═══ ATTENTION BANNER (if pending items) ═══ */}
        {(pendingCount > 0 || stats.pendingOrders > 0) && (
          <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-200">
                <AlertCircle className="text-yellow-700" size={16} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-yellow-900">
                  আপনার মনোযোগ দরকার
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-yellow-700">
                  {pendingCount > 0 && (
                    <p>• {pendingCount}টি Membership Request অপেক্ষমাণ</p>
                  )}
                  {stats.pendingOrders > 0 && (
                    <p>• {stats.pendingOrders}টি Order অপেক্ষমাণ</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUMMARY CARDS ═══ */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {summaryCards.map(({ label, value, icon: Icon, color }) => {
              const cs = colorStyles[color] || colorStyles.gold;
              return (
                <div
                  key={label}
                  className="rounded-2xl border border-zeluxe-lightgray bg-white p-4 transition hover:shadow-sm"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${cs.bg}`}>
                    <Icon className={cs.text} size={18} />
                  </span>
                  <p className="mt-3 text-2xl font-bold text-zeluxe-black">{value}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ QUICK LINKS ═══ */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
            Quick Links
          </h2>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {quickLinks.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center gap-2 rounded-2xl border border-zeluxe-lightgray bg-white p-3 transition hover:border-zeluxe-gold hover:shadow-sm active:scale-[0.97]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-gold/10">
                  <Icon className="text-zeluxe-gold" size={18} />
                </span>
                <span className="text-center text-[10px] font-medium text-zeluxe-black">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══ RECENT ORDERS ═══ */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-zeluxe-lightgray bg-white">
          <div className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-zeluxe-gold" size={16} />
              <h2 className="text-sm font-bold text-zeluxe-black">Recent Orders</h2>
            </div>
            <Link
              to="/admin/orders"
              className="flex items-center gap-1 text-xs font-medium text-zeluxe-gold hover:underline"
            >
              সব দেখুন
              <ArrowRight size={12} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              এখনো কোনো অর্ডার নেই
            </p>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-bold text-zeluxe-black">
                    {order.customerName}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${getStatusBadge(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-zeluxe-gold">
                  Tk {order.total.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* ═══ NEW RESELLERS ═══ */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-zeluxe-lightgray bg-white">
          <div className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="text-zeluxe-gold" size={16} />
              <h2 className="text-sm font-bold text-zeluxe-black">New Resellers</h2>
            </div>
            <Link
              to="/admin/resellers"
              className="flex items-center gap-1 text-xs font-medium text-zeluxe-gold hover:underline"
            >
              সব দেখুন
              <ArrowRight size={12} />
            </Link>
          </div>

          {newResellers.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              এখনো কোনো রিসেলার নেই
            </p>
          ) : (
            newResellers.map((reseller) => (
              <div
                key={reseller.id}
                className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zeluxe-gold/10">
                    <Users className="text-zeluxe-gold" size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zeluxe-black capitalize">
                      {reseller.name}
                    </p>
                    <span
                      className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${getStatusBadge(reseller.accountStatus)}`}
                    >
                      {reseller.accountStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ═══ MEMBERSHIP REQUESTS STATUS ═══ */}
        <div className="overflow-hidden rounded-2xl border border-zeluxe-lightgray bg-white">
          <div className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3">
            <div className="flex items-center gap-2">
              <UserCheck className="text-zeluxe-gold" size={16} />
              <h2 className="text-sm font-bold text-zeluxe-black">Membership Requests</h2>
            </div>
            <Link
              to="/admin/memberships"
              className="flex items-center gap-1 text-xs font-medium text-zeluxe-gold hover:underline"
            >
              সব দেখুন
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-4">
            {pendingCount === 0 ? (
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle className="text-green-600" size={16} />
                </span>
                <div>
                  <p className="text-sm font-bold text-zeluxe-black">No pending requests</p>
                  <p className="text-xs text-gray-500">সব membership request প্রসেস করা হয়েছে</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-50">
                  <Clock className="text-yellow-600" size={16} />
                </span>
                <div>
                  <p className="text-sm font-bold text-zeluxe-black">
                    {pendingCount}টি Request অপেক্ষমাণ
                  </p>
                  <p className="text-xs text-gray-500">যাচাই করতে Memberships পেজে যান</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          সর্বশেষ আপডেট: এই মুহূর্তে
        </p>
      </div>
    </AdminLayout>
  );
}
