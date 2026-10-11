import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import logo from '../assets/zeluxe-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12 pb-24">
      <div className="max-w-md w-full animate-fade-in-up">
        <Link to="/" className="text-sm text-zeluxe-gray hover:text-zeluxe-black mb-4 inline-block">
          ← হোম
        </Link>
        <img src={logo} alt="Zeluxe Gallery" className="h-32 mx-auto mb-6 object-contain" />

        <h1 className="text-2xl font-bold text-black text-center">Welcome Back</h1>
        <p className="text-sm text-gray-500 text-center mt-2">Login to your reseller account / আপনার রিসেলার অ্যাকাউন্টে লগইন করুন</p>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 text-sm text-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 text-sm text-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zeluxe-black text-white font-bold py-3 rounded-xl mt-6 hover:bg-[#2a2a2a] transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'LOGIN'}
          </button>
        </form>

        <p className="text-center mt-4">
          <Link to="/register" className="text-sm text-zeluxe-gold font-semibold hover:underline">
            Create Reseller Account
          </Link>
        </p>

        <p className="text-xs text-gray-400 text-center mt-8">
          By continuing, you agree to our Terms &amp; Conditions.
        </p>
      </div>
    </div>
  );
}
