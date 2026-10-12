import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Copy, Download, Loader2, Package, Search, Share2, X } from 'lucide-react';
import Layout from '../components/Layout';
import { db } from '../firebase';

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  imageUrl?: string;
  resellerPrice: number;
  suggestedPrice: number;
  stock: number;
};

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsQuery = query(collection(db, 'products'), where('active', '==', true));
        const snapshot = await getDocs(productsQuery);
        const fetchedProducts: Product[] = snapshot.docs.map((productDocument) => {
          const data = productDocument.data();
          return {
            id: productDocument.id,
            name: typeof data.name === 'string' ? data.name : 'Unnamed Product',
            sku: typeof data.sku === 'string' ? data.sku : '',
            category: typeof data.category === 'string' ? data.category : 'Uncategorized',
            description: typeof data.description === 'string' ? data.description : '',
            imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
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

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.category)));
    return ['All Categories', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !term || product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term);
      const matchesCategory =
        selectedCategory === 'All Categories' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleCreateOrder = (product: Product) => {
    navigate(`/orders/new?productId=${product.id}`);
  };

  const handleCopyDescription = (product: Product) => {
    const text = `${product.name}\n\n${product.description || ''}\n\nদাম: ৳${product.suggestedPrice}\n\nZeluxe Gallery`;
    void navigator.clipboard.writeText(text);
    alert('✓ কপি হয়েছে!');
  };

  const handleDownloadImage = async (product: Product) => {
    if (!product.imageUrl) return;
    try {
      const response = await fetch(product.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${product.sku}.jpg`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('ছবি ডাউনলোড ব্যর্থ হয়েছে');
    }
  };

  const handleShare = async (product: Product) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name}\n\n${product.description || ''}\n\nদাম: ৳${product.suggestedPrice}`,
        });
      } catch {
        // User cancelled share — no action needed
      }
    } else {
      alert('আপনার ব্রাউজার শেয়ার সাপোর্ট করে না');
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-zeluxe-black">Product Catalog</h1>
      <p className="mb-6 text-sm text-gray-600">Browse products and create orders for your customers</p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zeluxe-gray" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg py-3 pl-10 pr-4 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none focus:ring-1 focus:ring-zeluxe-gold"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading products" />
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white">
              <button
                onClick={() => setSelectedProduct(product)}
                className="flex aspect-square w-full items-center justify-center bg-zeluxe-fieldbg"
              >
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-zeluxe-gray" />
                )}
              </button>
              <div className="p-4">
                <h3 className="line-clamp-2 text-base font-bold text-zeluxe-black">{product.name}</h3>
                <p className="mt-1 font-mono text-xs text-zeluxe-gray">{product.sku}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-lg font-bold text-zeluxe-gold">৳{product.resellerPrice.toLocaleString()}</p>
                  {product.stock > 0 ? (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                      In Stock
                    </span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                      Out of Stock
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zeluxe-gray">MRP: ৳{product.suggestedPrice.toLocaleString()}</p>
                <button
                  onClick={() => handleCreateOrder(product)}
                  disabled={product.stock === 0}
                  className="mt-4 w-full rounded-lg bg-zeluxe-black py-2.5 text-sm font-bold text-white transition hover:bg-[#2a2a2a] disabled:bg-gray-300"
                >
                  Create Order
                </button>
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="mt-2 w-full rounded-lg border border-zeluxe-gold py-2.5 text-sm font-bold text-zeluxe-gold transition hover:bg-zeluxe-gold/10"
                >
                  বিস্তারিত
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-zeluxe-gray" />
          <p className="mt-4 text-gray-600">No products available yet.</p>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zeluxe-black">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg p-1.5 text-zeluxe-gray transition hover:bg-zeluxe-fieldbg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedProduct.imageUrl ? (
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="mb-4 h-64 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="mb-4 flex h-64 w-full items-center justify-center rounded-xl bg-zeluxe-fieldbg">
                <Package className="h-12 w-12 text-zeluxe-gray" />
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zeluxe-gray">SKU</span>
                <span className="font-mono text-zeluxe-black">{selectedProduct.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zeluxe-gray">Category</span>
                <span className="text-zeluxe-black">{selectedProduct.category}</span>
              </div>
              {selectedProduct.description && (
                <p className="pt-2 text-zeluxe-black">{selectedProduct.description}</p>
              )}
              <div className="grid grid-cols-3 gap-2 pt-3">
                <div className="rounded-xl bg-zeluxe-fieldbg p-3 text-center">
                  <p className="text-xs text-zeluxe-gray">Reseller</p>
                  <p className="mt-1 font-bold text-zeluxe-black">৳{selectedProduct.resellerPrice.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-zeluxe-fieldbg p-3 text-center">
                  <p className="text-xs text-zeluxe-gray">Suggested</p>
                  <p className="mt-1 font-bold text-zeluxe-black">৳{selectedProduct.suggestedPrice.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-zeluxe-fieldbg p-3 text-center">
                  <p className="text-xs text-zeluxe-gray">Profit</p>
                  <p className="mt-1 font-bold text-green-600">৳{(selectedProduct.suggestedPrice - selectedProduct.resellerPrice).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-zeluxe-gray">Stock</span>
                {selectedProduct.stock > 0 ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {selectedProduct.stock} in stock
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                    Out of stock
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                handleCreateOrder(selectedProduct);
                setSelectedProduct(null);
              }}
              disabled={selectedProduct.stock === 0}
              className="mt-4 w-full rounded-xl bg-zeluxe-black py-3 font-bold text-white transition hover:bg-[#2a2a2a] disabled:bg-gray-300"
            >
              Create Order
            </button>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                onClick={() => handleCopyDescription(selectedProduct)}
                className="flex flex-col items-center gap-1 rounded-xl border border-zeluxe-lightgray py-3 text-xs font-medium text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
              >
                <Copy className="h-5 w-5 text-zeluxe-gold" />
                কপি
              </button>
              <button
                onClick={() => void handleDownloadImage(selectedProduct)}
                disabled={!selectedProduct.imageUrl}
                className="flex flex-col items-center gap-1 rounded-xl border border-zeluxe-lightgray py-3 text-xs font-medium text-zeluxe-black transition hover:bg-zeluxe-fieldbg disabled:opacity-40"
              >
                <Download className="h-5 w-5 text-zeluxe-gold" />
                ডাউনলোড
              </button>
              <button
                onClick={() => void handleShare(selectedProduct)}
                className="flex flex-col items-center gap-1 rounded-xl border border-zeluxe-lightgray py-3 text-xs font-medium text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
              >
                <Share2 className="h-5 w-5 text-zeluxe-gold" />
                শেয়ার
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
