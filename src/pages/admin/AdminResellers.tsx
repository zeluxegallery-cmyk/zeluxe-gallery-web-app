import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Eye, Loader2, Search, Trash2, UserCheck, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../firebase';

type Reseller = {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountStatus: string;
  membershipStatus: string;
  role: string;
  createdAt?: { seconds?: number };
};

type ResellerDetail = Reseller & {
  uid: string;
};

const FILTERS = ['All', 'Active', 'Pending', 'Suspended'];

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'suspended':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending_membership':
    case 'pending':
      return 'bg-gray-200 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function AdminResellers() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [viewReseller, setViewReseller] = useState<ResellerDetail | null>(null);

  const loadData = useCallback(async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'reseller')));
      setResellers(
        snapshot.docs.map((userDoc) => {
          const data = userDoc.data();
          return {
            id: userDoc.id,
            name: typeof data.name === 'string' ? data.name : 'Unknown',
            email: typeof data.email === 'string' ? data.email : '—',
            phone: typeof data.phone === 'string' ? data.phone : '—',
            accountStatus: typeof data.accountStatus === 'string' ? data.accountStatus : 'pending',
            membershipStatus: typeof data.membershipStatus === 'string' ? data.membershipStatus : 'pending',
            role: typeof data.role === 'string' ? data.role : 'reseller',
            createdAt: data.createdAt,
          };
        }),
      );
    } catch (err) {
      console.error('Failed to load resellers:', err);
      toast.error('রিসেলার লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleActivate = async (reseller: Reseller) => {
    if (!window.confirm(`Activate ${reseller.name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', reseller.id), {
        accountStatus: 'active',
        membershipStatus: 'approved',
      });
      toast.success(`✓ ${reseller.name} কে activate করা হয়েছে।`);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Activate failed.';
      toast.error(message);
    }
  };

  const handleSuspend = async (reseller: Reseller) => {
    if (!window.confirm(`Suspend ${reseller.name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', reseller.id), { accountStatus: 'suspended' });
      toast.success(`✓ ${reseller.name} কে suspend করা হয়েছে।`);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Suspend failed.';
      toast.error(message);
    }
  };

  const handleDelete = async (reseller: Reseller) => {
    if (!window.confirm(`Delete ${reseller.name}?`)) return;
    if (!window.confirm(`Are you absolutely sure? This permanently removes the reseller record.`)) return;
    try {
      await deleteDoc(doc(db, 'users', reseller.id));
      toast.success(`✓ ${reseller.name} কে ডিলিট করা হয়েছে।`);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.';
      toast.error(message);
    }
  };

  const openView = (reseller: Reseller) => {
    setViewReseller({ ...reseller, uid: reseller.id });
  };

  const filtered = resellers.filter((reseller) => {
    const matchesSearch =
      reseller.name.toLowerCase().includes(search.toLowerCase()) ||
      reseller.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'All' || reseller.accountStatus.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  // ═══ <AdminLayout> ট্যাগটি সরিয়ে সরাসরি div দিয়ে শুরু করা হয়েছে ═══
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading" />
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-zeluxe-black">রিসেলার ম্যানেজমেন্ট</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zeluxe-gray" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-xl border border-zeluxe-lightgray bg-white py-2.5 pl-10 pr-4 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
        />
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition ${
              filter === f
                ? 'bg-zeluxe-black font-semibold text-white'
                : 'border border-zeluxe-lightgray text-zeluxe-gray hover:bg-zeluxe-fieldbg'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zeluxe-fieldbg">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Name</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Email</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Phone</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Registered</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((reseller) => (
              <tr key={reseller.id} className="border-b border-zeluxe-lightgray last:border-0">
                <td className="px-4 py-3 font-medium text-zeluxe-black">{reseller.name}</td>
                <td className="px-4 py-3 text-zeluxe-gray">{reseller.email}</td>
                <td className="px-4 py-3 text-zeluxe-gray">{reseller.phone}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-bold capitalize ${getStatusClass(reseller.accountStatus)}`}
                  >
                    {reseller.accountStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-zeluxe-gray">{formatDate(reseller.createdAt?.seconds)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openView(reseller)}
                      className="rounded-lg p-1.5 text-zeluxe-gold transition hover:bg-zeluxe-fieldbg"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {reseller.accountStatus !== 'active' && (
                      <button
                        onClick={() => handleActivate(reseller)}
                        className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-green-700"
                      >
                        Active করুন
                      </button>
                    )}
                    {reseller.accountStatus !== 'suspended' && (
                      <button
                        onClick={() => handleSuspend(reseller)}
                        className="rounded-lg bg-yellow-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-yellow-600"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(reseller)}
                      className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((reseller) => (
          <div key={reseller.id} className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zeluxe-black">{reseller.name}</p>
                <p className="text-xs text-zeluxe-gray">{reseller.email}</p>
              </div>
              <span
                className={`inline-block rounded-full px-2 py-1 text-xs font-bold capitalize ${getStatusClass(reseller.accountStatus)}`}
              >
                {reseller.accountStatus}
              </span>
            </div>
            <p className="mt-2 text-xs text-zeluxe-gray">{reseller.phone}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => openView(reseller)}
                className="rounded-lg bg-zeluxe-fieldbg px-2.5 py-1 text-xs font-bold text-zeluxe-black"
              >
                View
              </button>
              {reseller.accountStatus !== 'active' && (
                <button
                  onClick={() => handleActivate(reseller)}
                  className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-bold text-white"
                >
                  Active করুন
                </button>
              )}
              {reseller.accountStatus !== 'suspended' && (
                <button
                  onClick={() => handleSuspend(reseller)}
                  className="rounded-lg bg-yellow-500 px-2.5 py-1 text-xs font-bold text-white"
                >
                  Suspend
                </button>
              )}
              <button
                onClick={() => handleDelete(reseller)}
                className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 rounded-xl bg-zeluxe-fieldbg p-8 text-center text-zeluxe-gray">
          No resellers found.
        </div>
      )}

      {/* View modal */}
      {viewReseller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zeluxe-black">Reseller Details</h2>
              <button
                onClick={() => setViewReseller(null)}
                className="rounded-lg p-1.5 text-zeluxe-gray hover:bg-zeluxe-fieldbg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zeluxe-gold/10">
                  <Users className="text-zeluxe-gold" size={24} />
                </span>
                <div>
                  <p className="font-bold text-zeluxe-black">{viewReseller.name}</p>
                  <p className="text-xs text-zeluxe-gray">{viewReseller.email}</p>
                </div>
              </div>
              <div className="rounded-xl bg-zeluxe-fieldbg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zeluxe-gray">Phone</span>
                  <span className="text-zeluxe-black">{viewReseller.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zeluxe-gray">Account Status</span>
                  <span className="capitalize text-zeluxe-black">{viewReseller.accountStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zeluxe-gray">Membership</span>
                  <span className="capitalize text-zeluxe-black">{viewReseller.membershipStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zeluxe-gray">UID</span>
                  <span className="font-mono text-xs text-zeluxe-black">{viewReseller.uid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zeluxe-gray">Registered</span>
                  <span className="text-zeluxe-black">{formatDate(viewReseller.createdAt?.seconds)}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                {viewReseller.accountStatus !== 'active' && (
                  <button
                    onClick={() => {
                      void handleActivate(viewReseller);
                      setViewReseller(null);
                    }}
                    className="flex-1 rounded-xl bg-green-600 py-3 font-bold text-white transition hover:bg-green-700"
                  >
                    <UserCheck className="mx-auto h-4 w-4" />
                    Activate
                  </button>
                )}
                {viewReseller.accountStatus !== 'suspended' && (
                  <button
                    onClick={() => {
                      void handleSuspend(viewReseller);
                      setViewReseller(null);
                    }}
                    className="flex-1 rounded-xl bg-yellow-500 py-3 font-bold text-white transition hover:bg-yellow-600"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}