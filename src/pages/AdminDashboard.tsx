import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Clock, Loader2, Package, ShoppingBag, UserCheck, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { db } from '../firebase';

type Stats = {
  totalResellers: number;
  pendingMemberships: number;
  activeResellers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
};

const initialStats: Stats = {
  totalResellers: 0,
  pendingMemberships: 0,
  activeResellers: 0,
  totalProducts: 0,
  totalOrders: 0,
  pendingOrders: 0,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersSnap, pendingMembershipsSnap, productsSnap, ordersSnap, pendingOrdersSnap] =
          await Promise.all([
            getDocs(query(collection(db, 'users'), where('role', '==', 'reseller'))),
            getDocs(query(collection(db, 'membershipRequests'), where('status', '==', 'pending'))),
            getDocs(query(collection(db, 'products'))),
            getDocs(query(collection(db, 'orders'))),
            getDocs(query(collection(db, 'orders'), where('status', '==', 'pending'))),
          ]);

        const totalResellers = usersSnap.size;
        const activeResellers = usersSnap.docs.filter(
          (userDoc) => userDoc.data().accountStatus === 'active',
        ).length;

        setStats({
          totalResellers,
          pendingMemberships: pendingMembershipsSnap.size,
          activeResellers,
          totalProducts: productsSnap.size,
          totalOrders: ordersSnap.size,
          pendingOrders: pendingOrdersSnap.size,
        });
      } finally {
        setLoading(false);
      }
    };

    void loadStats();
  }, []);

  const cards = [
    { label: 'Total Resellers', value: stats.totalResellers, icon: Users },
    { label: 'Pending Memberships', value: stats.pendingMemberships, icon: Clock },
    { label: 'Active Resellers', value: stats.activeResellers, icon: UserCheck },
    { label: 'Total Products', value: stats.totalProducts, icon: Package },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock },
  ];

  if (loading) {
    return (
      <Layout isAdmin>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading admin dashboard" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout isAdmin>
      <h1 className="text-2xl font-bold text-zeluxe-black">Admin Overview</h1>
      <p className="mb-6 text-sm text-gray-600">Manage resellers and memberships</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
            <Icon className="h-5 w-5 text-zeluxe-gold" />
            <p className="mt-3 text-xs font-semibold uppercase text-zeluxe-gray">{label}</p>
            <p className="mt-1 text-2xl font-bold text-zeluxe-black">{value}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/admin/memberships')}
        className="mt-6 rounded-xl bg-zeluxe-black px-6 py-3 font-bold text-zeluxe-gold transition hover:bg-[#2a2a2a]"
      >
        Review Membership Requests →
      </button>
    </Layout>
  );
}
