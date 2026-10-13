import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logo from '../assets/zeluxe-logo.png';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBengaliError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') {
      return 'এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।';
    }
    if (code === 'auth/weak-password') {
      return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
    }
    if (code === 'auth/invalid-email') {
      return 'সঠিক ইমেইল ঠিকানা দিন।';
    }
    if (code === 'auth/network-request-failed') {
      return 'ইন্টারনেট সংযোগ চেক করুন।';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'এই মুহূর্তে রেজিস্ট্রেশন বন্ধ আছে। সাপোর্টে যোগাযোগ করুন।';
    }
    return 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('সব তথ্য পূরণ করুন।');
      return;
    }

    if (phone.trim().length !== 11) {
      setError('মোবাইল নম্বর ১১ ডিজিটের হতে হবে।');
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।');
      return;
    }

    if (!agree) {
      setError('শর্তাবলীতে সম্মতি দিতে হবে।');
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        role: 'reseller',
        accountStatus: 'pending_membership',
        membershipStatus: 'pending',
        createdAt: serverTimestamp(),
      });

      navigate('/membership');
    } catch (err: any) {
      setError(getBengaliError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 py-12 pb-24">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-4 inline-block text-sm text-zeluxe-gray hover:text-zeluxe-black">
          ← হোম
        </Link>

        <img src={logo} alt="Zeluxe Gallery" className="mx-auto mb-6 h-28 object-contain" />

        <h1 className="text-2xl font-bold text-zeluxe-black text-center">Zeluxe Gallery</h1>
        <p className="mt-2 text-center text-sm text-gray-500">রিসেলার অ্যাকাউন্ট তৈরি করুন</p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">পূর্ণ নাম</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="আপনার পূর্ণ নাম"
              autoComplete="name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">মোবাইল নম্বর</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              disabled={loading}
              className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              maxLength={11}
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">ইমেইল</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">পাসওয়ার্ড</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 pr-12 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold transition-colors"
                placeholder="কমপক্ষে ৬ অক্ষর"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zeluxe-gray hover:text-zeluxe-black"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">কনফার্ম পাসওয়ার্ড</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 pr-12 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold transition-colors"
                placeholder="আবার পাসওয়ার্ড দিন"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zeluxe-gray hover:text-zeluxe-black"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Agree checkbox with Legal link */}
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-zeluxe-lightgray text-zeluxe-gold focus:ring-zeluxe-gold"
            />
            <span className="text-sm text-zeluxe-black">
              আমি{' '}
              <Link
                to="/legal"
                target="_blank"
                className="font-medium text-zeluxe-gold underline hover:text-yellow-600"
              >
                শর্তাবলী ও প্রাইভেসি পলিসি
              </Link>
              -তে সম্মত আছি
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-zeluxe-black py-3 font-bold text-white transition-all hover:bg-[#2a2a2a] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                অ্যাকাউন্ট তৈরি হচ্ছে...
              </>
            ) : (
              'রেজিস্ট্রেশন করুন'
            )}
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link to="/login" className="text-sm font-semibold text-zeluxe-gold hover:underline">
            ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন
          </Link>
        </p>

        <div className="mt-8 flex justify-center text-xs text-gray-400">
          <span>🔒 নিরাপদ রেজিস্ট্রেশন</span>
        </div>
      </div>
    </div>
  );
}
