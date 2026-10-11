import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { CheckCircle, Clock, IndianRupee, Loader2, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';

type Order = {
  id: string;
  orderId: string;
  total: number;
  status: string;
  createdAt?: { seconds?: number };
};

type Stats = {
  totalSales: number;
  deliveredSales: number;
  pendingAmount: number;
  estimatedProfit: number;
};

const initialStats: Stats = {
  totalSales: 0,
  deliveredSales: 0,
  pendingAmount: 0,
  estimatedProfit: 0,
};

type Breakdown = {
  status: string;
  count: number;
  amount: number;
  textClass: string;
};

const BREAKDOWN_CONFIG: { status: string; textClass: string }[] = [
  { status: 'pending', textClass: 'text-yellow-700' },
  { status: 'confirmed', textClass: 'text-blue-700' },
  { status: 'shipped', textClass: 'text-purple-700' },
  { status: 'delivered', textClass: 'text-green-700' },
  { status: 'cancelled', textClass: 'text-red-700' },
];

const PENDING_STATUSES = ['pending', 'confirmed', 'shipped'];

function getStatusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function Earnings() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEarnings = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDocs(
          query(collection(db, 'orders'), where('resellerId', '==', uid)),
        );
        const sorted = snapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.seconds || 0;
          const bTime = b.data().createdAt?.seconds || 0;
          return bTime - aTime;
        });
        const fetchedOrders: Order[] = sorted.map((orderDoc) => {
          const data = orderDoc.data();
          return {
            id: orderDoc.id,
            orderId: typeof data.orderId === 'string' ? data.orderId : orderDoc.id,
            total: typeof data.total === 'number' ? data.total : 0,
            status: typeof data.status === 'string' ? data.status : 'pending',
            createdAt: data.createdAt,
          };
        });

        const totalSales = fetchedOrders.reduce((sum, order) => sum + order.total, 0);
        const deliveredSales = fetchedOrders
          .filter((order) => order.status === 'delivered')
          .reduce((sum, order) => sum + order.total, 0);
        const pendingAmount = fetchedOrders
          .filter((order) => PENDING_STATUSES.includes(order.status))
          .reduce((sum, order) => sum + order.total, 0);
        const estimatedProfit = deliveredSales * 0.2;

        setStats({ totalSales, deliveredSales, pendingAmount, estimatedProfit });
        setOrders(fetchedOrders);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load earnings.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadEarnings();
  }, []);

  const summaryCards = [
    {
      label: 'Total Sales',
      value: `৳${stats.totalSales.toLocaleString()}`,
      icon: TrendingUp,
      iconClass: 'text-zeluxe-gold',
      valueClass: 'text-zeluxe-black',
    },
    {
      label: 'Delivered Sales',
      value: `৳${stats.deliveredSales.toLocaleString()}`,
      icon: CheckCircle,
      iconClass: 'text-green-600',
      valueClass: 'text-green-600',
    },
    {
      label: 'Pending Amount',
      value: `৳${stats.pendingAmount.toLocaleString()}`,
      icon: Clock,
      iconClass: 'text-yellow-600',
      valueClass: 'text-yellow-600',
    },
    {
      label: 'Est. Profit',
      value: `৳${stats.estimatedProfit.toLocaleString()}`,
      icon: IndianRupee,
      iconClass: 'text-zeluxe-gold',
      valueClass: 'text-zeluxe-gold',
    },
  ];

  const breakdown: Breakdown[] = BREAKDOWN_CONFIG.map(({ status, textClass }) => {
    const matching = orders.filter((order) => order.status === status);
    return {
      status,
      count: matching.length,
      amount: matching.reduce((sum, order) => sum + order.total, 0),
      textClass,
    };
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading earnings" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </Layout>
    );
  }

  if (orders.length === 0) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold text-zeluxe-black">Earnings & Accounting</h1>
        <p className="mb-6 text-sm text-gray-600">Track your sales, profit, and outstanding balance</p>
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-zeluxe-gray" />
          <p className="mt-4 text-gray-600">
            No earnings yet. Start creating orders to see your profit!
          </p>
          <Link
            to="/orders/new"
            className="mt-4 inline-block rounded-xl bg-zeluxe-black px-6 py-3 font-bold text-white transition hover:bg-[#2a2a2a]"
          >
            Create Order
          </Link>
        </div>
      </Layout>
    );
  }

  const recentTransactions = orders.slice(0, 10);

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-zeluxe-black">Earnings & Accounting</h1>
      <p className="mb-6 text-sm text-gray-600">Track your sales, profit, and outstanding balance</p>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, iconClass, valueClass }) => (
          <div
            key={label}
            className="rounded-xl border border-zeluxe-lightgray bg-white p-4"
          >
            <Icon className={`h-5 w-5 ${iconClass}`} />
            <p className="mt-3 text-xs uppercase text-zeluxe-gray">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-xl bg-zeluxe-fieldbg p-5">
        <h2 className="mb-3 text-sm font-bold text-zeluxe-black">How we calculate:</h2>
        <ul className="space-y-2 text-xs text-gray-600">
          <li>Total Sales = Sum of all order totals</li>
          <li>Delivered Sales = Only orders with status 'delivered'</li>
          <li>Pending Amount = Orders not yet delivered</li>
          <li>Est. Profit = Delivered Sales × 20% (approx)</li>
        </ul>
      </div>

      <div className="mb-8 overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white">
        <h2 className="border-b p-4 text-lg font-bold text-zeluxe-black">Order Breakdown</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-zeluxe-fieldbg">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Orders</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Amount</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map(({ status, count, amount, textClass }) => (
              <tr key={status} className="border-b last:border-0">
                <td className="px-4 py-3 capitalize text-zeluxe-black">{status}</td>
                <td className="px-4 py-3 text-zeluxe-black">{count}</td>
                <td className={`px-4 py-3 font-bold ${textClass}`}>৳{amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white">
        <h2 className="border-b p-4 text-lg font-bold text-zeluxe-black">Recent Transactions</h2>
        {recentTransactions.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between border-b px-4 py-3 last:border-0"
          >
            <div>
              <p className="font-mono text-xs text-zeluxe-gray">{order.orderId}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDate(order.createdAt?.seconds)}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-zeluxe-black">৳{order.total.toLocaleString()}</p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-bold capitalize ${getStatusBadgeClass(order.status)}`}
              >
                {order.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
