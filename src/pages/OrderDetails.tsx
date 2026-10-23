import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Loader2, Link as LinkIcon, Package, User, Phone, Wallet, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  transactionId?: string;
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [fallbackSourceUrl, setFallbackSourceUrl] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null); // ═══ পিডিএফ জেনারেট করার রেফারেন্স ═══

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
            transactionId: typeof data.transactionId === 'string' ? data.transactionId : '',
            status: typeof data.status === 'string' ? data.status : 'pending',
            note: typeof data.note === 'string' ? data.note : undefined,
            createdAt: data.createdAt,
          });

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

  // ═══ PDF ডাউনলোড করার ফাংশন ═══
  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setDownloadingPdf(true);
    try {
      // HTML থেকে ছবি তৈরি করা
      const canvas = await html2canvas(invoiceRef.current, { 
        scale: 2, 
        useCORS: true, // ক্লাউডিনারি ছবি লোড করার জন্য
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice-${order?.orderId}.pdf`);
      toast.success('✓ পিডিএফ ডাউনলোড হয়েছে!');
    } catch (err) {
      console.error(err);
      toast.error('পিডিএফ ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to={isAdmin ? "/admin/orders" : "/orders"} className="inline-flex items-center gap-2 text-sm font-semibold text-zeluxe-gold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <p className="mt-6 text-gray-600">Order not found.</p>
      </div>
    );
  }

  let adminPayment = 0;
  if (order.items && order.items.length > 0) {
    const resellerTotal = order.items.reduce((sum, item) => sum + ((item.resellerPrice || 0) * item.quantity), 0);
    adminPayment = resellerTotal + order.deliveryCharge - order.discount;
  } else {
    adminPayment = order.total; 
  }

  const resellerProfit = order.total - adminPayment;

  return (
    // ═══ <Layout> ট্যাগটি সরিয়ে সরাসরি div দিয়ে শুরু করা হয়েছে ═══
    <div className="mx-auto max-w-2xl pb-10">
      
      {/* ═══ টপ অ্যাকশন বার (প্রিন্টের সময় হাইড হবে) ═══ */}
      <div className="print:hidden">
        <Link to={isAdmin ? "/admin/orders" : "/orders"} className="inline-flex items-center gap-2 text-sm font-semibold text-zeluxe-gold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zeluxe-black">{order.orderId}</h1>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold capitalize ${getStatusClass(order.status)}`}>{order.status}</span>
            <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt?.seconds)}</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 rounded-lg border border-zeluxe-lightgray bg-white px-4 py-2 text-sm font-bold text-zeluxe-black transition hover:bg-gray-50"
            >
              <FileText size={16} /> Print
            </button>
            <button 
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center justify-center gap-2 rounded-lg bg-zeluxe-gold px-4 py-2 text-sm font-bold text-zeluxe-black transition hover:brightness-110 disabled:opacity-50"
            >
              {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {downloadingPdf ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Invoice ডিজাইন (এটি পিডিএফ এবং প্রিন্টে দেখা যাবে) ═══ */}
      <div 
        ref={invoiceRef} 
        className="mt-6 bg-white p-6 sm:p-10 border border-zeluxe-lightgray rounded-xl shadow-sm print:shadow-none print:border-none print:p-0 print:mt-0"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-200 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Zeluxe Gallery</h1>
            <p className="text-sm text-gray-500 mt-1">Premium Fashion Reseller Platform</p>
            <p className="text-sm text-gray-500">Support: 01603-226151</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:text-right">
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">INVOICE</h2>
            <p className="text-sm font-medium text-gray-600 mt-1"># {order.orderId}</p>
            <p className="text-sm text-gray-500">{formatDate(order.createdAt?.seconds)}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Billed To</h3>
          <p className="text-base font-bold text-gray-900">{order.customerName}</p>
          <p className="text-sm text-gray-600 mt-0.5">{order.customerPhone}</p>
          <p className="text-sm text-gray-600 mt-0.5">{order.address}, {order.district}</p>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-gray-200">
              <tr>
                <th className="py-2 font-bold text-gray-700">Item Description</th>
                <th className="py-2 font-bold text-gray-700 text-center">Size</th>
                <th className="py-2 font-bold text-gray-700 text-center">Qty</th>
                <th className="py-2 font-bold text-gray-700 text-right">Price</th>
                <th className="py-2 font-bold text-gray-700 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-gray-800">{item.name}</td>
                    <td className="py-3 text-center text-gray-600">{item.size}</td>
                    <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">Tk {item.sellingPrice.toLocaleString()}</td>
                    <td className="py-3 text-right font-medium text-gray-900">Tk {(item.sellingPrice * item.quantity).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-100">
                  <td className="py-3 text-gray-800">{order.productName}</td>
                  <td className="py-3 text-center text-gray-600">{order.size || 'N/A'}</td>
                  <td className="py-3 text-center text-gray-600">{order.quantity}</td>
                  <td className="py-3 text-right text-gray-600">Tk {order.sellingPrice?.toLocaleString()}</td>
                  <td className="py-3 text-right font-medium text-gray-900">Tk {((order.sellingPrice || 0) * (order.quantity || 0)).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-full sm:w-1/2 md:w-1/3">
            <div className="flex justify-between py-1 text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">Tk {(order.total - order.deliveryCharge + order.discount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-gray-600">
              <span>Delivery Charge</span>
              <span className="font-medium text-gray-900">Tk {order.deliveryCharge.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between py-1 text-sm text-gray-600">
                <span>Discount</span>
                <span className="font-medium text-green-600">-Tk {order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-2 mt-2 border-t-2 border-gray-800 text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>Tk {order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment & Notes */}
        <div className="border-t border-gray-200 pt-6 text-sm text-gray-600">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <p><span className="font-bold text-gray-800">Payment Method:</span> {order.paymentMethod}</p>
              {order.transactionId && (
                <p className="mt-1"><span className="font-bold text-gray-800">Transaction ID:</span> {order.transactionId}</p>
              )}
            </div>
            {order.note && (
              <div className="sm:max-w-xs">
                <p className="font-bold text-gray-800">Note:</p>
                <p className="mt-1 text-xs">{order.note}</p>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Thank you for your business! If you have any questions, please contact support.</p>
          </div>
        </div>
      </div>

      {/* ═══ Reseller Info (Admin Only - হাইড ইন পিডিএফ) ═══ */}
      {isAdmin && reseller && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 print:hidden">
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
          </div>
        </div>
      )}

      {/* ═══ Payment Breakdown (Admin Only - হাইড ইন পিডিএফ) ═══ */}
      {isAdmin && (
        <div className="mt-4 rounded-xl border border-zeluxe-gold bg-zeluxe-gold/5 p-6 print:hidden">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-zeluxe-gold">
            <Wallet size={16} /> Payment Breakdown (Admin Only)
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">কাস্টমারের মোট বিল:</span>
              <span className="font-bold text-zeluxe-black">Tk {order.total.toLocaleString()}</span>
            </div>
            
            <div className="border-t border-zeluxe-gold/20 pt-2 flex justify-between">
              <span className="font-bold text-green-700">আপনার (অ্যাডমিনের) পাওনা:</span>
              <span className="font-bold text-green-700">Tk {adminPayment.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-bold text-blue-700">রিসেলারের লাভ:</span>
              <span className="font-bold text-blue-700">Tk {resellerProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* সোর্স লিংক (Admin Only - হাইড ইন পিডিএফ) */}
      {isAdmin && fallbackSourceUrl && (
        <div className="mt-4 print:hidden">
          <a href={fallbackSourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 transition">
            <LinkIcon size={16} /> Open Source Link
          </a>
        </div>
      )}
    </div>
  );
}