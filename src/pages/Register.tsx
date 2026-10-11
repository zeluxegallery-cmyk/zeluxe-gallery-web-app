import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import logo from '../assets/zeluxe-logo.png';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agree) {
      setError('You must agree to the Terms & Conditions.');
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
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

        <h1 className="text-2xl font-bold text-black text-center">Create Reseller Account</h1>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 text-sm text-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Mobile Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 text-sm text-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="01XXXXXXXXX"
            />
          </div>

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
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 text-sm text-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="Re-enter your password"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="w-4 h-4 rounded border-zeluxe-lightgray text-zeluxe-gold focus:ring-zeluxe-gold"
            />
            <span className="text-sm text-black">I agree to Terms &amp; Conditions</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zeluxe-black text-white font-bold py-3 rounded-xl mt-6 hover:bg-[#2a2a2a] transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-center mt-4">
          <Link to="/login" className="text-sm text-zeluxe-gold font-semibold hover:underline">
            Already have an account? Login
          </Link>
        </p>
      </div>
    </div>
  );
}
