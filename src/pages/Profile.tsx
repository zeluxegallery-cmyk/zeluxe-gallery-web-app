import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  LogOut,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  User as UserIcon,
  Loader2,
  Camera,
  Building2,
  Globe,
  MessageCircle,
  Pencil,
  X,
  Upload,
  MapPin,
} from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';
import { uploadImageToCloudinary } from '../lib/cloudinary';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    businessAddress: '',
    facebookUrl: '',
    whatsappNumber: '',
    bio: '',
    businessLogo: '',
  });

  const loadProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = { uid: user.uid, email: user.email, ...userDoc.data() };
        setUserData(data);
        setForm({
          businessName: (data as any).businessName || '',
          businessType: (data as any).businessType || '',
          businessAddress: (data as any).businessAddress || '',
          facebookUrl: (data as any).facebookUrl || '',
          whatsappNumber: (data as any).whatsappNumber || '',
          bio: (data as any).bio || '',
          businessLogo: (data as any).businessLogo || '',
        });
      }
    } catch (err) {
      console.error('Profile load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarUpload = async (file: File) => {
    if (!auth.currentUser) return;
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { avatarUrl: url });
      setUserData((prev: any) => ({ ...prev, avatarUrl: url }));
      alert('✓ প্রোফাইল ছবি আপডেট হয়েছে!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ছবি আপলোড ব্যর্থ');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setForm((prev) => ({ ...prev, businessLogo: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'লোগো আপলোড ব্যর্থ');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveBusiness = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        businessName: form.businessName.trim(),
        businessType: form.businessType.trim(),
        businessAddress: form.businessAddress.trim(),
        facebookUrl: form.facebookUrl.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        bio: form.bio.trim(),
        businessLogo: form.businessLogo.trim(),
      });
      setUserData((prev: any) => ({ ...prev, ...form }));
      setEditOpen(false);
      alert('✓ ব্যবসার তথ্য আপডেট হয়েছে!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'সেভ ব্যর্থ');
    } finally {
      setSaving(false);
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
      <span
        className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
          styles[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
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
  const hasBusinessInfo =
    userData.businessName ||
    userData.facebookUrl ||
    userData.whatsappNumber ||
    userData.bio;

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        {/* Avatar Section */}
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
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-zeluxe-black text-white shadow-lg transition hover:bg-zeluxe-gold disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={avatarInputRef}
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
        </div>

        {/* Business Info Card */}
        {hasBusinessInfo ? (
          <div className="mb-4 overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {userData.businessLogo ? (
                  <img
                    src={userData.businessLogo}
                    alt="Business Logo"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zeluxe-gold/10">
                    <Building2 className="text-zeluxe-gold" size={22} />
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-zeluxe-black">
                    {userData.businessName || 'আমার ব্যবসা'}
                  </p>
                  {userData.businessType && (
                    <p className="text-xs text-gray-500">{userData.businessType}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-lg border border-zeluxe-lightgray p-2 text-zeluxe-gold transition hover:bg-zeluxe-fieldbg"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            {userData.bio && (
              <p className="mb-3 text-sm text-gray-600">{userData.bio}</p>
            )}

            <div className="space-y-2 text-sm">
              {userData.businessAddress && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 text-zeluxe-gold" />
                  <span>{userData.businessAddress}</span>
                </div>
              )}
              {userData.facebookUrl && (
                <a
                  href={userData.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  <span>Facebook পেজ</span>
                </a>
              )}
              {userData.whatsappNumber && (
                <a
                  href={`https://wa.me/88${userData.whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{userData.whatsappNumber}</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-dashed border-zeluxe-lightgray bg-zeluxe-fieldbg p-5 text-center">
            <Building2 className="mx-auto text-zeluxe-gold" size={32} />
            <p className="mt-2 text-sm font-bold text-zeluxe-black">ব্যবসার তথ্য যোগ করুন</p>
            <p className="mt-1 text-xs text-gray-500">
              আপনার ব্যবসার নাম, লোগো, Facebook, WhatsApp যোগ করে প্রফেশনাল হয়ে উঠুন
            </p>
            <button
              onClick={() => setEditOpen(true)}
              className="mt-3 rounded-xl bg-zeluxe-black px-5 py-2 text-sm font-bold text-white transition hover:bg-[#2a2a2a]"
            >
              যোগ করুন
            </button>
          </div>
        )}

        {/* Account Info Card */}
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
          সাপোর্ট:{' '}
          <a href="mailto:zeluxegallery@gmail.com" className="text-zeluxe-gold">
            zeluxegallery@gmail.com
          </a>
        </p>
      </div>

      {/* Edit Business Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zeluxe-black">ব্যবসার তথ্য</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg p-1.5 text-zeluxe-gray hover:bg-zeluxe-fieldbg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Business Logo */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">
                  ব্যবসার লোগো
                </label>
                {form.businessLogo ? (
                  <div className="relative inline-block">
                    <img
                      src={form.businessLogo}
                      alt="Logo"
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, businessLogo: '' })}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zeluxe-lightgray p-4 text-center transition hover:border-zeluxe-gold disabled:opacity-60"
                  >
                    {logoUploading ? (
                      <>
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-zeluxe-gold" />
                        <p className="mt-2 text-xs text-gray-500">আপলোড হচ্ছে...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="mx-auto h-6 w-6 text-zeluxe-gold" />
                        <p className="mt-2 text-sm font-medium text-zeluxe-black">
                          লোগো আপলোড করুন
                        </p>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">
                  ব্যবসার নাম
                </label>
                <input
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  placeholder="যেমন: করিম ফ্যাশন হাউজ"
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">
                  ব্যবসার ধরন
                </label>
                <select
                  value={form.businessType}
                  onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                >
                  <option value="">নির্বাচন করুন</option>
                  <option value="Facebook Page">Facebook Page</option>
                  <option value="Online Store">Online Store</option>
                  <option value="Physical Shop">Physical Shop</option>
                  <option value="Both">Facebook + Shop</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>

              {/* Business Address */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">
                  ব্যবসার ঠিকানা
                </label>
                <input
                  value={form.businessAddress}
                  onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  placeholder="যেমন: ঢাকা, বাংলাদেশ"
                />
              </div>

              {/* Facebook URL */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">
                  Facebook পেজ (URL)
                </label>
                <input
                  value={form.facebookUrl}
                  onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              {/* WhatsApp Number */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">
                  WhatsApp নম্বর
                </label>
                <input
                  value={form.whatsappNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      whatsappNumber: e.target.value.replace(/\D/g, '').slice(0, 11),
                    })
                  }
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  placeholder="01XXXXXXXXX"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">
                  পরিচিতি (Bio)
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  placeholder="যেমন: সেরা মানের ফ্যাশন প্রোডাক্ট, সারা দেশে ডেলিভারি"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 rounded-xl border border-zeluxe-lightgray py-3 font-bold text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveBusiness}
                disabled={saving}
                className="flex-1 rounded-xl bg-zeluxe-black py-3 font-bold text-white transition hover:bg-[#2a2a2a] disabled:opacity-60"
              >
                {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function InfoRow({ icon: Icon, label, value, isLast = false }: any) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        !isLast ? 'border-b border-zeluxe-lightgray' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-zeluxe-gold" />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-medium text-zeluxe-black">{value}</span>
    </div>
  );
}
