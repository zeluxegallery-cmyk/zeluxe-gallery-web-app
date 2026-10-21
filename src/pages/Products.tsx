import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Copy, Download, Loader2, Package, Search, ChevronDown, Check } from 'lucide-react';
import Layout from '../components/Layout';
import { db } from '../firebase';

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

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 20;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('সব ক্যাটাগরি');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsQuery = query(collection(db, 'products'), where('active', '==', true));
        const snapshot = await getDocs(productsQuery);
        const fetchedProducts: Product[] = snapshot.docs.map((productDocument) => {
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
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.category)));
    return ['সব ক্যাটাগরি', ...unique];
  }, [products]);

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
    if (product.imageUrls.length === 0) return;

    setDownloadingId(product.id);
    try {
      for (let i = 0; i < product.imageUrls.length; i++) {
        const url = product.imageUrls[i];
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${product.sku || 'product'}-${i + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl pb-20">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-zeluxe-black md:text-2xl">
            প্রোডাক্ট ক্যাটালগ
          </h1>
          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            সব প্রোডাক্ট দেখুন এবং কাস্টমারের জন্য অর্ডার তৈরি করুন
          </p>
        </div>

        {/* Filters */}
        <div className="mb-5 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="প্রোডাক্ট কোড বা নাম দিয়ে খুঁজুন..."
                className="w-full rounded-md border border-zeluxe-lightgray bg-white py-3 pl-10 pr-4 text-sm text-zeluxe-black placeholder:text-gray-400 focus:border-zeluxe-gold focus:outline-none"
              />
            </div>
            <div className="relative sm:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none rounded-md border border-zeluxe-lightgray bg-white px-4 py-3 pr-10 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* ═══ SKELETON LOADING GRID ═══ */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white">
                {/* Image Skeleton */}
                <div className="aspect-square w-full animate-pulse bg-gray-200" />
                {/* Content Skeleton */}
                <div className="p-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                  <div className="mt-4 space-y-1.5">
                    <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="h-8 animate-pulse rounded bg-gray-200" />
                    <div className="h-8 animate-pulse rounded bg-gray-200" />
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
                  className="group overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white transition hover:border-zeluxe-gold hover:shadow-sm"
                >
                  <div className="relative aspect-square overflow-hidden bg-zeluxe-cream">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl.includes('res.cloudinary.com') ? product.imageUrl.replace('/upload/', '/upload/q_auto,f_auto,w_400/') : product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}

                    {product.imageUrls.length > 1 && (
                      <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {product.imageUrls.length} ছবি
                      </span>
                    )}

                    {product.stock === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="rounded bg-red-600 px-2 py-1 text-[11px] font-bold text-white">
                          স্টক নেই
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-bold text-zeluxe-black">
                      {product.name}
                    </h3>
                    <p className="mt-0.5 font-mono text-[10px] text-gray-500">
                      {product.sku}
                    </p>

                    <div className="mt-2.5 space-y-0.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-gray-500">Price:</span>
                        <span className="text-sm font-bold text-zeluxe-black">
                          Tk {product.resellerPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-gray-500">
                          Customer / Retail Price:
                        </span>
                        <span className="text-xs font-bold text-zeluxe-gold">
                          Tk {product.suggestedPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => handleDownloadAll(e, product)}
                        disabled={downloadingId === product.id || product.imageUrls.length === 0}
                        className="flex items-center justify-center gap-1 rounded-md bg-zeluxe-gold py-2 text-[11px] font-bold text-zeluxe-black transition hover:brightness-110 disabled:opacity-40"
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
                        className="flex items-center justify-center gap-1 rounded-md bg-zeluxe-gold py-2 text-[11px] font-bold text-zeluxe-black transition hover:brightness-110"
                      >
                        {copiedId === product.id ? (
                          <>
                            <Check size={13} />
                            কপি হয়েছে
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
                </Link>
              ))}
            </div>

            {visibleCount < filteredProducts.length && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
                  className="rounded-xl border border-zeluxe-black bg-white px-8 py-3 text-sm font-bold text-zeluxe-black transition hover:bg-gray-50 active:scale-95"
                >
                  আরো দেখুন (Load More)
                </button>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-gray-400">
              {displayedProducts.length}টি প্রোডাক্ট দেখানো হচ্ছে (মোট {filteredProducts.length}টি)
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-zeluxe-lightgray bg-white p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-600">
              কোনো প্রোডাক্ট পাওয়া যায়নি
            </p>
            {searchTerm || selectedCategory !== 'সব ক্যাটাগরি' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('সব ক্যাটাগরি');
                }}
                className="mt-3 text-xs font-medium text-zeluxe-gold hover:underline"
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