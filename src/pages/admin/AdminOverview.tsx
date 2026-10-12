import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  Bell,
  Clock,
  FolderTree,
  Loader2,
  Package,
  ShoppingBag,
  UserCheck,
  Users,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { db } from '../../firebase';

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

type RecentOrder = {
  id: string;
  customerName: string;
  total: number;
  status: string;
};

type RecentUser = {
  id: string;
  name: string;
  email: string;
  accountStatus: string;
};

type RecentRequest = {
  id: string;
  name: string;
  email: string;
  status: string;
};

const quickLinks = [
  { label: 'Memberships', path: '/admin/memberships', icon: UserCheck },
  { label: 'Resellers', path: '/admin/resellers', icon: Users },
  { label: 'Products', path: '/admin/products', icon: Package },
  { label: 'Categories', path: '/admin/categories', icon: FolderTree },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Notifications', path: '/admin/notifications', icon: Bell },
];

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
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

        const sortedOrders = usersSnap ? [...ordersSnap.docs].sort((a, b) => {
          const aTime = a.data().createdAt?.seconds || 0;
          const bTime = b.data().createdAt?.seconds || 0;
          return bTime - aTime;
        }) : [];
        setRecentOrders(
          sortedOrders.slice(0, 5).map((orderDoc) => {
            const data = orderDoc.data();
            return {
              id: orderDoc.id,
              customerName: typeof data.customerName === 'string' ? data.customerName : 'Unknown',
              total: typeof data.total === 'number' ? data.total : 0,
              status: typeof data.status === 'string' ? data.status : 'pending',
            };
          }),
        );

        const sortedUsers = [...usersSnap.docs].sort((a, b) => {
          const aTime = a.data().createdAt?.seconds || 0;
          const bTime = b.data().createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setRecentUsers(
          sortedUsers.slice(0, 5).map((userDoc) => {
            const data = userDoc.data();
            return {
              id: userDoc.id,
              name: typeof data.name === 'string' ? data.name : 'Unknown',
              email: typeof data.email === 'string' ? data.email : '—',
              accountStatus: typeof data.accountStatus === 'string' ? data.accountStatus : 'pending',
            };
          }),
        );

        const reqSorted = [...pendingMembershipsSnap.docs].sort((a, b) => {
          const aTime = a.data().createdAt?.seconds || 0;
          const bTime = b.data().createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setRecentRequests(
          reqSorted.slice(0, 5).map((reqDoc) => {
            const data = reqDoc.data();
            return {
              id: reqDoc.id,
              name: typeof data.name === 'string' ? data.name : 'Unknown',
              email: typeof data.email === 'string' ? data.email : '—',
              status: typeof data.status === 'string' ? data.status : 'pending',
            };
          }),
        );
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
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
      <AdminLayout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-zeluxe-black">Admin Overview</h1>
      <p className="mb-6 text-sm text-gray-600">Manage resellers and memberships</p>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
            <Icon className="h-5 w-5 text-zeluxe-gold" />
            <p className="mt-3 text-xs font-semibold uppercase text-zeluxe-gray">{label}</p>
            <p className="mt-1 text-2xl font-bold text-zeluxe-black">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Quick Links</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {quickLinks.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className="flex flex-col items-center gap-2 rounded-xl border border-zeluxe-lightgray bg-white p-4 transition hover:bg-zeluxe-fieldbg active:scale-[0.97]"
          >
            <Icon className="text-zeluxe-gold" size={22} />
            <span className="text-xs font-medium text-zeluxe-black">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <h2 className="mb-4 text-lg font-bold text-zeluxe-black">Recent Activity</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-xl border border-zeluxe-lightgray bg-white">
          <h3 className="border-b p-4 text-sm font-bold text-zeluxe-black">Recent Orders</h3>
          <div className="divide-y divide-zeluxe-lightgray">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-zeluxe-black">{order.customerName}</p>
                    <p className="text-xs capitalize text-zeluxe-gray">{order.status}</p>
                  </div>
                  <p className="text-sm font-bold text-zeluxe-gold">৳{order.total.toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-zeluxe-gray">No orders yet.</p>
            )}
          </div>
        </div>

        {/* Recent membership requests */}
        <div className="rounded-xl border border-zeluxe-lightgray bg-white">
          <h3 className="border-b p-4 text-sm font-bold text-zeluxe-black">Membership Requests</h3>
          <div className="divide-y divide-zeluxe-lightgray">
            {recentRequests.length > 0 ? (
              recentRequests.map((req) => (
                <div key={req.id} className="p-4">
                  <p className="text-sm font-medium text-zeluxe-black">{req.name}</p>
                  <p className="text-xs text-zeluxe-gray">{req.email}</p>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-zeluxe-gray">No pending requests.</p>
            )}
          </div>
        </div>

        {/* Recent users */}
        <div className="rounded-xl border border-zeluxe-lightgray bg-white">
          <h3 className="border-b p-4 text-sm font-bold text-zeluxe-black">New Resellers</h3>
          <div className="divide-y divide-zeluxe-lightgray">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div key={user.id} className="p-4">
                  <p className="text-sm font-medium text-zeluxe-black">{user.name}</p>
                  <p className="text-xs capitalize text-zeluxe-gray">{user.accountStatus}</p>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-zeluxe-gray">No resellers yet.</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
