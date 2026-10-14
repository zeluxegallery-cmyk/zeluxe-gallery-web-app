import { useState, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  TrendingUp,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { auth } from '../firebase';
import BottomNav from './BottomNav';
import LogoutModal from './LogoutModal';
import logo from '../assets/zeluxe-logo.png';

type LayoutProps = {
  children: ReactNode;
  isAdmin?: boolean;
};

type NavItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
};

const resellerNav: NavItem[] = [
  { label: 'Dashboard', path: '/reseller-dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'My Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Earnings', path: '/earnings', icon: TrendingUp },
  { label: 'টাকা তুলুন', path: '/withdraw', icon: Wallet },
  { label: 'Profile', path: '/profile', icon: User },
];

const adminNav: NavItem[] = [
  { label: 'Admin Overview', path: '/admin-dashboard', icon: LayoutDashboard },
  { label: 'Memberships', path: '/admin/memberships', icon: User },
];

export default function Layout({ children, isAdmin = false }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const navItems = isAdmin ? adminNav : resellerNav;

  const confirmLogout = async () => {
    setShowLogout(false);
    await signOut(auth);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-zeluxe-cream">
      <header className="flex h-16 items-center justify-between border-b border-zeluxe-lightgray bg-white px-4 md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-zeluxe-black transition-colors hover:bg-zeluxe-fieldbg"
          aria-label="Open navigation"
        >
          <Menu className="h-6 w-6" />
        </button>
        <img src={logo} alt="Zeluxe Gallery Reseller" className="h-12 object-contain" />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zeluxe-black text-sm font-bold text-zeluxe-gold">
          {auth.currentUser?.displayName?.charAt(0).toUpperCase() || auth.currentUser?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
      </header>

      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-zeluxe-lightgray bg-white transition-transform duration-200 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between md:block">
          <img src={logo} alt="Zeluxe Gallery Reseller" className="h-20 mx-auto my-4 object-contain" />
          <button
            onClick={() => setIsOpen(false)}
            className="mr-4 rounded-lg p-2 text-zeluxe-gray hover:bg-zeluxe-fieldbg md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3" aria-label="Main navigation">
          {navItems.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive(path)
                  ? 'bg-zeluxe-black text-white'
                  : 'text-zeluxe-gray hover:bg-zeluxe-fieldbg hover:text-zeluxe-black'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive(path) ? 'text-zeluxe-gold' : ''}`} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-zeluxe-lightgray p-3">
          <button
            onClick={() => {
              setIsOpen(false);
              setShowLogout(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-h-screen md:ml-60">
        <div className="mx-auto max-w-7xl p-5 pb-20 md:p-8 md:pb-8">{children}</div>
      </main>

      <BottomNav />

      {/* Custom Logout Modal */}
      <LogoutModal
        isOpen={showLogout}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogout(false)}
      />
    </div>
  );
}
