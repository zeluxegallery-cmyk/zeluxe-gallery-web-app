import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
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
  ChevronDown,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
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
  purchaseCost?: number;
  active: boolean;
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // পূর্ববর্তী পেজ থেকে আসা ক্যাটাগরি বা সেশন থেকে রিড করা
  const previousCategory =
    (location.state as { fromCategory?: string } | null)?.fromCategory ||
    sessionStorage.getItem('zeluxe_selected_category') ||
    'All';

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

      // সাইজ অ্যারে থেকে অনাকাঙ্ক্ষিত URL ফিল্টার করা
      const sizes: string[] = Array.isArray(data.sizes)
        ? data.sizes
            .filter((s: any) => typeof s === 'string')
            .map((s: string) => (s.startsWith('http') ? 'Free Size' : s))
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
        purchaseCost:
          typeof data.purchaseCost === 'number' ? data.purchaseCost : 0,
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
  const [sellingPrice, setSellingPrice] = useState(
    product ? String(product.suggestedPrice) : '',
  );
  const [copied, setCopied] = useState(false);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);

  // Cart state
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

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

        // সাইজ স্যানিটাইজেশন
        const sizes: string[] = Array.isArray(data.sizes)
          ? data.sizes
              .filter((s: unknown): s is string => typeof s === 'string')
              .map((s: string) => (s.startsWith('http') ? 'Free Size' : s))
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
          purchaseCost:
            typeof data.purchaseCost === 'number' ? data.purchaseCost : 0,
          active: typeof data.active === 'boolean' ? data.active : true,
        };

        if (!cancelled) {
          setProduct(loadedProduct);
          setSellingPrice((current) =>
            current || String(loadedProduct.suggestedPrice),
          );
          setSelectedColor((current) => current || colors[0] || '');
          setSelectedSize((current) => current || sizes[0] || '');
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

  // স্মার্ট ব্যাক নেভিগেশন যা আগের ক্যাটাগরি বজায় রাখে
  const handleBackToProducts = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/products?category=${encodeURIComponent(previousCategory)}`, {
        state: { selectedCategory: previousCategory },
      });
    }
  };

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

    const itemColor = selectedColor || (product.colors[0] || 'N/A');
    const itemSize = selectedSize || (product.sizes[0] || 'N/A');

    const newItem = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      imageUrl: product.imageUrl,
      color: itemColor,
      size: itemSize,
      quantity,
      sellingPrice: price,
      resellerPrice: product.resellerPrice,
      purchaseCost: product.purchaseCost || 0,
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
          (item.color || 'N/A') === newItem.color &&
          (item.size || 'N/A') === newItem.size,
      );

      if (existingIdx > -1) {
        const newQuantity =
          (Number(existingCart[existingIdx].quantity) || 0) + newItem.quantity;

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

  const handleOrderNow = () => {
    if (!product) return;

    if (product.active === false || product.stock <= 0) {
      toast.error('প্রোডাক্টটি বর্তমানে বিক্রির জন্য উপলব্ধ নয়');
      return;
    }

    if (product.sizes.length > 0 && !selectedSize) {
      toast.error('অনুগ্রহ করে সাইজ সিলেক্ট করুন');
      return;
    }

    const finalPrice = Number(sellingPrice) || product.suggestedPrice;

    navigate(`/orders/new?productId=${product.id}`, {
      state: {
        selectedColor,
        selectedSize,
        quantity,
        sellingPrice: finalPrice,
      },
    });
  };

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
      toast.success('✓ ছবি ডাউনলোড সম্পন্ন হয়েছে');
    } catch (err) {
      console.error('Image download failed:', err);
      toast.error('ছবি ডাউনলোড করতে সমস্যা হয়েছে');
    } finally {
      setDownloadingIdx(null);
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
        <button
          onClick={handleBackToProducts}
          className="mt-4 inline-block text-sm font-bold text-zeluxe-gold hover:underline"
        >
          ← প্রোডাক্টে ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <button
        type="button"
        onClick={handleBackToProducts}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-zeluxe-gold"
      >
        <ArrowLeft size={16} />
        সব প্রোডাক্ট
      </button>

      <div className="rounded-lg border border-zeluxe-lightgray bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {/* LEFT — Images (Aspect Ratio ও রেসপনসিভ হাইট ফিক্সড) */}
          <div>
            <div className="group relative aspect-square max-h-[460px] w-full overflow-hidden rounded-lg border border-zeluxe-lightgray bg-zeluxe-cream flex items-center justify-center">
              {product.imageUrls.length > 0 ? (
                <>
                  <img
                    src={product.imageUrls[activeImage]}
                    alt={product.name}
                    className="h-full w-full object-contain md:object-cover transition-transform duration-300 transform-gpu"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadSingle(
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
                        void handleDownloadSingle(url, idx);
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
                  onClick={handleOrderNow}
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
                onClick={() => void handleCopyDetails()}
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
              <button
                key={rp.id}
                type="button"
                onClick={() =>
                  navigate(`/products/${rp.id}`, {
                    state: { fromCategory: previousCategory },
                  })
                }
                className="group overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white text-left transition hover:border-zeluxe-gold"
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
              </button>
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
    </div>
  );
}
