import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  Clock,
  Wallet,
  Loader2,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  User,
  ArrowUpRight,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';

type Order = {
  id: string;
  orderId: string;
  productName: string;
  customerName: string;
  status: string;
  total: number;
  quantity: number;
  sellingPrice: number;
  productId: string;
  createdAt?: { seconds?: number };
  actualProfit: number;
};

type Stats = {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalSales: number;
  actualProfit: number;
  availableBalance: number;
  totalWithdrawn: number;
};

const initialStats: Stats = {
  totalOrders: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
  totalSales: 0,
  actualProfit: 0,
  availableBalance: 0,
  totalWithdrawn: 0,
};

const PENDING_STATUSES = ['pending', 'confirmed', 'shipped'];

function getStatusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'confirmed':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'shipped':
      return 'bg-purple-50 text-purple-700 border border-purple-200';
    case 'delivered':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'cancelled':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'returned':
      return 'bg-orange-50 text-orange-700 border border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  const d = new Date(seconds * 1000);
  return d.toLocaleDateString('bn-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTodayBengali() {
  const d = new Date();
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

export default function ResellerDashboard() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const productMap: Record<string, number> = {};
        productsSnap.docs.forEach((p) => {
          const data = p.data();
          productMap[p.id] = typeof data.resellerPrice === 'number' ? data.resellerPrice : 0;
        });

        const ordersQuery = query(collection(db, 'orders'), where('resellerId', '==', uid));
        const snapshot = await getDocs(ordersQuery);
        const fetchedOrders: Order[] = snapshot.docs.map((orderDocument) => {
          const data = orderDocument.data();
          const quantity = typeof data.quantity === 'number' ? data.quantity : 0;
          const sellingPrice = typeof data.sellingPrice === 'number' ? data.sellingPrice : 0;
          const productId = typeof data.productId === 'string' ? data.productId : '';
          const resellerPrice = productMap[productId] || 0;
          const actualProfit = (sellingPrice - resellerPrice) * quantity;

          return {
            id: orderDocument.id,
            orderId: typeof data.orderId === 'string' ? data.orderId : orderDocument.id,
            productName: typeof data.productName === 'string' ? data.productName : 'Product',
            customerName: typeof data.customerName === 'string' ? data.customerName : '',
            status: typeof data.status === 'string' ? data.status : 'pending',
            total: typeof data.total === 'number' ? data.total : 0,
            quantity,
            sellingPrice,
            productId,
            createdAt: data.createdAt,
            actualProfit,
          };
        });

        const withdrawQuery = query(
          collection(db, 'withdrawRequests'),
          where('resellerId', '==', uid)
        );
        const withdrawSnap = await getDocs(withdrawQuery);
        const totalWithdrawn = withdrawSnap.docs
          .map((d) => d.data())
          .filter((d) => d.status === 'approved' || d.status === 'paid')
          .reduce((sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0), 0);

        const totalSales = fetchedOrders.reduce((sum, order) => sum + order.total, 0);
        const pendingOrders = fetchedOrders.filter((order) =>
          PENDING_STATUSES.includes(order.status)
        ).length;
        const deliveredOrders = fetchedOrders.filter((order) => order.status === 'delivered').length;
        const actualProfit = fetchedOrders
          .filter((order) => order.status === 'delivered')
          .reduce((sum, order) => sum + order.actualProfit, 0);

        const availableBalance = actualProfit - totalWithdrawn;

        setOrders(fetchedOrders);
        setStats({
          totalOrders: fetchedOrders.length,
          pendingOrders,
          deliveredOrders,
          totalSales,
          actualProfit,
          availableBalance: availableBalance > 0 ? availableBalance : 0,
          totalWithdrawn,
        });
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const recentOrders = [...orders]
    .sort((first, second) => (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0))
    .slice(0, 5);

  const resellerName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split('@')[0] ||
    'Reseller';

  const summaryCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: ShoppingBag,
    },
    {
      label: 'Pending',
      value: stats.pendingOrders.toString(),
      icon: Clock,
    },
    {
      label: 'Total Sales',
      value: `Tk ${stats.totalSales.toLocaleString()}`,
      icon: TrendingUp,
    },
    {
      label: 'Delivered',
      value: stats.deliveredOrders.toString(),
      icon: CheckCircle,
    },
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
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        {/* ═══ GREETING CARD ═══ */}
        <div className="mb-4 rounded-lg bg-zeluxe-black p-6 text-white">
          <p className="text-xs text-gray-400">স্বাগতম,</p>
          <h1 className="mt-1 text-xl font-bold capitalize text-white">
            {resellerName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-zeluxe-gold px-2.5 py-1 text-[11px] font-bold text-zeluxe-black">
              <CheckCircle size={11} />
              অ্যাক্টিভ রিসেলার
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-gray-300">
              <Calendar size={11} />
              {formatTodayBengali()}
            </span>
          </div>
        </div>

        {/* ═══ AVAILABLE BALANCE ═══ */}
        <div className="mb-4 rounded-lg border border-zeluxe-lightgray bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-zeluxe-gold" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Available Balance
                </p>
              </div>
              <p className="mt-2 text-3xl font-bold text-zeluxe-black">
                Tk {stats.availableBalance.toLocaleString()}
              </p>
            </div>
            <Link
              to="/withdraw"
              className="flex items-center gap-1 rounded-md bg-zeluxe-black px-3.5 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
            >
              Withdraw
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-4 border-t border-zeluxe-lightgray pt-3 text-xs">
            <div>
              <p className="text-gray-500">মোট আয়</p>
              <p className="mt-0.5 font-bold text-green-600">Tk {stats.actualProfit.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-zeluxe-lightgray"></div>
            <div>
              <p className="text-gray-500">তুলেছেন</p>
              <p className="mt-0.5 font-bold text-zeluxe-black">Tk {stats.totalWithdrawn.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ═══ SUMMARY CARDS ═══ */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-zeluxe-lightgray bg-white p-4"
            >
              <Icon className="text-zeluxe-gold" size={18} />
              <p className="mt-3 text-2xl font-bold text-zeluxe-black">{value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="mb-6 rounded-lg border border-zeluxe-lightgray bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Quick Actions
          </p>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center gap-2 rounded-md p-2 transition hover:bg-zeluxe-fieldbg"
              >
                <Icon className="text-zeluxe-gold" size={20} />
                <span className="text-center text-[11px] font-medium text-zeluxe-black">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══ RECENT ORDERS ═══ */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-zeluxe-black">Recent Orders</h2>
            <Link
              to="/orders"
              className="text-xs font-medium text-zeluxe-gold hover:underline"
            >
              সব দেখুন →
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block rounded-lg border border-zeluxe-lightgray bg-white p-4 transition hover:border-zeluxe-gold"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-mono text-xs font-bold text-zeluxe-black">
                        {order.orderId}
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {order.productName}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${getStatusBadgeClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(order.createdAt?.seconds)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zeluxe-gold">
                        Tk {order.total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zeluxe-lightgray bg-white p-8 text-center">
              <Package className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-3 text-sm text-gray-600">
                এখনো কোনো অর্ডার নেই।
              </p>
              <Link
                to="/products"
                className="mt-3 inline-block rounded-md bg-zeluxe-black px-5 py-2 text-sm font-bold text-white"
              >
                প্রোডাক্ট দেখুন
              </Link>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}