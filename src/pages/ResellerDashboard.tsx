import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  Clock,
  IndianRupee,
  Loader2,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  User,
} from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt?: { seconds?: number };
};

type Stats = {
  totalOrders: number;
  pendingOrders: number;
  totalSales: number;
  totalProfit: number;
};

const initialStats: Stats = {
  totalOrders: 0,
  pendingOrders: 0,
  totalSales: 0,
  totalProfit: 0,
};

function getStatusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-gray-200 text-gray-800';
    case 'shipped':
      return 'bg-gray-200 text-gray-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function ResellerDashboard() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const ordersQuery = query(collection(db, 'orders'), where('resellerId', '==', uid));
        const snapshot = await getDocs(ordersQuery);
        const fetchedOrders: Order[] = snapshot.docs.map((orderDocument) => {
          const data = orderDocument.data();
          return {
            id: orderDocument.id,
            status: typeof data.status === 'string' ? data.status : 'pending',
            total: typeof data.total === 'number' ? data.total : 0,
            createdAt: data.createdAt,
          };
        });
        const totalSales = fetchedOrders.reduce((sum, order) => sum + order.total, 0);
        const pendingOrders = fetchedOrders.filter((order) => order.status === 'pending').length;

        setOrders(fetchedOrders);
        setStats({
          totalOrders: fetchedOrders.length,
          pendingOrders,
          totalSales,
          totalProfit: totalSales * 0.2,
        });
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, []);

  const recentOrders = [...orders]
    .sort((first, second) => (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0))
    .slice(0, 5);

  const resellerName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Reseller';

  const summaryCards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag },
    { label: 'Pending', value: stats.pendingOrders, icon: Clock },
    { label: 'Total Sales', value: `৳${stats.totalSales.toLocaleString()}`, icon: TrendingUp },
    { label: 'Profit', value: `৳${stats.totalProfit.toLocaleString()}`, icon: IndianRupee },
  ];

  const quickActions = [
    { label: 'প্রোডাক্ট', path: '/products', icon: Package },
    { label: 'নতুন অর্ডার', path: '/orders/new', icon: Plus },
    { label: 'আর্নিংস', path: '/earnings', icon: TrendingUp },
    { label: 'প্রোফাইল', path: '/profile', icon: User },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading dashboard" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* GREETING */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-zeluxe-black to-gray-900 p-6 text-white">
        <p className="text-xs text-gray-300">স্বাগতম,</p>
        <h1 className="mt-1 text-2xl font-bold text-white">{resellerName}</h1>
        <span className="mt-2 inline-block rounded-full bg-zeluxe-gold px-2 py-1 text-xs font-bold text-zeluxe-black">
          ✓ অ্যাক্টিভ রিসেলার
        </span>
      </div>

      {/* SUMMARY CARDS */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-zeluxe-lightgray bg-white p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-gold/10">
              <Icon className="text-zeluxe-gold" size={20} />
            </span>
            <p className="mt-3 text-2xl font-bold text-zeluxe-black">{value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {quickActions.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className="flex flex-col items-center gap-2 rounded-xl border border-zeluxe-lightgray bg-white p-3 transition hover:bg-zeluxe-fieldbg active:scale-[0.97]"
          >
            <Icon className="text-zeluxe-gold" size={20} />
            <span className="text-xs font-medium text-zeluxe-black">{label}</span>
          </Link>
        ))}
      </div>

      {/* RECENT ORDERS */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Recent Orders</h2>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-zeluxe-lightgray bg-white p-4 transition hover:bg-zeluxe-fieldbg active:scale-[0.98]"
              >
                <div>
                  <p className="text-sm font-bold text-zeluxe-black">Order #{order.id.slice(0, 8)}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-bold capitalize ${getStatusBadgeClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-zeluxe-black">৳{order.total.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-zeluxe-fieldbg p-6 text-center text-gray-600">
            No orders yet. Start by browsing products.
          </div>
        )}
      </section>
    </Layout>
  );
}
