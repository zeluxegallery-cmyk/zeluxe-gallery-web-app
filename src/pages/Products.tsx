import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Loader2, Package, Search } from 'lucide-react';
import Layout from '../components/Layout';
import { db } from '../firebase';

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
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
              <div className="flex aspect-square items-center justify-center bg-zeluxe-fieldbg">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-zeluxe-gray" />
                )}
              </div>
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
    </Layout>
  );
}
