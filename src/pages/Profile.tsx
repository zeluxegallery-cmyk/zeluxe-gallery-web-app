import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { LogOut, Mail, Phone, Calendar, ShieldCheck, User as UserIcon, Loader2, Camera } from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';
import { uploadImageToCloudinary } from '../lib/cloudinary';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    loadProfile();
  }, [navigate]);

  const handleAvatarUpload = async (file: File) => {
    if (!auth.currentUser) return;
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        avatarUrl: url,
      });
      setUserData((prev: any) => ({ ...prev, avatarUrl: url }));
      alert('✓ প্রোফাইল ছবি আপডেট হয়েছে!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ছবি আপলোড ব্যর্থ');
    } finally {
      setUploading(false);
    }
  };

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
        {/* Avatar with upload */}
        <div className="mb-6 text-center">
          <div className="relative mx-auto inline-block">
            {userData.avatarUrl ? (
              <img
                src={userData.avatarUrl}
                alt={userData.name}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zeluxe-gold text-4xl font-bold text-white">
                {initial}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-zeluxe-black text-white shadow-lg transition hover:bg-zeluxe-gold disabled:opacity-60"
              title="ছবি পরিবর্তন করুন"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAvatarUpload(file);
                e.target.value = '';
              }}
            />
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
