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
  ArrowRight,
  Gift,
  Users,
  Sparkles,
  Headphones,
  Target,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';

type Order = {
  id: string;
  orderId: string;
  productName: string;
  status: string;
  total: number;
  quantity: number;
  sellingPrice: number;
  productId: string;
  createdAt?: { seconds?: number };
  actualProfit: number;
};

type Product = {
  id: string;
  name: string;
  imageUrl: string;
  resellerPrice: number;
};

type Stats = {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalSales: number;
  actualProfit: number;
  availableBalance: number;
};

const initialStats: Stats = {
  totalOrders: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
  totalSales: 0,
  actualProfit: 0,
  availableBalance: 0,
};

const PENDING_STATUSES = ['pending', 'confirmed', 'shipped'];
const WELCOME_BONUS_TARGET = 5; // 5 orders
const WELCOME_BONUS_AMOUNT = 100; // Tk 100
const WELCOME_BONUS_DAYS = 30;

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

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  const d = new Date(seconds * 1000);
  return d.toLocaleDateString('bn-BD', { day: '2-digit', month: 'short' });
}

export default function ResellerDashboard() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [orders, setOrders] = useState<Order[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  // Welcome bonus calculation
  const [bonusProgress, setBonusProgress] = useState(0);
  const [bonusAchieved, setBonusAchieved] = useState(false);
  const [bonusDaysLeft, setBonusDaysLeft] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user data
        const { doc, getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', uid));
        const userInfo = userDoc.exists() ? userDoc.data() : null;
        setUserData(userInfo);

        // Fetch products (for resellerPrice map)
        const productsSnap = await getDocs(collection(db, 'products'));
        const productMap: Record<string, number> = {};
        productsSnap.docs.forEach((p) => {
          const data = p.data();
          productMap[p.id] = typeof data.resellerPrice === 'number' ? data.resellerPrice : 0;
        });

        // Featured products (first 6)
        const activeProducts: Product[] = productsSnap.docs
          .filter((d) => d.data().active === true)
          .slice(0, 6)
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: typeof data.name === 'string' ? data.name : 'Product',
              imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
              resellerPrice: typeof data.resellerPrice === 'number' ? data.resellerPrice : 0,
            };
          });
        setFeaturedProducts(activeProducts);

        // Fetch orders
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
            status: typeof data.status === 'string' ? data.status : 'pending',
            total: typeof data.total === 'number' ? data.total : 0,
            quantity,
            sellingPrice,
            productId,
            createdAt: data.createdAt,
            actualProfit,
          };
        });

        // Fetch withdraws
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
        });

        // Calculate welcome bonus progress
        const userCreatedAt = userInfo?.createdAt?.seconds || 0;
        const now = Math.floor(Date.now() / 1000);
        const bonusDeadline = userCreatedAt + WELCOME_BONUS_DAYS * 24 * 60 * 60;
        const daysLeft = Math.max(0, Math.ceil((bonusDeadline - now) / (24 * 60 * 60)));
        setBonusDaysLeft(daysLeft);

        const deliveredCount = deliveredOrders;
        setBonusProgress(Math.min(deliveredCount, WELCOME_BONUS_TARGET));
        setBonusAchieved(deliveredCount >= WELCOME_BONUS_TARGET);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const recentOrders = [...orders]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);

  const resellerName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split('@')[0] ||
    'Reseller';

  const bonusPercent = Math.round((bonusProgress / WELCOME_BONUS_TARGET) * 100);

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
        {/* ═══ GREETING ═══ */}
        <div className="mb-4">
          <p className="text-xs text-gray-500">স্বাগতম,</p>
          <h1 className="mt-0.5 text-xl font-bold capitalize text-zeluxe-black">
            {resellerName}
          </h1>
        </div>

        {/* ═══ WELCOME BONUS TRACKER ═══ */}
        {bonusAchieved ? (
          <div className="mb-4 overflow-hidden rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500">
                <CheckCircle className="text-white" size={24} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">
                    🎉 Welcome Bonus Unlocked
                  </p>
                </div>
                <p className="mt-1 text-lg font-bold text-green-900">
                  Tk {WELCOME_BONUS_AMOUNT} Bonus পেয়েছেন!
                </p>
                <p className="mt-1 text-xs text-green-700">
                  আপনার প্রথম {WELCOME_BONUS_TARGET}টি অর্ডার Delivered হয়েছে — ধন্যবাদ!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 overflow-hidden rounded-lg border border-zeluxe-gold/30 bg-gradient-to-br from-zeluxe-black to-gray-900 p-5 text-white">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold/20">
                <Gift className="text-zeluxe-gold" size={22} />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">
                    Welcome Bonus
                  </p>
                  <p className="text-lg font-bold text-zeluxe-gold">
                    Tk {WELCOME_BONUS_AMOUNT}
                  </p>
                </div>
                <p className="mt-1.5 text-sm font-medium text-white">
                  {WELCOME_BONUS_TARGET}টি অর্ডার Delivered করলেই Bonus!
                </p>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-300">
                      {bonusProgress}/{WELCOME_BONUS_TARGET} Verified
                    </span>
                    <span className="font-bold text-zeluxe-gold">
                      {bonusPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-zeluxe-gold transition-all duration-500"
                      style={{ width: `${bonusPercent}%` }}
                    />
                  </div>
                </div>

                {bonusDaysLeft > 0 ? (
                  <p className="mt-3 text-[11px] text-gray-400">
                    ⏰ আর <strong className="text-zeluxe-gold">{bonusDaysLeft} দিন</strong> বাকি
                  </p>
                ) : (
                  <p className="mt-3 text-[11px] text-red-400">
                    সময় শেষ — এই অফার আর নেই
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          <Link
            to="/products"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-zeluxe-lightgray bg-white p-3 transition hover:border-zeluxe-gold"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Package className="text-blue-600" size={18} />
            </span>
            <span className="text-[10px] font-medium text-zeluxe-black">
              প্রোডাক্ট
            </span>
          </Link>

          <Link
            to="/orders/new"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-zeluxe-lightgray bg-white p-3 transition hover:border-zeluxe-gold"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <Plus className="text-green-600" size={18} />
            </span>
            <span className="text-[10px] font-medium text-zeluxe-black">
              নতুন অর্ডার
            </span>
          </Link>

          <Link
            to="/withdraw"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-zeluxe-lightgray bg-white p-3 transition hover:border-zeluxe-gold"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-gold/10">
              <Wallet className="text-zeluxe-gold" size={18} />
            </span>
            <span className="text-[10px] font-medium text-zeluxe-black">
              টাকা তুলুন
            </span>
          </Link>

          <Link
            to="/support"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-zeluxe-lightgray bg-white p-3 transition hover:border-zeluxe-gold"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50">
              <Headphones className="text-purple-600" size={18} />
            </span>
            <span className="text-[10px] font-medium text-zeluxe-black">
              সাপোর্ট
            </span>
          </Link>
        </div>

        {/* ═══ BALANCE CARD ═══ */}
        <div className="mb-4 rounded-lg border-2 border-zeluxe-gold bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Wallet size={14} className="text-zeluxe-gold" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Available Balance
                </p>
              </div>
              <p className="mt-1.5 text-2xl font-bold text-zeluxe-black">
                Tk {stats.availableBalance.toLocaleString()}
              </p>
            </div>
            <Link
              to="/withdraw"
              className="flex items-center gap-1 rounded-md bg-zeluxe-black px-3 py-2 text-[11px] font-bold text-white transition hover:bg-gray-800"
            >
              Withdraw
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* ═══ MY PROGRESS ═══ */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zeluxe-black">My Progress</h2>
            <Link
              to="/earnings"
              className="flex items-center gap-0.5 text-[11px] font-medium text-zeluxe-gold hover:underline"
            >
              বিস্তারিত
              <ChevronRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-zeluxe-lightgray bg-white p-3">
              <ShoppingBag className="text-zeluxe-gold" size={16} />
              <p className="mt-2 text-lg font-bold text-zeluxe-black">
                {stats.totalOrders}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                Orders
              </p>
            </div>

            <div className="rounded-lg border border-zeluxe-lightgray bg-white p-3">
              <TrendingUp className="text-green-600" size={16} />
              <p className="mt-2 text-lg font-bold text-zeluxe-black">
                Tk {stats.totalSales.toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                Sales
              </p>
            </div>

            <div className="rounded-lg border border-zeluxe-lightgray bg-white p-3">
              <Wallet className="text-zeluxe-gold" size={16} />
              <p className="mt-2 text-lg font-bold text-zeluxe-black">
                Tk {stats.actualProfit.toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                Profit
              </p>
            </div>
          </div>
        </div>

        {/* ═══ FEATURED PRODUCTS ═══ */}
        {featuredProducts.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zeluxe-black">
                Featured Products
              </h2>
              <Link
                to="/products"
                className="flex items-center gap-0.5 text-[11px] font-medium text-zeluxe-gold hover:underline"
              >
                সব দেখুন
                <ChevronRight size={12} />
              </Link>
            </div>

            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="min-w-[120px] overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white transition hover:border-zeluxe-gold"
                >
                  <div className="aspect-square bg-zeluxe-cream">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] font-bold text-zeluxe-black">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-zeluxe-gold">
                      Tk {product.resellerPrice.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ═══ REFER & EARN ═══ */}
        <div className="mb-4 overflow-hidden rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-500">
              <Users className="text-white" size={20} />
            </span>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700">
                Refer & Earn
              </p>
              <p className="mt-1 text-sm font-bold text-purple-900">
                বন্ধুকে রিসেলার বানান, Bonus পান
              </p>
              <p className="mt-1 text-[11px] text-purple-700">
                শীঘ্রই আসছে — প্রতিটি successful referral-এ Tk 30 Bonus
              </p>
            </div>
          </div>
        </div>

        {/* ═══ RECENT ORDERS ═══ */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zeluxe-black">Recent Orders</h2>
            <Link
              to="/orders"
              className="flex items-center gap-0.5 text-[11px] font-medium text-zeluxe-gold hover:underline"
            >
              সব দেখুন
              <ChevronRight size={12} />
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block rounded-lg border border-zeluxe-lightgray bg-white p-3 transition hover:border-zeluxe-gold"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold text-zeluxe-black">
                        {order.orderId}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-gray-700">
                        {order.productName}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize ${getStatusBadgeClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {formatDate(order.createdAt?.seconds)}
                        </span>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-zeluxe-gold">
                      Tk {order.total.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zeluxe-lightgray bg-white p-8 text-center">
              <Package className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-xs text-gray-500">
                এখনো কোনো অর্ডার নেই
              </p>
              <Link
                to="/products"
                className="mt-3 inline-block rounded-md bg-zeluxe-black px-4 py-2 text-xs font-bold text-white"
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