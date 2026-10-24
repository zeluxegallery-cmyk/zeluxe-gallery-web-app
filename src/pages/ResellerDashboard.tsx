import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  Wallet,
  ArrowRight,
  Gift,
  Headphones,
  ChevronRight,
  CheckCircle,
  Sparkles,
  BarChart3,
  Users,
  Bell,
  X,
  BellOff,
} from 'lucide-react';
// ═══ Layout ইমপোর্ট মুছে ফেলা হয়েছে ═══
import { auth, db } from '../firebase';
import {
  REFERRAL_BONUS_AMOUNT,
  generateUniqueReferralCode,
  publishReferralCode,
} from '../lib/referral';

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

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: { seconds?: number };
};

type Stats = {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalSales: number;
  actualProfit: number;
  availableBalance: number;
  todayOrders: number;
  todaySales: number;
  referralBonus: number;
};

type ReferralInfo = {
  referralCode: string;
  referralCount: number;
  referralBonusEarned: number;
};

const initialStats: Stats = {
  totalOrders: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
  totalSales: 0,
  actualProfit: 0,
  availableBalance: 0,
  todayOrders: 0,
  todaySales: 0,
  referralBonus: 0,
};

const PENDING_STATUSES = ['pending', 'confirmed', 'shipped'];
const WELCOME_BONUS_TARGET = 5;
const WELCOME_BONUS_AMOUNT = 100;
const WELCOME_BONUS_DAYS = 30;

function getStatusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'pending': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'confirmed': return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'shipped': return 'bg-purple-50 text-purple-700 border border-purple-200';
    case 'delivered': return 'bg-green-50 text-green-700 border border-green-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border border-red-200';
    default: return 'bg-gray-50 text-gray-700 border border-gray-200';
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
  const d = new Date(seconds * 1000);
  const months = ['জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

type DashboardCache = {
  uid: string;
  stats: Stats;
  orders: Order[];
  featuredProducts: Product[];
  referralInfo: ReferralInfo | null;
  notifications: Notification[];
  bonusProgress: number;
  bonusAchieved: boolean;
  bonusDaysLeft: number;
  bonusStartDate: number;
};

// Lives in memory while the app is open: the next visit shows the last data at once,
// then refreshes quietly in the background.
let dashboardCache: DashboardCache | null = null;

function updateDashboardCache(uid: string, patch: Partial<DashboardCache>) {
  const base: DashboardCache =
    dashboardCache && dashboardCache.uid === uid
      ? dashboardCache
      : {
          uid,
          stats: initialStats,
          orders: [],
          featuredProducts: [],
          referralInfo: null,
          notifications: [],
          bonusProgress: 0,
          bonusAchieved: false,
          bonusDaysLeft: 0,
          bonusStartDate: 0,
        };
  dashboardCache = { ...base, ...patch };
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-gray-200/70 ${className}`} />;
}

type OrderItemLike = { resellerPrice?: number; sellingPrice?: number; quantity?: number };

export default function ResellerDashboard() {
  const currentUid = auth.currentUser?.uid;
  const cached = dashboardCache && dashboardCache.uid === currentUid ? dashboardCache : null;

  const [stats, setStats] = useState<Stats>(cached?.stats ?? initialStats);
  const [orders, setOrders] = useState<Order[]>(cached?.orders ?? []);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(cached?.featuredProducts ?? []);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(cached?.referralInfo ?? null);
  const [notifications, setNotifications] = useState<Notification[]>(cached?.notifications ?? []);
  const [bonusProgress, setBonusProgress] = useState(cached?.bonusProgress ?? 0);
  const [bonusAchieved, setBonusAchieved] = useState(cached?.bonusAchieved ?? false);
  const [bonusDaysLeft, setBonusDaysLeft] = useState(cached?.bonusDaysLeft ?? 0);
  const [bonusStartDate, setBonusStartDate] = useState<number>(cached?.bonusStartDate ?? 0);

  // Each part of the page has its own loading flag, so the page appears piece by piece.
  const [statsLoading, setStatsLoading] = useState(!cached);
  const [productsLoading, setProductsLoading] = useState(!cached);
  const [refLoading, setRefLoading] = useState(!cached);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // নোটিফিকেশন মডাল স্টেট
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Wait until Firebase has restored the login session (fixes blank page on refresh).
      await auth.authStateReady();
      const uid = auth.currentUser?.uid;
      if (!uid || cancelled) {
        setStatsLoading(false);
        setProductsLoading(false);
        setRefLoading(false);
        return;
      }

      setLoadError(false);

      // Start every read at once; each part of the page shows as soon as its data arrives.
      const userP = getDoc(doc(db, 'users', uid));
      const productsP = getDocs(collection(db, 'products'));
      const ordersP = getDocs(query(collection(db, 'orders'), where('resellerId', '==', uid)));
      const withdrawP = getDocs(query(collection(db, 'withdrawRequests'), where('resellerId', '==', uid)));
      const notifP = getDocs(query(collection(db, 'notifications'), where('userId', '==', uid)));

      // ─── নোটিফিকেশন ───
      void notifP
        .then((notifSnap) => {
          const fetchedNotifs: Notification[] = notifSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: typeof data.title === 'string' ? data.title : 'নোটিফিকেশন',
              message: typeof data.message === 'string' ? data.message : '',
              read: typeof data.read === 'boolean' ? data.read : false,
              createdAt: data.createdAt,
            };
          });
          fetchedNotifs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          if (cancelled) return;
          setNotifications(fetchedNotifs);
          updateDashboardCache(uid, { notifications: fetchedNotifs });
        })
        .catch((err) => console.error('Notifications load error:', err));

      // ─── প্রোডাক্ট (Featured + দামের তালিকা) ───
      const productMapP: Promise<Record<string, number>> = productsP
        .then((productsSnap) => {
          const productMap: Record<string, number> = {};
          productsSnap.docs.forEach((p) => {
            const data = p.data();
            productMap[p.id] = typeof data.resellerPrice === 'number' ? data.resellerPrice : 0;
          });

          const activeProducts: Product[] = productsSnap.docs
            .filter((d) => {
              const data = d.data();
              return data.active === true && typeof data.imageUrl === 'string' && data.imageUrl.length > 0;
            })
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

          if (!cancelled) {
            setFeaturedProducts(activeProducts);
            updateDashboardCache(uid, { featuredProducts: activeProducts });
          }
          return productMap;
        })
        .catch((err) => {
          console.error('Products load error:', err);
          return {} as Record<string, number>;
        })
        .finally(() => {
          if (!cancelled) setProductsLoading(false);
        });

      // ─── রেফারেল তথ্য ───
      void (async () => {
        try {
          const userDoc = await userP;
          if (!userDoc.exists()) return;
          const userInfo = userDoc.data();

          let refStats: ReferralInfo = {
            referralCode: typeof userInfo.referralCode === 'string' ? userInfo.referralCode : '',
            referralCount: typeof userInfo.referralCount === 'number' ? userInfo.referralCount : 0,
            referralBonusEarned: typeof userInfo.referralBonusEarned === 'number' ? userInfo.referralBonusEarned : 0,
          };

          if (!refStats.referralCode) {
            try {
              const newCode = await generateUniqueReferralCode();
              await updateDoc(doc(db, 'users', uid), {
                referralCode: newCode,
                referralCount: 0,
                referralBonusEarned: 0,
              });

              const userName = (userInfo.name as string) || auth.currentUser?.email?.split('@')[0] || 'Reseller';
              await publishReferralCode(uid, userName, newCode);

              refStats = { referralCode: newCode, referralCount: 0, referralBonusEarned: 0 };
            } catch (err) {
              console.error('Failed to generate referral code:', err);
            }
          }

          if (cancelled) return;
          setReferralInfo(refStats);
          updateDashboardCache(uid, { referralInfo: refStats });
        } catch (err) {
          console.error('Referral load error:', err);
        } finally {
          if (!cancelled) setRefLoading(false);
        }
      })();

      // ─── অর্ডার, উইথড্র ও ব্যালেন্স হিসাব (হিসাবের নিয়ম আগের মতোই) ───
      try {
        const [userDoc, ordersSnapshot, withdrawSnap] = await Promise.all([userP, ordersP, withdrawP]);
        const userInfo = userDoc.exists() ? userDoc.data() : null;

        // পুরনো অর্ডারে items না থাকলে প্রোডাক্টের দাম লাগে; নইলে প্রোডাক্টের জন্য অপেক্ষা করব না
        const needsProductPrices = ordersSnapshot.docs.some((d) => {
          const items = d.data().items;
          return !(Array.isArray(items) && items.length > 0);
        });
        const productMap: Record<string, number> = needsProductPrices ? await productMapP : {};

        const fetchedOrders: Order[] = ordersSnapshot.docs.map((orderDocument) => {
          const data = orderDocument.data();
          const quantity = typeof data.quantity === 'number' ? data.quantity : 0;
          const sellingPrice = typeof data.sellingPrice === 'number' ? data.sellingPrice : 0;
          const productId = typeof data.productId === 'string' ? data.productId : '';

          let actualProfit = 0;
          if (Array.isArray(data.items) && data.items.length > 0) {
            actualProfit = (data.items as OrderItemLike[]).reduce((sum, item) => {
              const resP = item.resellerPrice || 0;
              const sellP = item.sellingPrice || 0;
              const qty = item.quantity || 0;
              return sum + (sellP - resP) * qty;
            }, 0);
          } else {
            const resellerPrice = productMap[productId] || 0;
            actualProfit = (sellingPrice - resellerPrice) * quantity;
          }

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

        const totalWithdrawn = withdrawSnap.docs
          .map((d) => d.data())
          .filter((d) => d.status === 'approved' || d.status === 'paid')
          .reduce((sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0), 0);

        const totalSales = fetchedOrders.reduce((sum, order) => sum + order.total, 0);
        const pendingOrders = fetchedOrders.filter((order) => PENDING_STATUSES.includes(order.status)).length;
        const deliveredOrders = fetchedOrders.filter((order) => order.status === 'delivered').length;

        const actualProfit = fetchedOrders
          .filter((order) => order.status === 'delivered')
          .reduce((sum, order) => sum + order.actualProfit, 0);

        const referralBonus = typeof userInfo?.referralBonusEarned === 'number' ? userInfo.referralBonusEarned : 0;
        const availableBalance = actualProfit + referralBonus - totalWithdrawn;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
        const todayOrders = fetchedOrders.filter((o) => (o.createdAt?.seconds || 0) >= todayStart);
        const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);

        const newStats: Stats = {
          totalOrders: fetchedOrders.length,
          pendingOrders,
          deliveredOrders,
          totalSales,
          actualProfit,
          availableBalance: availableBalance > 0 ? availableBalance : 0,
          todayOrders: todayOrders.length,
          todaySales,
          referralBonus,
        };

        const userCreatedAt = userInfo?.createdAt?.seconds || 0;
        const nowSec = Math.floor(Date.now() / 1000);
        const bonusDeadline = userCreatedAt + WELCOME_BONUS_DAYS * 24 * 60 * 60;
        const daysLeft = Math.max(0, Math.ceil((bonusDeadline - nowSec) / (24 * 60 * 60)));
        const progress = Math.min(deliveredOrders, WELCOME_BONUS_TARGET);
        const achieved = deliveredOrders >= WELCOME_BONUS_TARGET;

        if (cancelled) return;
        setOrders(fetchedOrders);
        setStats(newStats);
        setBonusStartDate(userCreatedAt);
        setBonusDaysLeft(daysLeft);
        setBonusProgress(progress);
        setBonusAchieved(achieved);
        updateDashboardCache(uid, {
          orders: fetchedOrders,
          stats: newStats,
          bonusStartDate: userCreatedAt,
          bonusDaysLeft: daysLeft,
          bonusProgress: progress,
          bonusAchieved: achieved,
        });
      } catch (error) {
        console.error('Dashboard load error:', error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // নোটিফিকেশন রিড হিসেবে মার্ক করা
  const handleOpenNotifications = async () => {
    setIsNotifOpen(true);
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadNotifs.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  const recentOrders = [...orders]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);

  const resellerName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split('@')[0] ||
    'Reseller';

  const bonusPercent = Math.round((bonusProgress / WELCOME_BONUS_TARGET) * 100);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    // ═══ মেইন রিটার্ন থেকেও Layout ট্যাগ বাদ দেওয়া হয়েছে ═══
    <div className="mx-auto max-w-2xl pb-10">
      
      {/* ═══ PREMIUM HEADER WITH NOTIFICATIONS ═══ */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zeluxe-black capitalize leading-snug break-words">
            স্বাগতম, {resellerName}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            আজকের ব্যবসার আপডেট দেখুন
          </p>
        </div>
        
        {/* বেল আইকন বাটন */}
        <button 
          onClick={handleOpenNotifications}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card border border-gray-50 text-zeluxe-black transition hover:-translate-y-0.5 hover:text-zeluxe-gold"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
            </span>
          )}
        </button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">ডাটা লোড করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।</p>
          <button
            onClick={() => {
              setStatsLoading(true);
              setReloadKey((k) => k + 1);
            }}
            className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      )}

      {/* ═══ TODAY'S SNAPSHOT ═══ */}
      {(stats.todayOrders > 0 || stats.todaySales > 0) && (
        <div className="mb-4 rounded-xl bg-white p-3 shadow-card border border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-zeluxe-gold" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zeluxe-gold">
              আজকের হিসাব
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-number">
            <span className="text-gray-500">{stats.todayOrders}টি অর্ডার</span>
            <span className="font-bold text-zeluxe-black">Tk {stats.todaySales.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* ═══ WELCOME BONUS ═══ */}
      {statsLoading ? (
        <SkeletonBlock className="mb-5 h-36" />
      ) : bonusAchieved ? (
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-card border border-green-100">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500 shadow-sm">
              <CheckCircle className="text-white" size={24} />
            </span>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                Welcome Bonus Unlocked
              </p>
              <p className="mt-1 text-lg font-bold text-green-900 font-number">
                Tk {WELCOME_BONUS_AMOUNT} বোনাস পেয়েছেন
              </p>
              <p className="mt-0.5 text-xs text-green-700">
                প্রথম {WELCOME_BONUS_TARGET}টি অর্ডার সফলভাবে ডেলিভার হয়েছে
              </p>
            </div>
          </div>
        </div>
      ) : bonusDaysLeft > 0 && bonusStartDate > 0 ? (
        <div className="mb-5 rounded-2xl bg-zeluxe-black p-5 text-white shadow-card">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold/20">
              <Gift className="text-zeluxe-gold" size={22} />
            </span>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zeluxe-gold">
                    Welcome Bonus
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    প্রথম {WELCOME_BONUS_TARGET}টি অর্ডার ডেলিভার করলেই বোনাস
                  </p>
                </div>
                <p className="shrink-0 text-xl font-bold text-zeluxe-gold font-number">
                  Tk {WELCOME_BONUS_AMOUNT}
                </p>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-number">
                  <span className="text-gray-300">
                    {bonusProgress}/{WELCOME_BONUS_TARGET} সম্পন্ন
                  </span>
                  <span className="font-bold text-zeluxe-gold">
                    {bonusPercent}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-zeluxe-gold transition-all duration-500"
                    style={{ width: `${bonusPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs font-number">
                <span className="text-gray-400">
                  শুরু: {formatDate(bonusStartDate)}
                </span>
                <span className="text-zeluxe-gold">
                  বাকি <strong>{bonusDaysLeft} দিন</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══ BALANCE ═══ */}
      {statsLoading ? (
        <SkeletonBlock className="mb-5 h-32" />
      ) : (
        <>
      <div className="mb-5 rounded-2xl bg-white p-5 shadow-card border border-gray-50">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zeluxe-gold/10">
                <Wallet size={14} className="text-zeluxe-gold" />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Available Balance
              </p>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zeluxe-black font-number">
              Tk {stats.availableBalance.toLocaleString()}
            </p>
            
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 border border-gray-100">
                Profit: <strong className="text-zeluxe-black font-number">Tk {stats.actualProfit.toLocaleString()}</strong>
              </span>
              {stats.referralBonus > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 border border-green-100">
                  Referral: <strong className="text-green-800 font-number">+Tk {stats.referralBonus.toLocaleString()}</strong>
                </span>
              )}
            </div>
          </div>
          <Link
            to="/withdraw"
            className="flex shrink-0 items-center gap-1 rounded-xl bg-zeluxe-black px-3 py-2 text-[11px] font-bold text-white transition hover:bg-gray-800"
          >
            Withdraw
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
        </>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Quick Actions
        </p>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: 'প্রোডাক্ট', path: '/products', icon: Package },
            { label: 'নতুন অর্ডার', path: '/orders/new', icon: Plus },
            { label: 'আর্নিংস', path: '/earnings', icon: BarChart3 },
            { label: 'সাপোর্ট', path: '/support', icon: Headphones },
          ].map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-card border border-gray-50 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-cream transition group-hover:bg-zeluxe-gold/20">
                <Icon className="text-zeluxe-gold" size={18} />
              </span>
              <span className="text-center text-[10px] font-bold text-zeluxe-black">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ MY PROGRESS ═══ */}
      {statsLoading ? (
        <SkeletonBlock className="mb-6 h-36" />
      ) : (
        <>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            My Progress
          </p>
          <Link to="/earnings" className="flex items-center gap-0.5 text-[11px] font-bold text-zeluxe-gold hover:underline">
            বিস্তারিত <ChevronRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Link to="/orders" className="rounded-2xl bg-white p-3 shadow-card border border-gray-50 transition hover:shadow-md flex flex-col items-center justify-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-2">
              <ShoppingBag size={16} />
            </div>
            <p className="text-lg font-bold tracking-tight text-zeluxe-black font-number">
              {stats.totalOrders}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Orders</p>
          </Link>

          <div className="rounded-2xl bg-white p-3 shadow-card border border-gray-50 flex flex-col items-center justify-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600 mb-2">
              <TrendingUp size={16} />
            </div>
            <p className="text-sm sm:text-base font-bold tracking-tight text-zeluxe-black font-number w-full truncate px-1">
              Tk {stats.totalSales > 9999 ? (stats.totalSales / 1000).toFixed(1) + 'k' : stats.totalSales.toLocaleString()}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Sales</p>
          </div>

          <div className="rounded-2xl bg-white p-3 shadow-card border border-gray-50 flex flex-col items-center justify-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zeluxe-gold/10 text-zeluxe-gold mb-2">
              <Wallet size={16} />
            </div>
            <p className="text-sm sm:text-base font-bold tracking-tight text-zeluxe-black font-number w-full truncate px-1">
              Tk {stats.actualProfit > 9999 ? (stats.actualProfit / 1000).toFixed(1) + 'k' : stats.actualProfit.toLocaleString()}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Profit</p>
          </div>
        </div>
      </div>
        </>
      )}

      {/* ═══ FEATURED PRODUCTS ═══ */}
      {productsLoading ? (
        <SkeletonBlock className="mb-6 h-44" />
      ) : featuredProducts.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Featured Products
            </p>
            <Link to="/products" className="flex items-center gap-0.5 text-[11px] font-bold text-zeluxe-gold hover:underline">
              সব দেখুন <ChevronRight size={12} />
            </Link>
          </div>

          <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 snap-x hide-scrollbar">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="min-w-[130px] snap-start overflow-hidden rounded-2xl bg-white shadow-card border border-gray-50 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-square bg-zeluxe-cream">
                  <img
                    src={product.imageUrl.includes('res.cloudinary.com') ? product.imageUrl.replace('/upload/', '/upload/q_auto,f_auto,w_300/') : product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-[11px] font-bold text-zeluxe-black leading-tight">
                    {product.name}
                  </p>
                  <p className="mt-1 text-[12px] font-bold text-zeluxe-gold font-number">
                    Tk {product.resellerPrice.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══ REFER & EARN ═══ */}
      {refLoading ? (
        <SkeletonBlock className="mb-6 h-24" />
      ) : referralInfo && referralInfo.referralCode && (
        <Link
          to="/refer"
          className="mb-6 flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-zeluxe-gold/10 to-transparent p-4 shadow-card border border-zeluxe-gold/20 transition hover:border-zeluxe-gold"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold shadow-sm">
            <Users className="text-zeluxe-black" size={18} />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zeluxe-gold">
              Refer & Earn
            </p>
            <p className="mt-0.5 text-xs font-bold text-zeluxe-black">
              বন্ধুকে রিসেলার বানান, Tk {REFERRAL_BONUS_AMOUNT} পান
            </p>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-number">
              <span className="text-gray-600">
                {referralInfo.referralCount}টি referral
              </span>
              <span className="font-bold text-green-600">
                Tk {referralInfo.referralBonusEarned.toLocaleString()} earned
              </span>
            </div>
          </div>
          <ArrowRight size={16} className="shrink-0 text-zeluxe-gold" />
        </Link>
      )}

      {/* ═══ RECENT ORDERS ═══ */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Recent Orders
          </p>
          <Link to="/orders" className="flex items-center gap-0.5 text-[11px] font-bold text-zeluxe-gold hover:underline">
            সব দেখুন <ChevronRight size={12} />
          </Link>
        </div>

        {statsLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} className="h-[76px]" />
            ))}
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block rounded-2xl bg-white p-3 shadow-card border border-gray-50 transition hover:-translate-y-0.5 hover:shadow-md"
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
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${getStatusBadgeClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span className="text-[9px] font-medium text-gray-400">
                        {formatDate(order.createdAt?.seconds)}
                      </span>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-zeluxe-gold font-number">
                    Tk {order.total.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center shadow-card border border-gray-50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zeluxe-cream">
              <Package className="h-6 w-6 text-zeluxe-gold" />
            </div>
            <p className="mt-3 text-sm font-bold text-zeluxe-black">
              এখনো কোনো অর্ডার নেই
            </p>
            <p className="mt-1 text-xs text-gray-500">
              প্রথম অর্ডার দিলেই Welcome Bonus-এর পথে এগোবেন
            </p>
            <Link
              to="/products"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-zeluxe-black px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
            >
              প্রোডাক্ট দেখুন
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </section>

      {/* ═══ NOTIFICATION MODAL (Bottom Sheet Style) ═══ */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Bell className="text-zeluxe-gold" size={20} />
                <h2 className="text-lg font-bold text-zeluxe-black">নোটিফিকেশন</h2>
              </div>
              <button 
                onClick={() => setIsNotifOpen(false)}
                className="rounded-full p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                    <BellOff size={28} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-zeluxe-black">কোনো নোটিফিকেশন নেই</p>
                  <p className="mt-1 text-xs text-gray-500">নতুন অফার বা আপডেট এখানে দেখা যাবে</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={`rounded-xl border p-4 transition ${notif.read ? 'bg-white border-gray-100' : 'bg-zeluxe-gold/5 border-zeluxe-gold/30'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${notif.read ? 'bg-gray-100 text-gray-500' : 'bg-zeluxe-gold/20 text-zeluxe-gold'}`}>
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <p className={`text-sm ${notif.read ? 'font-medium text-gray-700' : 'font-bold text-zeluxe-black'}`}>
                          {notif.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="mt-2 text-[10px] font-medium text-gray-400">
                          {formatDate(notif.createdAt?.seconds)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
