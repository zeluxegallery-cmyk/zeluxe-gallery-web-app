import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Loader2, Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { db } from '../../firebase';

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  imageUrl: string;
  stock: number;
  purchaseCost: number;
  resellerPrice: number;
  suggestedPrice: number;
  active: boolean;
};

type Category = {
  id: string;
  name: string;
};

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  description: string;
  imageUrl: string;
  stock: string;
  purchaseCost: string;
  resellerPrice: string;
  suggestedPrice: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  category: '',
  description: '',
  imageUrl: '',
  stock: '0',
  purchaseCost: '0',
  resellerPrice: '0',
  suggestedPrice: '0',
  active: true,
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [productSnap, categorySnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), orderBy('name'))),
        getDocs(collection(db, 'categories')),
      ]);
      setProducts(
        productSnap.docs.map((productDoc) => {
          const data = productDoc.data();
          return {
            id: productDoc.id,
            name: typeof data.name === 'string' ? data.name : '—',
            sku: typeof data.sku === 'string' ? data.sku : '—',
            category: typeof data.category === 'string' ? data.category : '—',
            description: typeof data.description === 'string' ? data.description : '',
            imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
            stock: typeof data.stock === 'number' ? data.stock : 0,
            purchaseCost: typeof data.purchaseCost === 'number' ? data.purchaseCost : 0,
            resellerPrice: typeof data.resellerPrice === 'number' ? data.resellerPrice : 0,
            suggestedPrice: typeof data.suggestedPrice === 'number' ? data.suggestedPrice : 0,
            active: typeof data.active === 'boolean' ? data.active : true,
          };
        }),
      );
      setCategories(
        categorySnap.docs.map((catDoc) => ({
          id: catDoc.id,
          name: typeof catDoc.data().name === 'string' ? catDoc.data().name : 'Unnamed',
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      stock: String(product.stock),
      purchaseCost: String(product.purchaseCost),
      resellerPrice: String(product.resellerPrice),
      suggestedPrice: String(product.suggestedPrice),
      active: product.active,
    });
    setEditingId(product.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.sku.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        stock: Number(form.stock) || 0,
        purchaseCost: Number(form.purchaseCost) || 0,
        resellerPrice: Number(form.resellerPrice) || 0,
        suggestedPrice: Number(form.suggestedPrice) || 0,
        active: form.active,
      };
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), payload);
      } else {
        await addDoc(collection(db, 'products'), { ...payload, createdAt: serverTimestamp() });
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.';
      alert(message);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), { active: !product.active });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Toggle failed.';
      alert(message);
    }
  };

  const filtered = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zeluxe-gold" aria-label="Loading" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zeluxe-black">প্রোডাক্ট ম্যানেজমেন্ট</h1>
        <button
          onClick={openAdd}
          className="rounded-xl bg-zeluxe-black px-4 py-2 font-bold text-white transition hover:bg-[#2a2a2a] active:scale-[0.98]"
        >
          + নতুন প্রোডাক্ট
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zeluxe-gray" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full rounded-xl border border-zeluxe-lightgray bg-white py-2.5 pl-10 pr-4 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-zeluxe-lightgray bg-white px-4 py-2.5 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-zeluxe-lightgray bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zeluxe-fieldbg">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Image</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Name</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">SKU</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Category</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Stock</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Reseller Price</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Active</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-zeluxe-gray">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-b border-zeluxe-lightgray last:border-0">
                <td className="px-4 py-3">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zeluxe-fieldbg">
                      <Package className="h-5 w-5 text-zeluxe-gray" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-zeluxe-black">{product.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-zeluxe-gray">{product.sku}</td>
                <td className="px-4 py-3 text-zeluxe-gray">{product.category}</td>
                <td className="px-4 py-3 text-zeluxe-black">{product.stock}</td>
                <td className="px-4 py-3 font-bold text-zeluxe-gold">৳{product.resellerPrice.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={product.active}
                    onChange={() => toggleActive(product)}
                    className="h-4 w-4 rounded border-zeluxe-lightgray text-zeluxe-gold focus:ring-zeluxe-gold"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(product)}
                      className="rounded-lg p-1.5 text-zeluxe-gold transition hover:bg-zeluxe-fieldbg"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((product) => (
          <div key={product.id} className="rounded-xl border border-zeluxe-lightgray bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zeluxe-fieldbg">
                    <Package className="h-6 w-6 text-zeluxe-gray" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-zeluxe-black">{product.name}</p>
                  <p className="text-xs text-zeluxe-gray">{product.sku}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(product)}
                  className="rounded-lg p-1.5 text-zeluxe-gold"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id, product.name)}
                  className="rounded-lg p-1.5 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-zeluxe-gray">{product.category} · Stock: {product.stock}</span>
              <span className="font-bold text-zeluxe-gold">৳{product.resellerPrice.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 rounded-xl bg-zeluxe-fieldbg p-8 text-center text-zeluxe-gray">
          No products found.
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zeluxe-black">
                {editingId ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-zeluxe-gray hover:bg-zeluxe-fieldbg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">SKU *</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">Image URL</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zeluxe-black">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zeluxe-black">Purchase Cost</label>
                  <input
                    type="number"
                    value={form.purchaseCost}
                    onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                    className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zeluxe-black">Reseller Price</label>
                  <input
                    type="number"
                    value={form.resellerPrice}
                    onChange={(e) => setForm({ ...form, resellerPrice: e.target.value })}
                    className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zeluxe-black">Suggested Price</label>
                  <input
                    type="number"
                    value={form.suggestedPrice}
                    onChange={(e) => setForm({ ...form, suggestedPrice: e.target.value })}
                    className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-zeluxe-lightgray text-zeluxe-gold focus:ring-zeluxe-gold"
                />
                <span className="text-sm text-zeluxe-black">Active</span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-zeluxe-lightgray py-3 font-bold text-zeluxe-black transition hover:bg-zeluxe-fieldbg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-zeluxe-black py-3 font-bold text-white transition hover:bg-[#2a2a2a] disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
