import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Clock } from 'lucide-react';
import logo from '../assets/zeluxe-logo.png';

export default function Pending() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="bg-zeluxe-fieldbg rounded-2xl p-8 max-w-md w-full text-center animate-fade-in-up">
        <img src={logo} alt="Zeluxe Gallery" className="h-32 mx-auto mb-6 object-contain" />
        <div className="flex justify-center">
          <Clock className="w-12 h-12 text-zeluxe-gold" />
        </div>

        <h1 className="text-2xl font-bold text-black mt-4">Membership Under Review</h1>
        <p className="text-gray-500 mt-2">
          Your payment is being verified by admin. You'll get access once approved.
        </p>

        <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold mt-4">
          STATUS: PENDING
        </span>

        <button
          onClick={() => navigate('/membership')}
          className="w-full mt-6 border border-zeluxe-gold text-zeluxe-gold font-bold py-3 rounded-xl hover:bg-zeluxe-gold/5 transition-all active:scale-[0.98]"
        >
          View Membership Details
        </button>

        <button
          onClick={handleLogout}
          className="w-full mt-3 bg-zeluxe-black text-white font-bold py-3 rounded-xl hover:bg-[#2a2a2a] transition-all active:scale-[0.98]"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
