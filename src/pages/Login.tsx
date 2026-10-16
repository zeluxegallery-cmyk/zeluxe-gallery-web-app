import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import logo from '../assets/zeluxe-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBengaliError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/invalid-login-credentials') {
      return 'ইমেইল বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।';
    }
    if (code === 'auth/user-not-found') {
      return 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই। রেজিস্ট্রেশন করুন।';
    }
    if (code === 'auth/invalid-email') {
      return 'সঠিক ইমেইল ঠিকানা দিন।';
    }
    if (code === 'auth/too-many-requests') {
      return 'অনেকবার চেষ্টা করেছেন। কিছুক্ষণ পরে আবার চেষ্টা করুন।';
    }
    if (code === 'auth/user-disabled') {
      return 'আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে। সাপোর্টে যোগাযোগ করুন।';
    }
    if (code === 'auth/network-request-failed') {
      return 'ইন্টারনেট সংযোগ চেক করুন।';
    }
    return 'লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('ইমেইল এবং পাসওয়ার্ড দুটোই দিন।');
      toast.error('ইমেইল এবং পাসওয়ার্ড দুটোই দিন।');
      return;
    }

    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);

      toast.success('সফলভাবে লগইন হয়েছে!');

      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists()) {
        navigate('/admin-dashboard');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.accountStatus === 'active') {
          navigate('/reseller-dashboard');
        } else {
          navigate('/pending');
        }
      } else {
        navigate('/pending');
      }
    } catch (err: any) {
      const errorMessage = getBengaliError(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:flex">
      {/* LEFT SIDE — Brand showcase (desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-zeluxe-black text-white flex-col justify-center items-center p-12 relative">
        <img src={logo} alt="Zeluxe Gallery" className="h-32 mb-8 object-contain" />
        <h1 className="text-3xl font-bold text-zeluxe-gold tracking-wider text-center">
          Zeluxe Gallery
        </h1>
        <p className="text-sm text-gray-400 mt-2 text-center">প্রিমিয়াম রিসেলিং প্লাটফর্ম</p>

        <div className="mt-12 space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Check className="text-zeluxe-gold" size={20} />
            <span>প্রিমিয়াম ফ্যাশন প্রোডাক্ট</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="text-zeluxe-gold" size={20} />
            <span>সহজ ডেলিভারি ম্যানেজমেন্ট</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="text-zeluxe-gold" size={20} />
            <span>ভালো মুনাফা প্রতি অর্ডারে</span>
          </div>
        </div>

        <p className="absolute bottom-8 text-xs text-gray-500">© 2025 Zeluxe Gallery</p>
      </div>

      {/* RIGHT SIDE — Form */}
      <div className="md:w-1/2 flex items-center justify-center px-6 py-12 pb-24">
        <div className="w-full max-w-md">
          <Link to="/" className="text-sm text-zeluxe-gray hover:text-zeluxe-black mb-4 inline-block">
            ← হোম
          </Link>

          <img src={logo} alt="Zeluxe Gallery" className="md:hidden h-32 mx-auto mb-6 object-contain" />

          <h1 className="text-2xl font-bold text-zeluxe-black text-center">Zeluxe Gallery</h1>
          <p className="text-sm text-gray-500 text-center mt-2">
            স্বাগতম, আপনার অ্যাকাউন্টে লগইন করুন
          </p>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-zeluxe-black mb-1.5">ইমেইল</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zeluxe-black mb-1.5">পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 pr-12 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
                  placeholder="পাসওয়ার্ড দিন"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zeluxe-gray hover:text-zeluxe-black p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link to="/forgot-password" className="text-xs text-zeluxe-gold hover:underline">
                  পাসওয়ার্ড ভুলে গেছেন?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zeluxe-black text-white font-bold py-3 rounded-xl hover:bg-[#2a2a2a] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  লগইন হচ্ছে...
                </>
              ) : (
                'লগইন করুন'
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-600">
            নতুন অ্যাকাউন্ট?{' '}
            <Link to="/register" className="text-zeluxe-gold font-semibold hover:underline">
              রেজিস্ট্রেশন করুন
            </Link>
          </p>

          <div className="mt-8 flex justify-center text-xs text-gray-400">
            <span>🔒 নিরাপদ লগইন</span>
          </div>
        </div>
      </div>
    </div>
  );
}
