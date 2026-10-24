import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Copy, Download, Loader2, Package, Search, Check, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { downloadSingleImage } from '../lib/imageDownloader';
import { toast } from 'sonner';

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  imageUrl?: string;
  imageUrls: string[];
  resellerPrice: number;
  suggestedPrice: number;
  stock: number;
};

type Category = {
  id: string;
  name: string;
  imageUrl?: string;
};

// ═══ আপনার দেওয়া নির্দিষ্ট সিরিয়াল (Custom Order) ═══
const customOrder = [
  'T-Shirt', '3 Piece', 'Panjabi', 'Polo Shirt', 'Gadget', 'Watch',
  'Airpods', 'Hoodie', 'Sharee', '2 Piece', 'Baby Fashion', 'Borka',
  'Hijab', 'Smart Watch', 'Neckband', 'Microphone', 'Pant', 'Shirt'
];

// ═══ বাংলা থেকে ইংরেজি নামের অভিধান ═══
const categoryTranslations: Record<string, string> = {
  'পাওয়ার ব্যাংক': 'Power Bank',
  'পাঞ্জাবি': 'Panjabi',
  'হিজাব': 'Hijab',
  'গিফট আইটেম': 'Gift Items',
  'কসমেটিক্স': 'Cosmetics',
  'কাপল আইটেম': 'Couple Items',
  'ব্যাগ': 'Bag',
  'বোরকা': 'Borka',
  'শার্ট': 'Shirt',
  'পাঞ্জাবি কম্বো সেট': 'Panjabi Combo Set',
  'কিডস আইটেম': 'Kids Items',
  'পারফিউম': 'Perfume',
  'ইয়ারবাডস (ব্রুটুথ)': 'Airpods',
  'টি-শার্ট': 'T-Shirt',
  'থ্রি-পিস': '3 Piece',
  'স্কিন কেয়ার': 'Skin Care',
  'হুডি & জ্যাকেট': 'Hoodie',
  'শাড়ি': 'Sharee',
  'প্যান্ট & ট্রাউজার': 'Pant',
  'স্মার্ট ওয়াচ': 'Smart Watch',
  'ঘড়ি': 'Watch',
  'ড্রেস': 'Dress',
  'খেলনা': 'Toys',
  'বেবি ড্রেস': 'Baby Fashion',
  'হেডফোন': 'Headphone',
  'কুর্তি': 'Kurti',
  'ওয়েস্টার্ন ড্রেস': 'Western Dress',
  'ইন্টেরিয়র': 'Interior',
};

const getDisplayCategoryName = (name: string) => {
  return categoryTranslations[name] || name;
};

const getOrderIndex = (name: string) => {
  const index = customOrder.indexOf(name);
  return index === -1 ? 9999 : index;
};

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 20;
const ALL_CATEGORIES = 'সব ক্যাটাগরি';

type ProductsCache = {
  uid: string;
  products: Product[];
  categories: Category[];
};

// Kept in memory only while the app is open (never saved on the phone's disk),
// so wholesale prices do not stay behind on a shared phone. Keyed by user id.
let productsCache: ProductsCache | null = null;

function mapProduct(productDocument: QueryDocumentSnapshot<DocumentData>): Product {
  const data = productDocument.data();
  const imgUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';
  let urls: string[] = [];
  if (Array.isArray(data.imageUrls)) {
    urls = data.imageUrls.filter((u: unknown): u is string => typeof u === 'string');
  }
  if (urls.length === 0 && imgUrl) urls = [imgUrl];

  return {
    id: productDocument.id,
    name: typeof data.name === 'string' ? data.name : 'Unnamed Product',
    sku: typeof data.sku === 'string' ? data.sku : '',
    category: typeof data.category === 'string' ? data.category : 'Uncategorized',
    description: typeof data.description === 'string' ? data.description : '',
    imageUrl: imgUrl,
    imageUrls: urls,
    resellerPrice: typeof data.resellerPrice === 'number' ? data.resellerPrice : 0,
    suggestedPrice: typeof data.suggestedPrice === 'number' ? data.suggestedPrice : 0,
    stock: typeof data.stock === 'number' ? data.stock : 0,
  };
}

function buildCategories(docs: QueryDocumentSnapshot<DocumentData>[]): Category[] {
  const fetchedCategories: Category[] = docs.map((categoryDocument) => {
    const data = categoryDocument.data();
    return {
      id: categoryDocument.id,
      name: typeof data.name === 'string' ? data.name : '',
      imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
    };
  });

  // ═══ কাস্টম অর্ডার অনুযায়ী সাজানো ═══
  fetchedCategories.sort((a, b) => {
    const nameA = getDisplayCategoryName(a.name);
    const nameB = getDisplayCategoryName(b.name);
    const indexA = getOrderIndex(nameA);
    const indexB = getOrderIndex(nameB);

    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return nameA.localeCompare(nameB);
  });

  return fetchedCategories;
}

export default function Products() {
  const cached = productsCache && productsCache.uid === auth.currentUser?.uid ? productsCache : null;

  const [products, setProducts] = useState<Product[]>(cached?.products ?? []);
  const [categories, setCategories] = useState<Category[]>(cached?.categories ?? []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  // loading = nothing to show yet. allLoaded = the full list is here (needed for search and categories).
  const [loading, setLoading] = useState(!cached);
  const [allLoaded, setAllLoaded] = useState(!!cached);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Wait until Firebase has restored the login session.
      await auth.authStateReady();
      const uid = auth.currentUser?.uid;
      if (!uid || cancelled) {
        setLoading(false);
        setAllLoaded(true);
        return;
      }

      setLoadError(false);
      const hasCache = productsCache !== null && productsCache.uid === uid;

      // Start the full list and the categories at the same time (they used to load one after the other).
      const fullP = getDocs(query(collection(db, 'products'), where('active', '==', true)));
      const categoriesP = getDocs(collection(db, 'categories'))
        .then((snap) => buildCategories(snap.docs))
        .catch((err) => {
          console.error('Categories load error:', err);
          return null;
        });

      void categoriesP.then((cats) => {
        if (cats && !cancelled) setCategories(cats);
      });

      let fullDone = false;

      // Nothing cached yet: show the first page as soon as it arrives.
      // Both queries use the same default order, so these are the same 20 products the full list starts with.
      if (!hasCache) {
        void getDocs(
          query(collection(db, 'products'), where('active', '==', true), limit(INITIAL_VISIBLE_COUNT)),
        )
          .then((firstSnap) => {
            if (cancelled || fullDone) return;
            setProducts(firstSnap.docs.map(mapProduct));
            setLoading(false);
          })
          .catch((err) => console.error('First page load error:', err));
      }

      try {
        const fullSnap = await fullP;
        fullDone = true;
        const all = fullSnap.docs.map(mapProduct);
        if (!cancelled) {
          setProducts(all);
          setAllLoaded(true);
        }
        const cats = await categoriesP;
        productsCache = {
          uid,
          products: all,
          categories: cats ?? (productsCache && productsCache.uid === uid ? productsCache.categories : []),
        };
        if (!cancelled && cats) setCategories(cats);
      } catch (err) {
        console.error('Products load error:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAllLoaded(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [searchTerm, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term);
      const matchesCategory =
        selectedCategory === 'সব ক্যাটাগরি' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  // While only the first page is here, search/category results would be incomplete: show the skeleton instead.
  const isFiltering = searchTerm.trim() !== '' || selectedCategory !== ALL_CATEGORIES;
  const showSkeleton = loading || (!allLoaded && isFiltering);

  const handleCopy = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `${product.name}\n${product.sku}\n\n${product.description || ''}\n\nদাম: Tk ${product.suggestedPrice}\n\nZeluxe Gallery`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('কপি করা যায়নি');
    }
  };

  const handleDownloadAll = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    const primaryImg = product.imageUrls[0] || product.imageUrl;
    if (!primaryImg) {
      toast.error('কোনো ছবি পাওয়া যায়নি');
      return;
    }

    setDownloadingId(product.id);
    await downloadSingleImage(primaryImg, `${product.sku || 'product'}-1.jpg`);
    setDownloadingId(null);
  };

  const displayedCategories = categories.slice(0, 8);

  return (
    // ═══ <Layout> ট্যাগটি সরিয়ে সরাসরি div দিয়ে শুরু করা হয়েছে ═══
    <div className="mx-auto max-w-6xl pb-20">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-zeluxe-black md:text-3xl tracking-tight">
          প্রোডাক্ট ক্যাটালগ
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          সব প্রোডাক্ট দেখুন এবং কাস্টমারের জন্য অর্ডার তৈরি করুন
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="প্রোডাক্ট কোড বা নাম দিয়ে খুঁজুন..."
            className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm text-zeluxe-black shadow-sm placeholder:text-gray-400 focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold transition"
          />
        </div>
      </div>

      {/* ═══ ক্যাটাগরি স্ক্রলার (See All সহ) ═══ */}
      <div className="mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-zeluxe-black pl-1">Categories</h2>
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="text-xs font-bold text-zeluxe-gold hover:underline pr-1"
          >
            See All
          </button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-3 snap-x hide-scrollbar">
          
          {/* "সব" অপশন */}
          <button
            onClick={() => setSelectedCategory('সব ক্যাটাগরি')}
            className="flex flex-col items-center gap-2 min-w-[72px] snap-start group"
          >
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all ${selectedCategory === 'সব ক্যাটাগরি' ? 'border-zeluxe-gold bg-zeluxe-gold/10 shadow-sm' : 'border-gray-200 bg-white group-hover:border-zeluxe-gold/50'}`}>
              <Package size={24} className={selectedCategory === 'সব ক্যাটাগরি' ? 'text-zeluxe-gold' : 'text-gray-400'} />
            </div>
            <span className={`text-[11px] font-bold text-center leading-tight ${selectedCategory === 'সব ক্যাটাগরি' ? 'text-zeluxe-black' : 'text-gray-500'}`}>
              All
            </span>
          </button>

          {/* প্রথম ৮টি ক্যাটাগরি */}
          {displayedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className="flex flex-col items-center gap-2 min-w-[72px] snap-start group"
            >
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-all ${selectedCategory === cat.name ? 'border-zeluxe-gold shadow-sm' : 'border-gray-200 bg-white group-hover:border-zeluxe-gold/50'}`}>
                {cat.imageUrl ? (
                  <img 
                    src={cat.imageUrl.includes('res.cloudinary.com') ? cat.imageUrl.replace('/upload/', '/upload/q_auto,f_auto,w_150/') : cat.imageUrl} 
                    alt={cat.name} 
                    loading="lazy"
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <Package size={24} className="text-gray-400" />
                )}
              </div>
              <span className={`text-[11px] font-bold text-center line-clamp-2 leading-tight w-[72px] ${selectedCategory === cat.name ? 'text-zeluxe-black' : 'text-gray-500'}`}>
                {getDisplayCategoryName(cat.name)}
              </span>
            </button>
          ))}

        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">প্রোডাক্ট লোড করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।</p>
          <button
            onClick={() => {
              setAllLoaded(false);
              setReloadKey((k) => k + 1);
            }}
            className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      )}

      {/* ═══ SKELETON LOADING GRID ═══ */}
      {showSkeleton ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
              <div className="aspect-square w-full animate-pulse bg-gray-200" />
              <div className="p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="h-9 animate-pulse rounded-xl bg-gray-200" />
                  <div className="h-9 animate-pulse rounded-xl bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayedProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {displayedProducts.map((product, index) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card border border-gray-50 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-zeluxe-cream">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl.includes('res.cloudinary.com') ? product.imageUrl.replace('/upload/', '/upload/q_auto,f_auto,w_400/') : product.imageUrl}
                      alt={product.name}
                      crossOrigin="anonymous"
                      loading={index < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}

                  {product.imageUrls.length > 1 && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      {product.imageUrls.length} ছবি
                    </span>
                  )}

                  {product.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                      <span className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                        স্টক নেই
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-sm font-bold text-zeluxe-black leading-snug">
                    {product.name}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] text-gray-400">
                    {product.sku}
                  </p>

                  <div className="mt-auto pt-3">
                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Price:</span>
                        <span className="font-number text-sm font-bold text-zeluxe-black">
                          Tk {product.resellerPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Retail Price:</span>
                        <span className="font-number text-xs font-bold text-zeluxe-gold">
                          Tk {product.suggestedPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => handleDownloadAll(e, product)}
                        disabled={downloadingId === product.id || product.imageUrls.length === 0}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 py-2 text-[11px] font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-40"
                      >
                        {downloadingId === product.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                        ছবি
                      </button>
                      <button
                        onClick={(e) => handleCopy(e, product)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-zeluxe-gold py-2 text-[11px] font-bold text-zeluxe-black transition hover:brightness-110"
                      >
                        {copiedId === product.id ? (
                          <>
                            <Check size={13} />
                            কপি
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            কপি
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {visibleCount < filteredProducts.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
                className="rounded-xl border border-gray-200 bg-white px-8 py-3 text-sm font-bold text-zeluxe-black shadow-sm transition hover:bg-gray-50 active:scale-95"
              >
                আরো দেখুন (Load More)
              </button>
            </div>
          )}

          {!allLoaded && !isFiltering && displayedProducts.length >= INITIAL_VISIBLE_COUNT && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3 text-sm font-bold text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                আরও প্রোডাক্ট লোড হচ্ছে...
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs font-medium text-gray-400">
            {allLoaded
              ? `${displayedProducts.length}টি প্রোডাক্ট দেখানো হচ্ছে (মোট ${filteredProducts.length}টি)`
              : `${displayedProducts.length}টি প্রোডাক্ট দেখানো হচ্ছে`}
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm font-bold text-gray-600">
            কোনো প্রোডাক্ট পাওয়া যায়নি
          </p>
          {searchTerm || selectedCategory !== 'সব ক্যাটাগরি' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('সব ক্যাটাগরি');
              }}
              className="mt-3 text-sm font-bold text-zeluxe-gold hover:underline"
            >
              ফিল্টার রিসেট করুন
            </button>
          ) : null}
        </div>
      )}

      {/* ═══ ALL CATEGORIES MODAL (See All Popup) ═══ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
            
            <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-5">
              <h2 className="text-lg font-bold text-zeluxe-black">All Categories</h2>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-full p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                <button
                  onClick={() => { setSelectedCategory('সব ক্যাটাগরি'); setIsCategoryModalOpen(false); }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all ${selectedCategory === 'সব ক্যাটাগরি' ? 'border-zeluxe-gold bg-zeluxe-gold/10' : 'border-gray-100 bg-gray-50 group-hover:border-zeluxe-gold/50'}`}>
                    <Package size={24} className={selectedCategory === 'সব ক্যাটাগরি' ? 'text-zeluxe-gold' : 'text-gray-400'} />
                  </div>
                  <span className={`text-[11px] font-bold text-center leading-tight ${selectedCategory === 'সব ক্যাটাগরি' ? 'text-zeluxe-black' : 'text-gray-500'}`}>
                    All
                  </span>
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.name); setIsCategoryModalOpen(false); }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-all ${selectedCategory === cat.name ? 'border-zeluxe-gold' : 'border-gray-100 bg-gray-50 group-hover:border-zeluxe-gold/50'}`}>
                      {cat.imageUrl ? (
                        <img 
                          src={cat.imageUrl.includes('res.cloudinary.com') ? cat.imageUrl.replace('/upload/', '/upload/q_auto,f_auto,w_150/') : cat.imageUrl} 
                          alt={cat.name} 
                          loading="lazy"
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <Package size={24} className="text-gray-400" />
                      )}
                    </div>
                    <span className={`text-[11px] font-bold text-center line-clamp-2 leading-tight w-[76px] ${selectedCategory === cat.name ? 'text-zeluxe-black' : 'text-gray-500'}`}>
                      {getDisplayCategoryName(cat.name)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
