import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Loader2, Link as LinkIcon, Package, User, Phone, Wallet } from 'lucide-react';
import Layout from '../components/Layout';
import { db, auth } from '../firebase';

type OrderItem = {
  productId: string;
  name: string;
  imageUrl?: string;
  sourceUrl?: string;
  size: string;
  quantity: number;
  sellingPrice: number;
  resellerPrice?: number;
};

type OrderData = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  district: string;
  resellerId: string;
  productId?: string;
  productName?: string;
  size?: string | null;
  quantity?: number;
  sellingPrice?: number;
  imageUrl?: string;
  items?: OrderItem[];
  deliveryCharge: number;
  discount: number;
  total: number;
  paymentMethod: string;
  transactionId?: string; // ═══ নতুন যোগ করা হয়েছে ═══
  status: string;
  note?: string;
  createdAt?: { seconds?: number };
};

type ResellerInfo = {
  name: string;
  phone: string;
  email: string;
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
  const [reseller, setReseller] = useState<ResellerInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [fallbackSourceUrl, setFallbackSourceUrl] = useState<string | null>(null);

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
            resellerId: data.resellerId || '',
            productId: data.productId,
            productName: data.productName,
            size: data.size,
            quantity: data.quantity,
            sellingPrice: data.sellingPrice,
            imageUrl: data.imageUrl || '',
            items: Array.isArray(data.items) ? data.items : undefined,
            deliveryCharge: typeof data.deliveryCharge === 'number' ? data.deliveryCharge : 0,
            discount: typeof data.discount === 'number' ? data.discount : 0,
            total: typeof data.total === 'number' ? data.total : 0,
            paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : '—',
            transactionId: typeof data.transactionId === 'string' ? data.transactionId : '', // ═══ নতুন যোগ করা হয়েছে ═══
            status: typeof data.status === 'string' ? data.status : 'pending',
            note: typeof data.note === 'string' ? data.note : undefined,
            createdAt: data.createdAt,
          });

          // ═══ রিসেলারের তথ্য লোড করা হচ্ছে ═══
          if (data.resellerId) {
            const rDoc = await getDoc(doc(db, 'users', data.resellerId));
            if (rDoc.exists()) {
              const rData = rDoc.data();
              setReseller({
                name: rData.name || 'Unknown Reseller',
                phone: rData.phone || '—',
                email: rData.email || '—',
              });
            }
          }

          if (data.productId) {
            const productDoc = await getDoc(doc(db, 'products', data.productId));
            if (productDoc.exists()) {
              const pData = productDoc.data();
              if (typeof pData.sourceUrl === 'string' && pData.sourceUrl.trim() !== '') {
                setFallbackSourceUrl(pData.sourceUrl);
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

  // ═══ পেমেন্ট ক্যালকুলেশন ═══
  let adminPayment = 0;
  if (order.items && order.items.length > 0) {
    const resellerTotal = order.items.reduce((sum, item) => sum + ((item.resellerPrice || 0) * item.quantity), 0);
    adminPayment = resellerTotal + order.deliveryCharge - order.discount;
  } else {
    adminPayment = order.total; 
  }

  const resellerProfit = order.total - adminPayment;

  return (
    <Layout>
      <div className="mx-auto max-w-2xl pb-10">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-zeluxe-gold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-zeluxe-black">{order.orderId}</h1>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold capitalize ${getStatusClass(order.status)}`}>{order.status}</span>
        <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt?.seconds)}</p>

        {/* ═══ রিসেলার ইনফরমেশন (শুধু অ্যাডমিন দেখতে পাবে) ═══ */}
        {isAdmin && reseller && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-blue-800">
              <User size={16} /> Reseller Information
            </h2>
            <div className="space-y-2 text-sm text-blue-900">
              <div className="flex justify-between"><span>Name</span><span className="font-bold">{reseller.name}</span></div>
              <div className="flex justify-between">
                <span>Phone</span>
                <a href={`tel:${reseller.phone}`} className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <Phone size={14} /> {reseller.phone}
                </a>
              </div>
              <div className="flex justify-between"><span>Email</span><span className="font-medium">{reseller.email}</span></div>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-zeluxe-lightgray bg-white p-6">
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
            
            {order.items && order.items.length > 0 ? (
              order.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 border-b border-zeluxe-lightgray pb-4 last:border-0 last:pb-0">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-zeluxe-cream">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between font-bold text-zeluxe-black">
                      <span className="line-clamp-2">{item.name}</span>
                      <span>Tk {item.sellingPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>সাইজ: {item.size} | পরিমাণ: {item.quantity}</span>
                      <span className="font-bold">মোট: Tk {(item.sellingPrice * item.quantity).toLocaleString()}</span>
                    </div>
                    
                    {isAdmin && item.sourceUrl && (
                      <div className="mt-2">
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-zeluxe-gold/10 px-2 py-1 text-[10px] font-bold text-zeluxe-gold hover:bg-zeluxe-gold/20 transition">
                          <LinkIcon size={12} /> Open Source Link
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 border-b border-zeluxe-lightgray pb-4">
                 {order.imageUrl && (
                   <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zeluxe-lightgray">
                      <img src={order.imageUrl} alt={order.productName} className="h-full w-full object-cover" />
                   </div>
                 )}
                <div className="flex-1">
                  <div className="flex justify-between font-bold text-zeluxe-black">
                    <span>{order.productName}</span>
                    <span>Tk {order.sellingPrice?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>সাইজ: {order.size || 'N/A'} | পরিমাণ: {order.quantity}</span>
                    <span className="font-bold">মোট: Tk {((order.sellingPrice || 0) * (order.quantity || 0)).toLocaleString()}</span>
                  </div>
                  {isAdmin && fallbackSourceUrl && (
                    <div className="mt-2">
                      <a href={fallbackSourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-zeluxe-gold/10 px-2 py-1 text-[10px] font-bold text-zeluxe-gold hover:bg-zeluxe-gold/20 transition">
                        <LinkIcon size={12} /> Open Source Link
                      </a>
                    </div>
                  )}
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
            {/* ═══ নতুন যোগ করা ট্রানজেকশন আইডি ═══ */}
            {order.transactionId && (
              <div className="flex justify-between text-sm">
                <span className="text-zeluxe-gray">Transaction ID</span>
                <span className="font-mono font-bold text-blue-600">{order.transactionId}</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ পেমেন্ট ব্রেকডাউন (শুধু অ্যাডমিন দেখতে পাবে) ═══ */}
        {isAdmin && (
          <div className="mt-4 rounded-xl border border-zeluxe-gold bg-zeluxe-gold/5 p-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-zeluxe-gold">
              <Wallet size={16} /> Payment Breakdown (Admin Only)
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">কাস্টমারের মোট বিল:</span>
                <span className="font-bold text-zeluxe-black">Tk {order.total.toLocaleString()}</span>
              </div>
              
              <div className="border-t border-zeluxe-gold/20 pt-2 flex justify-between">
                <span className="font-bold text-green-700">আপনার (অ্যাডমিনের) পাওনা (রিসেলার প্রাইস + ডেলিভারি):</span>
                <span className="font-bold text-green-700">Tk {adminPayment.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-bold text-blue-700">রিসেলারের লাভ:</span>
                <span className="font-bold text-blue-700">Tk {resellerProfit.toLocaleString()}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-500">
              * রিসেলার পুরো টাকা (Tk {order.total}) আপনার নাম্বারে পাঠাবে এবং সিস্টেম থেকে তার লাভ অটোমেটিকভাবে কেটে নেওয়া হবে।
            </p>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-zeluxe-black p-6 text-white">
          <div className="flex justify-between text-xl font-bold">
            <span>সর্বমোট বিল</span>
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