import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { CheckCircle, Loader2, XCircle, Clock, Wallet } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { db } from '../../firebase';

type Withdrawal = {
  id: string;
  resellerId: string;
  resellerName: string;
  resellerPhone: string;
  amount: number;
  method: 'bKash' | 'Nagad';
  accountNumber: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  note?: string;
  createdAt?: any;
  processedAt?: any;
};

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('pending');

  const loadData = async () => {
    try {
      // NO orderBy — fetch all, sort in JavaScript to avoid index requirement
      const snap = await getDocs(query(collection(db, 'withdrawRequests')));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Withdrawal[];

      // Sort by createdAt descending (client-side)
      list.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      console.log('Withdrawals loaded:', list.length, list);
      setWithdrawals(list);
    } catch (err) {
      console.error('Load failed:', err);
      alert('Withdraw load করতে সমস্যা: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleApprove = async (w: Withdrawal) => {
    if (!window.confirm(`৳${w.amount} approve করবেন?`)) return;
    try {
      await updateDoc(doc(db, 'withdrawRequests', w.id), {
        status: 'approved',
        processedAt: serverTimestamp(),
      });
      await loadData();
    } catch (err) {
      alert('Approve failed: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const handleReject = async (w: Withdrawal) => {
    const reason = window.prompt('Reject করার কারণ লিখুন:');
    if (!reason) return;
    try {
      await updateDoc(doc(db, 'withdrawRequests', w.id), {
        status: 'rejected',
        note: reason,
        processedAt: serverTimestamp(),
      });
      await loadData();
    } catch (err) {
      alert('Reject failed: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const handleMarkPaid = async (w: Withdrawal) => {
    if (!window.confirm(`৳${w.amount} ${w.method}-এ পাঠানো হয়েছে?`)) return;
    try {
      await updateDoc(doc(db, 'withdrawRequests', w.id), {
        status: 'paid',
        paidAt: serverTimestamp(),
      });
      await loadData();
    } catch (err) {
      alert('Update failed: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const filtered = filter === 'all' ? withdrawals : withdrawals.filter((w) => w.status === filter);

  const totalPending = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((s, w) => s + Number(w.amount || 0), 0);
  const totalApproved = withdrawals
    .filter((w) => w.status === 'approved')
    .reduce((s, w) => s + Number(w.amount || 0), 0);
  const totalPaid = withdrawals
    .filter((w) => w.status === 'paid')
    .reduce((s, w) => s + Number(w.amount || 0), 0);

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      return d.toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="mb-1 text-2xl font-bold text-zeluxe-black">Withdraw Management</h1>
      <p className="mb-6 text-sm text-gray-500">রিসেলারদের টাকা তোলার request ম্যানেজ করুন</p>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Pending</p>
          <p className="mt-1 text-xl font-bold text-yellow-600">৳{totalPending.toFixed(0)}</p>
        </div>
        <div className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Approved</p>
          <p className="mt-1 text-xl font-bold text-blue-600">৳{totalApproved.toFixed(0)}</p>
        </div>
        <div className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
          <p className="text-xs uppercase text-gray-500">Paid</p>
          <p className="mt-1 text-xl font-bold text-green-600">৳{totalPaid.toFixed(0)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'approved', 'paid', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === f ? 'bg-zeluxe-black text-white' : 'border border-zeluxe-lightgray text-gray-600'
            }`}
          >
            {f === 'all' ? 'সব' : f === 'pending' ? 'অপেক্ষমাণ' : f === 'approved' ? 'অনুমোদিত' : f === 'paid' ? 'পরিশোধিত' : 'প্রত্যাখ্যাত'}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">এই filter-এ কোনো withdraw request নেই।</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <div key={w.id} className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-zeluxe-black">{w.resellerName || 'Unknown'}</p>
                    {getStatusBadge(w.status)}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {w.method} • {w.accountNumber} • {w.resellerPhone}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(w.createdAt)}</p>
                  {w.note && (
                    <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
                      কারণ: {w.note}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-zeluxe-gold">৳{w.amount}</p>
                </div>
              </div>

              {w.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleApprove(w)}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(w)}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}

              {w.status === 'approved' && (
                <div className="mt-3">
                  <button
                    onClick={() => handleMarkPaid(w)}
                    className="w-full rounded-lg bg-green-600 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                  >
                    ✓ Mark as Paid (টাকা পাঠানো হয়েছে)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
