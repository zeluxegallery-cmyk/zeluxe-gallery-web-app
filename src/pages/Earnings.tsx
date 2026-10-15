import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import {
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  Wallet,
  Users,
  Gift,
  ArrowRight,
} from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';

type Order = {
  id: string;
  orderId: string;
  total: number;
  quantity: number;
  sellingPrice: number;
  productId: string;
  status: string;
  createdAt?: { seconds?: number };
  actualProfit: number;
};

type Stats = {
  totalSales: number;
  deliveredSales: number;
  pendingAmount: number;
  actualProfit: number;
  referralBonus: number;
  totalWithdrawn: number;
  availableBalance: number;
};

const initialStats: Stats = {
  totalSales: 0,
  deliveredSales: 0,
  pendingAmount: 0,
  actualProfit: 0,
  referralBonus: 0,
  totalWithdrawn: 0,
  availableBalance: 0,
};

type Breakdown = {
  status: string;
  count: number;
  amount: number;
  textClass: string;
};

const BREAKDOWN_CONFIG: { status: string; label: string; textClass: string }[] = [
  { status: 'pending', label: 'অপেক্ষমাণ', textClass: 'text-yellow-700' },
  { status: 'confirmed', label: 'কনফার্মড', textClass: 'text-blue-700' },
  { status: 'shipped', label: 'শিপড', textClass: 'text-purple-700' },
  { status: 'delivered', label: 'ডেলিভারড', textClass: 'text-green-700' },
  { status: 'cancelled', label: 'বাতিল', textClass: 'text-red-700' },
];

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
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'অপেক্ষমাণ',
    confirmed: 'কনফার্মড',
    shipped: 'শিপড',
    delivered: 'ডেলিভারড',
    cancelled: 'বাতিল',
    returned: 'ফেরত',
  };
  return labels[status.toLowerCase()] || status;
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
        // Fetch user (for referral bonus)
        const userSnap = await getDoc(doc(db, 'users', uid));
        const userData = userSnap.exists() ? userSnap.data() : null;
        const referralBonus =
          typeof userData?.referralBonusEarned === 'number'
            ? userData.referralBonusEarned
            : 0;

        // Fetch products for resellerPrice
        const productsSnap = await getDocs(collection(db, 'products'));
        const productMap: Record<string, number> = {};
        productsSnap.docs.forEach((p) => {
          const data = p.data();
          productMap[p.id] =
            typeof data.resellerPrice === 'number' ? data.resellerPrice : 0;
        });

        // Fetch orders
        const snapshot = await getDocs(
          query(collection(db, 'orders'), where('resellerId', '==', uid))
        );
        const sorted = snapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.seconds || 0;
          const bTime = b.data().createdAt?.seconds || 0;
          return bTime - aTime;
        });

        const fetchedOrders: Order[] = sorted.map((orderDoc) => {
          const data = orderDoc.data();
          const quantity = typeof data.quantity === 'number' ? data.quantity : 0;
          const sellingPrice =
            typeof data.sellingPrice === 'number' ? data.sellingPrice : 0;
          const productId = typeof data.productId === 'string' ? data.productId : '';
          const resellerPrice = productMap[productId] || 0;
          const actualProfit = (sellingPrice - resellerPrice) * quantity;

          return {
            id: orderDoc.id,
            orderId: typeof data.orderId === 'string' ? data.orderId : orderDoc.id,
            total: typeof data.total === 'number' ? data.total : 0,
            quantity,
            sellingPrice,
            productId,
            status: typeof data.status === 'string' ? data.status : 'pending',
            createdAt: data.createdAt,
            actualProfit,
          };
        });

        // ═══ Calculate stats ═══
        const totalSales = fetchedOrders.reduce((sum, order) => sum + order.total, 0);
        const deliveredOrders = fetchedOrders.filter(
          (order) => order.status === 'delivered'
        );
        const deliveredSales = deliveredOrders.reduce(
          (sum, order) => sum + order.total,
          0
        );
        const pendingAmount = fetchedOrders
          .filter((order) => PENDING_STATUSES.includes(order.status))
          .reduce((sum, order) => sum + order.total, 0);
        const actualProfit = deliveredOrders.reduce(
          (sum, order) => sum + order.actualProfit,
          0
        );

        // ═══ Fetch withdrawals ═══
        const withdrawSnap = await getDocs(
          query(
            collection(db, 'withdrawRequests'),
            where('resellerId', '==', uid)
          )
        );
        const totalWithdrawn = withdrawSnap.docs
          .map((d) => d.data())
          .filter((d) => d.status === 'approved' || d.status === 'paid')
          .reduce(
            (sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0),
            0
          );

        // ═══ Available Balance = Order Profit + Referral Bonus - Withdrawn ═══
        const availableBalance = actualProfit + referralBonus - totalWithdrawn;

        setStats({
          totalSales,
          deliveredSales,
          pendingAmount,
          actualProfit,
          referralBonus,
          totalWithdrawn,
          availableBalance: availableBalance > 0 ? availableBalance : 0,
        });
        setOrders(fetchedOrders);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load earnings.';
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
      value: `Tk ${stats.totalSales.toLocaleString()}`,
      icon: TrendingUp,
      iconClass: 'text-zeluxe-gold',
      valueClass: 'text-zeluxe-black',
    },
    {
      label: 'Delivered Sales',
      value: `Tk ${stats.deliveredSales.toLocaleString()}`,
      icon: CheckCircle,
      iconClass: 'text-green-600',
      valueClass: 'text-green-600',
    },
    {
      label: 'Pending Amount',
      value: `Tk ${stats.pendingAmount.toLocaleString()}`,
      icon: Clock,
      iconClass: 'text-yellow-600',
      valueClass: 'text-yellow-600',
    },
    {
      label: 'Order Profit',
      value: `Tk ${stats.actualProfit.toLocaleString()}`,
      icon: Wallet,
      iconClass: 'text-zeluxe-gold',
      valueClass: 'text-zeluxe-gold',
    },
  ];

  const breakdown: Breakdown[] = BREAKDOWN_CONFIG.map(
    ({ status, textClass }) => {
      const matching = orders.filter((order) => order.status === status);
      return {
        status,
        count: matching.length,
        amount: matching.reduce((sum, order) => sum + order.total, 0),
        textClass,
      };
    }
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        {/* ═══ HEADER ═══ */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-zeluxe-black md:text-2xl">
            Earnings & Accounting
          </h1>
          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            আপনার আয়, লাভ এবং balance বিস্তারিত
          </p>
        </div>

        {/* ═══ AVAILABLE BALANCE HERO ═══ */}
        <div className="relative mb-5 overflow-hidden rounded-lg bg-zeluxe-black p-5 text-white">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-zeluxe-gold/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <Wallet size={12} />
              Available Balance
            </div>
            <p className="mt-2 text-4xl font-bold tracking-tight text-zeluxe-gold">
              Tk {stats.availableBalance.toLocaleString()}
            </p>

            {/* Breakdown */}
            <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <TrendingUp size={12} className="text-zeluxe-gold" />
                  Order Profit
                </div>
                <span className="font-bold text-white">
                  Tk {stats.actualProfit.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Users size={12} className="text-zeluxe-gold" />
                  Referral Bonus
                </div>
                <span className="font-bold text-green-400">
                  +Tk {stats.referralBonus.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                <span className="text-gray-400">মোট আয়</span>
                <span className="font-bold text-white">
                  Tk {(stats.actualProfit + stats.referralBonus).toLocaleString()}
                </span>
              </div>

              {stats.totalWithdrawn > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">আগে তুলেছেন</span>
                  <span className="font-bold text-red-400">
                    -Tk {stats.totalWithdrawn.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ WITHDRAW BUTTON ═══ */}
        <Link
          to="/withdraw"
          className="mb-5 flex items-center justify-between rounded-lg border border-zeluxe-gold/30 bg-gradient-to-r from-zeluxe-gold/10 to-transparent p-4 transition hover:border-zeluxe-gold"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-gold">
              <Wallet className="text-zeluxe-black" size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-zeluxe-black">
                টাকা তুলুন
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                bKash/Nagad-এ টাকা তুলুন
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-zeluxe-gold" />
        </Link>

        {/* ═══ SUMMARY CARDS ═══ */}
        <div className="mb-5">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Sales Overview
          </p>
          <div className="grid grid-cols-2 gap-3">
            {summaryCards.map(
              ({ label, value, icon: Icon, iconClass, valueClass }) => (
                <div
                  key={label}
                  className="rounded-lg border border-zeluxe-lightgray bg-white p-4"
                >
                  <Icon className={`h-4 w-4 ${iconClass}`} />
                  <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    {label}
                  </p>
                  <p className={`mt-1 text-lg font-bold ${valueClass}`}>
                    {value}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* ═══ HOW WE CALCULATE ═══ */}
        <div className="mb-5 rounded-lg border border-zeluxe-lightgray bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-zeluxe-black">
            কীভাবে হিসাব করা হয়:
          </h2>
          <ul className="space-y-2 text-xs leading-relaxed text-gray-600">
            <li>
              <strong className="text-zeluxe-black">Total Sales</strong> — সব
              অর্ডারের মোট দাম
            </li>
            <li>
              <strong className="text-zeluxe-black">Delivered Sales</strong> —
              শুধু ডেলিভার হওয়া অর্ডার
            </li>
            <li>
              <strong className="text-zeluxe-black">Pending Amount</strong> —
              এখনো ডেলিভার হয়নি
            </li>
            <li>
              <strong className="text-zeluxe-black">Order Profit</strong> —
              (বিক্রয় মূল্য − রিসেলার মূল্য) × পরিমাণ
            </li>
            <li>
              <strong className="text-zeluxe-black">Referral Bonus</strong> —
              প্রতি সফল referral-এ Tk 30
            </li>
          </ul>
        </div>

        {/* ═══ ORDER BREAKDOWN ═══ */}
        <div className="mb-5 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white">
          <div className="border-b border-zeluxe-lightgray px-4 py-3">
            <h2 className="text-sm font-bold text-zeluxe-black">
              Order Breakdown
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-zeluxe-cream">
              <tr>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Orders
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map(({ status, count, amount, textClass }) => (
                <tr
                  key={status}
                  className="border-b border-zeluxe-lightgray last:border-0"
                >
                  <td className="px-4 py-2.5 text-xs capitalize text-zeluxe-black">
                    {getStatusLabel(status)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zeluxe-black">
                    {count}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right text-xs font-bold ${textClass}`}
                  >
                    Tk {amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══ RECENT TRANSACTIONS ═══ */}
        <div className="overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white">
          <div className="border-b border-zeluxe-lightgray px-4 py-3">
            <h2 className="text-sm font-bold text-zeluxe-black">
              Recent Transactions
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zeluxe-cream">
                <TrendingUp className="h-6 w-6 text-zeluxe-gold" />
              </div>
              <p className="mt-3 text-sm font-bold text-zeluxe-black">
                এখনো কোনো earning নেই
              </p>
              <p className="mt-1 text-xs text-gray-500">
                প্রথম অর্ডার দিলেই এখানে দেখতে পাবেন
              </p>
              <Link
                to="/orders/new"
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-zeluxe-black px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
              >
                অর্ডার তৈরি করুন
                <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            orders.slice(0, 10).map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3 transition last:border-0 hover:bg-zeluxe-cream"
              >
                <div>
                  <p className="font-mono text-[11px] font-bold text-zeluxe-black">
                    {order.orderId}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {formatDate(order.createdAt?.seconds)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zeluxe-black">
                    Tk {order.total.toLocaleString()}
                  </p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize ${getStatusBadgeClass(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* ═══ REFERRAL CARD LINK ═══ */}
        {stats.referralBonus > 0 && (
          <Link
            to="/refer"
            className="mt-5 flex items-center gap-3 overflow-hidden rounded-lg border border-zeluxe-gold/30 bg-gradient-to-br from-zeluxe-gold/10 to-transparent p-4 transition hover:border-zeluxe-gold"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold">
              <Gift className="text-zeluxe-black" size={20} />
            </span>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">
                Referral Earnings
              </p>
              <p className="mt-0.5 text-sm font-bold text-zeluxe-black">
                আপনার referral থেকে Tk{' '}
                {stats.referralBonus.toLocaleString()} পেয়েছেন
              </p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-zeluxe-gold" />
          </Link>
        )}
      </div>
    </Layout>
  );
}
