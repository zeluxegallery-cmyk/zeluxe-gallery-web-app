import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ShoppingBag } from 'lucide-react';
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
const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 20;

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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'অপেক্ষমাণ',
    confirmed: 'কনফার্মড',
    shipped: 'শিপড',
    delivered: 'ডেলিভারড',
    cancelled: 'বাতিল',
    returned: 'ফেরত',
    all: 'সব'
  };
  return labels[status.toLowerCase()] || status;
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
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

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

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [activeFilter]);

  const filteredOrders =
    activeFilter === 'All'
      ? orders
      : orders.filter((order) => order.status.toLowerCase() === activeFilter.toLowerCase());

  const displayedOrders = filteredOrders.slice(0, visibleCount);

  return (
    // ═══ <Layout> সরিয়ে সরাসরি div দিয়ে শুরু করা হয়েছে ═══
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="text-2xl font-bold text-zeluxe-black">আমার অর্ডার</h1>
      <p className="mb-6 text-sm text-gray-600">আপনার সব অর্ডারের তালিকা</p>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
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
            {getStatusLabel(filter)}
          </button>
        ))}
      </div>

      {/* ═══ SKELETON LOADING ═══ */}
      {loading ? (
        <div className="space-y-4">
          {/* Desktop Table Skeleton */}
          <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
            <div className="bg-zeluxe-fieldbg px-4 py-3">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-300"></div>
            </div>
            <div className="divide-y divide-zeluxe-lightgray">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-4 animate-pulse">
                  <div className="h-4 w-24 rounded bg-gray-200"></div>
                  <div className="h-4 w-32 rounded bg-gray-200"></div>
                  <div className="h-4 w-24 rounded bg-gray-200"></div>
                  <div className="h-4 w-16 rounded bg-gray-200"></div>
                  <div className="h-6 w-20 rounded-full bg-gray-200"></div>
                </div>
              ))}
            </div>
          </div>
          {/* Mobile Card Skeleton */}
          <div className="space-y-3 md:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zeluxe-lightgray bg-white p-4 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 w-20 rounded bg-gray-200"></div>
                  <div className="h-5 w-16 rounded-full bg-gray-200"></div>
                </div>
                <div className="mt-3 h-5 w-1/2 rounded bg-gray-200"></div>
                <div className="mt-3 flex justify-between">
                  <div className="h-4 w-24 rounded bg-gray-200"></div>
                  <div className="h-4 w-16 rounded bg-gray-200"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : displayedOrders.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zeluxe-fieldbg">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">অর্ডার আইডি</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">কাস্টমার</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">তারিখ</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">মোট বিল</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-zeluxe-gray">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((order) => (
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
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {displayedOrders.map((order) => (
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
                    {getStatusLabel(order.status)}
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

          {/* ═══ LOAD MORE BUTTON ═══ */}
          {visibleCount < filteredOrders.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
                className="rounded-xl border border-zeluxe-black bg-white px-8 py-3 text-sm font-bold text-zeluxe-black transition hover:bg-gray-50 active:scale-95"
              >
                আরো অর্ডার দেখুন (Load More)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-zeluxe-gray" />
          <p className="mt-4 font-medium text-gray-600">এখনো কোনো অর্ডার নেই।</p>
          <p className="mt-1 text-xs text-gray-500">প্রথম অর্ডার তৈরি করে ব্যবসা শুরু করুন!</p>
          <button
            onClick={() => navigate('/orders/new')}
            className="mt-4 rounded-xl bg-zeluxe-black px-6 py-3 font-bold text-white transition hover:bg-[#2a2a2a]"
          >
            নতুন অর্ডার করুন
          </button>
        </div>
      )}
    </div>
  );
}