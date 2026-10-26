import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
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
const PAYMENT_METHODS = [
  'Cash on Delivery',
  'bKash Advance',
  'Full Advance',
];
const PAYMENT_NUMBER = '01603226151';

const inputClass =
  'w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold';

const formatMoney = (amount: number) =>
  `৳${amount.toLocaleString('en-BD')}`;

export default function CreateOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetProductId = searchParams.get('productId');
  const submittingRef = useRef(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [pastCustomers, setPastCustomers] = useState<
    Record<string, PastCustomer>
  >({});
  const [isAutofilled, setIsAutofilled] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState(
    presetProductId || '',
  );
  const [currentSize, setCurrentSize] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [currentSellingPrice, setCurrentSellingPrice] = useState('');

  const [deliveryCharge, setDeliveryCharge] = useState('70');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(
    'Cash on Delivery',
  );
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const [productsSnapshot, ordersSnapshot] = await Promise.all([
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

        const loadedProducts: Product[] =
          productsSnapshot.docs.map((productDoc) => {
            const data = productDoc.data();

            return {
              id: productDoc.id,
              name:
                typeof data.name === 'string'
                  ? data.name
                  : 'Unnamed Product',
              sku: typeof data.sku === 'string' ? data.sku : '',
              imageUrl:
                typeof data.imageUrl === 'string'
                  ? data.imageUrl
                  : '',
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
              sizes: Array.isArray(data.sizes)
                ? data.sizes.filter(
                    (size: unknown): size is string =>
                      typeof size === 'string',
                  )
                : [],
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
          });

        const customers: Record<string, PastCustomer> = {};

        ordersSnapshot.docs.forEach((orderDoc) => {
          const data = orderDoc.data();

          if (data.customerPhone && data.customerName) {
            customers[String(data.customerPhone)] = {
              name: String(data.customerName),
              address:
                typeof data.address === 'string'
                  ? data.address
                  : '',
              district:
                typeof data.district === 'string'
                  ? data.district
                  : DISTRICTS[0],
            };
          }
        });

        if (cancelled) return;

        setProducts(loadedProducts);
        setPastCustomers(customers);

        if (presetProductId) {
          const preset = loadedProducts.find(
            (product) => product.id === presetProductId,
          );

          if (preset) {
            setCurrentProductId(preset.id);
            setCurrentSellingPrice(
              String(preset.suggestedPrice || ''),
            );
            setCurrentSize(preset.sizes[0] || '');
          }
        }
      } catch (error) {
        console.error('Failed to load order data:', error);
        if (!cancelled) {
          toast.error('প্রোডাক্ট বা অর্ডারের তথ্য লোড করা যায়নি।');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    try {
      const savedCart = localStorage.getItem('zeluxe_cart');

      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);

        if (Array.isArray(parsed)) {
          const validCart = parsed.filter(
            (item): item is CartItem =>
              item !== null &&
              typeof item === 'object' &&
              typeof item.productId === 'string' &&
              typeof item.name === 'string' &&
              typeof item.quantity === 'number' &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              typeof item.sellingPrice === 'number' &&
              typeof item.resellerPrice === 'number',
          );

          setCart(validCart);
        }
      }
    } catch (error) {
      console.error('Failed to restore cart:', error);
    }

    return () => {
      cancelled = true;
    };
  }, [presetProductId]);

  const selectedProduct = products.find(
    (product) => product.id === currentProductId,
  );

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search),
    );
  }, [products, productSearch]);

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
  const grandTotal =
    totalItemPrice + numDeliveryCharge - numDiscount;

  const handlePhoneChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const phone = event.target.value.replace(/\D/g, '').slice(0, 11);

    setCustomerPhone(phone);
    setIsAutofilled(false);

    if (phone.length === 11 && pastCustomers[phone]) {
      const customer = pastCustomers[phone];

      setCustomerName(customer.name);
      setAddress(customer.address);
      setDistrict(customer.district);
      setDeliveryCharge(
        customer.district === DISTRICTS[0] ? '70' : '120',
      );
      setIsAutofilled(true);

      toast.info('আগের কাস্টমারের তথ্য পূরণ করা হয়েছে।');
    }
  };

  const handleProductSelect = (product: Product) => {
    setCurrentProductId(product.id);
    setCurrentSellingPrice(
      String(product.suggestedPrice || ''),
    );
    setCurrentSize(product.sizes[0] || '');
    setCurrentQuantity('1');
    setIsProductModalOpen(false);
    setProductSearch('');
  };

  const handleAddToCart = () => {
    if (!selectedProduct) {
      toast.error('প্রোডাক্ট সিলেক্ট করুন।');
      return;
    }

    const quantity = Number(currentQuantity);
    const sellingPrice = Number(currentSellingPrice);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      toast.error('সঠিক পরিমাণ লিখুন।');
      return;
    }

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice <= 0
    ) {
      toast.error('সঠিক বিক্রয় মূল্য লিখুন।');
      return;
    }

    if (
      selectedProduct.sizes.length > 0 &&
      !currentSize
    ) {
      toast.error('সাইজ সিলেক্ট করুন।');
      return;
    }

    const existingQuantity = cart
      .filter((item) => item.productId === selectedProduct.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (existingQuantity + quantity > selectedProduct.stock) {
      toast.error(
        `পর্যাপ্ত স্টক নেই। বর্তমানে স্টক: ${selectedProduct.stock}`,
      );
      return;
    }

    if (cart.length >= 5) {
      toast.error('একটি অর্ডারে সর্বোচ্চ ৫টি আইটেম রাখা যাবে।');
      return;
    }

    const item: CartItem = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      imageUrl: selectedProduct.imageUrl,
      size: currentSize,
      quantity,
      sellingPrice,
      resellerPrice: selectedProduct.resellerPrice,
      purchaseCost: selectedProduct.purchaseCost,
      sourceUrl: selectedProduct.sourceUrl,
    };

    const updatedCart = [...cart, item];

    setCart(updatedCart);
    localStorage.setItem(
      'zeluxe_cart',
      JSON.stringify(updatedCart),
    );

    setCurrentProductId('');
    setCurrentSize('');
    setCurrentQuantity('1');
    setCurrentSellingPrice('');

    toast.success('প্রোডাক্ট কার্টে যোগ হয়েছে।');
  };

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
    localStorage.setItem(
      'zeluxe_cart',
      JSON.stringify(updatedCart),
    );
  };

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_NUMBER);
      setCopied(true);
      toast.success('পেমেন্ট নাম্বার কপি হয়েছে।');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('নাম্বার কপি করা যায়নি। হাতে কপি করুন।');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submittingRef.current) return;

    const user = auth.currentUser;

    if (!user) {
      toast.error('অর্ডার করতে লগইন করুন।');
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      toast.error('কমপক্ষে একটি প্রোডাক্ট যোগ করুন।');
      return;
    }

    if (cart.length > 5) {
      toast.error('একটি অর্ডারে সর্বোচ্চ ৫টি আইটেম রাখা যাবে।');
      return;
    }

    if (
      !customerName.trim() ||
      !customerPhone.trim() ||
      !address.trim()
    ) {
      toast.error('কাস্টমারের নাম, ফোন ও ঠিকানা পূরণ করুন।');
      return;
    }

    if (!/^01[0-9]{9}$/.test(customerPhone)) {
      toast.error('সঠিক ১১ সংখ্যার বাংলাদেশি ফোন নম্বর দিন।');
      return;
    }

    if (
      !Number.isFinite(numDiscount) ||
      numDiscount < 0 ||
      numDiscount > totalItemPrice + numDeliveryCharge
    ) {
      toast.error('ডিসকাউন্টের পরিমাণ সঠিক নয়।');
      return;
    }

    if (
      !Number.isFinite(numDeliveryCharge) ||
      numDeliveryCharge < 0
    ) {
      toast.error('ডেলিভারি চার্জ সঠিক নয়।');
      return;
    }

    if (grandTotal < 0) {
      toast.error('অর্ডারের মোট বিল ঋণাত্মক হতে পারে না।');
      return;
    }

    if (
      (paymentMethod === 'bKash Advance' ||
        paymentMethod === 'Full Advance') &&
      !transactionId.trim()
    ) {
      toast.error('ট্রানজেকশন আইডি দিন।');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const quantities = new Map<string, number>();

      for (const item of cart) {
        quantities.set(
          item.productId,
          (quantities.get(item.productId) || 0) + item.quantity,
        );
      }

      // অর্ডার জমা দেওয়ার ঠিক আগে বর্তমান প্রোডাক্ট ও স্টক যাচাই।
      for (const [productId, quantity] of quantities.entries()) {
        const productRef = doc(db, 'products', productId);
        const productSnapshot = await getDoc(productRef);

        if (!productSnapshot.exists()) {
          throw new Error('একটি প্রোডাক্ট আর পাওয়া যাচ্ছে না।');
        }

        const latest = productSnapshot.data();

        if (latest.active === false) {
          throw new Error('একটি প্রোডাক্ট নিষ্ক্রিয় করা হয়েছে।');
        }

        if (
          typeof latest.stock !== 'number' ||
          !Number.isFinite(latest.stock) ||
          latest.stock < quantity
        ) {
          throw new Error(
            `“${latest.name || 'প্রোডাক্ট'}”-এর পর্যাপ্ত স্টক নেই।`,
          );
        }

        const cartItemsForProduct = cart.filter(
          (item) => item.productId === productId,
        );

        for (const item of cartItemsForProduct) {
          if (
            typeof latest.resellerPrice !== 'number' ||
            latest.resellerPrice !== item.resellerPrice
          ) {
            throw new Error(
              `“${item.name}”-এর রিসেলার মূল্য পরিবর্তিত হয়েছে। প্রোডাক্টটি আবার যোগ করুন।`,
            );
          }
        }
      }

      const orderId = await generateOrderId();

      const orderItems = cart.map((item) => ({
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
      }));

      await addDoc(collection(db, 'orders'), {
        orderId,
        resellerId: user.uid,
        resellerEmail: user.email || '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        district,
        items: orderItems,

        // পুরোনো সিস্টেমের single-product compatibility।
        productId: cart[0].productId,
        productName: cart[0].name,
        size: cart[0].size,
        quantity: cart[0].quantity,
        sellingPrice: cart[0].sellingPrice,
        resellerPrice: cart[0].resellerPrice,

        itemTotal: totalItemPrice,
        profit: totalProfit,
        deliveryCharge: numDeliveryCharge,
        discount: numDiscount,
        total: grandTotal,

        paymentMethod,
        transactionId: transactionId.trim(),
        note: note.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      localStorage.removeItem('zeluxe_cart');
      setCart([]);

      toast.success(`অর্ডার সফল হয়েছে! অর্ডার আইডি: ${orderId}`);
      navigate('/orders');
    } catch (error) {
      console.error('Order creation failed:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'অর্ডার তৈরি করা যায়নি। আবার চেষ্টা করুন।';

      toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
        <span className="ml-3">লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zeluxe-black">
          নতুন অর্ডার তৈরি করুন
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          কাস্টমারের তথ্য দিন, প্রোডাক্ট যোগ করুন এবং অর্ডার কনফার্ম করুন।
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-zeluxe-black">
            কাস্টমারের তথ্য
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                কাস্টমারের নাম *
              </label>
              <input
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={inputClass}
                placeholder="সম্পূর্ণ নাম"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                মোবাইল নম্বর *
              </label>
              <input
                required
                inputMode="numeric"
                value={customerPhone}
                onChange={handlePhoneChange}
                className={inputClass}
                placeholder="01XXXXXXXXX"
                maxLength={11}
              />
              {isAutofilled && (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <UserCheck size={14} />
                  আগের কাস্টমারের তথ্য পাওয়া গেছে
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                সম্পূর্ণ ঠিকানা *
              </label>
              <textarea
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
                placeholder="বাসা, রোড, এলাকা..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">
                ডেলিভারি এলাকা *
              </label>
              <select
                value={district}
                onChange={(e) => {
                  const value = e.target.value;
                  setDistrict(value);
                  setDeliveryCharge(
                    value === 'ঢাকার ভিতরে' ? '70' : '120',
                  );
                }}
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

        <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-zeluxe-black">
              প্রোডাক্ট নির্বাচন
            </h2>
            <button
              type="button"
              onClick={() => setIsProductModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-zeluxe-gold px-4 py-2.5 text-sm font-bold text-zeluxe-black"
            >
              <Search size={16} />
              প্রোডাক্ট খুঁজুন
            </button>
          </div>

          {selectedProduct ? (
            <div className="rounded-xl border border-zeluxe-lightgray p-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="m-auto h-full text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-500">
                    SKU: {selectedProduct.sku || 'N/A'}
                  </p>
                  <p className="mt-1 text-sm">
                    রিসেলার মূল্য: {formatMoney(selectedProduct.resellerPrice)}
                  </p>
                  <p className="text-xs text-gray-500">
                    স্টক: {selectedProduct.stock}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentProductId('')}
                  aria-label="প্রোডাক্ট সরান"
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedProduct.sizes.length > 0 && (
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium">
                    সাইজ *
                  </label>
                  <select
                    value={currentSize}
                    onChange={(e) => setCurrentSize(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">সাইজ বাছাই করুন</option>
                    {selectedProduct.sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    পরিমাণ *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.stock}
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    বিক্রয় মূল্য (৳) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={currentSellingPrice}
                    onChange={(e) =>
                      setCurrentSellingPrice(e.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zeluxe-black px-4 py-3 text-sm font-bold text-white"
              >
                <Plus size={18} />
                কার্টে যোগ করুন
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsProductModalOpen(true)}
              className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-gray-300 p-8 text-gray-500"
            >
              <Package size={32} />
              <span className="mt-2 text-sm">
                প্রোডাক্ট নির্বাচন করতে এখানে চাপ দিন
              </span>
            </button>
          )}
        </section>

        {cart.length > 0 && (
          <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">
              কার্ট ({cart.length}/5)
            </h2>

            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 p-3"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="m-auto h-full text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.size ? `সাইজ: ${item.size} · ` : ''}
                      পরিমাণ: {item.quantity}
                    </p>
                    <p className="mt-1 text-sm">
                      {formatMoney(item.sellingPrice)} × {item.quantity}
                    </p>
                    <p className="text-xs text-green-600">
                      লাভ: {formatMoney(
                        (item.sellingPrice - item.resellerPrice) *
                          item.quantity,
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(index)}
                    aria-label="কার্ট থেকে সরান"
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-zeluxe-lightgray bg-white p-5">
          <h2 className="mb-4 text-lg font-bold">
            পেমেন্ট ও সামারি
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                ডেলিভারি চার্জ (৳)
              </label>
              <input
                readOnly
                value={deliveryCharge}
                className={`${inputClass} bg-gray-100`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                ডিসকাউন্ট (৳)
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">
              পেমেন্ট মেথড
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
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
            <div className="mb-4 rounded-xl border border-zeluxe-gold bg-yellow-50 p-4">
              <p className="mb-2 text-sm">
                নিচের নাম্বারে টাকা পাঠিয়ে ট্রানজেকশন আইডি দিন:
              </p>

              <div className="mb-3 flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                <span className="font-mono font-bold">
                  {PAYMENT_NUMBER}
                </span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  aria-label="পেমেন্ট নাম্বার কপি"
                  className="p-1"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <label className="mb-1 block text-sm font-medium">
                Transaction ID *
              </label>
              <input
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className={inputClass}
                placeholder="ট্রানজেকশন আইডি"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              নোট (ঐচ্ছিক)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
              placeholder="বিশেষ নির্দেশনা..."
            />
          </div>
        </section>

        <section className="rounded-xl bg-zeluxe-black p-5 text-white sm:p-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">মোট আইটেম</span>
              <span>{cart.length} টি</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">আইটেমের মোট দাম</span>
              <span>{formatMoney(totalItemPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">ডেলিভারি চার্জ</span>
              <span>{formatMoney(numDeliveryCharge)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">ডিসকাউন্ট</span>
              <span>-{formatMoney(numDiscount)}</span>
            </div>
            <div className="flex justify-between border-t border-white/20 pt-3 font-bold text-green-400">
              <span>মোট লাভ</span>
              <span>{formatMoney(totalProfit)}</span>
            </div>
            <div className="flex justify-between border-t border-white/20 pt-4 text-xl font-bold">
              <span>সর্বমোট বিল</span>
              <span className="text-zeluxe-gold">
                {formatMoney(grandTotal)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || cart.length === 0}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-zeluxe-gold py-4 text-sm font-bold text-zeluxe-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                অর্ডার তৈরি হচ্ছে...
              </>
            ) : (
              '✓ অর্ডার কনফার্ম করুন'
            )}
          </button>
        </section>
      </form>

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white">
            <div className="border-b border-gray-200 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  প্রোডাক্ট নির্বাচন করুন
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  aria-label="মডাল বন্ধ করুন"
                  className="rounded-full p-2 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  autoFocus
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="প্রোডাক্টের নাম বা SKU দিয়ে খুঁজুন..."
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-zeluxe-gold"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package size={32} className="mx-auto mb-2" />
                  কোনো প্রোডাক্ট পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductSelect(product)}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-gray-50"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="m-auto h-full text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          SKU: {product.sku || 'N/A'}
                        </p>
                        <p className="mt-1 text-xs font-medium">
                          রিসেলার মূল্য: {formatMoney(product.resellerPrice)}
                        </p>
                        <p className="text-xs text-gray-500">
                          স্টক: {product.stock}
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