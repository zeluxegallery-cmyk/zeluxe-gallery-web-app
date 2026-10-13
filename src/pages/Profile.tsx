import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LogOut, Mail, Phone, Calendar, ShieldCheck, User as UserIcon, Pencil, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData({ uid: user.uid, email: user.email, ...userDoc.data() });
        }
      } catch (err) {
        console.error('Profile load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [navigate]);

  const handleLogout = async () => {
    if (!window.confirm('লগআউট করতে চান?')) return;
    await signOut(auth);
    navigate('/login');
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '—';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      pending_membership: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      active: 'সক্রিয়',
      approved: 'অনুমোদিত',
      pending: 'অপেক্ষমাণ',
      pending_membership: 'অপেক্ষমাণ',
      suspended: 'স্থগিত',
      rejected: 'প্রত্যাখ্যাত',
    };
    return (
      <span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
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

  if (!userData) {
    return (
      <Layout>
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <p className="text-gray-600">প্রোফাইল তথ্য পাওয়া যায়নি।</p>
        </div>
      </Layout>
    );
  }

  const initial = userData.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zeluxe-gold text-3xl font-bold text-white">
            {initial}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zeluxe-black">
            {userData.name || 'Reseller'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{userData.email}</p>
          <Link
            to="/"
            className="mt-2 inline-block text-xs font-medium text-zeluxe-gold hover:underline"
          >
            Zeluxe Gallery
          </Link>
        </div>

        {/* Info Card */}
        <div className="mb-4 overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white">
          <InfoRow icon={Phone} label="মোবাইল নম্বর" value={userData.phone || '—'} />
          <InfoRow icon={Mail} label="ইমেইল" value={userData.email || '—'} />
          <InfoRow
            icon={ShieldCheck}
            label="মেম্বারশিপ স্ট্যাটাস"
            value={getStatusBadge(userData.membershipStatus || 'pending')}
          />
          <InfoRow
            icon={UserIcon}
            label="অ্যাকাউন্ট স্ট্যাটাস"
            value={getStatusBadge(userData.accountStatus || 'pending_membership')}
          />
          <InfoRow
            icon={Calendar}
            label="যোগদানের তারিখ"
            value={formatDate(userData.createdAt)}
            isLast
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/reseller-dashboard')}
            className="flex-1 rounded-xl border border-zeluxe-black py-3 font-bold text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
          >
            ড্যাশবোর্ড
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-bold text-white transition hover:bg-red-700"
          >
            <LogOut className="h-4 w-4" />
            লগআউট
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          সাপোর্ট: <a href="mailto:zeluxegallery@gmail.com" className="text-zeluxe-gold">zeluxegallery@gmail.com</a>
        </p>
      </div>
    </Layout>
  );
}

function InfoRow({ icon: Icon, label, value, isLast = false }: any) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b border-zeluxe-lightgray' : ''}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-zeluxe-gold" />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-medium text-zeluxe-black">{value}</span>
    </div>
  );
}
