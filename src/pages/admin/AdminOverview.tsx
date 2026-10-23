import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  Users,
  UserCheck,
  Clock,
  Package,
  ShoppingBag,
  AlertCircle,
  FolderTree,
  Bell,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    returned: 'Returned',
    active: 'Active',
    pending_membership: 'Pending',
    suspended: 'Suspended',
  };
  return labels[status.toLowerCase()] || status;
}

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

        const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const resellers = users.filter((u) => u.role === 'reseller');
        const activeResellers = resellers.filter((u) => u.accountStatus === 'active');
        const pendingUsers = resellers.filter((u) => u.accountStatus === 'pending_membership');

        const products = productsSnap.docs;
        const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const pendingOrders = orders.filter(
          (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'shipped'
        );

        orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        const recent = orders.slice(0, 5).map((o) => ({
          id: o.id,
          customerName: typeof o.customerName === 'string' ? o.customerName : 'Unknown',
          total: typeof o.total === 'number' ? o.total : 0,
          status: typeof o.status === 'string' ? o.status : 'pending',
        }));

        const sortedResellers = [...resellers].sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
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
    { label: 'Total Resellers', value: stats.totalResellers, icon: Users },
    { label: 'Pending Memberships', value: stats.pendingMemberships, icon: Clock },
    { label: 'Active Resellers', value: stats.activeResellers, icon: UserCheck },
    { label: 'Total Products', value: stats.totalProducts, icon: Package },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: AlertCircle },
  ];

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
      delivered: 'bg-green-50 text-green-700 border border-green-200',
      pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      confirmed: 'bg-blue-50 text-blue-700 border border-blue-200',
      shipped: 'bg-purple-50 text-purple-700 border border-purple-200',
      cancelled: 'bg-red-50 text-red-700 border border-red-200',
      active: 'bg-green-50 text-green-700 border border-green-200',
      pending_membership: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      suspended: 'bg-red-50 text-red-700 border border-red-200',
    };
    return styles[status] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="mb-5 h-28 rounded-lg bg-gray-300"></div>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-200"></div>
          ))}
        </div>
        <div className="mb-5 grid grid-cols-3 gap-3 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-200"></div>
          ))}
        </div>
        <div className="mb-4 h-64 rounded-lg bg-gray-200"></div>
        <div className="h-48 rounded-lg bg-gray-200"></div>
      </div>
    );
  }

  return (
    // ═══ <AdminLayout> ট্যাগটি সরিয়ে সরাসরি div দিয়ে শুরু করা হয়েছে ═══
    <div className="mx-auto max-w-3xl pb-10">
      {/* ═══ HEADER ═══ */}
      <div className="mb-5 rounded-lg bg-zeluxe-black p-6 text-white">
        <p className="text-[11px] uppercase tracking-wider text-gray-400">
          Admin Panel
        </p>
        <h1 className="mt-1.5 text-xl font-bold">Zeluxe Gallery</h1>
        <p className="mt-1 text-xs text-gray-400">
          সব রিসেলার, অর্ডার ও পেমেন্ট একনজরে দেখুন
        </p>
      </div>

      {/* ═══ ATTENTION BANNER ═══ */}
      {(pendingCount > 0 || stats.pendingOrders > 0) && (
        <div className="mb-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-yellow-700" size={18} />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-900">
                Action Required!
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-yellow-700">
                {pendingCount > 0 && (
                  <p>• {pendingCount} Pending Membership Requests</p>
                )}
                {stats.pendingOrders > 0 && (
                  <p>• {stats.pendingOrders} Pending Orders</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUMMARY CARDS ═══ */}
      <div className="mb-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-zeluxe-lightgray bg-white p-4"
            >
              <Icon className="text-zeluxe-gold" size={18} />
              <p className="mt-3 text-2xl font-bold text-zeluxe-black">{value}</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ QUICK LINKS ═══ */}
      <div className="mb-5">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Quick Links
        </h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {quickLinks.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-2 rounded-lg border border-zeluxe-lightgray bg-white p-3 transition hover:border-zeluxe-gold"
            >
              <Icon className="text-zeluxe-gold" size={20} />
              <span className="text-center text-[10px] font-medium text-zeluxe-black">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ RECENT ORDERS ═══ */}
      <div className="mb-4 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white">
        <div className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-zeluxe-gold" size={15} />
            <h2 className="text-sm font-bold text-zeluxe-black">Recent Orders</h2>
          </div>
          <Link
            to="/admin/orders"
            className="flex items-center gap-1 text-[11px] font-medium text-zeluxe-gold hover:underline"
          >
            View All
            <ArrowRight size={12} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">
            No orders yet
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
                  {getStatusLabel(order.status)}
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
      <div className="mb-4 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white">
        <div className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="text-zeluxe-gold" size={15} />
            <h2 className="text-sm font-bold text-zeluxe-black">New Resellers</h2>
          </div>
          <Link
            to="/admin/resellers"
            className="flex items-center gap-1 text-[11px] font-medium text-zeluxe-gold hover:underline"
          >
            View All
            <ArrowRight size={12} />
          </Link>
        </div>

        {newResellers.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">
            No resellers yet
          </p>
        ) : (
          newResellers.map((reseller) => (
            <div
              key={reseller.id}
              className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3 last:border-0"
            >
              <p className="text-sm font-bold capitalize text-zeluxe-black">
                {reseller.name}
              </p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${getStatusBadge(reseller.accountStatus)}`}
              >
                {getStatusLabel(reseller.accountStatus)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ═══ MEMBERSHIP REQUESTS ═══ */}
      <div className="overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white">
        <div className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3">
          <div className="flex items-center gap-2">
            <UserCheck className="text-zeluxe-gold" size={15} />
            <h2 className="text-sm font-bold text-zeluxe-black">Membership Requests</h2>
          </div>
          <Link
            to="/admin/memberships"
            className="flex items-center gap-1 text-[11px] font-medium text-zeluxe-gold hover:underline"
          >
            View All
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="p-4">
          {pendingCount === 0 ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={18} />
              <div>
                <p className="text-sm font-bold text-zeluxe-black">No pending requests</p>
                <p className="text-xs text-gray-500">সব মেম্বারশিপ রিকোয়েস্ট প্রসেস করা হয়েছে</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Clock className="text-yellow-600" size={18} />
              <div>
                <p className="text-sm font-bold text-zeluxe-black">
                  {pendingCount} Pending Requests
                </p>
                <p className="text-xs text-gray-500">যাচাই করতে মেম্বারশিপ পেজে যান</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}