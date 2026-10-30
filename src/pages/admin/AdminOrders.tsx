import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Eye, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../firebase';

type Order = {
  id: string;
  orderId: string;
  customerName: string;
  resellerName: string;
  size?: string | null;
  total: number;
  status: string;
  createdAt?: { seconds?: number };
  stockDeducted?: boolean;
};

const STATUS_FILTERS = [
  'All',
  'Pending',
  'Confirmed',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Returned',
];

const STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 20;

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
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      let snapshot;

      try {
        snapshot = await getDocs(
          query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
        );
      } catch {
        snapshot = await getDocs(collection(db, 'orders'));
      }

      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const aTime = a.data().createdAt?.seconds || 0;
        const bTime = b.data().createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setOrders(
        sortedDocs.map((orderDoc) => {
          const data = orderDoc.data();

          return {
            id: orderDoc.id,
            orderId:
              typeof data.orderId === 'string'
                ? data.orderId
                : orderDoc.id,
            customerName:
              typeof data.customerName === 'string'
                ? data.customerName
                : 'Unknown',
            resellerName:
              typeof data.resellerName === 'string'
                ? data.resellerName
                : '—',
            size: typeof data.size === 'string' ? data.size : null,
            total: typeof data.total === 'number' ? data.total : 0,
            status:
              typeof data.status === 'string'
                ? data.status
                : 'pending',
            createdAt: data.createdAt,
            stockDeducted: data.stockDeducted === true,
          };
        }),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'অর্ডার লোড করা যায়নি।';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [search, statusFilter]);

  /**
   * Delivered হলে transaction-এর মাধ্যমে স্টক কমানো হয়।
   * stockDeducted ফিল্ড একই অর্ডারে দ্বিতীয়বার স্টক কমানো আটকায়।
   * deliveredAt ফিল্ড প্রথমবার Delivered হওয়ার সময় সংরক্ষণ করে।
   */
  const handleStatusChange = async (
    id: string,
    newStatus: string,
  ) => {
    const orderRef = doc(db, 'orders', id);
    const isDelivering = newStatus.toLowerCase() === 'delivered';

    try {
      await runTransaction(db, async (transaction) => {
        // প্রথমে অর্ডার পড়তে হবে।
        const orderSnapshot = await transaction.get(orderRef);

        if (!orderSnapshot.exists()) {
          throw new Error('অর্ডারটি পাওয়া যায়নি।');
        }

        const orderData = orderSnapshot.data();
        const currentStatus = String(orderData.status || 'pending')
          .toLowerCase();

        // একই অর্ডারের স্টক আগেই কমানো হলে আর কমানো যাবে না।
        if (orderData.stockDeducted === true) {
          if (currentStatus === 'delivered' && isDelivering) {
            return;
          }

          if (currentStatus === 'delivered' && !isDelivering) {
            throw new Error(
              'ডেলিভারি সম্পন্ন অর্ডারের স্ট্যাটাস সরাসরি পরিবর্তন করা যাবে না। স্টক সমন্বয়ের জন্য আলাদা ব্যবস্থা প্রয়োজন।',
            );
          }

          throw new Error(
            'এই অর্ডারের স্টক আগেই সমন্বয় করা হয়েছে।',
          );
        }

        // আগের সংস্করণে তৈরি delivered অর্ডারে stockDeducted
        // না থাকলে অন্ধভাবে আবার স্টক কমানো হবে না।
        if (currentStatus === 'delivered') {
          if (isDelivering) {
            return;
          }

          throw new Error(
            'এই অর্ডার আগে থেকেই Delivered। স্টক যাচাই না করে স্ট্যাটাস পরিবর্তন করা যাবে না।',
          );
        }

        // Delivered ছাড়া অন্য স্ট্যাটাস হলে শুধু স্ট্যাটাস আপডেট।
        if (!isDelivering) {
          transaction.update(orderRef, {
            status: newStatus,
          });

          return;
        }

        type StockItem = {
          productId: string;
          quantity: number;
        };

        const stockItems: StockItem[] = [];

        // নতুন অর্ডারের items array ব্যবহার করা হবে।
        if (
          Array.isArray(orderData.items) &&
          orderData.items.length > 0
        ) {
          for (const item of orderData.items) {
            const productId = item?.productId;
            const quantity = Number(item?.quantity);

            if (
              typeof productId !== 'string' ||
              productId.trim() === '' ||
              !Number.isInteger(quantity) ||
              quantity <= 0
            ) {
              throw new Error(
                'অর্ডারের পণ্যের ID বা quantity সঠিক নয়। স্টক পরিবর্তন করা হয়নি।',
              );
            }

            stockItems.push({ productId, quantity });
          }
        } else {
          // পুরোনো single-product অর্ডারের জন্য fallback।
          const productId = orderData.productId;
          const quantity = Number(orderData.quantity);

          if (
            typeof productId !== 'string' ||
            productId.trim() === '' ||
            !Number.isInteger(quantity) ||
            quantity <= 0
          ) {
            throw new Error(
              'অর্ডারে পণ্যের ID বা quantity পাওয়া যায়নি। স্টক পরিবর্তন করা হয়নি।',
            );
          }

          stockItems.push({ productId, quantity });
        }

        // একই productId একাধিকবার থাকলে quantity একত্র করা।
        const quantityByProduct = new Map<string, number>();

        for (const item of stockItems) {
          quantityByProduct.set(
            item.productId,
            (quantityByProduct.get(item.productId) || 0) +
              item.quantity,
          );
        }

        // Transaction-এ সব product document আগে পড়তে হবে,
        // তারপরেই কোনো write করা যাবে।
        const productsToUpdate: Array<{
          ref: ReturnType<typeof doc>;
          stock: number;
          quantity: number;
        }> = [];

        for (const [productId, quantity] of quantityByProduct) {
          const productRef = doc(db, 'products', productId);
          const productSnapshot = await transaction.get(productRef);

          if (!productSnapshot.exists()) {
            throw new Error(
              `পণ্য পাওয়া যায়নি (ID: ${productId})। স্টক পরিবর্তন করা হয়নি।`,
            );
          }

          const productData = productSnapshot.data();
          const currentStock = productData.stock;

          if (
            typeof currentStock !== 'number' ||
            !Number.isFinite(currentStock) ||
            currentStock < 0
          ) {
            throw new Error(
              `পণ্যের স্টক সঠিকভাবে সেট করা নেই (ID: ${productId})।`,
            );
          }

          if (currentStock < quantity) {
            throw new Error(
              `পণ্যের স্টক অপর্যাপ্ত (ID: ${productId})। বর্তমান স্টক: ${currentStock}, প্রয়োজন: ${quantity}।`,
            );
          }

          productsToUpdate.push({
            ref: productRef,
            stock: currentStock,
            quantity,
          });
        }

        // সব পণ্যের স্টক যাচাই সম্পন্ন হওয়ার পর write শুরু।
        for (const product of productsToUpdate) {
          transaction.update(product.ref, {
            stock: product.stock - product.quantity,
          });
        }

        // স্টক এবং অর্ডার একই transaction-এ আপডেট হবে।
        transaction.update(orderRef, {
          status: newStatus,

          // প্রথমবার Delivered হওয়ার সার্ভার টাইম।
          deliveredAt: serverTimestamp(),

          stockDeducted: true,
          stockDeductedAt: serverTimestamp(),
        });
      });

      toast.success(
        `✓ অর্ডার স্ট্যাটাস "${newStatus}" এ আপডেট হয়েছে।`,
      );

      await loadData();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'অর্ডার আপডেট করা যায়নি।';

      toast.error(message);
    }
  };

  const handleDelete = async (order: Order) => {
    // Delivered অর্ডার ডিলিট করলে স্টক অডিটের রেকর্ড হারাতে পারে।
    if (order.status.toLowerCase() === 'delivered') {
      toast.error(
        'Delivered অর্ডার সরাসরি ডিলিট করা যাবে না।',
      );
      return;
    }

    if (
      !window.confirm(
        `Delete order "${order.orderId}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'orders', order.id));

      toast.success(`✓ অর্ডার "${order.orderId}" ডিলিট হয়েছে।`);

      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Delete failed.';

      toast.error(message);
    }
  };

  const filtered = orders.filter((order) => {
    const matchesSearch =
      order.orderId.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      order.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const displayedOrders = filtered.slice(0, visibleCount);

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zeluxe-black">
          সব অর্ডার
        </h1>

        <span className="rounded-full bg-zeluxe-gold/20 px-3 py-1 text-sm font-bold text-zeluxe-black">
          {filtered.length} Orders
        </span>
      </div>

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
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
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

      {/* Loading UI */}
      {loading ? (
        <div className="space-y-4">
          <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
            <div className="bg-zeluxe-fieldbg px-4 py-3">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-300" />
            </div>

            <div className="divide-y divide-zeluxe-lightgray">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex animate-pulse items-center justify-between px-4 py-4"
                >
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-6 w-16 rounded-full bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-zeluxe-lightgray bg-white p-4"
              >
                <div className="flex justify-between">
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-10 rounded bg-gray-200" />
                </div>

                <div className="mt-3 h-5 w-1/2 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ) : displayedOrders.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zeluxe-fieldbg">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">
                    Reseller
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {displayedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-zeluxe-lightgray last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-zeluxe-black">
                        {order.orderId}
                      </div>

                      {order.size && (
                        <div className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                          Size: {order.size}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-zeluxe-black">
                      {order.customerName}
                    </td>

                    <td className="px-4 py-3 text-zeluxe-gray">
                      {order.resellerName}
                    </td>

                    <td className="px-4 py-3 font-bold text-zeluxe-gold">
                      Tk {order.total.toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value)
                        }
                        className={`rounded-full border-0 px-2 py-1 text-xs font-bold capitalize focus:outline-none ${getStatusClass(order.status)}`}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option
                            key={status}
                            value={status}
                            className="bg-white capitalize text-zeluxe-black"
                          >
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3 text-zeluxe-gray">
                      {formatDate(order.createdAt?.seconds)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="rounded-lg p-1.5 text-zeluxe-gold transition hover:bg-zeluxe-fieldbg"
                          aria-label="View order"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(order)}
                          className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                          aria-label="Delete order"
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
            {displayedOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-zeluxe-lightgray bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-zeluxe-gray">
                      {order.orderId}
                    </p>

                    {order.size && (
                      <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                        Size: {order.size}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="rounded-lg p-1 text-zeluxe-gold"
                      aria-label="View order"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(order)}
                      className="rounded-lg p-1 text-red-600"
                      aria-label="Delete order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-2 font-medium text-zeluxe-black">
                  {order.customerName}
                </p>

                <p className="text-xs text-zeluxe-gray">
                  {order.resellerName}
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <span className="font-bold text-zeluxe-gold">
                    Tk {order.total.toLocaleString()}
                  </span>

                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(order.id, e.target.value)
                    }
                    className={`rounded-full border-0 px-2 py-1 text-xs font-bold capitalize focus:outline-none ${getStatusClass(order.status)}`}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option
                        key={status}
                        value={status}
                        className="bg-white capitalize text-zeluxe-black"
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  {formatDate(order.createdAt?.seconds)}
                </p>
              </div>
            ))}
          </div>

          {/* Load More */}
          {visibleCount < filtered.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() =>
                  setVisibleCount((prev) => prev + LOAD_MORE_COUNT)
                }
                className="rounded-xl border border-zeluxe-black bg-white px-8 py-3 text-sm font-bold text-zeluxe-black transition hover:bg-gray-50 active:scale-95"
              >
                আরো অর্ডার দেখুন (Load More)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-xl bg-zeluxe-fieldbg p-8 text-center text-zeluxe-gray">
          No orders found.
        </div>
      )}
    </div>
  );
}
