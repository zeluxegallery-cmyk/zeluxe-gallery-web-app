import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Copy, Check } from 'lucide-react';
import logo from '../assets/zeluxe-logo.png';

export default function Membership() {
  const navigate = useNavigate();
  const [transactionId, setTransactionId] = useState('');
  const [senderMobile, setSenderMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
    }
  }, [navigate]);

  const paymentNumber = '01603-226151';

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    if (!transactionId.trim() || !senderMobile.trim()) {
      setError('Please fill in both the Transaction ID and Sender Mobile Number.');
      return;
    }

    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const userName = userData.name || '';
      const userPhone = userData.phone || '';

      await setDoc(doc(db, 'membershipRequests', user.uid), {
        uid: user.uid,
        name: userName,
        phone: userPhone,
        email: user.email,
        transactionId: transactionId.trim(),
        senderMobile: senderMobile.trim(),
        amount: 99,
        paymentNumber: paymentNumber,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'users', user.uid), {
        membershipStatus: 'pending',
      });

      navigate('/pending');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit membership request. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full mx-auto animate-fade-in-up">
        <img src={logo} alt="Zeluxe Gallery" className="h-32 mx-auto mb-6 object-contain" />
        <h1 className="text-2xl font-bold text-black text-center">Membership</h1>
        <p className="text-sm text-gray-500 text-center mt-1">Reseller Subscription</p>

        <div className="text-center mt-8">
          <p className="text-5xl font-bold text-zeluxe-gold">৳99</p>
          <p className="text-sm text-gray-500 mt-2">One-time Membership Fee</p>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-fade-in">
            {error}
          </div>
        )}

        {/* Payment card */}
        <div className="bg-zeluxe-fieldbg rounded-xl p-5 mt-8">
          <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">PAYMENT NUMBER</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-black">{paymentNumber}</p>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-zeluxe-lightgray transition-colors"
              aria-label="Copy number"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-zeluxe-gray" />
              )}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Pay ৳99 via bKash/Nagad to the number above, then submit the transaction details below.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Transaction ID</label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 text-sm text-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="e.g. 8N7K3M2X"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1.5">Sender Mobile Number</label>
            <input
              type="tel"
              value={senderMobile}
              onChange={(e) => setSenderMobile(e.target.value)}
              className="w-full bg-zeluxe-fieldbg border border-zeluxe-lightgray rounded-xl px-4 py-3 text-sm text-black placeholder:text-zeluxe-gray focus:outline-none focus:border-zeluxe-gold focus:ring-1 focus:ring-zeluxe-gold transition-colors"
              placeholder="01XXXXXXXXX"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zeluxe-black text-zeluxe-gold font-bold py-3 rounded-xl mt-6 hover:bg-[#2a2a2a] transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'SUBMIT MEMBERSHIP REQUEST'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Your payment will be manually verified by admin.
        </p>
      </div>
    </div>
  );
}
