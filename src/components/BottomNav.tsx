import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Plus, ShoppingBag, User } from 'lucide-react';

type NavEntry = {
  label: string;
  path: string;
  icon: typeof Home;
  elevated?: boolean;
};

const items: NavEntry[] = [
  { label: 'Home', path: '/reseller-dashboard', icon: Home },
  { label: 'Products', path: '/products', icon: Package },
  { label: '', path: '/orders/new', icon: Plus, elevated: true },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Profile', path: '/profile', icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  // /products/123 এ গেলেও "Products" ট্যাব জ্বলে থাকবে
  const isActive = (path: string) => {
    const current = location.pathname;
    if (path === '/orders') {
      return current === '/orders' || (current.startsWith('/orders/') && current !== '/orders/new');
    }
    return current === path || current.startsWith(`${path}/`);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 grid h-16 grid-cols-5 border-t border-zeluxe-lightgray bg-white/95 backdrop-blur-md shadow-[0_-4px_25px_rgba(0,0,0,0.1)] md:hidden pb-[env(safe-area-inset-bottom)]">
      {items.map(({ label, path, icon: Icon, elevated }) => {
        const active = isActive(path);

        if (elevated) {
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center relative"
              aria-label="New order"
            >
              <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-zeluxe-gold text-zeluxe-black shadow-xl transition transform active:scale-95">
                <Icon size={26} />
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
              active ? 'text-zeluxe-gold font-bold' : 'text-gray-400 hover:text-zeluxe-black'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] tracking-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

