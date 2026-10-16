import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Loader2, ShoppingBag } from 'lucide-react';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';

type Order = {
  id: string;
  orderId: string;
  customerName: string;
  total: number;
  status: string;
  createdAt?: { seconds?: number };
};

const STATUS_FILTERS = ['All', 'Pending', 'Shipped', 'Delivered', 'Cancelled'];

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'shipped':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const ordersQuery = query(collection(db, 'orders'), where('resellerId', '==', uid));
        const snapshot = await getDocs(ordersQuery);
        const sorted = snapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.seconds || 0;
          const bTime = b.data().createdAt?.seconds || 0;
          return bTime - aTime;
        });
        const fetchedOrders: Order[] = sorted.map((orderDocument) => {
          const data = orderDocument.data();
          return {
            id: orderDocument.id,
            orderId: typeof data.orderId === 'string' ? data.orderId : orderDocument.id,
            customerName: typeof data.customerName === 'string' ? data.customerName : 'Unknown',
            total: typeof data.total === 'number' ? data.total : 0,
            status: typeof data.status === 'string' ? data.status : 'pending',
            createdAt: data.createdAt,
          };
        });
        setOrders(fetchedOrders);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, []);

  const filteredOrders =
    activeFilter === 'All'
      ? orders
      : orders.filter((order) => order.status.toLowerCase() === activeFilter.toLowerCase());

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-zeluxe-black">My Orders</h1>
      <p className="mb-6 text-sm text-gray-600">Track all your customer orders</p>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition ${
              activeFilter === filter
                ? 'bg-zeluxe-black font-semibold text-white'
                : 'border border-zeluxe-lightgray text-zeluxe-gray hover:bg-zeluxe-fieldbg'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading orders" />
        </div>
      ) : filteredOrders.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zeluxe-fieldbg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="cursor-pointer border-b border-zeluxe-lightgray transition hover:bg-zeluxe-fieldbg last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-zeluxe-black">{order.orderId}</td>
                    <td className="px-4 py-3 text-zeluxe-black">{order.customerName}</td>
                    <td className="px-4 py-3 text-zeluxe-gray">{formatDate(order.createdAt?.seconds)}</td>
                    <td className="px-4 py-3 font-bold text-zeluxe-gold">Tk {order.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-bold capitalize ${getStatusClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="mb-3 cursor-pointer rounded-xl border border-zeluxe-lightgray bg-white p-4 transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-zeluxe-gray">{order.orderId}</p>
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-bold capitalize ${getStatusClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 font-bold text-zeluxe-black">{order.customerName}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{formatDate(order.createdAt?.seconds)}</span>
                  <span className="font-bold text-zeluxe-gold">Tk {order.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-zeluxe-gray" />
          <p className="mt-4 text-gray-600">No orders yet. Create your first order!</p>
          <button
            onClick={() => navigate('/orders/new')}
            className="mt-4 rounded-xl bg-zeluxe-black px-6 py-3 font-bold text-white transition hover:bg-[#2a2a2a]"
          >
            Create Order
          </button>
        </div>
      )}
    </Layout>
  );
}
