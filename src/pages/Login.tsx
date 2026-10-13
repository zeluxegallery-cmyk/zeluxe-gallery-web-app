import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import logo from '../assets/zeluxe-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeUser = async (uid: string) => {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    if (adminDoc.exists()) {
      navigate('/admin-dashboard');
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', uid));
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
  };

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
    if (code === 'auth/popup-closed-by-user') {
      return 'Google লগইন বাতিল করা হয়েছে।';
    }
    if (code === 'auth/popup-blocked') {
      return 'Popup block হয়েছে। ব্রাউজারের সেটিংস চেক করুন।';
    }
    return 'লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('ইমেইল এবং পাসওয়ার্ড দুটোই দিন।');
      return;
    }

    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
      await routeUser(user.uid);
    } catch (err: any) {
      setError(getBengaliError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await routeUser(user.uid);
    } catch (err: any) {
      setError(getBengaliError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:flex">
      {/* LEFT SIDE — Brand showcase (desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-zeluxe-black text-white flex-col justify-center items-center p-12">
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

          {/* Logo — mobile only */}
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
                disabled={loading || googleLoading}
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
                  disabled={loading || googleLoading}
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
              disabled={loading || googleLoading}
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

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-zeluxe-lightgray"></div>
            <span className="text-xs text-gray-400">অথবা</span>
            <div className="flex-1 h-px bg-zeluxe-lightgray"></div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            className="w-full border border-zeluxe-lightgray py-3 rounded-xl font-medium text-zeluxe-black flex items-center justify-center gap-2 hover:bg-zeluxe-fieldbg transition-colors disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google দিয়ে লগইন করুন
          </button>

          <p className="text-center mt-6 text-sm text-gray-600">
            নতুন অ্যাকাউন্ট?{' '}
            <Link to="/register" className="text-zeluxe-gold font-semibold hover:underline">
              রেজিস্ট্রেশন করুন
            </Link>
          </p>

          <div className="mt-8 flex justify-center gap-4 text-xs text-gray-400">
            <span>🔒 নিরাপদ লগইন</span>
            <span>•</span>
            <span>Powered by Firebase</span>
          </div>
        </div>
      </div>
    </div>
  );
}
