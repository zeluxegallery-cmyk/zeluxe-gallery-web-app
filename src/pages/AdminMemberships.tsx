import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CheckCircle, Clock, Loader2, XCircle, User } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { db } from '../firebase';

type MembershipRequest = {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  transactionId: string;
  senderMobile: string;
  amount: number;
  paymentNumber: string;
  status: string;
  createdAt?: any;
};

export default function AdminMemberships() {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // NO orderBy — client-side sort to avoid composite index requirement
      const q = query(
        collection(db, 'membershipRequests'),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      const list: MembershipRequest[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: typeof data.uid === 'string' ? data.uid : d.id,
          name: typeof data.name === 'string' ? data.name : 'Unknown',
          email: typeof data.email === 'string' ? data.email : '',
          phone: typeof data.phone === 'string' ? data.phone : '',
          transactionId: typeof data.transactionId === 'string' ? data.transactionId : '',
          senderMobile: typeof data.senderMobile === 'string' ? data.senderMobile : '',
          amount: typeof data.amount === 'number' ? data.amount : 99,
          paymentNumber: typeof data.paymentNumber === 'string' ? data.paymentNumber : '',
          status: typeof data.status === 'string' ? data.status : 'pending',
          createdAt: data.createdAt,
        };
      });

      // Sort client-side (newest first)
      list.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setRequests(list);
    } catch (err) {
      console.error('Failed to load membership requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleApprove = async (req: MembershipRequest) => {
    if (!window.confirm(`${req.name} এর membership approve করবেন?`)) return;
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, 'users', req.uid), {
        accountStatus: 'active',
        membershipStatus: 'approved',
      });
      await updateDoc(doc(db, 'membershipRequests', req.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
      });
      await loadRequests();
    } catch (err) {
      alert('Approve failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: MembershipRequest) => {
    const reason = window.prompt('Reject করার কারণ লিখুন:', 'পেমেন্ট verify করা যায়নি');
    if (!reason) return;
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, 'users', req.uid), {
        membershipStatus: 'rejected',
      });
      await updateDoc(doc(db, 'membershipRequests', req.id), {
        status: 'rejected',
        reason,
        rejectedAt: serverTimestamp(),
      });
      await loadRequests();
    } catch (err) {
      alert('Reject failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setProcessingId(null);
    }
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
      <h1 className="mb-1 text-2xl font-bold text-zeluxe-black">Membership Requests</h1>
      <p className="mb-6 text-sm text-gray-500">
        Pending payment verification ({requests.length}টি)
      </p>

      {requests.length === 0 ? (
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">No pending membership requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-gold/10">
                    <User className="text-zeluxe-gold" size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-zeluxe-black">{req.name}</p>
                    <p className="text-xs text-gray-500">{req.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
                  <Clock size={12} />
                  অপেক্ষমাণ
                </span>
              </div>

              {/* Payment Details */}
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zeluxe-fieldbg p-3">
                    <p className="text-[10px] font-bold uppercase text-gray-500">
                      Transaction ID
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-bold text-zeluxe-black">
                      {req.transactionId || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zeluxe-fieldbg p-3">
                    <p className="text-[10px] font-bold uppercase text-gray-500">
                      Sender Number
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-zeluxe-black">
                      {req.senderMobile || '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-500">Amount</p>
                    <p className="mt-1 text-sm font-bold text-zeluxe-gold">
                      Tk {req.amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-500">Phone</p>
                    <p className="mt-1 text-sm font-bold text-zeluxe-black">
                      {req.phone || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-500">Date</p>
                    <p className="mt-1 text-sm font-bold text-zeluxe-black">
                      {formatDate(req.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={processingId === req.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-60"
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={processingId === req.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-60"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
