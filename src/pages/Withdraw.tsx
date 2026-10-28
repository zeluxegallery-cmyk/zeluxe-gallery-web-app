import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  Loader2,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Gift,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { getOrderProfit } from '../lib/profit';

const MIN_WITHDRAW = 100;

// ইনস্ট্যান্ট পেজ ওপেনিংয়ের জন্য মেমোরি ক্যাশ
let withdrawCache: { userData: any; orders: any[]; products: any[]; withdrawals: any[]; uid: string } | null = null;

export default function Withdraw() {
  const navigate = useNavigate();
  const currentUid = auth.currentUser?.uid || '';
  const hasCache = withdrawCache && withdrawCache.uid === currentUid;

  const [userData, setUserData] = useState<any>(hasCache ? withdrawCache!.userData : null);
  const [orders, setOrders] = useState<any[]>(hasCache ? withdrawCache!.orders : []);
  const [products, setProducts] = useState<any[]>(hasCache ? withdrawCache!.products : []);
  const [withdrawals, setWithdrawals] = useState<any[]>(hasCache ? withdrawCache!.withdrawals : []);
  const [loading, setLoading] = useState(!hasCache);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const [userDoc, ordersSnap, productsSnap, withdrawSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, 'orders'), where('resellerId', '==', user.uid))),
        getDocs(collection(db, 'products')),
        getDocs(
          query(collection(db, 'withdrawRequests'), where('resellerId', '==', user.uid))
        ),
      ]);

      const uData = userDoc.exists() ? { uid: user.uid, ...userDoc.data() } : null;
      const oList = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pList = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const wList = withdrawSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      wList.sort(
        (a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      setUserData(uData);
      setOrders(oList);
      setProducts(pList);
      setWithdrawals(wList);

      // ক্যাশ আপডেট করে রাখা
      withdrawCache = {
        userData: uData,
        orders: oList,
        products: pList,
        withdrawals: wList,
        uid: user.uid,
      };
    } catch (err) {
      console.error('Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Order Profit (only delivered orders) - same rule as Dashboard and Earnings (src/lib/profit.ts)
  const productPrices: Record<string, number> = {};
  products.forEach((p) => {
    productPrices[p.id] = Number(p.resellerPrice) || 0;
  });

  const orderProfit = orders.reduce(
    (sum, order) =>
      order.status === 'delivered' ? sum + getOrderProfit(order, productPrices) : sum,
    0,
  );

  // Referral Bonus
  const referralBonus = Number(userData?.referralBonusEarned) || 0;

  // Total Earned
  const totalEarned = orderProfit + referralBonus;

  // Already Requested/Withdrawn
  const alreadyRequested = withdrawals
    .filter((w) => ['pending', 'approved', 'paid'].includes(w.status))
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  // Available Balance
  const availableBalance = Math.max(0, totalEarned - alreadyRequested);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);

    if (!amt || amt < MIN_WITHDRAW) {
      const msg = `সর্বনিম্ন Tk ${MIN_WITHDRAW} তুলতে পারবেন।`;
      setError(msg);
      toast.error(msg);
      return;
    }
    if (amt > availableBalance) {
      const msg = 'Available Balance এর চেয়ে বেশি তুলতে পারবেন না।';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!/^\d{11}$/.test(accountNumber)) {
      const msg = '১১ ডিজিটের সঠিক মোবাইল নাম্বার দিন।';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!auth.currentUser) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'withdrawRequests'), {
        resellerId: auth.currentUser.uid,
        resellerName: userData?.name || '',
        resellerPhone: userData?.phone || '',
        amount: amt,
        method,
        accountNumber,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setAmount('');
      setAccountNumber('');
      toast.success('✓ Withdraw request জমা হয়েছে। Admin যাচাই করে approve করবে।');
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Request পাঠানো যায়নি।';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: {
        label: 'অপেক্ষমাণ',
        bg: 'bg-yellow-50 border border-yellow-200',
        text: 'text-yellow-700',
        icon: Clock,
      },
      approved: {
        label: 'অনুমোদিত',
        bg: 'bg-blue-50 border border-blue-200',
        text: 'text-blue-700',
        icon: CheckCircle,
      },
      paid: {
        label: 'পরিশোধিত',
        bg: 'bg-green-50 border border-green-200',
        text: 'text-green-700',
        icon: CheckCircle,
      },
      rejected: {
        label: 'প্রত্যাখ্যাত',
        bg: 'bg-red-50 border border-red-200',
        text: 'text-red-700',
        icon: XCircle,
      },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${c.bg} ${c.text}`}
      >
        <Icon size={11} />
        {c.label}
      </span>
    );
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      return d.toLocaleDateString('bn-BD', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  if (loading && !userData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      {/* HEADER */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zeluxe-black md:text-2xl">
          টাকা তুলুন
        </h1>
        <p className="mt-1 text-xs text-gray-500 md:text-sm">
          Order profit এবং Referral bonus একসাথে তুলুন
        </p>
      </div>

      {/* BALANCE HERO */}
      <div className="relative mb-5 overflow-hidden rounded-lg bg-zeluxe-black p-5 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-zeluxe-gold/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <Wallet size={12} />
            Available Balance
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight text-zeluxe-gold font-number">
            Tk {availableBalance.toFixed(0)}
          </p>

          {/* Breakdown */}
          <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-300">
                <TrendingUp size={12} className="text-zeluxe-gold" />
                Order Profit
              </div>
              <span className="font-bold text-white font-number">
                Tk {orderProfit.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-300">
                <Users size={12} className="text-zeluxe-gold" />
                Referral Bonus
              </div>
              <span className="font-bold text-green-400 font-number">
                +Tk {referralBonus.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
              <span className="text-gray-400">মোট আয়</span>
              <span className="font-bold text-white font-number">
                Tk {totalEarned.toLocaleString()}
              </span>
            </div>

            {alreadyRequested > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">আগে তুলেছেন</span>
                <span className="font-bold text-red-400 font-number">
                  -Tk {alreadyRequested.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MIN WITHDRAW INFO */}
      {availableBalance < MIN_WITHDRAW && (
        <div className="mb-5 rounded-md border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 shrink-0 text-yellow-700" size={16} />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-900">
                আরো Tk {(MIN_WITHDRAW - availableBalance).toFixed(0)} প্রয়োজন
              </p>
              <p className="mt-0.5 text-xs text-yellow-700">
                সর্বনিম্ন Tk {MIN_WITHDRAW} হলে withdraw request করতে পারবেন।
                আরো order নিন বা বন্ধুকে refer করুন।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW FORM */}
      <div className="mb-5 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white shadow-sm">
        <div className="border-b border-zeluxe-lightgray px-5 py-3.5">
          <h2 className="text-sm font-bold text-zeluxe-black">
            Withdraw Request
          </h2>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                পরিমাণ (Tk)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`সর্বনিম্ন ${MIN_WITHDRAW}`}
                min={MIN_WITHDRAW}
                max={availableBalance}
                disabled={submitting}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-md border border-zeluxe-lightgray bg-white px-4 py-3 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
              />
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-gray-400">সর্বনিম্ন Tk {MIN_WITHDRAW}</span>
                {availableBalance >= MIN_WITHDRAW && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(availableBalance.toFixed(0)))}
                    className="font-bold text-zeluxe-gold hover:underline"
                  >
                    সর্বোচ্চ Tk {availableBalance.toFixed(0)} নিন
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                পেমেন্ট মাধ্যম
              </label>
              <div className="flex gap-2">
                {(['bKash', 'Nagad'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    disabled={submitting}
                    className={`flex-1 rounded-md border-2 py-3 text-sm font-bold transition ${
                      method === m
                        ? 'border-zeluxe-gold bg-zeluxe-gold/10 text-zeluxe-black'
                        : 'border-zeluxe-lightgray text-gray-500 hover:border-zeluxe-gold/50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                {method} নাম্বার
              </label>
              <input
                type="tel"
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 11))
                }
                placeholder="01XXXXXXXXX"
                maxLength={11}
                disabled={submitting}
                className="w-full rounded-md border border-zeluxe-lightgray bg-white px-4 py-3 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || availableBalance < MIN_WITHDRAW}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-zeluxe-black py-3.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  পাঠানো হচ্ছে...
                </>
              ) : availableBalance < MIN_WITHDRAW ? (
                `সর্বনিম্ন Tk ${MIN_WITHDRAW} প্রয়োজন`
              ) : (
                <>
                  Withdraw Request পাঠান
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* WITHDRAW HISTORY */}
      <div className="overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white shadow-sm">
        <div className="border-b border-zeluxe-lightgray px-5 py-3.5">
          <h2 className="text-sm font-bold text-zeluxe-black">
            আগের Withdraw
          </h2>
        </div>
        {withdrawals.length > 0 ? (
          <div>
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between border-b border-zeluxe-lightgray px-5 py-3.5 last:border-0"
              >
                <div>
                  <p className="text-sm font-bold text-zeluxe-black font-number">
                    Tk {w.amount}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {w.method} • {w.accountNumber}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatDate(w.createdAt)}
                  </p>
                </div>
                {getStatusBadge(w.status)}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Wallet className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-xs text-gray-500">
              এখনো কোনো withdraw request নেই
            </p>
          </div>
        )}
      </div>
    </div>
  );
}