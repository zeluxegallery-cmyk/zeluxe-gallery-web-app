import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Copy, Download, Loader2, Package, Search, Check } from 'lucide-react';
import Layout from '../components/Layout';
import { db } from '../firebase';
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

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 20;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('সব ক্যাটাগরি');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // ১. প্রোডাক্ট লোড
        const productsQuery = query(collection(db, 'products'), where('active', '==', true));
        const productSnap = await getDocs(productsQuery);
        const fetchedProducts: Product[] = productSnap.docs.map((productDocument) => {
          const data = productDocument.data();
          const imgUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';
          let urls: string[] = [];
          if (Array.isArray(data.imageUrls)) {
            urls = data.imageUrls.filter((u: any) => typeof u === 'string');
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
        });
        setProducts(fetchedProducts);

        // ২. ক্যাটাগরি লোড (ছবিসহ)
        const categorySnap = await getDocs(collection(db, 'categories'));
        const fetchedCategories: Category[] = categorySnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: typeof data.name === 'string' ? data.name : '',
            imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
          };
        });
        setCategories(fetchedCategories);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

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

  const handleCopy = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `${product.name}\n${product.sku}\n\n${product.description || ''}\n\nদাম: Tk ${product.suggestedPrice}\n\nZeluxe Gallery`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('কপি করা যায়নি');
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

  return (
    <Layout>
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

        {/* ═══ সুন্দর ক্যাটাগরি স্ক্রলার (গোল ছবি) ═══ */}
        <div className="mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x hide-scrollbar">
            
            {/* "সব ক্যাটাগরি" অপশন */}
            <button
              onClick={() => setSelectedCategory('সব ক্যাটাগরি')}
              className="flex flex-col items-center gap-2 min-w-[70px] snap-start group"
            >
              <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all ${selectedCategory === 'সব ক্যাটাগরি' ? 'border-zeluxe-gold bg-zeluxe-gold/10 shadow-sm' : 'border-gray-200 bg-white group-hover:border-zeluxe-gold/50'}`}>
                <Package size={24} className={selectedCategory === 'সব ক্যাটাগরি' ? 'text-zeluxe-gold' : 'text-gray-400'} />
              </div>
              <span className={`text-[11px] font-bold text-center ${selectedCategory === 'সব ক্যাটাগরি' ? 'text-zeluxe-black' : 'text-gray-500'}`}>
                সব
              </span>
            </button>

            {/* ডাটাবেস থেকে আসা ক্যাটাগরি */}
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className="flex flex-col items-center gap-2 min-w-[70px] snap-start group"
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
                <span className={`text-[11px] font-bold text-center line-clamp-2 leading-tight ${selectedCategory === cat.name ? 'text-zeluxe-black' : 'text-gray-500'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ SKELETON LOADING GRID ═══ */}
        {loading ? (
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
              {displayedProducts.map((product) => (
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
                        loading="lazy"
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

            <p className="mt-6 text-center text-xs font-medium text-gray-400">
              {displayedProducts.length}টি প্রোডাক্ট দেখানো হচ্ছে (মোট {filteredProducts.length}টি)
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
      </div>
    </Layout>
  );
}