import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { FolderTree, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { db } from '../../firebase';

type Category = {
  id: string;
  name: string;
  productCount: number;
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
          const productCount = products.filter((p) => p.category === name).length;
          return { id: catDoc.id, name, productCount };
        }),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAdd = async () => {
    const name = window.prompt('Category name:');
    if (!name || !name.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), { name: name.trim() });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Add failed.';
      alert(message);
    }
  };

  const handleEdit = async (cat: Category) => {
    const name = window.prompt('Category name:', cat.name);
    if (!name || !name.trim()) return;
    try {
      await updateDoc(doc(db, 'categories', cat.id), { name: name.trim() });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Edit failed.';
      alert(message);
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
          onClick={handleAdd}
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
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zeluxe-gold/10">
                  <FolderTree className="text-zeluxe-gold" size={20} />
                </span>
                <div>
                  <p className="font-bold text-zeluxe-black">{cat.name}</p>
                  <p className="text-xs text-gray-500">{cat.productCount} products</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(cat)}
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
    </AdminLayout>
  );
}
