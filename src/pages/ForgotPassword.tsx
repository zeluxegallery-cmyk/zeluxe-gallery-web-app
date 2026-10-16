import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../firebase';
import logo from '../assets/zeluxe-logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getBengaliError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/user-not-found') {
      return 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই। রেজিস্ট্রেশন করুন।';
    }
    if (code === 'auth/invalid-email') {
      return 'সঠিক ইমেইল ঠিকানা দিন।';
    }
    if (code === 'auth/network-request-failed') {
      return 'ইন্টারনেট সংযোগ চেক করুন।';
    }
    if (code === 'auth/too-many-requests') {
      return 'অনেকবার চেষ্টা করেছেন। কিছুক্ষণ পরে আবার চেষ্টা করুন।';
    }
    return 'রিসেট লিংক পাঠানো যায়নি। আবার চেষ্টা করুন।';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError('ইমেইল দিন।');
      toast.error('ইমেইল দিন।');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
      toast.success('✓ রিসেট লিংক পাঠানো হয়েছে। ইমেইল চেক করুন।');
    } catch (err: any) {
      const errorMessage = getBengaliError(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12 pb-24">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-4 inline-block text-sm text-zeluxe-gray hover:text-zeluxe-black">
          ← হোম
        </Link>

        <img src={logo} alt="Zeluxe Gallery" className="mx-auto mb-6 h-28 object-contain" />

        <h1 className="text-center text-2xl font-bold text-zeluxe-black">Zeluxe Gallery</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          পাসওয়ার্ড রিসেট করুন — আপনার ইমেইল দিন, আমরা রিসেট লিংক পাঠাব
        </p>

        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✓ রিসেট লিংক পাঠানো হয়েছে। আপনার ইমেইল চেক করুন (Spam folder-ও দেখুন)।
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">ইমেইল</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
              className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zeluxe-black py-3 font-bold text-white transition hover:bg-[#2a2a2a] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                পাঠানো হচ্ছে...
              </>
            ) : (
              'রিসেট লিংক পাঠান'
            )}
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link to="/login" className="text-sm text-zeluxe-gold hover:underline">
            ← লগইনে ফিরে যান
          </Link>
        </p>
      </div>
    </div>
  );
}
