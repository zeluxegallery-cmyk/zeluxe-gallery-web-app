import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
  User,
  Users,
  Gift,
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { db } from '../firebase';
import { creditReferrer, REFERRAL_BONUS_AMOUNT } from '../lib/referral';

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
  // Referral info
  referredBy?: string;
  referredByName?: string;
};

export default function AdminMemberships() {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'membershipRequests'),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);

      // For each request, also fetch user doc to check referredBy
      const list: MembershipRequest[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const uid = typeof data.uid === 'string' ? data.uid : d.id;

          let referredBy: string | undefined;
          let referredByName: string | undefined;

          try {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (typeof userData.referredBy === 'string' && userData.referredBy) {
                referredBy = userData.referredBy;
                referredByName =
                  typeof userData.referredByName === 'string'
                    ? userData.referredByName
                    : 'Reseller';
              }
            }
          } catch {
            // ignore
          }

          return {
            id: d.id,
            uid,
            name: typeof data.name === 'string' ? data.name : 'Unknown',
            email: typeof data.email === 'string' ? data.email : '',
            phone: typeof data.phone === 'string' ? data.phone : '',
            transactionId: typeof data.transactionId === 'string' ? data.transactionId : '',
            senderMobile: typeof data.senderMobile === 'string' ? data.senderMobile : '',
            amount: typeof data.amount === 'number' ? data.amount : 99,
            paymentNumber: typeof data.paymentNumber === 'string' ? data.paymentNumber : '',
            status: typeof data.status === 'string' ? data.status : 'pending',
            createdAt: data.createdAt,
            referredBy,
            referredByName,
          };
        })
      );

      // Sort by createdAt desc
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
      // 1. Activate user
      await updateDoc(doc(db, 'users', req.uid), {
        accountStatus: 'active',
        membershipStatus: 'approved',
      });

      // 2. Update request status
      await updateDoc(doc(db, 'membershipRequests', req.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
      });

      // 3. Credit referrer if exists
      if (req.referredBy) {
        const credited = await creditReferrer(req.referredBy);
        if (credited) {
          console.log(`✓ Referral bonus Tk ${REFERRAL_BONUS_AMOUNT} credited to ${req.referredByName}`);
        }
      }

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
      <h1 className="mb-1 text-xl font-bold text-zeluxe-black md:text-2xl">
        Membership Requests
      </h1>
      <p className="mb-6 text-xs text-gray-500 md:text-sm">
        Pending payment verification ({requests.length}টি)
      </p>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zeluxe-lightgray bg-white p-12 text-center">
          <Clock className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-600">
            কোনো pending membership request নেই
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zeluxe-lightgray bg-zeluxe-cream px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-gold/10">
                    <User className="text-zeluxe-gold" size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zeluxe-black">
                      {req.name}
                    </p>
                    <p className="text-[11px] text-gray-500">{req.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2 py-1 text-[10px] font-bold text-yellow-700">
                  <Clock size={11} />
                  অপেক্ষমাণ
                </span>
              </div>

              {/* Referral Badge */}
              {req.referredBy && (
                <div className="border-b border-zeluxe-lightgray bg-gradient-to-r from-zeluxe-gold/5 to-transparent px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-zeluxe-gold" />
                    <p className="text-[11px] text-zeluxe-black">
                      <strong>{req.referredByName}</strong> এর মাধ্যমে invited
                    </p>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-zeluxe-gold/20 px-2 py-0.5 text-[10px] font-bold text-zeluxe-black">
                      <Gift size={10} />
                      Tk {REFERRAL_BONUS_AMOUNT}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-zeluxe-cream p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Transaction ID
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-bold text-zeluxe-black">
                      {req.transactionId || '—'}
                    </p>
                  </div>
                  <div className="rounded-md bg-zeluxe-cream p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Sender Number
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-zeluxe-black">
                      {req.senderMobile || '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Amount
                    </p>
                    <p className="mt-1 text-sm font-bold text-zeluxe-gold">
                      Tk {req.amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Phone
                    </p>
                    <p className="mt-1 text-sm font-bold text-zeluxe-black">
                      {req.phone || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Date
                    </p>
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
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
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
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
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