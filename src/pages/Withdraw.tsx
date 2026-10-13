import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { Loader2, Wallet, Clock, CheckCircle, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';

const MIN_WITHDRAW = 500;

export default function Withdraw() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const user = auth.currentUser;
    if (!user) { navigate('/login'); return; }
    try {
      const [userDoc, ordersSnap, productsSnap, withdrawSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, 'orders'), where('resellerId', '==', user.uid))),
        getDocs(collection(db, 'products')),
        getDocs(query(collection(db, 'withdrawRequests'), where('resellerId', '==', user.uid))),
      ]);
      setUserData(userDoc.exists() ? { uid: user.uid, ...userDoc.data() } : null);
      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const wList = withdrawSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      wList.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setWithdrawals(wList);
    } catch (err) {
      console.error('Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const totalEarnings = orders.reduce((sum, order) => {
    if (order.status !== 'delivered') return sum;
    const product = products.find(p => p.id === order.productId);
    if (!product) return sum;
    const resellerPrice = Number(product.resellerPrice) || 0;
    const sellingPrice = Number(order.sellingPrice) || 0;
    const qty = Number(order.quantity) || 0;
    return sum + (sellingPrice - resellerPrice) * qty;
  }, 0);

  const alreadyRequested = withdrawals
    .filter(w => ['pending', 'approved', 'paid'].includes(w.status))
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const availableBalance = Math.max(0, totalEarnings - alreadyRequested);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!amt || amt < MIN_WITHDRAW) {
      setError(`সর্বনিম্ন ৳${MIN_WITHDRAW} তুলতে পারবেন।`); return;
    }
    if (amt > availableBalance) {
      setError('Available Balance এর চেয়ে বেশি তুলতে পারবেন না।'); return;
    }
    if (!/^\d{11}$/.test(accountNumber)) {
      setError('১১ ডিজিটের সঠিক মোবাইল নাম্বার দিন।'); return;
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
      alert('✓ Withdraw request জমা হয়েছে। Admin যাচাই করে approve করবে।');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Request পাঠানো যায়নি।');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: { label: 'অপেক্ষমাণ', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      approved: { label: 'অনুমোদিত', bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      paid: { label: 'পরিশোধিত', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      rejected: { label: 'প্রত্যাখ্যাত', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${c.bg} ${c.text}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      return d.toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
  };

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
        <h1 className="mb-1 text-2xl font-bold text-zeluxe-black">টাকা তুলুন</h1>
        <p className="mb-6 text-sm text-gray-500">Delivered অর্ডার থেকে অর্জিত লাভ তুলুন</p>

        <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-zeluxe-black to-gray-900 p-6 text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
            <Wallet size={14} />
            Available Balance
          </div>
          <p className="mt-2 text-4xl font-bold text-zeluxe-gold">৳{availableBalance.toFixed(0)}</p>
          <div className="mt-4 flex gap-4 text-xs text-gray-400">
            <span>মোট আয়: ৳{totalEarnings.toFixed(0)}</span>
            <span>•</span>
            <span>আগে তুলেছেন: ৳{alreadyRequested.toFixed(0)}</span>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-zeluxe-lightgray bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Withdraw Request</h2>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">পরিমাণ (৳)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`সর্বনিম্ন ৳${MIN_WITHDRAW}`}
                min={MIN_WITHDRAW}
                max={availableBalance}
                disabled={submitting}
                className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">সর্বনিম্ন ৳{MIN_WITHDRAW}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">পেমেন্ট মাধ্যম</label>
              <div className="flex gap-3">
                {(['bKash', 'Nagad'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    disabled={submitting}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold transition ${
                      method === m
                        ? 'border-zeluxe-gold bg-zeluxe-gold/10 text-zeluxe-black'
                        : 'border-zeluxe-lightgray text-gray-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                {method} নাম্বার
              </label>
              <input
                type="tel"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="01XXXXXXXXX"
                maxLength={11}
                disabled={submitting}
                className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || availableBalance < MIN_WITHDRAW}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zeluxe-black py-3 font-bold text-white transition hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              {submitting ? (
                <><Loader2 className="animate-spin" size={18} />পাঠানো হচ্ছে...</>
              ) : availableBalance < MIN_WITHDRAW ? (
                `সর্বনিম্ন ৳${MIN_WITHDRAW} প্রয়োজন`
              ) : (
                'Request পাঠান'
              )}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-zeluxe-lightgray bg-white">
          <div className="border-b border-zeluxe-lightgray p-4">
            <h2 className="text-lg font-bold text-zeluxe-black">আগের Withdraw</h2>
          </div>
          {withdrawals.length > 0 ? (
            <div>
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between border-b border-zeluxe-lightgray px-4 py-3 last:border-0">
                  <div>
                    <p className="font-bold text-zeluxe-black">৳{w.amount}</p>
                    <p className="text-xs text-gray-500">{w.method} • {w.accountNumber}</p>
                    <p className="text-xs text-gray-400">{formatDate(w.createdAt)}</p>
                  </div>
                  {getStatusBadge(w.status)}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              এখনো কোনো withdraw request নেই।
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
