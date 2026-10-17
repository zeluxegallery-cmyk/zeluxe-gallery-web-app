import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Plus, ShoppingBag, User } from 'lucide-react';

type NavEntry = {
  label: string;
  path: string;
  icon: typeof Home;
  elevated?: boolean;
};

const items: NavEntry[] = [
  { label: 'হোম', path: '/reseller-dashboard', icon: Home },
  { label: 'প্রোডাক্ট', path: '/products', icon: Package },
  { label: '', path: '/orders/new', icon: Plus, elevated: true },
  { label: 'অর্ডার', path: '/orders', icon: ShoppingBag },
  { label: 'প্রোফাইল', path: '/profile', icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-zeluxe-lightgray bg-white md:hidden">
      {items.map(({ label, path, icon: Icon, elevated }) => {
        const active = isActive(path);

        if (elevated) {
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center"
              aria-label="New order"
            >
              <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-zeluxe-gold text-white shadow-lg">
                <Icon size={24} />
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
              active ? 'text-zeluxe-gold' : 'text-zeluxe-gray'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}