import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { BarChart3, TrendingUp, Loader2, Calendar, ShoppingBag, CheckCircle, XCircle, Clock, Wallet } from 'lucide-react';
import { db } from '../../firebase';

type OrderItem = {
  resellerPrice: number;
  purchaseCost: number;
  quantity: number;
};

type Order = {
  id: string;
  orderId: string;
  customerName: string;
  productName: string;
  total: number;
  status: string;
  createdAt?: any;
  items?: OrderItem[]; 
};

type MonthlyReport = {
  monthKey: string;      
  monthLabel: string;    
  totalOrders: number;
  delivered: number;
  pending: number;
  cancelled: number;
  totalSales: number;
  deliveredSales: number;
  totalProfit: number;   
};

export default function AdminReports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const monthNames = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
  ];

  const parseOrderId = (orderId: string): { monthKey: string; label: string } | null => {
    const match = orderId?.match(/^ZEL-(\d{2})(\d{2})-/);
    if (!match) return null;

    const year = match[1];
    const month = match[2];
    const monthIndex = parseInt(month, 10) - 1;

    if (monthIndex < 0 || monthIndex > 11) return null;

    return {
      monthKey: `${year}${month}`,
      label: `${monthNames[monthIndex]} ২০${year}`,
    };
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        const list: Order[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            orderId: typeof data.orderId === 'string' ? data.orderId : '',
            customerName: typeof data.customerName === 'string' ? data.customerName : '',
            productName: typeof data.productName === 'string' ? data.productName : '',
            total: typeof data.total === 'number' ? data.total : 0,
            status: typeof data.status === 'string' ? data.status : 'pending',
            createdAt: data.createdAt,
            items: Array.isArray(data.items) ? data.items : undefined, 
          };
        });
        setOrders(list);

        const grouped: Record<string, MonthlyReport> = {};

        list.forEach((order) => {
          const parsed = parseOrderId(order.orderId);
          if (!parsed) return;

          if (!grouped[parsed.monthKey]) {
            grouped[parsed.monthKey] = {
              monthKey: parsed.monthKey,
              monthLabel: parsed.label,
              totalOrders: 0,
              delivered: 0,
              pending: 0,
              cancelled: 0,
              totalSales: 0,
              deliveredSales: 0,
              totalProfit: 0, 
            };
          }

          const report = grouped[parsed.monthKey];
          report.totalOrders += 1;
          report.totalSales += order.total;

          let orderProfit = 0;
          if (order.items && order.items.length > 0) {
            orderProfit = order.items.reduce((sum, item) => {
              const resellerP = item.resellerPrice || 0;
              const purchaseP = item.purchaseCost || 0;
              const qty = item.quantity || 0;
              return sum + ((resellerP - purchaseP) * qty);
            }, 0);
          }
          report.totalProfit += orderProfit;

          if (order.status === 'delivered') {
            report.delivered += 1;
            report.deliveredSales += order.total;
          } else if (order.status === 'cancelled' || order.status === 'returned') {
            report.cancelled += 1;
          } else {
            report.pending += 1;
          }
        });

        const sorted = Object.values(grouped).sort((a, b) =>
          b.monthKey.localeCompare(a.monthKey)
        );

        setMonthlyReports(sorted);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, []);

  // ═══ <AdminLayout> ট্যাগটি সরিয়ে সরাসরি div দিয়ে শুরু করা হয়েছে ═══
  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
      </div>
    );
  }

  const grandTotalOrders = monthlyReports.reduce((s, r) => s + r.totalOrders, 0);
  const grandTotalSales = monthlyReports.reduce((s, r) => s + r.totalSales, 0);
  const grandTotalDelivered = monthlyReports.reduce((s, r) => s + r.delivered, 0);
  const grandTotalCancelled = monthlyReports.reduce((s, r) => s + r.cancelled, 0);
  const grandTotalProfit = monthlyReports.reduce((s, r) => s + r.totalProfit, 0); 

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-zeluxe-black">Monthly Reports</h1>
      <p className="mb-6 text-sm text-gray-500">মাসিক অর্ডার ও বিক্রয় রিপোর্ট</p>

      {/* Overall Summary */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
          <ShoppingBag className="text-zeluxe-gold" size={20} />
          <p className="mt-2 text-xs uppercase text-gray-500">Total Orders</p>
          <p className="mt-1 text-xl font-bold text-zeluxe-black">{grandTotalOrders}</p>
        </div>
        <div className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
          <TrendingUp className="text-green-600" size={20} />
          <p className="mt-2 text-xs uppercase text-gray-500">Total Sales</p>
          <p className="mt-1 text-xl font-bold text-zeluxe-black">Tk {grandTotalSales.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zeluxe-gold bg-zeluxe-gold/5 p-4">
          <Wallet className="text-zeluxe-gold" size={20} />
          <p className="mt-2 text-xs uppercase text-zeluxe-gold font-bold">Admin Profit</p>
          <p className="mt-1 text-xl font-bold text-zeluxe-black">Tk {grandTotalProfit.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
          <CheckCircle className="text-green-600" size={20} />
          <p className="mt-2 text-xs uppercase text-gray-500">Delivered</p>
          <p className="mt-1 text-xl font-bold text-green-600">{grandTotalDelivered}</p>
        </div>
        <div className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
          <XCircle className="text-red-600" size={20} />
          <p className="mt-2 text-xs uppercase text-gray-500">Cancelled</p>
          <p className="mt-1 text-xl font-bold text-red-600">{grandTotalCancelled}</p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {monthlyReports.length === 0 ? (
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">এখনো কোনো monthly data নেই।</p>
          <p className="mt-2 text-xs text-gray-400">
            প্রথম অর্ডার করার পর এখানে মাসিক রিপোর্ট দেখতে পাবেন।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthlyReports.map((report) => (
            <div
              key={report.monthKey}
              className="overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white"
            >
              {/* Month Header */}
              <div className="flex items-center justify-between border-b border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Calendar className="text-zeluxe-gold" size={18} />
                  <h3 className="font-bold text-zeluxe-black">{report.monthLabel}</h3>
                </div>
                <span className="rounded-full bg-zeluxe-gold/20 px-3 py-1 text-xs font-bold text-zeluxe-black">
                  {report.totalOrders} orders
                </span>
              </div>

              {/* Month Stats */}
              <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
                <div>
                  <p className="text-xs uppercase text-gray-500">Total Sales</p>
                  <p className="mt-1 text-lg font-bold text-zeluxe-black">
                    Tk {report.totalSales.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Delivered Sales</p>
                  <p className="mt-1 text-lg font-bold text-green-600">
                    Tk {report.deliveredSales.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-zeluxe-gold font-bold">Admin Profit</p>
                  <p className="mt-1 text-lg font-bold text-zeluxe-gold">
                    Tk {report.totalProfit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Pending</p>
                  <p className="mt-1 text-lg font-bold text-yellow-600">{report.pending}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Cancelled</p>
                  <p className="mt-1 text-lg font-bold text-red-600">{report.cancelled}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="px-4 pb-4">
                <div className="flex gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Delivered: {report.delivered}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-600">Pending: {report.pending}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">Cancelled: {report.cancelled}</span>
                  </div>
                </div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100">
                  {report.delivered > 0 && (
                    <div
                      className="bg-green-500"
                      style={{ width: `${(report.delivered / report.totalOrders) * 100}%` }}
                    ></div>
                  )}
                  {report.pending > 0 && (
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${(report.pending / report.totalOrders) * 100}%` }}
                    ></div>
                  )}
                  {report.cancelled > 0 && (
                    <div
                      className="bg-red-500"
                      style={{ width: `${(report.cancelled / report.totalOrders) * 100}%` }}
                    ></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        রিপোর্ট Order ID থেকে month বের করে তৈরি করা হয়েছে
      </p>
    </>
  );
}