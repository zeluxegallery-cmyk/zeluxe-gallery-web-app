import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Loader2, Package, Pencil, Plus, Search, Trash2, Upload, X, Wand2 } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
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

// Category short codes for SKU generation
const CATEGORY_CODES: Record<string, string> = {
  'শার্ট': 'SHT',
  'টি-শার্ট': 'TSH',
  'পাঞ্জাবি': 'PNJ',
  'প্যান্ট & ট্রাউজার': 'PNT',
  'হুডি & জ্যাকেট': 'HDJ',
  'শাড়ি': 'SAR',
  'থ্রি-পিস': 'TPS',
  'কুর্তি': 'KRT',
  'বোরকা': 'BRK',
  'হিজাব': 'HJB',
  'বেবি ড্রেস': 'BBD',
  'কিডস আইটেম': 'KID',
  'খেলনা': 'TOY',
  'ঘড়ি': 'WAT',
  'স্মার্ট ওয়াচ': 'SWT',
  'হেডফোন': 'HDP',
  'পাওয়ার ব্যাংক': 'PWB',
  'কসমেটিক্স': 'CSM',
  'স্কিন কেয়ার': 'SKC',
  'পারফিউম': 'PRF',
  'ব্যাগ': 'BAG',
  'কাপল আইটেম': 'CPL',
  'গিফট আইটেম': 'GFT',
  'ওয়েস্টার্ন ড্রেস': 'WDR',
  'ইন্টেরিয়র': 'INT',
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
  const [uploading, setUploading] = useState(false);
  const [skuLoading, setSkuLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ═══ AUTO SKU GENERATION ═══
  const generateSKU = useCallback(async (categoryName: string): Promise<string> => {
    if (!categoryName) return '';

    const code = CATEGORY_CODES[categoryName] || 'GEN';

    try {
      const q = query(collection(db, 'products'));
      const snap = await getDocs(q);

      // Find max sequence for this category
      let maxSeq = 0;
      snap.docs.forEach((d) => {
        const sku = d.data().sku;
        if (typeof sku === 'string' && sku.startsWith(`ZEL-${code}-`)) {
          const parts = sku.split('-');
          const seq = parseInt(parts[2], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      });

      const nextSeq = maxSeq + 1;
      const seqStr = nextSeq.toString().padStart(4, '0');
      return `ZEL-${code}-${seqStr}`;
    } catch (err) {
      console.error('SKU generation failed:', err);
      return `ZEL-${code}-0001`;
    }
  }, []);

  const handleCategoryChange = async (categoryName: string) => {
    setForm((prev) => ({ ...prev, category: categoryName, sku: '' }));

    if (!categoryName) return;

    // Only auto-generate for new products, not when editing
    if (editingId) return;

    setSkuLoading(true);
    try {
      const newSku = await generateSKU(categoryName);
      setForm((prev) => ({ ...prev, sku: newSku }));
    } finally {
      setSkuLoading(false);
    }
  };

  const handleRegenerateSku = async () => {
    if (!form.category) {
      alert('প্রথমে ক্যাটাগরি সিলেক্ট করুন');
      return;
    }
    setSkuLoading(true);
    try {
      const newSku = await generateSKU(form.category);
      setForm((prev) => ({ ...prev, sku: newSku }));
    } finally {
      setSkuLoading(false);
    }
  };

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
    if (!form.name.trim() || !form.sku.trim()) {
      alert('নাম এবং SKU অবশ্যই দিতে হবে');
      return;
    }
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
    if (!window.confirm(`"${name}" ডিলিট করবেন? এটা ফেরত আনা যাবে না।`)) return;
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

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      alert(message);
    } finally {
      setUploading(false);
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

  const inputClass =
    'w-full rounded-md border border-zeluxe-lightgray bg-white px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none';

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zeluxe-black">প্রোডাক্ট ম্যানেজমেন্ট</h1>
        <button
          onClick={openAdd}
          className="rounded-md bg-zeluxe-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 active:scale-[0.98]"
        >
          + নতুন
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zeluxe-gray" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা SKU দিয়ে খুঁজুন..."
            className="w-full rounded-md border border-zeluxe-lightgray bg-white py-2.5 pl-10 pr-4 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-zeluxe-lightgray bg-white px-4 py-2.5 text-sm text-zeluxe-black focus:border-zeluxe-gold focus:outline-none"
        >
          <option value="">সব ক্যাটাগরি</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zeluxe-cream">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Image</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">SKU</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Category</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Stock</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Price</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Active</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500"></th>
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
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zeluxe-cream">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-zeluxe-black">{product.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{product.sku}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{product.category}</td>
                <td className="px-4 py-3 text-zeluxe-black">{product.stock}</td>
                <td className="px-4 py-3 font-bold text-zeluxe-gold">
                  Tk {product.resellerPrice.toLocaleString()}
                </td>
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
                      className="rounded-md p-1.5 text-zeluxe-gold transition hover:bg-zeluxe-cream"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="rounded-md p-1.5 text-red-600 transition hover:bg-red-50"
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
          <div key={product.id} className="rounded-lg border border-zeluxe-lightgray bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-12 w-12 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-zeluxe-cream">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-zeluxe-black">{product.name}</p>
                  <p className="font-mono text-[10px] text-gray-500">{product.sku}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(product)}
                  className="rounded-md p-1.5 text-zeluxe-gold"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id, product.name)}
                  className="rounded-md p-1.5 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {product.category} · Stock: {product.stock}
              </span>
              <span className="font-bold text-zeluxe-gold">
                Tk {product.resellerPrice.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-zeluxe-lightgray bg-white p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">কোনো প্রোডাক্ট নেই</p>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zeluxe-black">
                {editingId ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-zeluxe-cream"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category FIRST — so SKU auto-generates */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  ক্যাটাগরি *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">ক্যাটাগরি সিলেক্ট করুন</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SKU — auto-generated, readonly */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-zeluxe-black">
                  <span>SKU *</span>
                  <button
                    type="button"
                    onClick={handleRegenerateSku}
                    disabled={!form.category || skuLoading}
                    className="flex items-center gap-1 text-[11px] font-medium text-zeluxe-gold hover:underline disabled:opacity-40"
                  >
                    <Wand2 size={12} />
                    Auto Generate
                  </button>
                </label>
                <div className="relative">
                  <input
                    value={skuLoading ? 'তৈরি হচ্ছে...' : form.sku}
                    readOnly
                    placeholder="ক্যাটাগরি সিলেক্ট করলে অটো তৈরি হবে"
                    className={`${inputClass} bg-zeluxe-cream font-mono text-gray-600 ${
                      skuLoading ? 'animate-pulse' : ''
                    }`}
                  />
                  {skuLoading && (
                    <Loader2
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zeluxe-gold"
                    />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  ফরম্যাট: ZEL-XXX-NNNN (একটি ক্যাটাগরিতে অটো নাম্বার বাড়বে)
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  প্রোডাক্টের নাম *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="যেমন: Premium Silk Saree"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  বিবরণ
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="প্রোডাক্টের বিবরণ..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                  প্রোডাক্টের ছবি
                </label>
                {form.imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="h-32 w-32 rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: '' })}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-zeluxe-lightgray p-4 text-center transition hover:border-zeluxe-gold disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-zeluxe-gold" />
                        <p className="mt-2 text-xs text-gray-500">আপলোড হচ্ছে...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="mx-auto h-6 w-6 text-zeluxe-gold" />
                        <p className="mt-2 text-sm font-medium text-zeluxe-black">
                          ছবি আপলোড করুন
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          JPG, PNG (Max 5MB)
                        </p>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImageUpload(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                    স্টক
                  </label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                    ক্রয় মূল্য (Tk)
                  </label>
                  <input
                    type="number"
                    value={form.purchaseCost}
                    onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                    রিসেলার মূল্য (Tk)
                  </label>
                  <input
                    type="number"
                    value={form.resellerPrice}
                    onChange={(e) => setForm({ ...form, resellerPrice: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">
                    সাজেস্টেড মূল্য (Tk)
                  </label>
                  <input
                    type="number"
                    value={form.suggestedPrice}
                    onChange={(e) => setForm({ ...form, suggestedPrice: e.target.value })}
                    className={inputClass}
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
                <span className="text-sm text-zeluxe-black">
                  Active (রিসেলাররা দেখতে পাবে)
                </span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-md border border-zeluxe-lightgray py-3 text-sm font-bold text-zeluxe-black transition hover:bg-zeluxe-cream"
              >
                বাতিল
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-md bg-zeluxe-black py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
