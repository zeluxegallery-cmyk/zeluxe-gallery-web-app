import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import {
  CheckCircle,
  Clock,
  TrendingUp,
  Wallet,
  Users,
  Gift,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { getOrderProfit } from '../lib/profit';

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
        const [userSnap, productsSnap, snapshot, withdrawSnap] = await Promise.all([
          getDoc(doc(db, 'users', uid)),
          getDocs(collection(db, 'products')),
          getDocs(query(collection(db, 'orders'), where('resellerId', '==', uid))),
          getDocs(query(collection(db, 'withdrawRequests'), where('resellerId', '==', uid)))
        ]);

        const userData = userSnap.exists() ? userSnap.data() : null;
        const referralBonus = typeof userData?.referralBonusEarned === 'number' ? userData.referralBonusEarned : 0;

        const productMap: Record<string, number> = {};
        productsSnap.docs.forEach((p) => {
          const data = p.data();
          productMap[p.id] = typeof data.resellerPrice === 'number' ? data.resellerPrice : 0;
        });

        const sorted = snapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.seconds || 0;
          const bTime = b.data().createdAt?.seconds || 0;
          return bTime - aTime;
        });

        const fetchedOrders: Order[] = sorted.map((orderDoc) => {
          const data = orderDoc.data();
          const quantity = typeof data.quantity === 'number' ? data.quantity : 0;
          const sellingPrice = typeof data.sellingPrice === 'number' ? data.sellingPrice : 0;
          const productId = typeof data.productId === 'string' ? data.productId : '';
          
          // Same profit rule as Dashboard and Withdraw (src/lib/profit.ts)
          const actualProfit = getOrderProfit(data, productMap);

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

        const totalSales = fetchedOrders.reduce((sum, order) => sum + order.total, 0);
        const deliveredOrders = fetchedOrders.filter((order) => order.status === 'delivered');
        const deliveredSales = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
        const pendingAmount = fetchedOrders
          .filter((order) => PENDING_STATUSES.includes(order.status))
          .reduce((sum, order) => sum + order.total, 0);
        const actualProfit = deliveredOrders.reduce((sum, order) => sum + order.actualProfit, 0);

        const totalWithdrawn = withdrawSnap.docs
          .map((d) => d.data())
          .filter((d) => d.status === 'approved' || d.status === 'paid')
          .reduce((sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0), 0);

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
        const message = err instanceof Error ? err.message : 'Failed to load earnings.';
        setError(message);
        toast.error('আর্নিংস লোড করতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };

    void loadEarnings();
  }, []);

  const summaryCards = [
    { label: 'মোট বিক্রি', value: `Tk ${stats.totalSales.toLocaleString()}`, icon: TrendingUp, iconClass: 'text-zeluxe-gold', valueClass: 'text-zeluxe-black' },
    { label: 'ডেলিভারড সেলস', value: `Tk ${stats.deliveredSales.toLocaleString()}`, icon: CheckCircle, iconClass: 'text-green-600', valueClass: 'text-green-600' },
    { label: 'অপেক্ষমাণ টাকা', value: `Tk ${stats.pendingAmount.toLocaleString()}`, icon: Clock, iconClass: 'text-yellow-600', valueClass: 'text-yellow-600' },
    { label: 'অর্ডার প্রফিট', value: `Tk ${stats.actualProfit.toLocaleString()}`, icon: Wallet, iconClass: 'text-zeluxe-gold', valueClass: 'text-zeluxe-gold' },
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
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <div className="h-6 w-1/2 animate-pulse rounded bg-gray-300 mb-2"></div>
          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
        </div>
        <div className="mb-5 h-48 w-full animate-pulse rounded-lg bg-gray-300"></div>
        <div className="mb-5 h-16 w-full animate-pulse rounded-lg bg-gray-200"></div>
        <div className="mb-5 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200"></div>
          ))}
        </div>
        <div className="h-64 w-full animate-pulse rounded-lg bg-gray-200"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      {/* ═══ HEADER ═══ */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zeluxe-black md:text-2xl">
          আর্নিংস ও হিসাব
        </h1>
        <p className="mt-1 text-xs text-gray-500 md:text-sm">
          আপনার আয়, লাভ এবং ব্যালেন্সের বিস্তারিত
        </p>
      </div>

      {/* ═══ AVAILABLE BALANCE HERO ═══ */}
      <div className="relative mb-5 overflow-hidden rounded-lg bg-zeluxe-black p-5 text-white">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-zeluxe-gold/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <Wallet size={12} />
            উপলব্ধ ব্যালেন্স (Available Balance)
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight text-zeluxe-gold">
            Tk {stats.availableBalance.toLocaleString()}
          </p>

          {/* Breakdown */}
          <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-300">
                <TrendingUp size={12} className="text-zeluxe-gold" />
                অর্ডার প্রফিট
              </div>
              <span className="font-bold text-white">
                Tk {stats.actualProfit.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-300">
                <Users size={12} className="text-zeluxe-gold" />
                রেফারেল বোনাস
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
            <p className="text-sm font-bold text-zeluxe-black">টাকা তুলুন</p>
            <p className="mt-0.5 text-[11px] text-gray-500">bKash/Nagad-এ টাকা তুলুন</p>
          </div>
        </div>
        <ArrowRight size={18} className="text-zeluxe-gold" />
      </Link>

      {/* ═══ SUMMARY CARDS ═══ */}
      <div className="mb-5">
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          সেলস ওভারভিউ
        </p>
        <div className="grid grid-cols-2 gap-3">
          {summaryCards.map(({ label, value, icon: Icon, iconClass, valueClass }) => (
            <div key={label} className="rounded-lg border border-zeluxe-lightgray bg-white p-4">
              <Icon className={`h-4 w-4 ${iconClass}`} />
              <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                {label}
              </p>
              <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ HOW WE CALCULATE ═══ */}
      <div className="mb-5 rounded-lg border border-zeluxe-lightgray bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-zeluxe-black">
          কীভাবে হিসাব করা হয়:
        </h2>
        <ul className="space-y-2 text-xs leading-relaxed text-gray-600">
          <li><strong className="text-zeluxe-black">মোট বিক্রি</strong> — সব অর্ডারের মোট দাম</li>
          <li><strong className="text-zeluxe-black">ডেলিভারড সেলস</strong> — শুধু ডেলিভার হওয়া অর্ডার</li>
          <li><strong className="text-zeluxe-black">অপেক্ষমাণ টাকা</strong> — এখনো ডেলিভার হয়নি</li>
          <li><strong className="text-zeluxe-black">অর্ডার প্রফিট</strong> — (বিক্রয় মূল্য − রিসেলার মূল্য) × পরিমাণ</li>
          <li><strong className="text-zeluxe-black">রেফারেল বোনাস</strong> — প্রতি সফল রেফারেলে Tk 30</li>
        </ul>
      </div>

      {/* ═══ ORDER BREAKDOWN ═══ */}
      <div className="mb-5 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white">
        <div className="border-b border-zeluxe-lightgray px-4 py-3">
          <h2 className="text-sm font-bold text-zeluxe-black">অর্ডার ব্রেকডাউন</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-zeluxe-cream">
            <tr>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">স্ট্যাটাস</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">অর্ডার</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">টাকার পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map(({ status, count, amount, textClass }) => (
              <tr key={status} className="border-b border-zeluxe-lightgray last:border-0">
                <td className="px-4 py-2.5 text-xs capitalize text-zeluxe-black">{getStatusLabel(status)}</td>
                <td className="px-4 py-2.5 text-xs text-zeluxe-black">{count}</td>
                <td className={`px-4 py-2.5 text-right text-xs font-bold ${textClass}`}>
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
          <h2 className="text-sm font-bold text-zeluxe-black">সাম্প্রতিক লেনদেন</h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zeluxe-cream">
              <TrendingUp className="h-6 w-6 text-zeluxe-gold" />
            </div>
            <p className="mt-3 text-sm font-bold text-zeluxe-black">এখনো কোনো আর্নিং নেই</p>
            <p className="mt-1 text-xs text-gray-500">প্রথম অর্ডার দিলেই এখানে দেখতে পাবেন</p>
            <Link to="/orders/new" className="mt-3 inline-flex items-center gap-1 rounded-md bg-zeluxe-black px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800">
              অর্ডার তৈরি করুন
              <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          orders.slice(0, 10).map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3 transition last:border-0 hover:bg-zeluxe-cream">
              <div>
                <p className="font-mono text-[11px] font-bold text-zeluxe-black">{order.orderId}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(order.createdAt?.seconds)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-zeluxe-black">Tk {order.total.toLocaleString()}</p>
                <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize ${getStatusBadgeClass(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ═══ REFERRAL CARD LINK ═══ */}
      {stats.referralBonus > 0 && (
        <Link to="/refer" className="mt-5 flex items-center gap-3 overflow-hidden rounded-lg border border-zeluxe-gold/30 bg-gradient-to-br from-zeluxe-gold/10 to-transparent p-4 transition hover:border-zeluxe-gold">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold">
            <Gift className="text-zeluxe-black" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">রেফারেল আর্নিংস</p>
            <p className="mt-0.5 text-sm font-bold text-zeluxe-black">
              আপনার রেফারেল থেকে Tk {stats.referralBonus.toLocaleString()} পেয়েছেন
            </p>
          </div>
          <ArrowRight size={18} className="shrink-0 text-zeluxe-gold" />
        </Link>
      )}
    </div>
  );
}