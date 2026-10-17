import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Check, X, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import {
  findReferrerByCode,
  generateUniqueReferralCode,
  publishReferralCode,
} from '../lib/referral';

const inputClass =
  'w-full rounded-md border border-zeluxe-lightgray bg-white px-4 py-3 text-sm text-zeluxe-black placeholder:text-gray-400 focus:border-zeluxe-gold focus:outline-none';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref') || '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referral info
  const [referrerInfo, setReferrerInfo] = useState<{ uid: string; name: string } | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);

  // Load referrer info if code is in URL
  useEffect(() => {
    const loadReferrer = async () => {
      if (!referralCodeFromUrl) return;
      setReferralLoading(true);
      try {
        const referrer = await findReferrerByCode(referralCodeFromUrl);
        if (referrer) {
          setReferrerInfo(referrer);
        }
      } finally {
        setReferralLoading(false);
      }
    };
    loadReferrer();
  }, [referralCodeFromUrl]);

  const getBengaliError = (code: string): string => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।';
      case 'auth/invalid-email':
        return 'সঠিক ইমেইল ঠিকানা দিন।';
      case 'auth/weak-password':
        return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
      case 'auth/network-request-failed':
        return 'ইন্টারনেট সংযোগ চেক করুন।';
      case 'auth/too-many-requests':
        return 'অনেকবার চেষ্টা করেছেন। কিছুক্ষণ পরে আবার চেষ্টা করুন।';
      default:
        return 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim() || !phone.trim() || !email.trim() || !password) {
      setError('সব প্রয়োজনীয় তথ্য দিন।');
      toast.error('সব প্রয়োজনীয় তথ্য দিন।');
      return;
    }
    if (phone.trim().length !== 11) {
      setError('মোবাইল নাম্বার ১১ সংখ্যার হতে হবে।');
      toast.error('মোবাইল নাম্বার ১১ সংখ্যার হতে হবে।');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (password !== confirmPassword) {
      setError('দুইটা পাসওয়ার্ড একই হতে হবে।');
      toast.error('দুইটা পাসওয়ার্ড একই হতে হবে।');
      return;
    }
    if (!agreed) {
      setError('শর্তাবলীতে সম্মত হতে হবে।');
      toast.error('শর্তাবলীতে সম্মত হতে হবে।');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth user
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2. Generate own referral code
      const ownReferralCode = await generateUniqueReferralCode();

      // 3. Build user document
      const userData: Record<string, any> = {
        uid: user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        role: 'reseller',
        accountStatus: 'pending_membership',
        membershipStatus: 'pending',
        referralCode: ownReferralCode,
        referralBonusEarned: 0,
        referralCount: 0,
        createdAt: serverTimestamp(),
      };

      // 4. If referred, save referrer's UID
      if (referrerInfo) {
        userData.referredBy = referrerInfo.uid;
        userData.referredByName = referrerInfo.name;
      }

      // 5. Save to Firestore
      await setDoc(doc(db, 'users', user.uid), userData);

      // 6. Publish referral code to public collection
      await publishReferralCode(user.uid, name.trim(), ownReferralCode);

      // 7. Show success toast
      toast.success('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!');

      // 8. Navigate to membership payment (১ সেকেন্ড দেরি করে, যাতে টোস্ট দেখা যায়)
      setTimeout(() => navigate('/membership'), 1000);
      
    } catch (err: any) {
      const code = err?.code || '';
      const errorMessage = getBengaliError(code);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:flex">
      {/* LEFT SIDE — Brand showcase (Desktop only) */}
      <div className="relative hidden flex-col items-center justify-center bg-zeluxe-black p-12 text-white md:flex md:w-1/2">
        <img
          src="https://res.cloudinary.com/q1zrv81l/image/upload/e_make_transparent,h_100,c_fit/v1792007942/zeluxe-icon.png"
          alt="Zeluxe Gallery"
          className="h-32 object-contain"
        />
        <h1 className="mt-6 text-3xl font-bold tracking-wide text-zeluxe-gold">
          Zeluxe Gallery
        </h1>
        <p className="mt-2 text-sm text-gray-400">প্রিমিয়াম ফ্যাশন রিসেলিং প্লাটফর্ম</p>

        <div className="mt-12 space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Check className="text-zeluxe-gold" size={18} />
            <span>শূন্য ইনভেস্টমেন্টে ব্যবসা</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="text-zeluxe-gold" size={18} />
            <span>আমরাই ডেলিভারি দিই</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="text-zeluxe-gold" size={18} />
            <span>২৪/৭ সাপোর্ট</span>
          </div>
        </div>

        <p className="absolute bottom-8 text-xs text-gray-500">
          © 2026 Zeluxe Gallery
        </p>
      </div>

      {/* RIGHT SIDE — Form */}
      <div className="flex items-center justify-center px-6 py-12 md:w-1/2">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-4 inline-block text-sm text-gray-500 hover:text-zeluxe-black"
          >
            ← হোম
          </Link>

          <img
            src="https://res.cloudinary.com/q1zrv81l/image/upload/e_make_transparent,h_100,c_fit/v1792007942/zeluxe-icon.png"
            alt="Zeluxe Gallery"
            className="mx-auto mb-6 h-24 object-contain md:hidden"
          />

          <h1 className="text-center text-2xl font-bold text-zeluxe-black">
            Zeluxe Gallery
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            নতুন রিসেলার অ্যাকাউন্ট তৈরি করুন
          </p>

          {/* Referral Banner */}
          {referralCodeFromUrl && (
            <div className="mt-5 rounded-md border border-zeluxe-gold/30 bg-gradient-to-r from-zeluxe-gold/10 to-transparent p-3">
              {referralLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 size={14} className="animate-spin text-zeluxe-gold" />
                  Referral code যাচাই করছি...
                </div>
              ) : referrerInfo ? (
                <div className="flex items-center gap-2">
                  <UserIcon size={16} className="shrink-0 text-zeluxe-gold" />
                  <p className="text-xs text-zeluxe-black">
                    আপনি invited হয়েছেন <strong>{referrerInfo.name}</strong> এর মাধ্যমে
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <X size={14} />
                  Referral code টি সঠিক নয়
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                আপনার নাম *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="পূর্ণ নাম"
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                মোবাইল নাম্বার *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                }
                placeholder="01XXXXXXXXX"
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                ইমেইল *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                পাসওয়ার্ড *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষর"
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                পাসওয়ার্ড নিশ্চিত করুন *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="আবার পাসওয়ার্ড লিখুন"
                disabled={loading}
                className={inputClass}
              />
            </div>

            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-zeluxe-lightgray text-zeluxe-gold focus:ring-zeluxe-gold"
              />
              <span className="text-xs text-gray-600">
                আমি{' '}
                <Link
                  to="/legal"
                  className="font-medium text-zeluxe-gold hover:underline"
                >
                  শর্তাবলী ও প্রাইভেসি পলিসি
                </Link>{' '}
                পড়েছি এবং সম্মত আছি।
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-zeluxe-black py-3.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  অ্যাকাউন্ট তৈরি হচ্ছে...
                </>
              ) : (
                'অ্যাকাউন্ট তৈরি করুন'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            আগেই অ্যাকাউন্ট আছে?{' '}
            <Link
              to="/login"
              className="font-semibold text-zeluxe-gold hover:underline"
            >
              লগইন করুন
            </Link>
          </p>

          <div className="mt-8 flex justify-center text-xs text-gray-400">
            <span>🔒 নিরাপদ রেজিস্ট্রেশন</span>
          </div>
        </div>
      </div>
    </div>
  );
}