import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Clock, IndianRupee, Loader2, ShoppingBag, TrendingUp } from 'lucide-react';
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

  const summaryCards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock },
    { label: 'Total Sales', value: `৳${stats.totalSales.toLocaleString()}`, icon: TrendingUp },
    { label: 'Estimated Profit', value: `৳${stats.totalProfit.toLocaleString()}`, icon: IndianRupee },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-zeluxe-black">Dashboard</h1>
      <p className="mb-6 text-sm text-gray-700">Welcome back to your reseller business</p>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading dashboard" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {summaryCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
                <Icon className="h-5 w-5 text-zeluxe-gold" />
                <p className="mt-3 text-xs uppercase font-semibold text-zeluxe-gray">{label}</p>
                <p className="mt-1 text-2xl font-bold text-zeluxe-black">{value}</p>
              </div>
            ))}
          </div>

          <section className="mt-8">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Recent Orders</h2>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-xl border border-zeluxe-lightgray bg-white p-4">
                    <div>
                      <p className="text-sm font-bold text-zeluxe-black">Order #{order.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs capitalize text-zeluxe-gray">{order.status}</p>
                    </div>
                    <p className="text-sm font-bold text-zeluxe-black">৳{order.total.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-zeluxe-fieldbg p-6 text-center text-gray-600">
                No orders yet. Start by browsing products.
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-3">
              <a href="/products" className="rounded-xl bg-zeluxe-black py-3 text-center text-sm font-bold text-white transition hover:bg-[#2a2a2a]">
                Browse Products
              </a>
              <a href="/orders" className="rounded-xl border border-zeluxe-black py-3 text-center text-sm font-bold text-zeluxe-black transition hover:bg-zeluxe-fieldbg">
                My Orders
              </a>
              <a href="/earnings" className="rounded-xl border border-zeluxe-black py-3 text-center text-sm font-bold text-zeluxe-black transition hover:bg-zeluxe-fieldbg">
                Earnings
              </a>
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}
