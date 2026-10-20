import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Loader2, Link as LinkIcon } from 'lucide-react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase'; // auth ইমপোর্ট করা হলো

type OrderData = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  district: string;
  productId: string;
  productName: string;
  size?: string | null;
  quantity: number;
  sellingPrice: number;
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
  return new Date(seconds * 1000).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        // Check if current user is admin
        const user = auth.currentUser;
        if (user) {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (adminDoc.exists() || (userDoc.exists() && userDoc.data().role === 'admin')) {
            setIsAdmin(true);
          }
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
            productId: typeof data.productId === 'string' ? data.productId : '',
            productName: typeof data.productName === 'string' ? data.productName : '—',
            size: typeof data.size === 'string' ? data.size : null,
            quantity: typeof data.quantity === 'number' ? data.quantity : 0,
            sellingPrice: typeof data.sellingPrice === 'number' ? data.sellingPrice : 0,
            deliveryCharge: typeof data.deliveryCharge === 'number' ? data.deliveryCharge : 0,
            discount: typeof data.discount === 'number' ? data.discount : 0,
            total: typeof data.total === 'number' ? data.total : 0,
            paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : '—',
            status: typeof data.status === 'string' ? data.status : 'pending',
            note: typeof data.note === 'string' ? data.note : undefined,
            createdAt: data.createdAt,
          });

          // Fetch product source URL if productId exists
          if (data.productId) {
            const productDoc = await getDoc(doc(db, 'products', data.productId));
            if (productDoc.exists()) {
              const pData = productDoc.data();
              if (typeof pData.sourceUrl === 'string' && pData.sourceUrl.trim() !== '') {
                setSourceUrl(pData.sourceUrl);
              }
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
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading order" />
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
      <div className="mx-auto max-w-2xl">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-zeluxe-gold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-zeluxe-black">{order.orderId}</h1>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold capitalize ${getStatusClass(order.status)}`}>
          {order.status}
        </span>
        <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt?.seconds)}</p>

        <div className="mt-6 rounded-xl border border-zeluxe-lightgray bg-white p-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-zeluxe-gray">Customer Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Name</span>
              <span className="font-medium text-zeluxe-black">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Phone</span>
              <span className="font-medium text-zeluxe-black">{order.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Address</span>
              <span className="text-right font-medium text-zeluxe-black">{order.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">District</span>
              <span className="font-medium text-zeluxe-black">{order.district}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zeluxe-lightgray bg-white p-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-zeluxe-gray">Order Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Product</span>
              <span className="font-medium text-zeluxe-black">{order.productName}</span>
            </div>
            {order.size && (
              <div className="flex justify-between">
                <span className="text-zeluxe-gray">Size</span>
                <span className="font-medium text-zeluxe-black">{order.size}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Quantity</span>
              <span className="font-medium text-zeluxe-black">{order.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Unit Price</span>
              <span className="font-medium text-zeluxe-black">Tk {order.sellingPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Delivery Charge</span>
              <span className="font-medium text-zeluxe-black">Tk {order.deliveryCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Discount</span>
              <span className="font-medium text-zeluxe-black">-Tk {order.discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zeluxe-gray">Payment Method</span>
              <span className="font-medium text-zeluxe-black">{order.paymentMethod}</span>
            </div>

            {/* ═══ নতুন সোর্স লিংক সেকশন (শুধু অ্যাডমিনের জন্য) ═══ */}
            {isAdmin && sourceUrl && (
              <div className="mt-4 border-t border-zeluxe-lightgray pt-4">
                <p className="text-xs text-gray-500 mb-1">Admin Only (Source):</p>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-zeluxe-gold/10 px-3 py-2 text-xs font-bold text-zeluxe-gold hover:bg-zeluxe-gold/20 transition"
                >
                  <LinkIcon size={14} />
                  Open Source Link
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