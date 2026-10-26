
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Loader2,
  Package,
  Copy,
  Download,
  Check,
  Minus,
  Plus,
  X,
  ChevronDown,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { downloadSingleImage } from '../lib/imageDownloader';

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  imageUrl: string;
  imageUrls: string[];
  colors: string[];
  sizes: string[];
  stock: number;
  resellerPrice: number;
  suggestedPrice: number;
  active: boolean;
};

const DISTRICTS = ['ঢাকার ভিতরে', 'ঢাকার বাইরে'];
const PAYMENT_METHODS = ['Cash on Delivery', 'bKash Advance', 'Full Advance'];

const inputClass =
  'w-full rounded-md border border-zeluxe-lightgray bg-white px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(() => {
    // @ts-ignore
    const cachedMap = window.__productDetailCache;

    if (id && cachedMap && cachedMap.has(id)) {
      const data = cachedMap.get(id);
      const imgUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';

      let urls: string[] = Array.isArray(data.imageUrls)
        ? data.imageUrls.filter((u: any) => typeof u === 'string')
        : [];

      if (urls.length === 0 && imgUrl) urls = [imgUrl];

      const colors: string[] = Array.isArray(data.colors)
        ? data.colors.filter((c: any) => typeof c === 'string')
        : [];

      const sizes: string[] = Array.isArray(data.sizes)
        ? data.sizes.filter((s: any) => typeof s === 'string')
        : [];

      return {
        id,
        name: typeof data.name === 'string' ? data.name : 'Product',
        sku: typeof data.sku === 'string' ? data.sku : '',
        category: typeof data.category === 'string' ? data.category : '',
        description: typeof data.description === 'string' ? data.description : '',
        imageUrl: imgUrl,
        imageUrls: urls,
        colors,
        sizes,
        stock: typeof data.stock === 'number' ? data.stock : 0,
        resellerPrice:
          typeof data.resellerPrice === 'number' ? data.resellerPrice : 0,
        suggestedPrice:
          typeof data.suggestedPrice === 'number' ? data.suggestedPrice : 0,
        active: true,
      };
    }

    return null;
  });

  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!product);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] || '');
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || '');

  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);

  // Cart state
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // Order modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('ঢাকার ভিতরে');
  const [sellingPrice, setSellingPrice] = useState(
    product ? String(product.suggestedPrice) : '',
  );
  const [deliveryCharge, setDeliveryCharge] = useState('70');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateCartState = () => {
    try {
      const cartStr = localStorage.getItem('zeluxe_cart');

      if (cartStr) {
        const cart = JSON.parse(cartStr);

        if (Array.isArray(cart)) {
          setCartCount(
            cart.reduce(
              (sum: number, item: any) => sum + (Number(item.quantity) || 0),
              0,
            ),
          );

          setCartTotal(
            cart.reduce(
              (sum: number, item: any) =>
                sum +
                (Number(item.sellingPrice) || 0) *
                  (Number(item.quantity) || 0),
              0,
            ),
          );
        }
      } else {
        setCartCount(0);
        setCartTotal(0);
      }
    } catch (e) {
      console.error('Cart state update failed:', e);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'products', id));

        if (!snap.exists()) {
          if (!cancelled) setProduct(null);
          return;
        }

        const data = snap.data();
        const imgUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';

        let urls: string[] = [];

        if (Array.isArray(data.imageUrls)) {
          urls = data.imageUrls.filter(
            (u: unknown): u is string => typeof u === 'string',
          );
        }

        if (urls.length === 0 && imgUrl) urls = [imgUrl];

        const colors: string[] = Array.isArray(data.colors)
          ? data.colors.filter(
              (c: unknown): c is string => typeof c === 'string',
            )
          : [];

        const sizes: string[] = Array.isArray(data.sizes)
          ? data.sizes.filter(
              (s: unknown): s is string => typeof s === 'string',
            )
          : [];

        const loadedProduct: Product = {
          id: snap.id,
          name: typeof data.name === 'string' ? data.name : 'Product',
          sku: typeof data.sku === 'string' ? data.sku : '',
          category: typeof data.category === 'string' ? data.category : '',
          description:
            typeof data.description === 'string' ? data.description : '',
          imageUrl: imgUrl,
          imageUrls: urls,
          colors,
          sizes,
          stock: typeof data.stock === 'number' ? data.stock : 0,
          resellerPrice:
            typeof data.resellerPrice === 'number' ? data.resellerPrice : 0,
          suggestedPrice:
            typeof data.suggestedPrice === 'number'
              ? data.suggestedPrice
              : 0,
          active: typeof data.active === 'boolean' ? data.active : true,
        };

        if (!cancelled) {
          setProduct(loadedProduct);
          setSellingPrice((current) =>
            current || String(loadedProduct.suggestedPrice),
          );

          setSelectedColor((current) =>
            current || colors[0] || '',
          );

          setSelectedSize((current) =>
            current || sizes[0] || '',
          );
        }

        if (loadedProduct.category) {
          try {
            const relQ = query(
              collection(db, 'products'),
              where('category', '==', loadedProduct.category),
              where('active', '==', true),
              limit(6),
            );

            const relSnap = await getDocs(relQ);

            const related: Product[] = relSnap.docs
              .filter((d) => d.id !== loadedProduct.id)
              .slice(0, 4)
              .map((d) => {
                const rData = d.data();
                const rImg =
                  typeof rData.imageUrl === 'string' ? rData.imageUrl : '';

                return {
                  id: d.id,
                  name: typeof rData.name === 'string' ? rData.name : 'Product',
                  sku: typeof rData.sku === 'string' ? rData.sku : '',
                  category:
                    typeof rData.category === 'string' ? rData.category : '',
                  description: '',
                  imageUrl: rImg,
                  imageUrls: rImg ? [rImg] : [],
                  colors: [],
                  sizes: [],
                  stock: typeof rData.stock === 'number' ? rData.stock : 0,
                  resellerPrice:
                    typeof rData.resellerPrice === 'number'
                      ? rData.resellerPrice
                      : 0,
                  suggestedPrice:
                    typeof rData.suggestedPrice === 'number'
                      ? rData.suggestedPrice
                      : 0,
                  active: true,
                };
              });

            if (!cancelled) setRelatedProducts(related);
          } catch (relErr) {
            console.error('Related load failed:', relErr);
          }
        }
      } catch (err) {
        console.error('Product load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProduct();
    updateCartState();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;

    if (product.active === false || product.stock <= 0) {
      toast.error('প্রোডাক্টটি বর্তমানে বিক্রির জন্য উপলব্ধ নয়');
      return;
    }

    if (product.sizes.length > 0 && !selectedSize) {
      toast.error('অনুগ্রহ করে সাইজ সিলেক্ট করুন');
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error('সঠিক পণ্যের পরিমাণ দিন');
      return;
    }

    if (quantity > product.stock) {
      toast.error(`পর্যাপ্ত স্টক নেই। বর্তমানে স্টক: ${product.stock}টি`);
      return;
    }

    const price = Number(sellingPrice) || product.suggestedPrice;

    if (!Number.isFinite(price) || price <= 0) {
      toast.error('সঠিক বিক্রয় মূল্য দিন');
      return;
    }

    const newItem = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      imageUrl: product.imageUrl,
      size: selectedSize || 'N/A',
      quantity,
      sellingPrice: price,
      resellerPrice: product.resellerPrice,
    };

    try {
      const existingCartStr = localStorage.getItem('zeluxe_cart');
      let existingCart: any[] = [];

      if (existingCartStr) {
        const parsed = JSON.parse(existingCartStr);
        if (Array.isArray(parsed)) existingCart = parsed;
      }

      const existingIdx = existingCart.findIndex(
        (item: any) =>
          item.productId === newItem.productId &&
          item.size === newItem.size,
      );

      if (existingIdx > -1) {
        const newQuantity =
          (Number(existingCart[existingIdx].quantity) || 0) +
          newItem.quantity;

        if (newQuantity > product.stock) {
          toast.error(`পর্যাপ্ত স্টক নেই। বর্তমানে স্টক: ${product.stock}টি`);
          return;
        }

        existingCart[existingIdx].quantity = newQuantity;
        existingCart[existingIdx].sellingPrice = price;
        existingCart[existingIdx].resellerPrice = product.resellerPrice;
      } else {
        existingCart.push(newItem);
      }

      localStorage.setItem('zeluxe_cart', JSON.stringify(existingCart));
      toast.success('✓ কার্টে যোগ হয়েছে!');
      updateCartState();
    } catch (err) {
      console.error('Add to cart failed:', err);
      toast.error('কার্টে যোগ করতে সমস্যা হয়েছে');
    }
  };

  const numQty = Number(quantity) || 0;
  const numSelling = Number(sellingPrice) || 0;
  const numDiscount = Number(discount) || 0;
  const numDelivery = Number(deliveryCharge) || 0;

  const profit = product
    ? (numSelling - product.resellerPrice) * numQty
    : 0;

  const itemTotal = numQty * numSelling;
  const total = itemTotal + numDelivery - numDiscount;

  const handleCopyDetails = async () => {
    if (!product) return;

    const colorLine = selectedColor ? `\nকালার: ${selectedColor}` : '';
    const sizeLine = selectedSize ? `\nসাইজ: ${selectedSize}` : '';

    const text = `${product.name}\n${product.sku}${colorLine}${sizeLine}\n\n${product.description}\n\nদাম: Tk ${product.suggestedPrice}\n\nZeluxe Gallery`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('✓ প্রোডাক্টের বিবরণ কপি হয়েছে!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('কপি করা যায়নি');
    }
  };

  const handleDownloadSingle = async (url: string, idx: number) => {
    if (!product) return;

    setDownloadingIdx(idx);

    try {
      await downloadSingleImage(url, `${product.sku}-${idx + 1}.jpg`);
    } finally {
      setDownloadingIdx(null);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      navigate('/login');
      return;
    }

    if (!product) return;

    if (
      !customerName.trim() ||
      !customerPhone.trim() ||
      !address.trim() ||
      !sellingPrice
    ) {
      toast.error('সব প্রয়োজনীয় তথ্য দিন');
      return;
    }

    if (product.sizes.length > 0 && !selectedSize) {
      toast.error('অনুগ্রহ করে সাইজ সিলেক্ট করুন');
      return;
    }

    if (!Number.isFinite(numSelling) || numSelling <= 0) {
      toast.error('সঠিক বিক্রয় মূল্য দিন');
      return;
    }

    if (!Number.isInteger(numQty) || numQty < 1) {
      toast.error('সঠিক পণ্যের পরিমাণ দিন');
      return;
    }

    if (
      !Number.isFinite(numDelivery) ||
      numDelivery < 0 ||
      !Number.isFinite(numDiscount) ||
      numDiscount < 0
    ) {
      toast.error('ডেলিভারি চার্জ বা ডিসকাউন্ট সঠিক নয়');
      return;
    }

    if (numDiscount > itemTotal + numDelivery) {
      toast.error('ডিসকাউন্ট মোট মূল্যের চেয়ে বেশি হতে পারবে না');
      return;
    }

    setSubmitting(true);

    try {
      // Firebase থেকে সর্বশেষ পণ্যের তথ্য ও reseller price যাচাই
      const productRef = doc(db, 'products', product.id);
      const latestProductSnap = await getDoc(productRef);

      if (!latestProductSnap.exists()) {
        toast.error('প্রোডাক্টটি আর পাওয়া যাচ্ছে না');
        return;
      }

      const latestProduct = latestProductSnap.data();
      const currentStock = latestProduct.stock;

      if (latestProduct.active === false) {
        toast.error('প্রোডাক্টটি বর্তমানে বিক্রির জন্য বন্ধ');
        return;
      }

      if (
        typeof currentStock !== 'number' ||
        !Number.isFinite(currentStock) ||
        currentStock < 0
      ) {
        toast.error('প্রোডাক্টের স্টক তথ্য সঠিক নয়');
        return;
      }

      if (numQty > currentStock) {
        toast.error(`পর্যাপ্ত স্টক নেই। বর্তমানে স্টক: ${currentStock}টি`);
        return;
      }

      if (
        typeof latestProduct.resellerPrice !== 'number' ||
        !Number.isFinite(latestProduct.resellerPrice) ||
        latestProduct.resellerPrice < 0
      ) {
        toast.error('প্রোডাক্টের reseller price সঠিক নয়');
        return;
      }

      // সর্বশেষ Firebase reseller price ব্যবহার করা হচ্ছে।
      const verifiedResellerPrice = latestProduct.resellerPrice;

      // অর্ডার নম্বর তৈরি
      const counterRef = doc(db, 'settings', 'orderCounter');
      const counterSnap = await getDoc(counterRef);
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const currentMonth = `${year}${month}`;

      let sequence = 1;

      if (counterSnap.exists()) {
        const data = counterSnap.data();

        if (data.currentMonth === currentMonth) {
          sequence = (data.currentSequence || 0) + 1;
        }
      }

      const orderId = `ZEL-${currentMonth}-${sequence
        .toString()
        .padStart(4, '0')}`;

      await addDoc(collection(db, 'orders'), {
        orderId,
        resellerId: user.uid,
        resellerEmail: user.email,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        district,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productColor: selectedColor || '',
        productSize: selectedSize || '',
        quantity: numQty,

        // Rules-এ products/{productId}.resellerPrice-এর সঙ্গে যাচাই হবে।
        resellerPrice: verifiedResellerPrice,

        sellingPrice: numSelling,
        deliveryCharge: numDelivery,
        discount: numDiscount,
        total: Number(total),
        paymentMethod,
        note: note.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await setDoc(
        counterRef,
        {
          currentMonth,
          currentSequence: sequence,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      toast.success('✓ অর্ডার সফলভাবে তৈরি হয়েছে!');
      setOrderModalOpen(false);
      navigate('/orders');
    } catch (err) {
      console.error('Order creation failed:', err);
      toast.error(
        'অর্ডার তৈরি করা যায়নি: ' +
          (err instanceof Error ? err.message : 'Unknown error'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !product) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-lg border border-dashed border-zeluxe-lightgray bg-white p-12 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-sm text-gray-600">প্রোডাক্ট পাওয়া যায়নি</p>
        <Link
          to="/products"
          className="mt-4 inline-block text-sm font-bold text-zeluxe-gold hover:underline"
        >
          ← প্রোডাক্টে ফিরে যান
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-24 transform-gpu transition-all">
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-zeluxe-gold"
      >
        <ArrowLeft size={16} />
        সব প্রোডাক্ট
      </Link>

      <div className="rounded-lg border border-zeluxe-lightgray bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {/* LEFT — Images */}
          <div>
            <div className="group relative overflow-hidden rounded-lg border border-zeluxe-lightgray bg-zeluxe-cream">
              <div className="relative aspect-square">
                {product.imageUrls.length > 0 ? (
                  <>
                    <img
                      src={product.imageUrls[activeImage]}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 transform-gpu"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadSingle(
                          product.imageUrls[activeImage],
                          activeImage,
                        )
                      }
                      disabled={downloadingIdx === activeImage}
                      className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zeluxe-black shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95 disabled:opacity-50"
                      title="এই ছবিটি ডাউনলোড করুন"
                    >
                      {downloadingIdx === activeImage ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Download size={20} />
                      )}
                    </button>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-16 w-16 text-gray-300" />
                  </div>
                )}
              </div>
            </div>

            {product.imageUrls.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {product.imageUrls.map((url, idx) => (
                  <div key={idx} className="group relative">
                    <button
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      className={`aspect-square w-full overflow-hidden rounded-md border-2 transition ${
                        activeImage === idx
                          ? 'border-zeluxe-gold'
                          : 'border-transparent'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`${product.name} ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDownloadSingle(url, idx);
                      }}
                      disabled={downloadingIdx === idx}
                      className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded bg-zeluxe-black/70 text-white backdrop-blur-sm transition hover:bg-zeluxe-black disabled:opacity-50"
                      title="এই ছবিটি ডাউনলোড করুন"
                    >
                      {downloadingIdx === idx ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Product Info */}
          <div>
            <h1 className="text-xl font-bold text-zeluxe-black md:text-2xl">
              {product.name}
            </h1>

            <p className="mt-1 font-mono text-xs text-gray-500">
              SKU: {product.sku}
            </p>

            <div className="mt-4 rounded-md border border-zeluxe-lightgray bg-zeluxe-cream p-4">
              <label className="mb-2 block text-xs font-medium text-gray-600">
                Variation &amp; Price:
              </label>

              {product.colors.length > 0 && (
                <div className="relative mb-3">
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full appearance-none rounded-md border border-zeluxe-lightgray bg-white px-3 py-2.5 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
                  >
                    {product.colors.map((c) => (
                      <option key={c} value={c}>
                        Color: {c}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              )}

              {product.sizes.length > 0 && (
                <div className="relative mb-3">
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full appearance-none rounded-md border border-zeluxe-lightgray bg-white px-3 py-2.5 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
                  >
                    {product.sizes.map((s) => (
                      <option key={s} value={s}>
                        Size: {s}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              )}

              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Color:</span>
                <span className="font-medium text-zeluxe-black">
                  {selectedColor || '—'}
                </span>
              </div>

              <div className="mt-1.5 flex justify-between text-xs">
                <span className="text-gray-500">Size:</span>
                <span className="font-medium text-zeluxe-black">
                  {selectedSize || '—'}
                </span>
              </div>

              <div className="mt-1.5 flex justify-between text-xs">
                <span className="text-gray-500">Price:</span>
                <span className="font-bold text-zeluxe-black">
                  Tk {product.resellerPrice.toLocaleString()}
                </span>
              </div>

              <div className="mt-1.5 flex justify-between text-xs">
                <span className="text-gray-500">Customer / Retail Price:</span>
                <span className="font-bold text-zeluxe-gold">
                  Tk {product.suggestedPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                আপনার বিক্রয় মূল্য (Tk)
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={sellingPrice}
                onChange={(e) =>
                  setSellingPrice(e.target.value.replace(/[^0-9]/g, ''))
                }
                className="w-full rounded-md border border-zeluxe-lightgray bg-white px-4 py-3 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
              />

              <p className="mt-1 text-[11px] text-gray-500">
                আপনার ক্রয় মূল্য:{' '}
                <span className="font-bold text-zeluxe-black">
                  Tk {product.resellerPrice}
                </span>
              </p>
            </div>

            <div className="mt-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-medium text-zeluxe-black">
                  পরিমাণ:
                </span>

                <div className="flex items-center rounded-md border border-zeluxe-lightgray bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 text-zeluxe-black transition hover:bg-zeluxe-cream"
                    aria-label="পরিমাণ কমান"
                  >
                    <Minus size={16} />
                  </button>

                  <span className="min-w-[32px] text-center text-sm font-bold text-zeluxe-black">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(product.stock, q + 1))
                    }
                    disabled={quantity >= product.stock}
                    className="p-2 text-zeluxe-black transition hover:bg-zeluxe-cream disabled:opacity-40"
                    aria-label="পরিমাণ বাড়ান"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <span className="text-xs text-gray-500">
                  স্টক: {product.stock}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0 || product.active === false}
                  className="flex items-center justify-center gap-2 rounded-md border border-zeluxe-black bg-white py-3 text-sm font-bold text-zeluxe-black transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <ShoppingCart size={16} />
                  Add to Cart
                </button>

                <button
                  type="button"
                  onClick={() => setOrderModalOpen(true)}
                  disabled={product.stock <= 0 || product.active === false}
                  className="flex items-center justify-center gap-2 rounded-md bg-zeluxe-black py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
                >
                  <Package size={16} />
                  Order Now
                </button>
              </div>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-zeluxe-lightgray bg-white py-3 text-xs font-bold text-zeluxe-black transition hover:border-zeluxe-gold"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-600" />
                    কপি হয়েছে
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy Details
                  </>
                )}
              </button>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold text-zeluxe-black">
                Description
              </h3>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {product.description || 'প্রোডাক্টের কোনো বিবরণ নেই।'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-zeluxe-black">
            Related Products
          </h2>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {relatedProducts.map((rp) => (
              <Link
                key={rp.id}
                to={`/products/${rp.id}`}
                className="group overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white transition hover:border-zeluxe-gold"
              >
                <div className="aspect-square bg-zeluxe-cream">
                  {rp.imageUrl ? (
                    <img
                      src={rp.imageUrl}
                      alt={rp.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <p className="line-clamp-2 text-xs font-bold text-zeluxe-black">
                    {rp.name}
                  </p>

                  <p className="mt-1.5 text-[11px] text-gray-500">
                    Price:{' '}
                    <span className="font-bold text-zeluxe-black">
                      Tk {rp.resellerPrice.toLocaleString()}
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Floating Cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
          <button
            type="button"
            onClick={() => navigate('/orders/new')}
            className="flex w-full items-center justify-between rounded-2xl bg-zeluxe-black px-5 py-4 text-white shadow-2xl transition hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <ShoppingCart size={20} className="text-zeluxe-gold" />

                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zeluxe-gold text-[10px] font-bold text-zeluxe-black shadow-sm">
                  {cartCount}
                </span>
              </div>

              <div className="text-left">
                <p className="text-sm font-bold">কার্ট দেখুন</p>
                <p className="text-xs text-gray-300">{cartCount} টি আইটেম</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-300">মোট দাম</p>
              <p className="text-sm font-bold text-zeluxe-gold">
                Tk {cartTotal.toLocaleString()}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Order Modal */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zeluxe-black">
                অর্ডার করুন
              </h2>

              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-zeluxe-cream"
                aria-label="বন্ধ করুন"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-zeluxe-lightgray bg-white p-3 shadow-sm">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-zeluxe-lightgray bg-zeluxe-cream">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package size={20} className="text-gray-400" />
                    </div>
                  )}

                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zeluxe-black text-[10px] font-bold text-white shadow-sm">
                    {quantity}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="line-clamp-2 text-sm font-bold text-zeluxe-black">
                    {product.name}
                  </p>

                  <p className="mt-0.5 font-mono text-[10px] text-gray-500">
                    SKU: {product.sku}
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                    {selectedColor && (
                      <span className="rounded border border-zeluxe-lightgray bg-zeluxe-cream px-2 py-1 font-medium text-gray-700">
                        Color: {selectedColor}
                      </span>
                    )}

                    {selectedSize && (
                      <span className="rounded border border-zeluxe-lightgray bg-zeluxe-cream px-2 py-1 font-medium text-gray-700">
                        Size: {selectedSize}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  কাস্টমারের নাম *
                </label>

                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="পূর্ণ নাম"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  মোবাইল নাম্বার *
                </label>

                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  ঠিকানা *
                </label>

                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  maxLength={500}
                  rows={2}
                  placeholder="সম্পূর্ণ ঠিকানা"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  এলাকা
                </label>

                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setDeliveryCharge(
                      e.target.value === 'ঢাকার ভিতরে' ? '70' : '120',
                    );
                  }}
                  className={inputClass}
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                    বিক্রয় মূল্য (Tk)
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                    ডিসকাউন্ট (Tk)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>

              {numSelling > 0 && (
                <div
                  className={`flex items-center justify-between rounded-md p-3 ${
                    profit >= 0
                      ? 'border border-green-200 bg-green-50'
                      : 'border border-red-200 bg-red-50'
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      profit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {profit >= 0 ? 'আপনার লাভ:' : 'লস হচ্ছে:'}
                  </span>

                  <span
                    className={`text-base font-bold ${
                      profit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    Tk {Math.abs(profit)}
                  </span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  পেমেন্ট পদ্ধতি
                </label>

                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  নোট (ঐচ্ছিক)
                </label>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="বিশেষ নির্দেশনা..."
                  className={inputClass}
                />
              </div>

              <div className="rounded-md bg-zeluxe-black p-4 text-white">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">আইটেম মোট</span>
                    <span>Tk {itemTotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">ডেলিভারি</span>
                    <span>Tk {numDelivery.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">ডিসকাউন্ট</span>
                    <span>-Tk {numDiscount.toLocaleString()}</span>
                  </div>

                  <div className="my-2 border-t border-white/20" />

                  <div className="flex justify-between text-sm font-bold">
                    <span>সর্বমোট</span>
                    <span className="text-zeluxe-gold">
                      Tk {total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-zeluxe-gold py-3 text-sm font-bold text-zeluxe-black transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    অর্ডার হচ্ছে...
                  </span>
                ) : (
                  '✓ অর্ডার কনফার্ম করুন'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
