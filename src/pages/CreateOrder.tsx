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
import { Loader2, Search, Package, X, ChevronDown, Plus, Trash2 } from 'lucide-react';
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

type CartItem = {
  productId: string;
  name: string;
  sku: string;
  imageUrl: string;
  size: string;
  quantity: number;
  sellingPrice: number;
  resellerPrice: number;
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

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Current Item State (for adding to cart)
  const [currentProductId, setCurrentProductId] = useState(presetProductId || '');
  const [currentSize, setCurrentSize] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [currentSellingPrice, setCurrentSellingPrice] = useState('');

  // Order Extras
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
            setCurrentProductId(preset.id);
            setCurrentSellingPrice(String(preset.suggestedPrice));
            if (preset.sizes.length > 0) setCurrentSize(preset.sizes[0]);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();

    // ═══ localStorage থেকে কার্ট লোড করা হচ্ছে (ডিলিট করা হবে না) ═══
    try {
      const savedCart = localStorage.getItem('zeluxe_cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          setCart(parsedCart);
        }
      }
    } catch (e) {
      console.error('Failed to load cart', e);
    }
    // ═══ কার্ট লোড শেষ ═══

  }, [presetProductId]);

  const selectedProduct = products.find((p) => p.id === currentProductId);

  const handleProductSelect = (product: Product) => {
    setCurrentProductId(product.id);
    setCurrentSellingPrice(String(product.suggestedPrice));
    setCurrentSize(product.sizes.length > 0 ? product.sizes[0] : '');
    setIsProductModalOpen(false);
    setProductSearch('');
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    setDeliveryCharge(val === 'ঢাকার ভিতরে' ? '70' : '120');
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Add item to cart
  const handleAddToCart = () => {
    if (!selectedProduct) {
      toast.error('প্রোডাক্ট সিলেক্ট করুন।');
      return;
    }
    const qty = Number(currentQuantity) || 0;
    const price = Number(currentSellingPrice) || 0;
    
    if (qty <= 0 || price <= 0) {
      toast.error('সঠিক পরিমাণ এবং বিক্রয় মূল্য দিন।');
      return;
    }
    if (selectedProduct.sizes.length > 0 && !currentSize) {
      toast.error('সাইজ সিলেক্ট করুন।');
      return;
    }

    const newItem: CartItem = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      imageUrl: selectedProduct.imageUrl,
      size: currentSize || 'N/A',
      quantity: qty,
      sellingPrice: price,
      resellerPrice: selectedProduct.resellerPrice,
    };

    const newCart = [...cart, newItem];
    setCart(newCart);
    localStorage.setItem('zeluxe_cart', JSON.stringify(newCart)); // ═══ স্টোরেজে আপডেট ═══
    
    // Reset current item form
    setCurrentProductId('');
    setCurrentSize('');
    setCurrentQuantity('1');
    setCurrentSellingPrice('');
    toast.success('প্রোডাক্ট অর্ডারে যোগ হয়েছে!');
  };

  // ═══ ডিলিট করলে স্টোরেজ থেকেও মুছবে ═══
  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
    localStorage.setItem('zeluxe_cart', JSON.stringify(updatedCart));
  };

  // Calculations
  const totalItemPrice = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const totalProfit = cart.reduce((sum, item) => sum + ((item.sellingPrice - item.resellerPrice) * item.quantity), 0);
  const numDiscount = Number(discount) || 0;
  const numDeliveryCharge = Number(deliveryCharge) || 0;
  const grandTotal = totalItemPrice + numDeliveryCharge - numDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return navigate('/login');

    if (cart.length === 0) {
      toast.error('অন্তত একটি প্রোডাক্ট যোগ করুন।');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      toast.error('কাস্টমারের সব তথ্য দিন।');
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
        
        // মাল্টিপল আইটেম সেভ করা হচ্ছে
        items: cart, 
        // পুরনো সিস্টেমের সাথে কম্প্যাটিবল রাখার জন্য প্রথম প্রোডাক্টের ডাটাও রাখছি
        productId: cart[0].productId,
        productName: cart[0].name,
        size: cart[0].size,
        quantity: cart[0].quantity,
        sellingPrice: cart[0].sellingPrice,
        
        itemTotal: totalItemPrice,
        profit: totalProfit,
        deliveryCharge: numDeliveryCharge,
        discount: numDiscount,
        total: Number(grandTotal),
        paymentMethod,
        note: note.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      toast.success('✓ অর্ডার সফলভাবে তৈরি হয়েছে!');
      localStorage.removeItem('zeluxe_cart'); // অর্ডার শেষে কার্ট খালি হবে
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
      <div className="mx-auto max-w-2xl pb-24">
        <h1 className="text-2xl font-bold text-zeluxe-black">নতুন অর্ডার</h1>
        <p className="mb-6 text-sm text-gray-600">একসাথে একাধিক প্রোডাক্ট যোগ করে অর্ডার করুন</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* কাস্টমার ইনফরমেশন */}
          <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">কাস্টমারের তথ্য</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">কাস্টমারের নাম *</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required className={inputClass} placeholder="যেমন: রফিকুল ইসলাম" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">মোবাইল নাম্বার *</label>
                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required className={inputClass} placeholder="01XXXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">ডেলিভারি ঠিকানা *</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={2} className={`${inputClass} resize-none`} placeholder="সম্পূর্ণ ঠিকানা লিখুন" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">এলাকা</label>
                <select value={district} onChange={(e) => handleDistrictChange(e.target.value)} className={inputClass}>
                  {DISTRICTS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* প্রোডাক্ট অ্যাড সেকশন */}
          <section className="rounded-xl border border-zeluxe-gold bg-zeluxe-gold/5 p-5">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">প্রোডাক্ট যোগ করুন</h2>
            <div className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">প্রোডাক্ট *</label>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                    selectedProduct ? 'border-zeluxe-gold bg-white text-zeluxe-black font-medium' : 'border-zeluxe-lightgray bg-white text-gray-500'
                  }`}
                >
                  <span className="truncate pr-4">{selectedProduct ? selectedProduct.name : 'প্রোডাক্ট সিলেক্ট করুন...'}</span>
                  <ChevronDown size={18} className={selectedProduct ? 'text-zeluxe-gold' : 'text-gray-400'} />
                </button>
              </div>

              {selectedProduct && selectedProduct.sizes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black mb-1.5">সাইজ</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map((s) => (
                      <button
                        key={s} type="button" onClick={() => setCurrentSize(s)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${currentSize === s ? 'border-zeluxe-gold bg-zeluxe-gold text-zeluxe-black' : 'border-zeluxe-lightgray bg-white text-zeluxe-black hover:border-zeluxe-gold'}`}
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
                  <input type="text" inputMode="numeric" value={currentQuantity} onChange={(e) => setCurrentQuantity(e.target.value.replace(/[^0-9]/g, ''))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zeluxe-black mb-1.5">বিক্রয় মূল্য (Tk)</label>
                  <input type="text" inputMode="numeric" value={currentSellingPrice} onChange={(e) => setCurrentSellingPrice(e.target.value.replace(/[^0-9]/g, ''))} className={inputClass} />
                  
                  {/* ক্রয় মূল্য দেখানো হচ্ছে */}
                  {selectedProduct && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      রিসেলার মূল্য (ক্রয়): <span className="font-bold text-zeluxe-black">Tk {selectedProduct.resellerPrice}</span>
                    </p>
                  )}

                </div>
              </div>

              <button type="button" onClick={handleAddToCart} className="w-full flex items-center justify-center gap-2 rounded-xl bg-zeluxe-black py-3 text-sm font-bold text-white transition hover:bg-gray-800">
                <Plus size={18} /> অর্ডার লিস্টে যোগ করুন
              </button>
            </div>
          </section>

          {/* কার্ট লিস্ট */}
          {cart.length > 0 && (
            <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
              <h2 className="mb-4 text-lg font-bold text-zeluxe-black">অর্ডার লিস্ট ({cart.length})</h2>
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-zeluxe-lightgray p-3 bg-zeluxe-fieldbg">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white border border-zeluxe-lightgray">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <Package size={20} className="m-auto mt-3 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zeluxe-black line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500">সাইজ: {item.size} | পরিমাণ: {item.quantity}</p>
                      <p className="text-xs font-bold text-zeluxe-gold mt-1">Tk {item.sellingPrice} x {item.quantity} = Tk {item.sellingPrice * item.quantity}</p>
                    </div>
                    <button type="button" onClick={() => removeFromCart(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* অর্ডার সামারি */}
          <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">পেমেন্ট ও সামারি</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">ডেলিভারি চার্জ (Tk)</label>
                <input type="text" inputMode="numeric" value={deliveryCharge} readOnly className={`${inputClass} bg-gray-100 cursor-not-allowed`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zeluxe-black mb-1.5">ডিসকাউন্ট (Tk)</label>
                <input type="text" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^0-9]/g, ''))} className={inputClass} placeholder="0" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zeluxe-black mb-1.5">পেমেন্ট মেথড</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass}>
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zeluxe-black mb-1.5">নোট (ঐচ্ছিক)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="বিশেষ নির্দেশনা..." />
            </div>
          </section>

          {/* ফাইনাল সামারি ও সাবমিট */}
          <section className="rounded-xl bg-zeluxe-black p-6 text-white">
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-300">
                <span>সর্বমোট আইটেম</span>
                <span>{cart.length} টি</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>আইটেম মোট দাম</span>
                <span>Tk {totalItemPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>ডেলিভারি চার্জ</span>
                <span>Tk {numDeliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>ডিসকাউন্ট</span>
                <span>-Tk {numDiscount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-400 font-bold pt-2 border-t border-white/10">
                <span>আপনার মোট লাভ:</span>
                <span>Tk {totalProfit.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between text-xl font-bold pt-3 border-t border-white/20 mb-6">
              <span>সর্বমোট বিল</span>
              <span className="text-zeluxe-gold">Tk {grandTotal.toLocaleString()}</span>
            </div>
            
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full rounded-xl bg-zeluxe-gold py-4 text-sm font-bold text-zeluxe-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'অর্ডার তৈরি হচ্ছে...' : '✓ অর্ডার কনফার্ম করুন'}
            </button>
          </section>
        </form>
      </div>

      {/* ═══ প্রোডাক্ট সার্চ মডাল ═══ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white">
            <div className="border-b border-zeluxe-lightgray p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zeluxe-black">প্রোডাক্ট সিলেক্ট করুন</h3>
                <button onClick={() => setIsProductModalOpen(false)} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" autoFocus placeholder="নাম বা SKU দিয়ে খুঁজুন..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg py-2.5 pl-10 pr-4 text-sm focus:border-zeluxe-gold focus:outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500"><Package className="mx-auto mb-2 text-gray-300" size={32} /><p>কোনো প্রোডাক্ট পাওয়া যায়নি</p></div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((p) => (
                    <button key={p.id} onClick={() => handleProductSelect(p)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-zeluxe-fieldbg">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-gray-50">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <Package className="m-auto h-full text-gray-300" size={20} />}
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