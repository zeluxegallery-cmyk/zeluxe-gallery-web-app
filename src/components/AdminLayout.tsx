import { useState, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { auth } from '../firebase';
import logo from '../assets/zeluxe-logo.png';

type NavItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { label: 'Overview', path: '/admin-dashboard', icon: LayoutDashboard },
  { label: 'Memberships', path: '/admin/memberships', icon: UserCheck },
  { label: 'Resellers', path: '/admin/resellers', icon: Users },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Categories', path: '/admin/categories', icon: FolderTree },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Withdrawals', path: '/admin/withdrawals', icon: Wallet },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { label: 'Notifications', path: '/admin/notifications', icon: Bell },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const activeItem = navItems.find((item) => isActive(item.path));

  return (
    <div className="min-h-screen bg-zeluxe-fieldbg">
      {/* Mobile header */}
      <header className="flex h-16 items-center justify-between border-b border-zeluxe-lightgray bg-white px-4 md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-lg p-2 text-zeluxe-black transition-colors hover:bg-zeluxe-fieldbg"
          aria-label="Open navigation"
        >
          <Menu className="h-6 w-6" />
        </button>
        <img src={logo} alt="Zeluxe Admin" className="h-12 object-contain" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zeluxe-gold text-sm font-bold text-white">
          A
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-zeluxe-lightgray bg-white transition-transform duration-200 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between md:block">
          <img src={logo} alt="Zeluxe Admin" className="mx-auto my-4 h-16 object-contain" />
          <button
            onClick={() => setIsOpen(false)}
            className="mr-4 rounded-lg p-2 text-zeluxe-gray hover:bg-zeluxe-fieldbg md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3" aria-label="Admin navigation">
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
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="min-h-screen md:ml-60">
        {/* Desktop topbar */}
        <header className="hidden items-center justify-between border-b border-zeluxe-lightgray bg-white px-8 py-4 md:flex">
          <h1 className="text-lg font-bold text-zeluxe-black">{activeItem?.label || 'Admin'}</h1>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zeluxe-gold text-sm font-bold text-white">
            A
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 pb-20 md:p-8 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
