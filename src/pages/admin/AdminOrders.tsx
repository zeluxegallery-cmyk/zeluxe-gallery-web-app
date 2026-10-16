import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { Eye, Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '../../components/AdminLayout';
import { db } from '../../firebase';

type Order = {
  id: string;
  orderId: string;
  customerName: string;
  resellerName: string;
  total: number;
  status: string;
  createdAt?: { seconds?: number };
};

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-gray-200 text-gray-800';
    case 'shipped':
      return 'bg-gray-200 text-gray-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'returned':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadData = useCallback(async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      setOrders(
        snapshot.docs.map((orderDoc) => {
          const data = orderDoc.data();
          return {
            id: orderDoc.id,
            orderId: typeof data.orderId === 'string' ? data.orderId : orderDoc.id,
            customerName: typeof data.customerName === 'string' ? data.customerName : 'Unknown',
            resellerName: typeof data.resellerName === 'string' ? data.resellerName : '—',
            total: typeof data.total === 'number' ? data.total : 0,
            status: typeof data.status === 'string' ? data.status : 'pending',
            createdAt: data.createdAt,
          };
        }),
      );
    } catch {
      // Fallback without orderBy if index missing
      const snapshot = await getDocs(collection(db, 'orders'));
      const sorted = [...snapshot.docs].sort((a, b) => {
        const aTime = a.data().createdAt?.seconds || 0;
        const bTime = b.data().createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setOrders(
        sorted.map((orderDoc) => {
          const data = orderDoc.data();
          return {
            id: orderDoc.id,
            orderId: typeof data.orderId === 'string' ? data.orderId : orderDoc.id,
            customerName: typeof data.customerName === 'string' ? data.customerName : 'Unknown',
            resellerName: typeof data.resellerName === 'string' ? data.resellerName : '—',
            total: typeof data.total === 'number' ? data.total : 0,
            status: typeof data.status === 'string' ? data.status : 'pending',
            createdAt: data.createdAt,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
      toast.success(`✓ অর্ডার স্ট্যাটাস "${newStatus}" এ আপডেট হয়েছে।`);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed.';
      toast.error(message);
    }
  };

  const handleDelete = async (order: Order) => {
    if (!window.confirm(`Delete order "${order.orderId}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'orders', order.id));
      toast.success(`✓ অর্ডার "${order.orderId}" ডিলিট হয়েছে।`);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.';
      toast.error(message);
    }
  };

  const filtered = orders.filter((order) => {
    const matchesSearch =
      order.orderId.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

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
      <h1 className="mb-6 text-2xl font-bold text-zeluxe-black">সব অর্ডার</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zeluxe-gray" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Order ID or customer..."
          className="w-full rounded-xl border border-zeluxe-lightgray bg-white py-2.5 pl-10 pr-4 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
        />
      </div>

      {/* Status filter */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition ${
              statusFilter === filter
                ? 'bg-zeluxe-black font-semibold text-white'
                : 'border border-zeluxe-lightgray text-zeluxe-gray hover:bg-zeluxe-fieldbg'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zeluxe-fieldbg">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Order ID</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Customer</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Reseller</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Total</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Status</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Date</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-b border-zeluxe-lightgray last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-zeluxe-black">{order.orderId}</td>
                <td className="px-4 py-3 text-zeluxe-black">{order.customerName}</td>
                <td className="px-4 py-3 text-zeluxe-gray">{order.resellerName}</td>
                <td className="px-4 py-3 font-bold text-zeluxe-gold">Tk {order.total.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className={`rounded-full px-2 py-1 text-xs font-bold capitalize border-0 focus:outline-none ${getStatusClass(order.status)}`}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status} className="bg-white text-zeluxe-black capitalize">
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-zeluxe-gray">{formatDate(order.createdAt?.seconds)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="rounded-lg p-1.5 text-zeluxe-gold transition hover:bg-zeluxe-fieldbg"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(order)}
                      className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((order) => (
          <div key={order.id} className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-zeluxe-gray">{order.orderId}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="rounded-lg p-1 text-zeluxe-gold"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(order)}
                  className="rounded-lg p-1 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 font-medium text-zeluxe-black">{order.customerName}</p>
            <p className="text-xs text-zeluxe-gray">{order.resellerName}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-bold text-zeluxe-gold">Tk {order.total.toLocaleString()}</span>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                className={`rounded-full px-2 py-1 text-xs font-bold capitalize border-0 focus:outline-none ${getStatusClass(order.status)}`}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status} className="bg-white text-zeluxe-black capitalize">
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-400">{formatDate(order.createdAt?.seconds)}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 rounded-xl bg-zeluxe-fieldbg p-8 text-center text-zeluxe-gray">
          No orders found.
        </div>
      )}
    </AdminLayout>
  );
}
