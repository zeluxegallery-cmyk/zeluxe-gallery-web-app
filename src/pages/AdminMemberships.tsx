import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { db } from '../firebase';

type MembershipRequest = {
  id: string;
  uid: string;
  name: string;
  email: string;
  transactionId: string;
  amount: number;
  createdAt?: { seconds?: number };
};

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminMemberships() {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'membershipRequests'), where('status', '==', 'pending')),
      );
      const sorted = snapshot.docs.sort((a, b) => {
        const aTime = a.data().createdAt?.seconds || 0;
        const bTime = b.data().createdAt?.seconds || 0;
        return bTime - aTime;
      });
      const fetched: MembershipRequest[] = sorted.map((requestDoc) => {
        const data = requestDoc.data();
        return {
          id: requestDoc.id,
          uid: typeof data.uid === 'string' ? data.uid : requestDoc.id,
          name: typeof data.name === 'string' ? data.name : 'Unknown',
          email: typeof data.email === 'string' ? data.email : '—',
          transactionId: typeof data.transactionId === 'string' ? data.transactionId : '—',
          amount: typeof data.amount === 'number' ? data.amount : 0,
          createdAt: data.createdAt,
        };
      });
      setRequests(fetched);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleApprove = async (req: MembershipRequest) => {
    if (!window.confirm('Approve this membership?')) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', req.uid), {
        accountStatus: 'active',
        membershipStatus: 'approved',
      });
      await updateDoc(doc(db, 'membershipRequests', req.uid), { status: 'approved' });
      await loadRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Error: ' + message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (req: MembershipRequest) => {
    const reason = window.prompt('Rejection reason:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', req.uid), { membershipStatus: 'rejected' });
      await updateDoc(doc(db, 'membershipRequests', req.uid), { status: 'rejected', reason });
      await loadRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Error: ' + message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout isAdmin>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading requests" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout isAdmin>
      <h1 className="text-2xl font-bold text-zeluxe-black">Membership Requests</h1>
      <p className="mb-6 text-sm text-gray-600">Pending payment verifications</p>

      {requests.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zeluxe-fieldbg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-zeluxe-lightgray last:border-0">
                    <td className="px-4 py-3 font-medium text-zeluxe-black">{req.name}</td>
                    <td className="px-4 py-3 text-zeluxe-gray">{req.email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zeluxe-black">{req.transactionId}</td>
                    <td className="px-4 py-3 font-bold text-zeluxe-black">৳{req.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zeluxe-gray">{formatDate(req.createdAt?.seconds)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={actionLoading}
                          className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req)}
                          disabled={actionLoading}
                          className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {requests.map((req) => (
              <div key={req.id} className="mb-3 rounded-xl border border-zeluxe-lightgray bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-zeluxe-black">{req.name}</p>
                  <span className="font-bold text-zeluxe-gold">৳{req.amount.toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-zeluxe-gray">{req.email}</p>
                <p className="mt-1 font-mono text-xs text-zeluxe-gray">{req.transactionId}</p>
                <p className="mt-1 text-xs text-gray-500">{formatDate(req.createdAt?.seconds)}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={actionLoading}
                    className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    disabled={actionLoading}
                    className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-zeluxe-gray" />
          <p className="mt-4 flex items-center justify-center gap-2 text-gray-600">
            <AlertCircle className="h-4 w-4" />
            No pending membership requests.
          </p>
        </div>
      )}
    </Layout>
  );
}
