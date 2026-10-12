import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import logo from '../assets/zeluxe-logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('ইমেইল দিন।');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found') {
        setError('এই ইমেইলে কোনো অ্যাকাউন্ট নেই।');
      } else if (code === 'auth/invalid-email') {
        setError('সঠিক ইমেইল দিন।');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to send reset email.';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-12 pb-24">
      <div className="w-full max-w-md animate-fade-in-up">
        <Link to="/" className="mb-4 inline-block text-sm text-zeluxe-gray hover:text-zeluxe-black">
          ← হোম
        </Link>
        <img src={logo} alt="Zeluxe Gallery" className="mx-auto mb-6 h-20 object-contain" />

        <h1 className="text-center text-2xl font-bold text-zeluxe-black">পাসওয়ার্ড রিসেট করুন</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          আপনার ইমেইল দিন, আমরা রিসেট লিংক পাঠাব
        </p>

        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✓ রিসেট লিংক পাঠানো হয়েছে। আপনার ইমেইল চেক করুন।
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
              className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-zeluxe-black py-3 font-bold text-white transition hover:bg-[#2a2a2a] active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}
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
