import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { Loader2, Search, Package, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { auth, db } from '../firebase';
import { generateOrderId } from '../lib/orderId';

type Product = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  suggestedPrice: number;
  resellerPrice: number;
  sizes: string[];
};

const DISTRICTS = ['ঢাকার ভিতরে', 'ঢাকার বাইরে'];
const PAYMENT_METHODS = ['Cash on Delivery', 'bKash Advance', 'Full Advance'];
const inputClass =
  'w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetProductId = searchParams.get('productId');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('ঢাকার ভিতরে');

  // Order Details
  const [productId, setProductId] = useState(presetProductId || '');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('70');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [note, setNote] = useState('');

  // Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsQuery = query(collection(db, 'products'), where('active', '==', true));
        const snapshot = await getDocs(productsQuery);
        const fetchedProducts: Product[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          let sizes: string[] = [];
          if (Array.isArray(data.sizes)) sizes = data.sizes;
          
          return {
            id: doc.id,
            name: typeof data.name === 'string' ? data.name : 'Unnamed Product',
            sku: typeof data.sku === 'string' ? data.sku : '',
            imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
            suggestedPrice: typeof data.suggestedPrice === 'number' ? data.suggestedPrice : 0,
            resellerPrice: typeof data.resellerPrice === 'number' ? data.resellerPrice : 0,
            sizes,
          };
        });
        setProducts(fetchedProducts);

        if (presetProductId) {
          const preset = fetchedProducts.find((p) => p.id === presetProductId);
          if (preset) {
            setProductId(preset.id);
            setSellingPrice(String(preset.suggestedPrice));
            if (preset.sizes.length > 0) setSize(preset.sizes[0]);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, [presetProductId]);

  const selectedProduct = products.find((p) => p.id === productId);

  const handleProductSelect = (product: Product) => {
    setProductId(product.id);
    setSellingPrice(String(product.suggestedPrice));
    setSize(product.sizes.length > 0 ? product.sizes[0] : '');
    setIsProductModalOpen(false);
    setProductSearch('');
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    setDeliveryCharge(val === 'ঢাকার ভিতরে' ? '70' : '120');
  };

  const numQuantity = Number(quantity) || 0;
  const numSellingPrice = Number(sellingPrice) || 0;
  const numDiscount = Number(discount) || 0;
  const numDeliveryCharge = Number(deliveryCharge) || 0;

  const profit = selectedProduct
    ? (numSellingPrice - Number(selectedProduct.resellerPrice)) * numQuantity
    : 0;

  const itemTotal = numQuantity * numSellingPrice;
  const total = itemTotal + numDeliveryCharge - numDiscount;

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return navigate('/login');

    if (!customerName.trim() || !customerPhone.trim() || !address.trim() || !productId || !sellingPrice || numSellingPrice <= 0) {
      toast.error('সব প্রয়োজনীয় তথ্য দিন।');
      return;
    }

    if (selectedProduct?.sizes.length && !size) {
      toast.error('অনুগ্রহ করে সাইজ সিলেক্ট করুন।');
      return;
    }

    setSubmitting(true);
    try {
      const orderId = await generateOrderId();
      await addDoc(collection(db, 'orders'), {
        orderId,
        resellerId: user.uid,
        resellerEmail: user.email,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        district,
        productId,
        productName: selectedProduct?.name || '',
        productSku: selectedProduct?.sku || '',
        size: size || null,
        quantity: numQuantity,
        sellingPrice: numSellingPrice,
        deliveryCharge: numDeliveryCharge,
        discount: numDiscount,
        total: Number(total),
        paymentMethod,
        note: note.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      toast.success('✓ অর্ডার সফলভাবে তৈরি হয়েছে!');
      setTimeout(() => navigate('/orders'), 1000);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error('অর্ডার তৈরি করতে সমস্যা হয়েছে: ' + message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl pb-20">
        <h1 className="text-2xl font-bold text-zeluxe-black">নতুন অর্ডার</h1>
        <p className="mb-6 text-sm text-gray-600">কাস্টমারের জন্য নতুন অর্ডার তৈরি করুন</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* কাস্টমার ইনফরমেশন */}
          <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">কাস্টমারের তথ্য</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">কাস্টমারের নাম *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="যেমন: রফিকুল ইসলাম"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">মোবাইল নাম্বার *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">ডেলিভারি ঠিকানা *</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="সম্পূর্ণ ঠিকানা লিখুন"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">এলাকা</label>
                <select
                  value={district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className={inputClass}
                >
                  {DISTRICTS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* অর্ডার ডিটেইলস */}
          <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">অর্ডারের বিবরণ</h2>
            <div className="space-y-4">
              
              {/* ═══ নতুন প্রোডাক্ট সিলেক্টর বাটন ═══ */}
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">প্রোডাক্ট *</label>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                    selectedProduct 
                      ? 'border-zeluxe-gold bg-zeluxe-gold/5 text-zeluxe-black font-medium' 
                      : 'border-zeluxe-lightgray bg-zeluxe-fieldbg text-gray-500'
                  }`}
                >
                  <span className="truncate pr-4">
                    {selectedProduct ? selectedProduct.name : 'প্রোডাক্ট সিলেক্ট করুন...'}
                  </span>
                  <ChevronDown size={18} className={selectedProduct ? 'text-zeluxe-gold' : 'text-gray-400'} />
                </button>
              </div>

              {/* সাইজ সিলেকশন (যদি প্রোডাক্টে সাইজ থাকে) */}
              {selectedProduct && selectedProduct.sizes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black mb-1.5">সাইজ</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                          size === s
                            ? 'border-zeluxe-gold bg-zeluxe-gold text-zeluxe-black'
                            : 'border-zeluxe-lightgray bg-white text-zeluxe-black hover:border-zeluxe-gold'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black mb-1.5">পরিমাণ</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black mb-1.5">বিক্রয় মূল্য (Tk)</label>
                  <input
                    type="number"
                    min={0}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black mb-1.5">ডেলিভারি চার্জ (Tk)</label>
                  <input
                    type="number"
                    value={deliveryCharge}
                    readOnly
                    className={`${inputClass} bg-gray-100 cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black mb-1.5">ডিসকাউন্ট (Tk)</label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {selectedProduct && numSellingPrice > 0 && (
                <div className={`mt-2 flex items-center justify-between rounded-xl p-3 ${
                  profit >= 0 ? 'border border-green-200 bg-green-50' : 'border border-red-200 bg-red-50'
                }`}>
                  <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {profit >= 0 ? 'আপনার লাভ:' : 'লস হচ্ছে:'}
                  </span>
                  <span className={`text-lg font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    Tk {Math.abs(profit)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">পেমেন্ট মেথড</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">নোট (ঐচ্ছিক)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন"
                />
              </div>
            </div>
          </section>

          {/* অর্ডার সামারি */}
          <section className="rounded-xl bg-zeluxe-black p-6 text-white">
            <h2 className="mb-4 text-lg font-bold">অর্ডার সামারি</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>আইটেম মোট</span>
                <span>Tk {itemTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>ডেলিভারি চার্জ</span>
                <span>Tk {numDeliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>ডিসকাউন্ট</span>
                <span>-Tk {numDiscount.toLocaleString()}</span>
              </div>
              <div className="my-3 border-t border-white/20" />
              <div className="flex justify-between text-xl font-bold">
                <span>সর্বমোট</span>
                <span className="text-zeluxe-gold">Tk {total.toLocaleString()}</span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting || !productId}
            className="w-full rounded-xl bg-zeluxe-gold py-4 text-sm font-bold text-zeluxe-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'অর্ডার তৈরি হচ্ছে...' : '✓ অর্ডার কনফার্ম করুন'}
          </button>
        </form>
      </div>

      {/* ═══ প্রোডাক্ট সার্চ মডাল ═══ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white">
            {/* Modal Header */}
            <div className="border-b border-zeluxe-lightgray p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zeluxe-black">প্রোডাক্ট সিলেক্ট করুন</h3>
                <button 
                  onClick={() => setIsProductModalOpen(false)}
                  className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  autoFocus
                  placeholder="নাম বা SKU দিয়ে খুঁজুন..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg py-2.5 pl-10 pr-4 text-sm focus:border-zeluxe-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Body (Product List) */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="mx-auto mb-2 text-gray-300" size={32} />
                  <p>কোনো প্রোডাক্ট পাওয়া যায়নি</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProductSelect(p)}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-zeluxe-fieldbg"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-gray-50">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="m-auto h-full text-gray-300" size={20} />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-bold text-zeluxe-black">{p.name}</p>
                        <p className="font-mono text-[10px] text-gray-500">{p.sku}</p>
                        <p className="text-xs font-medium text-zeluxe-gold mt-0.5">Tk {p.resellerPrice}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}