import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  Loader2,
  Search,
  Package,
  X,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Check,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { generateOrderId } from '../lib/orderId';

type Product = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  suggestedPrice: number;
  resellerPrice: number;
  purchaseCost: number;
  sizes: string[];
  stock: number;
  sourceUrl?: string;
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
  purchaseCost: number;
  sourceUrl?: string;
};

type PastCustomer = {
  name: string;
  address: string;
  district: string;
};

const DISTRICTS = ['ঢাকার ভিতরে', 'ঢাকার বাইরে'];
const PAYMENT_METHODS = ['Cash on Delivery', 'bKash Advance', 'Full Advance'];
const PAYMENT_NUMBER = '01603226151';

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
  const [pastCustomers, setPastCustomers] = useState<
    Record<string, PastCustomer>
  >({});
  const [isAutofilled, setIsAutofilled] = useState(false);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Current Item
  const [currentProductId, setCurrentProductId] = useState(
    presetProductId || '',
  );
  const [currentSize, setCurrentSize] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [currentSellingPrice, setCurrentSellingPrice] = useState('');

  // Order Extras
  const [deliveryCharge, setDeliveryCharge] = useState('70');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  // Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const user = auth.currentUser;

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const [productsSnap, ordersSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'products'),
              where('active', '==', true),
            ),
          ),
          getDocs(
            query(
              collection(db, 'orders'),
              where('resellerId', '==', user.uid),
            ),
          ),
        ]);

        const fetchedProducts: Product[] = productsSnap.docs.map(
          (productDoc) => {
            const data = productDoc.data();

            const sizes: string[] = Array.isArray(data.sizes)
              ? data.sizes.filter(
                  (size: unknown): size is string =>
                    typeof size === 'string',
                )
              : [];

            return {
              // গুরুত্বপূর্ণ: এটি নির্দিষ্ট রঙ/ভ্যারিয়েন্টের document ID।
              id: productDoc.id,
              name:
                typeof data.name === 'string'
                  ? data.name
                  : 'Unnamed Product',
              sku: typeof data.sku === 'string' ? data.sku : '',
              imageUrl:
                typeof data.imageUrl === 'string' ? data.imageUrl : '',
              suggestedPrice:
                typeof data.suggestedPrice === 'number'
                  ? data.suggestedPrice
                  : 0,
              resellerPrice:
                typeof data.resellerPrice === 'number'
                  ? data.resellerPrice
                  : 0,
              purchaseCost:
                typeof data.purchaseCost === 'number'
                  ? data.purchaseCost
                  : 0,
              sizes,
              // পুরোনো পণ্যে stock না থাকলে 0 ধরা হবে।
              stock:
                typeof data.stock === 'number' &&
                Number.isFinite(data.stock)
                  ? Math.max(0, Math.floor(data.stock))
                  : 0,
              sourceUrl:
                typeof data.sourceUrl === 'string'
                  ? data.sourceUrl
                  : '',
            };
          },
        );

        const customers: Record<string, PastCustomer> = {};

        ordersSnap.docs.forEach((orderDoc) => {
          const data = orderDoc.data();

          if (data.customerPhone && data.customerName) {
            customers[String(data.customerPhone)] = {
              name: String(data.customerName),
              address:
                typeof data.address === 'string' ? data.address : '',
              district:
                typeof data.district === 'string'
                  ? data.district
                  : 'ঢাকার ভিতরে',
            };
          }
        });

        if (cancelled) return;

        setProducts(fetchedProducts);
        setPastCustomers(customers);

        if (presetProductId) {
          const preset = fetchedProducts.find(
            (product) => product.id === presetProductId,
          );

          if (preset) {
            setCurrentProductId(preset.id);
            setCurrentSellingPrice(String(preset.suggestedPrice));

            if (preset.sizes.length > 0) {
              setCurrentSize(preset.sizes[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load order data:', error);

        if (!cancelled) {
          toast.error('প্রোডাক্ট বা আগের অর্ডারের তথ্য লোড করা যায়নি।');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    try {
      const savedCart = localStorage.getItem('zeluxe_cart');

      if (savedCart) {
        const parsedCart: unknown = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          const validCart = parsedCart.filter((item): item is CartItem => {
            return (
              item !== null &&
              typeof item === 'object' &&
              typeof item.productId === 'string' &&
              typeof item.name === 'string' &&
              typeof item.quantity === 'number' &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              typeof item.sellingPrice === 'number' &&
              typeof item.resellerPrice === 'number'
            );
          });

          if (validCart.length > 0) {
            setCart(validCart);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }

    return () => {
      cancelled = true;
    };
  }, [presetProductId]);

  const selectedProduct = products.find(
    (product) => product.id === currentProductId,
  );

  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const phone = event.target.value.replace(/[^0-9]/g, '');

    setCustomerPhone(phone);
    setIsAutofilled(false);

    if (phone.length === 11 && pastCustomers[phone]) {
      setCustomerName(pastCustomers[phone].name);
      setAddress(pastCustomers[phone].address);
      setDistrict(pastCustomers[phone].district);
      setIsAutofilled(true);

      toast.info('কাস্টমারের আগের তথ্য অটো-ফিল করা হয়েছে।');
    }
  };

  const handleProductSelect = (product: Product) => {
    setCurrentProductId(product.id);
    setCurrentSellingPrice(String(product.suggestedPrice));
    setCurrentSize(product.sizes.length > 0 ? product.sizes[0] : '');
    setIsProductModalOpen(false);
    setProductSearch('');
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setDeliveryCharge(value === 'ঢাকার ভিতরে' ? '70' : '120');
  };

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search),
    );
  }, [products, productSearch]);

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_NUMBER);
      setCopied(true);
      toast.success('পেমেন্ট নাম্বার কপি হয়েছে!');

      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('নাম্বার কপি করা যায়নি। হাতে কপি করুন।');
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) {
      toast.error('প্রোডাক্ট সিলেক্ট করুন।');
      return;
    }

    const qty = Number(currentQuantity);
    const price = Number(currentSellingPrice);

    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error('পরিমাণ অবশ্যই ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast.error('সঠিক বিক্রয় মূল্য দিন।');
      return;
    }

    if (selectedProduct.sizes.length > 0 && !currentSize) {
      toast.error('সাইজ সিলেক্ট করুন।');
      return;
    }

    // Firestore Rules অনুযায়ী একটি অর্ডারে সর্বোচ্চ ৫টি cart line রাখা হবে।
    if (cart.length >= 5) {
      toast.error('একটি অর্ডারে সর্বোচ্চ ৫টি প্রোডাক্ট লাইন যোগ করা যাবে।');
      return;
    }

    // একই productId আগে কার্টে থাকলে তার পরিমাণও হিসাব হবে।
    const alreadyInCart = cart
      .filter((item) => item.productId === selectedProduct.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (alreadyInCart + qty > selectedProduct.stock) {
      toast.error(
        `স্টক পর্যাপ্ত নেই। বর্তমান স্টক: ${selectedProduct.stock}, কার্টে আছে: ${alreadyInCart}।`,
      );
      return;
    }

    const newItem: CartItem = {
      // নির্দিষ্ট রঙের product document ID সংরক্ষণ করা হচ্ছে।
      productId: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      imageUrl: selectedProduct.imageUrl,
      size: currentSize || 'N/A',
      quantity: qty,
      sellingPrice: price,
      resellerPrice: selectedProduct.resellerPrice,
      purchaseCost: selectedProduct.purchaseCost,
      sourceUrl: selectedProduct.sourceUrl || '',
    };

    const newCart = [...cart, newItem];

    setCart(newCart);
    localStorage.setItem('zeluxe_cart', JSON.stringify(newCart));

    setCurrentProductId('');
    setCurrentSize('');
    setCurrentQuantity('1');
    setCurrentSellingPrice('');

    toast.success('প্রোডাক্ট অর্ডারে যোগ হয়েছে!');
  };

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, itemIndex) => itemIndex !== index);

    setCart(updatedCart);

    if (updatedCart.length > 0) {
      localStorage.setItem('zeluxe_cart', JSON.stringify(updatedCart));
    } else {
      localStorage.removeItem('zeluxe_cart');
    }
  };

  const totalItemPrice = cart.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0,
  );

  const totalProfit = cart.reduce(
    (sum, item) =>
      sum + (item.sellingPrice - item.resellerPrice) * item.quantity,
    0,
  );

  const numDiscount = Number(discount) || 0;
  const numDeliveryCharge = Number(deliveryCharge) || 0;
  const grandTotal = totalItemPrice + numDeliveryCharge - numDiscount;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      toast.error('অন্তত একটি প্রোডাক্ট যোগ করুন।');
      return;
    }

    if (cart.length > 5) {
      toast.error('একটি অর্ডারে সর্বোচ্চ ৫টি প্রোডাক্ট লাইন রাখা যাবে। কার্ট থেকে কিছু প্রোডাক্ট সরান।');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      toast.error('কাস্টমারের সব তথ্য দিন।');
      return;
    }

    if (!/^[0-9]{11}$/.test(customerPhone.trim())) {
      toast.error('সঠিক ১১ সংখ্যার মোবাইল নাম্বার দিন।');
      return;
    }

    if (numDiscount < 0 || numDiscount > totalItemPrice + numDeliveryCharge) {
      toast.error('ডিসকাউন্টের পরিমাণ সঠিক নয়।');
      return;
    }

    const isAdvancePayment =
      paymentMethod === 'bKash Advance' ||
      paymentMethod === 'Full Advance';

    if (isAdvancePayment && !transactionId.trim()) {
      toast.error('অনুগ্রহ করে ট্রানজেকশন আইডি দিন।');
      return;
    }

    // জমা দেওয়ার আগে বর্তমান প্রোডাক্ট ও স্টক আবার যাচাই।
    // একই productId একাধিকবার থাকলে মোট পরিমাণ একসাথে হিসাব হবে।
    const quantitiesByProduct = new Map<string, number>();

    for (const item of cart) {
      if (
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        toast.error('কার্টে ভুল প্রোডাক্ট বা পরিমাণ আছে।');
        return;
      }

      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) || 0) + item.quantity,
      );
    }

    for (const [productId, requestedQuantity] of quantitiesByProduct) {
      // পেজে লোড করা পুরোনো স্টকের বদলে Firebase থেকে সর্বশেষ তথ্য পড়ুন।
      let latestSnap: Awaited<ReturnType<typeof getDoc>>;
      try {
        latestSnap = await getDoc(doc(db, 'products', productId));
      } catch (readError) {
        console.error('Latest product stock read failed:', readError);
        toast.error('স্টক যাচাই করা যায়নি। আবার চেষ্টা করুন।');
        return;
      }

      if (!latestSnap.exists()) {
        toast.error('কার্টের একটি প্রোডাক্ট আর পাওয়া যাচ্ছে না। সেটি সরিয়ে আবার যোগ করুন।');
        return;
      }

      const latestData = latestSnap.data();
      const latestName = typeof latestData.name === 'string' ? latestData.name : 'প্রোডাক্ট';
      const latestStock = latestData.stock;

      if (latestData.active === false) {
        toast.error(`${latestName} বর্তমানে বিক্রির জন্য বন্ধ।`);
        return;
      }

      if (
        typeof latestStock !== 'number' ||
        !Number.isFinite(latestStock) ||
        latestStock < 0
      ) {
        toast.error(`${latestName}: স্টকের তথ্য সঠিক নয়।`);
        return;
      }

      if (requestedQuantity > latestStock) {
        toast.error(
          `${latestName}: পর্যাপ্ত স্টক নেই। বর্তমান স্টক ${latestStock}, অর্ডারের পরিমাণ ${requestedQuantity}।`,
        );
        return;
      }
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

        // প্রতিটি আইটেমের নিজস্ব productId ও quantity রাখা হচ্ছে।
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          imageUrl: item.imageUrl,
          size: item.size,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          resellerPrice: item.resellerPrice,
          purchaseCost: item.purchaseCost,
          sourceUrl: item.sourceUrl || '',
        })),

        // পুরোনো single-product order ফরম্যাটের সঙ্গে সামঞ্জস্য।
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
        transactionId: transactionId.trim(),
        note: note.trim(),

        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast.success('✓ অর্ডার সফলভাবে তৈরি হয়েছে!');
      localStorage.removeItem('zeluxe_cart');

      setTimeout(() => navigate('/orders'), 1000);
    } catch (error) {
      console.error('Order creation failed:', error);

      const message =
        error instanceof Error ? error.message : 'Unknown error';

      toast.error('অর্ডার তৈরি করতে সমস্যা হয়েছে: ' + message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="text-2xl font-bold text-zeluxe-black">নতুন অর্ডার</h1>
      <p className="mb-6 text-sm text-gray-600">
        একসাথে একাধিক প্রোডাক্ট যোগ করে অর্ডার করুন
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <section className="relative overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white p-5">
          {isAutofilled && (
            <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-lg bg-green-100 px-3 py-1 text-[10px] font-bold text-green-700">
              <UserCheck size={12} /> Autofilled
            </div>
          )}

          <h2 className="mb-4 text-lg font-bold text-zeluxe-black">
            কাস্টমারের তথ্য
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                মোবাইল নাম্বার *
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={handlePhoneChange}
                required
                className={inputClass}
                placeholder="01XXXXXXXXX"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                পুরনো কাস্টমারের নাম্বার দিলে তথ্য অটো বসে যাবে।
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                কাস্টমারের নাম *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                required
                className={inputClass}
                placeholder="যেমন: রফিকুল ইসলাম"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                ডেলিভারি ঠিকানা *
              </label>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                required
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="সম্পূর্ণ ঠিকানা লিখুন"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                এলাকা
              </label>
              <select
                value={district}
                onChange={(event) => handleDistrictChange(event.target.value)}
                className={inputClass}
              >
                {DISTRICTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Add Product */}
        <section className="rounded-xl border border-zeluxe-gold bg-zeluxe-gold/5 p-5">
          <h2 className="mb-4 text-lg font-bold text-zeluxe-black">
            প্রোডাক্ট যোগ করুন
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                প্রোডাক্ট *
              </label>

              <button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                  selectedProduct
                    ? 'border-zeluxe-gold bg-white font-medium text-zeluxe-black'
                    : 'border-zeluxe-lightgray bg-white text-gray-500'
                }`}
              >
                <span className="truncate pr-4">
                  {selectedProduct
                    ? selectedProduct.name
                    : 'প্রোডাক্ট সিলেক্ট করুন...'}
                </span>
                <ChevronDown
                  size={18}
                  className={
                    selectedProduct ? 'text-zeluxe-gold' : 'text-gray-400'
                  }
                />
              </button>

              {selectedProduct && (
                <p className="mt-2 text-xs text-gray-600">
                  বর্তমান স্টক:{' '}
                  <span className="font-bold text-zeluxe-black">
                    {selectedProduct.stock} টি
                  </span>
                </p>
              )}
            </div>

            {selectedProduct && selectedProduct.sizes.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  সাইজ
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setCurrentSize(size)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        currentSize === size
                          ? 'border-zeluxe-gold bg-zeluxe-gold text-zeluxe-black'
                          : 'border-zeluxe-lightgray bg-white text-zeluxe-black hover:border-zeluxe-gold'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  পরিমাণ
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentQuantity}
                  onChange={(event) =>
                    setCurrentQuantity(
                      event.target.value.replace(/[^0-9]/g, ''),
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  বিক্রয় মূল্য (Tk)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentSellingPrice}
                  onChange={(event) =>
                    setCurrentSellingPrice(
                      event.target.value.replace(/[^0-9]/g, ''),
                    )
                  }
                  className={inputClass}
                />
                {selectedProduct && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    রিসেলার মূল্য (ক্রয়):{' '}
                    <span className="font-bold text-zeluxe-black">
                      Tk {selectedProduct.resellerPrice}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zeluxe-black py-3 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              <Plus size={18} /> অর্ডার লিস্টে যোগ করুন
            </button>
          </div>
        </section>

        {/* Cart */}
        {cart.length > 0 && (
          <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
            <h2 className="mb-4 text-lg font-bold text-zeluxe-black">
              অর্ডার লিস্ট ({cart.length})
            </h2>

            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex items-start gap-3 rounded-lg border border-zeluxe-lightgray bg-zeluxe-fieldbg p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-zeluxe-lightgray bg-white">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package
                        size={20}
                        className="m-auto mt-3 text-gray-400"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-bold text-zeluxe-black">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      SKU: {item.sku || 'N/A'} | সাইজ: {item.size} | পরিমাণ:{' '}
                      {item.quantity}
                    </p>
                    <p className="mt-1 text-xs font-bold text-zeluxe-gold">
                      Tk {item.sellingPrice} × {item.quantity} = Tk{' '}
                      {item.sellingPrice * item.quantity}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(index)}
                    aria-label="প্রোডাক্ট সরান"
                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment and Summary */}
        <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-zeluxe-black">
            পেমেন্ট ও সামারি
          </h2>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                ডেলিভারি চার্জ (Tk)
              </label>
              <input
                type="text"
                value={deliveryCharge}
                readOnly
                className={`${inputClass} cursor-not-allowed bg-gray-100`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                ডিসকাউন্ট (Tk)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={discount}
                onChange={(event) =>
                  setDiscount(event.target.value.replace(/[^0-9]/g, ''))
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
              পেমেন্ট মেথড
            </label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={inputClass}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {(paymentMethod === 'bKash Advance' ||
            paymentMethod === 'Full Advance') && (
            <div className="mb-4 rounded-xl border border-zeluxe-gold bg-zeluxe-gold/5 p-4">
              <p className="mb-2 text-sm font-medium text-zeluxe-black">
                অনুগ্রহ করে নিচের নাম্বারে টাকা পাঠিয়ে ট্রানজেকশন আইডি দিন:
              </p>

              <div className="mb-3 flex items-center justify-between rounded-lg border border-zeluxe-gold bg-white px-3 py-2">
                <span className="font-mono text-base font-bold tracking-wider text-zeluxe-black">
                  {PAYMENT_NUMBER}
                </span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  aria-label="পেমেন্ট নাম্বার কপি করুন"
                  className="p-1 text-zeluxe-gold transition hover:text-zeluxe-black"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                Transaction ID *
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                placeholder="যেমন: 9F7A2B1C4D"
                className={inputClass}
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
              নোট (ঐচ্ছিক)
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="বিশেষ নির্দেশনা..."
            />
          </div>
        </section>

        {/* Final Summary */}
        <section className="rounded-xl bg-zeluxe-black p-6 text-white">
          <div className="mb-4 space-y-2 text-sm">
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

            <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-green-400">
              <span>আপনার মোট লাভ:</span>
              <span>Tk {totalProfit.toLocaleString()}</span>
            </div>
          </div>

          <div className="mb-6 flex justify-between border-t border-white/20 pt-3 text-xl font-bold">
            <span>সর্বমোট বিল</span>
            <span className="text-zeluxe-gold">
              Tk {grandTotal.toLocaleString()}
            </span>
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

      {/* Product Search Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white">
            <div className="border-b border-zeluxe-lightgray p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zeluxe-black">
                  প্রোডাক্ট সিলেক্ট করুন
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  aria-label="মডাল বন্ধ করুন"
                  className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="নাম বা SKU দিয়ে খুঁজুন..."
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg py-2.5 pl-10 pr-4 text-sm focus:border-zeluxe-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package
                    className="mx-auto mb-2 text-gray-300"
                    size={32}
                  />
                  <p>কোনো প্রোডাক্ট পাওয়া যায়নি</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductSelect(product)}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-zeluxe-fieldbg"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zeluxe-lightgray bg-gray-50">
                        {product.imageUrl ? (
                          <img
                            src={
                              product.imageUrl.includes('res.cloudinary.com')
                                ? product.imageUrl.replace(
                                    '/upload/',
                                    '/upload/q_auto,f_auto,w_150/',
                                  )
                                : product.imageUrl
                            }
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package
                            className="m-auto h-full text-gray-300"
                            size={20}
                          />
                        )}
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-bold text-zeluxe-black">
                          {product.name}
                        </p>
                        <p className="font-mono text-[10px] text-gray-500">
                          {product.sku}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-zeluxe-gold">
                          রিসেলার মূল্য: Tk {product.resellerPrice}
                        </p>
                        <p className="text-xs text-gray-500">
                          স্টক: {product.stock} টি
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
