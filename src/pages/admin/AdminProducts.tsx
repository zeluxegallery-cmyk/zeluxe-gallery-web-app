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
import { Loader2, Package, Pencil, Plus, Search, Trash2, Upload, X, Wand2, Palette, Ruler, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import { db } from '../../firebase';

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
  sourceUrl: string;
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
  imageUrls: string[];
  colorsInput: string;
  sizesInput: string;
  sourceUrl: string;
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
  imageUrls: [],
  colorsInput: '',
  sizesInput: '',
  sourceUrl: '',
  stock: '0',
  purchaseCost: '0',
  resellerPrice: '0',
  suggestedPrice: '0',
  active: true,
};

const MAX_IMAGES = 10; // একসঙ্গে একাধিক ছবি আপলোড করার সুবিধা বাড়াতে লিমিট বাড়ানো হলো
const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 20;

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
  'পাঞ্জাবি কম্বো সেট': 'Panjabi Combo',
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

// ═══ SKU জেনারেট করার কোড ═══
const CATEGORY_CODES: Record<string, string> = {
  'শার্ট': 'SHT', 'Shirt': 'SHT', 
  'টি-শার্ট': 'TSH', 'T-Shirt': 'TSH', 
  'পাঞ্জাবি': 'PNJ', 'Panjabi': 'PNJ',
  'প্যান্ট & ট্রাউজার': 'PNT', 'Pant': 'PNT',
  'হুডি & জ্যাকেট': 'HDJ', 'Hoodie': 'HDJ',
  'শাড়ি': 'SAR', 'Sharee': 'SAR',
  'থ্রি-পিস': 'TPS', '3 Piece': 'TPS',
  'কুর্তি': 'KRT',
  'বোরকা': 'BRK', 'Borka': 'BRK', 
  'হিজাব': 'HJB', 'Hijab': 'HJB', 
  'বেবি ড্রেস': 'BBD', 'Baby Fashion': 'BBD',
  'কিডস আইটেম': 'KID', 'Kids Items': 'KID',
  'খেলনা': 'TOY',
  'ঘড়ি': 'WAT', 'Watch': 'WAT',
  'স্মার্ট ওয়াচ': 'SWT', 'Smart Watch': 'SWT',
  'হেডফোন': 'HDP', 'Headphone': 'HDP',
  'ইয়ারবাডস (ব্রুটুথ)': 'HDP', 'Airpods': 'HDP',
  'পাওয়ার ব্যাংক': 'PWB', 'Power Bank': 'PWB',
  'কসমেটিক্স': 'CSM', 'Cosmetics': 'CSM',
  'স্কিন কেয়ার': 'SKC', 'Skin Care': 'SKC',
  'পারফিউম': 'PRF', 'Perfume': 'PRF',
  'ব্যাগ': 'BAG', 'Bag': 'BAG',
  'কাপল আইটেম': 'CPL', 'Couple Items': 'CPL',
  'গিফট আইটেম': 'GFT', 'Gift Items': 'GFT',
  'ওয়েস্টার্ন ড্রেস': 'WDR', 'Western Dress': 'WDR',
  'ইন্টেরিয়র': 'INT', 'Interior': 'INT',
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  
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
          const imgUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';
          let urls: string[] = [];
          if (Array.isArray(data.imageUrls)) {
            urls = data.imageUrls.filter((u: any) => typeof u === 'string');
          }
          if (urls.length === 0 && imgUrl) urls = [imgUrl];

          let colors: string[] = [];
          if (Array.isArray(data.colors)) colors = data.colors.filter((c: any) => typeof c === 'string');
          
          let sizes: string[] = [];
          if (Array.isArray(data.sizes)) sizes = data.sizes.filter((s: any) => typeof s === 'string');

          return {
            id: productDoc.id,
            name: typeof data.name === 'string' ? data.name : '—',
            sku: typeof data.sku === 'string' ? data.sku : '—',
            category: typeof data.category === 'string' ? data.category : '—',
            description: typeof data.description === 'string' ? data.description : '',
            imageUrl: imgUrl,
            imageUrls: urls,
            colors,
            sizes,
            sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : '',
            stock: typeof data.stock === 'number' ? data.stock : 0,
            purchaseCost: typeof data.purchaseCost === 'number' ? data.purchaseCost : 0,
            resellerPrice: typeof data.resellerPrice === 'number' ? data.resellerPrice : 0,
            suggestedPrice: typeof data.suggestedPrice === 'number' ? data.suggestedPrice : 0,
            active: typeof data.active === 'boolean' ? data.active : true,
          };
        }),
      );

      let fetchedCats = categorySnap.docs.map((catDoc) => ({
        id: catDoc.id,
        name: typeof catDoc.data().name === 'string' ? catDoc.data().name : 'Unnamed',
      }));

      fetchedCats.sort((a, b) => {
        const nameA = getDisplayCategoryName(a.name);
        const nameB = getDisplayCategoryName(b.name);
        const indexA = getOrderIndex(nameA);
        const indexB = getOrderIndex(nameB);
        if (indexA !== indexB) return indexA - indexB;
        return nameA.localeCompare(nameB);
      });

      setCategories(fetchedCats);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error('ডেটা লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [search, categoryFilter]);

  const generateSKU = useCallback(async (categoryName: string): Promise<string> => {
    if (!categoryName) return '';
    const code = CATEGORY_CODES[categoryName] || 'GEN';
    try {
      const q = query(collection(db, 'products'));
      const snap = await getDocs(q);
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
      return `ZEL-${code}-${nextSeq.toString().padStart(4, '0')}`;
    } catch (err) {
      return `ZEL-${code}-0001`;
    }
  }, []);

  const handleCategoryChange = async (categoryName: string) => {
    setForm((prev) => ({ ...prev, category: categoryName, sku: '' }));
    if (!categoryName || editingId) return;
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
      toast.error('প্রথমে ক্যাটাগরি সিলেক্ট করুন');
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
      imageUrls: product.imageUrls.length > 0 ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []),
      colorsInput: product.colors.join(', '),
      sizesInput: product.sizes.join(', '),
      sourceUrl: product.sourceUrl,
      stock: String(product.stock),
      purchaseCost: String(product.purchaseCost),
      resellerPrice: String(product.resellerPrice),
      suggestedPrice: String(product.suggestedPrice),
      active: product.active,
    });
    setEditingId(product.id);
    setModalOpen(true);
  };

  // ═══ মাল্টিপল ছবি আপলোড করলে প্রতিটি ছবির জন্য আলাদা প্রোডাক্ট হিসেবে সেভ করার লজিক ═══
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('প্রোডাক্টের নাম অবশ্যই দিতে হবে');
      return;
    }
    if (form.imageUrls.length === 0) {
      toast.error('কমপক্ষে একটি ছবি আপলোড করতে হবে');
      return;
    }

    setSaving(true);
    try {
      const colors = form.colorsInput.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
      const sizes = form.sizesInput.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

      // যদি এডিট মোডে থাকেন, তবে একটিই আপডেট হবে
      if (editingId) {
        const payload = {
          name: form.name.trim(),
          sku: form.sku.trim(),
          category: form.category,
          description: form.description.trim(),
          imageUrl: form.imageUrls[0] || '',
          imageUrls: form.imageUrls,
          colors,
          sizes,
          sourceUrl: form.sourceUrl.trim(),
          stock: Number(form.stock) || 0,
          purchaseCost: Number(form.purchaseCost) || 0,
          resellerPrice: Number(form.resellerPrice) || 0,
          suggestedPrice: Number(form.suggestedPrice) || 0,
          active: form.active,
        };
        await updateDoc(doc(db, 'products', editingId), payload);
        toast.success('✓ প্রোডাক্ট আপডেট হয়েছে!');
      } else {
        // নতুন প্রোডাক্ট যোগ করার সময় একাধিক ছবি থাকলে প্রতিটি ছবির জন্য লুপ চালিয়ে আলাদা আলাদা প্রোডাক্ট তৈরি করা হবে
        for (let i = 0; i < form.imageUrls.length; i++) {
          const imgUrl = form.imageUrls[i];
          
          // প্রতিটি আলাদা প্রোডাক্টের জন্য নতুন SKU জেনারেট করা
          const uniqueSku = await generateSKU(form.category);

          const payload = {
            name: form.imageUrls.length > 1 ? `${form.name.trim()} (${i + 1})` : form.name.trim(),
            sku: uniqueSku,
            category: form.category,
            description: form.description.trim(),
            imageUrl: imgUrl,
            imageUrls: [imgUrl],
            colors,
            sizes,
            sourceUrl: form.sourceUrl.trim(),
            stock: Number(form.stock) || 0,
            purchaseCost: Number(form.purchaseCost) || 0,
            resellerPrice: Number(form.resellerPrice) || 0,
            suggestedPrice: Number(form.suggestedPrice) || 0,
            active: form.active,
            createdAt: serverTimestamp(),
          };

          await addDoc(collection(db, 'products'), payload);
        }
        toast.success(`✓ সফলভাবে ${form.imageUrls.length}টি আলাদা প্রোডাক্ট যোগ হয়েছে!`);
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" ডিলিট করবেন? এটা ফেরত আনা যাবে না।`)) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success(`✓ "${name}" ডিলিট হয়েছে।`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), { active: !product.active });
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toggle failed.');
    }
  };

  const handleMultipleImageUpload = async (files: FileList) => {
    const remaining = MAX_IMAGES - form.imageUrls.length;
    if (remaining <= 0) {
      toast.error(`সর্বোচ্চ ${MAX_IMAGES}টি ছবি আপলোড করা যাবে`);
      return;
    }
    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploadPromises = filesToUpload.map((file) => uploadImageToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ...urls] }));
      toast.success(`✓ ${urls.length}টি ছবি আপলোড হয়েছে`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }));
  };

  const filtered = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const displayedProducts = filtered.slice(0, visibleCount);

  const inputClass =
    'w-full rounded-md border border-zeluxe-lightgray bg-white px-4 py-3 text-sm text-zeluxe-black placeholder:text-zeluxe-gray focus:border-zeluxe-gold focus:outline-none';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="hidden overflow-hidden rounded-lg border border-zeluxe-lightgray bg-white md:block">
          <div className="bg-zeluxe-cream px-4 py-3">
            <div className="h-4 w-1/4 animate-pulse rounded bg-gray-300"></div>
          </div>
          <div className="divide-y divide-zeluxe-lightgray">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-4 animate-pulse">
                <div className="h-10 w-10 rounded-md bg-gray-200"></div>
                <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                <div className="h-4 w-20 rounded bg-gray-200"></div>
                <div className="h-4 w-16 rounded bg-gray-200"></div>
                <div className="h-4 w-10 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zeluxe-black">প্রোডাক্ট ম্যানেজমেন্ট</h1>
        <button onClick={openAdd} className="rounded-md bg-zeluxe-black px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800">
          + নতুন
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zeluxe-gray" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা SKU দিয়ে খুঁজুন..."
            className="w-full rounded-md border border-zeluxe-lightgray bg-white py-2.5 pl-10 pr-4 text-sm focus:border-zeluxe-gold focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-zeluxe-lightgray bg-white px-4 py-2.5 text-sm focus:border-zeluxe-gold focus:outline-none"
        >
          <option value="">সব ক্যাটাগরি</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{getDisplayCategoryName(cat.name)}</option>
          ))}
        </select>
      </div>

      {displayedProducts.length > 0 ? (
        <>
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
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {displayedProducts.map((product) => (
                  <tr key={product.id} className="border-b border-zeluxe-lightgray last:border-0">
                    <td className="px-4 py-3">
                      {product.imageUrl ? (
                        <div className="relative">
                          <img 
                            src={product.imageUrl.includes('res.cloudinary.com') ? product.imageUrl.replace('/upload/', '/upload/q_auto,f_auto,w_100/') : product.imageUrl} 
                            alt={product.name} 
                            loading="lazy"
                            className="h-10 w-10 rounded-md object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zeluxe-cream">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-zeluxe-black">{product.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{product.sku}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{getDisplayCategoryName(product.category)}</td>
                    <td className="px-4 py-3 text-zeluxe-black">{product.stock}</td>
                    <td className="px-4 py-3 font-bold text-zeluxe-gold">Tk {product.resellerPrice.toLocaleString()}</td>
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
                        <button onClick={() => openEdit(product)} className="rounded-md p-1.5 text-zeluxe-gold hover:bg-zeluxe-cream">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id, product.name)} className="rounded-md p-1.5 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {displayedProducts.map((product) => (
              <div key={product.id} className="rounded-lg border border-zeluxe-lightgray bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl.includes('res.cloudinary.com') ? product.imageUrl.replace('/upload/', '/upload/q_auto,f_auto,w_150/') : product.imageUrl} 
                        alt={product.name} 
                        loading="lazy"
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
                    <button onClick={() => openEdit(product)} className="rounded-md p-1.5 text-zeluxe-gold">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id, product.name)} className="rounded-md p-1.5 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500">{getDisplayCategoryName(product.category)} · Stock: {product.stock}</span>
                  <span className="font-bold text-zeluxe-gold">Tk {product.resellerPrice.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
                className="rounded-md border border-zeluxe-black bg-white px-8 py-3 text-sm font-bold text-zeluxe-black transition hover:bg-gray-50 active:scale-95"
              >
                আরো প্রোডাক্ট দেখুন (Load More)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-zeluxe-lightgray bg-white p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">কোনো প্রোডাক্ট নেই</p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zeluxe-black">
                {editingId ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট (একাধিক ছবি দিলে আলাদা প্রোডাক্ট তৈরি হবে)'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-1.5 text-gray-500 hover:bg-zeluxe-cream">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">ক্যাটাগরি *</label>
                <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} className={inputClass}>
                  <option value="">ক্যাটাগরি সিলেক্ট করুন</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {getDisplayCategoryName(cat.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-zeluxe-black">
                  <span>SKU *</span>
                  <button
                    type="button"
                    onClick={handleRegenerateSku}
                    disabled={!form.category || skuLoading}
                    className="flex items-center gap-1 text-[11px] font-medium text-zeluxe-gold hover:underline disabled:opacity-40"
                  >
                    <Wand2 size={12} /> Auto Generate
                  </button>
                </label>
                <div className="relative">
                  <input
                    value={skuLoading ? 'তৈরি হচ্ছে...' : form.sku}
                    readOnly
                    placeholder="ক্যাটাগরি সিলেক্ট করলে অটো তৈরি হবে"
                    className={`${inputClass} bg-zeluxe-cream font-mono text-gray-600 ${skuLoading ? 'animate-pulse' : ''}`}
                  />
                  {skuLoading && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zeluxe-gold" />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">প্রোডাক্টের নাম *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="যেমন: Premium Silk Saree"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">বিবরণ</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="প্রোডাক্টের বিবরণ..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zeluxe-black">
                  <LinkIcon size={14} className="text-zeluxe-gold" />
                  <span>সোর্স লিংক (URL)</span>
                </label>
                <input
                  type="url"
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                  placeholder="যেমন: https://lifegood.com/product/27480"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zeluxe-black">
                  <Ruler size={14} className="text-zeluxe-gold" />
                  <span>উপলব্ধ সাইজ</span>
                </label>
                <input
                  value={form.sizesInput}
                  onChange={(e) => setForm({ ...form, sizesInput: e.target.value })}
                  placeholder="যেমন: S, M, L, XL, XXL"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zeluxe-black">
                  <Palette size={14} className="text-zeluxe-gold" />
                  <span>উপলব্ধ কালার (ঐচ্ছিক)</span>
                </label>
                <input
                  value={form.colorsInput}
                  onChange={(e) => setForm({ ...form, colorsInput: e.target.value })}
                  placeholder="যেমন: Red, Blue, Green, Black"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-zeluxe-black">
                  <span>প্রোডাক্টের ছবিগুলো (একাধিক আপলোড করতে পারবেন)</span>
                  <span className="text-[11px] font-normal text-gray-500">{form.imageUrls.length}/{MAX_IMAGES}</span>
                </label>

                {form.imageUrls.length > 0 && (
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {form.imageUrls.map((url, idx) => (
                      <div key={idx} className="group relative aspect-square overflow-hidden rounded-md border-2 border-zeluxe-gold">
                        <img src={url} alt={`Product ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-md"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {form.imageUrls.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-zeluxe-lightgray p-4 text-center transition hover:border-zeluxe-gold disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-zeluxe-gold" />
                        <p className="mt-2 text-xs text-gray-500">ছবি আপলোড হচ্ছে...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="mx-auto h-6 w-6 text-zeluxe-gold" />
                        <p className="mt-2 text-sm font-medium text-zeluxe-black">
                          একাধিক ছবি সিলেক্ট করুন (প্রতিটি ছবি আলাদা প্রোডাক্ট হবে)
                        </p>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) void handleMultipleImageUpload(files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">স্টক</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/[^0-9]/g, '') })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">ক্রয় মূল্য (Tk)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.purchaseCost}
                    onChange={(e) => setForm({ ...form, purchaseCost: e.target.value.replace(/[^0-9]/g, '') })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">রিসেলার মূল্য (Tk)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.resellerPrice}
                    onChange={(e) => setForm({ ...form, resellerPrice: e.target.value.replace(/[^0-9]/g, '') })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zeluxe-black">সাজেস্টেড মূল্য (Tk)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.suggestedPrice}
                    onChange={(e) => setForm({ ...form, suggestedPrice: e.target.value.replace(/[^0-9]/g, '') })}
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
                <span className="text-sm text-zeluxe-black">Active (রিসেলাররা দেখতে পাবে)</span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-md border border-zeluxe-lightgray py-3 text-sm font-bold text-zeluxe-black transition hover:bg-zeluxe-cream">
                বাতিল
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded-md bg-zeluxe-black py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-60">
                {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
