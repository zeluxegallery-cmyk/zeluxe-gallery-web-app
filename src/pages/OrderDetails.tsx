import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Loader2, Link as LinkIcon } from 'lucide-react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase';

type OrderItem = {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  sellingPrice: number;
};

type OrderData = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  district: string;
  productId?: string;
  productName?: string;
  size?: string | null;
  quantity?: number;
  sellingPrice?: number;
  items?: OrderItem[]; // নতুন মাল্টিপল আইটেম
  deliveryCharge: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  note?: string;
  createdAt?: { seconds?: number };
};

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'shipped': return 'bg-purple-100 text-purple-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(seconds?: number) {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) { setLoading(false); return; }

      try {
        const user = auth.currentUser;
        if (user) {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (adminDoc.exists() || (userDoc.exists() && userDoc.data().role === 'admin')) setIsAdmin(true);
        }

        const orderDoc = await getDoc(doc(db, 'orders', id));
        if (orderDoc.exists()) {
          const data = orderDoc.data();
          
          setOrder({
            orderId: typeof data.orderId === 'string' ? data.orderId : orderDoc.id,
            customerName: typeof data.customerName === 'string' ? data.customerName : 'Unknown',
            customerPhone: typeof data.customerPhone === 'string' ? data.customerPhone : '—',
            address: typeof data.address === 'string' ? data.address : '—',
            district: typeof data.district === 'string' ? data.district : '—',
            productId: data.productId,
            productName: data.productName,
            size: data.size,
            quantity: data.quantity,
            sellingPrice: data.sellingPrice,
            items: Array.isArray(data.items) ? data.items : undefined,
            deliveryCharge: typeof data.deliveryCharge === 'number' ? data.deliveryCharge : 0,
            discount: typeof data.discount === 'number' ? data.discount : 0,
            total: typeof data.total === 'number' ? data.total : 0,
            paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : '—',
            status: typeof data.status === 'string' ? data.status : 'pending',
            note: typeof data.note === 'string' ? data.note : undefined,
            createdAt: data.createdAt,
          });

          if (data.productId) {
            const productDoc = await getDoc(doc(db, 'products', data.productId));
            if (productDoc.exists()) {
              const pData = productDoc.data();
              if (typeof pData.sourceUrl === 'string' && pData.sourceUrl.trim() !== '') setSourceUrl(pData.sourceUrl);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl">
          <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-zeluxe-gold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Link>
          <p className="mt-6 text-gray-600">Order not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl pb-10">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-zeluxe-gold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-zeluxe-black">{order.orderId}</h1>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold capitalize ${getStatusClass(order.status)}`}>{order.status}</span>
        <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt?.seconds)}</p>

        <div className="mt-6 rounded-xl border border-zeluxe-lightgray bg-white p-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-zeluxe-gray">Customer Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zeluxe-gray">Name</span><span className="font-medium text-zeluxe-black">{order.customerName}</span></div>
            <div className="flex justify-between"><span className="text-zeluxe-gray">Phone</span><span className="font-medium text-zeluxe-black">{order.customerPhone}</span></div>
            <div className="flex justify-between"><span className="text-zeluxe-gray">Address</span><span className="text-right font-medium text-zeluxe-black">{order.address}</span></div>
            <div className="flex justify-between"><span className="text-zeluxe-gray">District</span><span className="font-medium text-zeluxe-black">{order.district}</span></div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zeluxe-lightgray bg-white p-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-zeluxe-gray">Order Items</h2>
          <div className="space-y-4">
            
            {/* যদি মাল্টিপল আইটেম থাকে */}
            {order.items && order.items.length > 0 ? (
              order.items.map((item, idx) => (
                <div key={idx} className="flex flex-col border-b border-zeluxe-lightgray pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between font-medium text-zeluxe-black">
                    <span>{item.name}</span>
                    <span>Tk {item.sellingPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>সাইজ: {item.size} | পরিমাণ: {item.quantity}</span>
                    <span className="font-bold">মোট: Tk {(item.sellingPrice * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              // পুরনো সিস্টেমের সিঙ্গেল আইটেম
              <div className="flex flex-col border-b border-zeluxe-lightgray pb-3">
                <div className="flex justify-between font-medium text-zeluxe-black">
                  <span>{order.productName}</span>
                  <span>Tk {order.sellingPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>সাইজ: {order.size || 'N/A'} | পরিমাণ: {order.quantity}</span>
                  <span className="font-bold">মোট: Tk {((order.sellingPrice || 0) * (order.quantity || 0)).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between text-sm pt-2">
              <span className="text-zeluxe-gray">Delivery Charge</span>
              <span className="font-medium text-zeluxe-black">Tk {order.deliveryCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zeluxe-gray">Discount</span>
              <span className="font-medium text-zeluxe-black">-Tk {order.discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zeluxe-gray">Payment Method</span>
              <span className="font-medium text-zeluxe-black">{order.paymentMethod}</span>
            </div>

            {isAdmin && sourceUrl && (
              <div className="mt-4 border-t border-zeluxe-lightgray pt-4">
                <p className="text-xs text-gray-500 mb-1">Admin Only (Source):</p>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-zeluxe-gold/10 px-3 py-2 text-xs font-bold text-zeluxe-gold hover:bg-zeluxe-gold/20 transition">
                  <LinkIcon size={14} /> Open Source Link
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-zeluxe-fieldbg p-6">
          <div className="flex justify-between text-xl font-bold">
            <span className="text-zeluxe-black">Total</span>
            <span className="text-zeluxe-gold">Tk {order.total.toLocaleString()}</span>
          </div>
        </div>

        {order.note && (
          <div className="mt-4 rounded-xl border border-zeluxe-lightgray bg-white p-6">
            <h2 className="mb-2 text-sm font-bold uppercase text-zeluxe-gray">Order Note</h2>
            <p className="text-sm text-gray-600">{order.note}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}