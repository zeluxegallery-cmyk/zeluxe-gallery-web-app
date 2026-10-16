import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { Bell, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '../../components/AdminLayout';
import { db } from '../../firebase';

type Reseller = {
  id: string;
  name: string;
  email: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  userId: string;
  read: boolean;
  createdAt?: { seconds?: number };
};

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminNotifications() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [recipientType, setRecipientType] = useState<'all' | 'specific'>('all');
  const [selectedUser, setSelectedUser] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [usersSnap, notifSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'reseller'))),
        getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20))),
      ]);
      setResellers(
        usersSnap.docs.map((userDoc) => {
          const data = userDoc.data();
          return {
            id: userDoc.id,
            name: typeof data.name === 'string' ? data.name : 'Unknown',
            email: typeof data.email === 'string' ? data.email : '—',
          };
        }),
      );
      setNotifications(
        notifSnap.docs.map((notifDoc) => {
          const data = notifDoc.data();
          return {
            id: notifDoc.id,
            title: typeof data.title === 'string' ? data.title : '—',
            message: typeof data.message === 'string' ? data.message : '',
            userId: typeof data.userId === 'string' ? data.userId : '',
            read: typeof data.read === 'boolean' ? data.read : false,
            createdAt: data.createdAt,
          };
        }),
      );
    } catch {
      // Fallback for notifications without orderBy index
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'reseller')));
      setResellers(
        usersSnap.docs.map((userDoc) => {
          const data = userDoc.data();
          return {
            id: userDoc.id,
            name: typeof data.name === 'string' ? data.name : 'Unknown',
            email: typeof data.email === 'string' ? data.email : '—',
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title এবং Message দুটোই দিতে হবে।');
      return;
    }

    setSending(true);
    try {
      if (recipientType === 'specific') {
        if (!selectedUser) {
          toast.error('একজন রিসেলার সিলেক্ট করুন।');
          setSending(false);
          return;
        }
        await addDoc(collection(db, 'notifications'), {
          userId: selectedUser,
          title: title.trim(),
          message: message.trim(),
          read: false,
          createdAt: serverTimestamp(),
        });
        toast.success('✓ নির্দিষ্ট রিসেলারকে নোটিফিকেশন পাঠানো হয়েছে।');
      } else {
        for (const reseller of resellers) {
          await addDoc(collection(db, 'notifications'), {
            userId: reseller.id,
            title: title.trim(),
            message: message.trim(),
            read: false,
            createdAt: serverTimestamp(),
          });
        }
        toast.success(`✓ ${resellers.length} জন রিসেলারকে নোটিফিকেশন পাঠানো হয়েছে।`);
      }
      setTitle('');
      setMessage('');
      setSelectedUser('');
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-zeluxe-black">নোটিফিকেশন পাঠান</h1>

      {/* Send form */}
      <div className="mb-8 rounded-xl border border-zeluxe-lightgray bg-white p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zeluxe-black">Recipient</label>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as 'all' | 'specific')}
              className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
            >
              <option value="all">All Resellers</option>
              <option value="specific">Specific User</option>
            </select>
          </div>

          {recipientType === 'specific' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-zeluxe-black">Select Reseller</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
              >
                <option value="">Choose a reseller...</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zeluxe-black">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
              placeholder="Notification title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zeluxe-black">Message</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
              placeholder="Write your message..."
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zeluxe-black py-3 font-bold text-white transition hover:bg-[#2a2a2a] disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sending ? 'পাঠানো হচ্ছে...' : 'পাঠান'}
          </button>
        </div>
      </div>

      {/* Recent notifications */}
      <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Recent Notifications</h2>
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="rounded-xl border border-zeluxe-lightgray bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zeluxe-gold/10">
                    <Bell className="text-zeluxe-gold" size={16} />
                  </span>
                  <div>
                    <p className="font-bold text-zeluxe-black">{notif.title}</p>
                    <p className="mt-1 text-sm text-zeluxe-gray">{notif.message}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatDate(notif.createdAt?.seconds)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-zeluxe-fieldbg p-8 text-center text-zeluxe-gray">
          No notifications sent yet.
        </div>
      )}
    </AdminLayout>
  );
}
