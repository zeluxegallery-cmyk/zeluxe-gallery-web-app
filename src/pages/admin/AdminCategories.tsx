import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { FolderTree, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import { db } from '../../firebase';

type Category = {
  id: string;
  name: string;
  imageUrl: string;
  productCount: number;
};

type CategoryForm = {
  name: string;
  imageUrl: string;
};

const emptyForm: CategoryForm = {
  name: '',
  imageUrl: '',
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [catSnap, productSnap] = await Promise.all([
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'products')),
      ]);
      const products = productSnap.docs.map((p) => p.data());
      setCategories(
        catSnap.docs.map((catDoc) => {
          const data = catDoc.data();
          const name = typeof data.name === 'string' ? data.name : 'Unnamed';
          const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';
          const productCount = products.filter((p) => p.category === name).length;
          return { id: catDoc.id, name, imageUrl, productCount };
        }),
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

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, imageUrl: cat.imageUrl });
    setEditingId(cat.id);
    setModalOpen(true);
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

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        imageUrl: form.imageUrl.trim(),
      };
      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), payload);
      } else {
        await addDoc(collection(db, 'categories'), { ...payload, createdAt: serverTimestamp() });
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

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.';
      alert(message);
    }
  };

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
        <h1 className="text-2xl font-bold text-zeluxe-black">ক্যাটাগরি ম্যানেজমেন্ট</h1>
        <button
          onClick={openAdd}
          className="rounded-xl bg-zeluxe-black px-4 py-2 font-bold text-white transition hover:bg-[#2a2a2a] active:scale-[0.98]"
        >
          + নতুন ক্যাটাগরি
        </button>
      </div>

      {categories.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-xl border border-zeluxe-lightgray bg-white p-4"
            >
              <div className="flex items-center gap-3">
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-gold/10">
                    <FolderTree className="text-zeluxe-gold" size={20} />
                  </span>
                )}
                <div>
                  <p className="font-bold text-zeluxe-black">{cat.name}</p>
                  <p className="text-xs text-gray-500">{cat.productCount} products</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(cat)}
                  className="rounded-lg p-1.5 text-zeluxe-gold transition hover:bg-zeluxe-fieldbg"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-zeluxe-fieldbg p-12 text-center">
          <FolderTree className="mx-auto h-12 w-12 text-zeluxe-gray" />
          <p className="mt-4 text-gray-600">No categories yet. Create your first category!</p>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zeluxe-black">
                {editingId ? 'ক্যাটাগরি এডিট' : 'নতুন ক্যাটাগরি'}
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
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">ক্যাটাগরির নাম *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-black">ক্যাটাগরির ছবি</label>
                {form.imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="h-32 w-32 rounded-xl object-cover"
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
                    className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zeluxe-lightgray p-4 text-center cursor-pointer transition hover:border-zeluxe-gold disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-zeluxe-gold" />
                        <p className="mt-2 text-xs text-zeluxe-gray">আপলোড হচ্ছে...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="mx-auto h-6 w-6 text-zeluxe-gold" />
                        <p className="mt-2 text-sm font-medium text-zeluxe-black">ছবি আপলোড করুন</p>
                        <p className="mt-1 text-xs text-zeluxe-gray">JPG, PNG (Max 5MB)</p>
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

              <div>
                <label className="mb-1 block text-sm font-medium text-zeluxe-gray">Image URL (manual)</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full rounded-xl border border-zeluxe-lightgray bg-zeluxe-fieldbg px-4 py-3 text-sm focus:border-zeluxe-gold focus:outline-none"
                  placeholder="https://..."
                />
              </div>
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
