import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { resizeImage } from '../lib/imageResize';
import type { Category, Filter, Subcategory } from '../types';

function emptyFilter(): Omit<Filter, 'id'> {
  return {
    name: '',
    category: '',
    subcategory: '',
    thumb_128: '',
    tags: [],
    prompt: '',
    isPro: false,
    popularity: 0,
    order: 0,
  };
}

export default function FiltersPage() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [form, setForm] = useState<Omit<Filter, 'id'>>(() => emptyFilter());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const qf = query(collection(db, 'filters_feed'), orderBy('order', 'asc'));
    const unsubF = onSnapshot(qf, (snap) => {
      const rows: Filter[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setFilters(rows);
    });
    const qc = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubC = onSnapshot(qc, (snap) => {
      const rows: Category[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setCategories(rows);
    });
    const qs = query(collection(db, 'subcategories'), orderBy('order', 'asc'));
    const unsubS = onSnapshot(qs, (snap) => {
      const rows: Subcategory[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setSubcategories(rows);
    });
    return () => {
      unsubF();
      unsubC();
      unsubS();
    };
  }, []);

  const title = useMemo(() => (editingId ? 'Edit Filter' : 'Create Filter'), [editingId]);

  async function uploadThumbIfNeeded(existingUrl?: string): Promise<string> {
    if (!file) return existingUrl || '';
    const resized = await resizeImage(file, 128, 128);
    const ext = 'webp';
    const fileRef = ref(storage, `filters/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
    const buf = await resized.arrayBuffer();
    await uploadBytes(fileRef, new Uint8Array(buf), { contentType: 'image/webp' });
    return await getDownloadURL(fileRef);
  }

  // Get filtered subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    if (!form.category) return [];
    return subcategories.filter(sub => sub.parentCategoryId === form.category);
  }, [form.category, subcategories]);

  // Auto-set order when creating new filter
  useEffect(() => {
    if (!editingId && form.order === 0) {
      if (filters.length === 0) return;
      const maxOrder = Math.max(...filters.map(item => item.order || 0));
      const nextOrder = maxOrder + 1;
      if (nextOrder > 0) {
        setForm((f) => ({ ...f, order: nextOrder }));
      }
    }
  }, [filters.length, editingId]);

  // Auto-set thumbnail from subcategory or category if no image selected
  useEffect(() => {
    if (!file && !editingId) {
      // Priority: subcategory image > category image
      if (form.subcategory) {
        const subcategory = subcategories.find(s => s.id === form.subcategory);
        if (subcategory && subcategory.cover_image) {
          setForm((f) => ({ ...f, thumb_128: subcategory.cover_image || '' }));
          return;
        }
      }
      
      // Fallback to category image
      if (form.category) {
        const category = categories.find(c => c.id === form.category);
        if (category && category.cover_image) {
          setForm((f) => ({ ...f, thumb_128: category.cover_image || '' }));
        }
      }
    }
  }, [form.category, form.subcategory, categories, subcategories, file, editingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const thumbUrl = await uploadThumbIfNeeded(form.thumb_128);
      const payload = {
        ...form,
        thumb_128: thumbUrl,
        category: form.category,
        subcategory: form.subcategory || undefined, // Only include if set
        updatedAt: serverTimestamp(),
      } as any;

      if (editingId) {
        await updateDoc(doc(db, 'filters_feed', editingId), payload);
      } else {
        await addDoc(collection(db, 'filters_feed'), payload);
      }
      setForm(emptyFilter());
      setEditingId(null);
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(f: Filter) {
    const { id, updatedAt, ...rest } = f;
    setForm({ ...emptyFilter(), ...rest });
    setEditingId(id!);
  }

  async function remove(id: string) {
    if (!confirm('Delete this filter?')) return;
    await deleteDoc(doc(db, 'filters_feed', id));
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Filters</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border rounded p-4">
          <h3 className="font-medium mb-3">{title}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Category *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))}
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            </div>
            {form.category && availableSubcategories.length > 0 && (
              <div>
                <label className="block text-sm mb-1">Subcategory (optional)</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.subcategory || ''}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                >
                  <option value="">None</option>
                  {availableSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Popularity</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  value={form.popularity}
                  onChange={(e) => setForm((f) => ({ ...f, popularity: Number(e.target.value) }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Order (auto-assigned, editable)</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 bg-gray-50"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isPro"
                type="checkbox"
                checked={form.isPro}
                onChange={(e) => setForm((f) => ({ ...f, isPro: e.target.checked }))}
              />
              <label htmlFor="isPro">Premium (Pro)</label>
            </div>
            <div>
              <label className="block text-sm mb-1">Prompt</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Tags (comma separated)</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={(form.tags || []).join(', ')}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Thumbnail (128×128)
                {form.thumb_128 && !file && form.subcategory && ' (inherited from subcategory)'}
                {form.thumb_128 && !file && !form.subcategory && form.category && ' (inherited from category)'}
                {form.thumb_128 && file && ' (new image selected)'}
              </label>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {form.thumb_128 && (
                <div className="mt-2">
                  <img src={form.thumb_128} alt="Thumb preview" className="w-16 h-16 object-cover border rounded" />
                  {!file && (form.category || form.subcategory) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Using {form.subcategory ? 'subcategory' : 'category'} image
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button disabled={loading} className="px-4 py-2 rounded bg-black text-white">
                {editingId ? 'Save' : 'Create'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="px-4 py-2 rounded border"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyFilter());
                    setFile(null);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="bg-white border rounded p-4">
          <h3 className="font-medium mb-3">Existing</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Thumb</th>
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2">Subcategory</th>
                  <th className="py-2 pr-2">Popularity</th>
                  <th className="py-2 pr-2">Order</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filters.map((f) => {
                  const category = categories.find((c) => c.id === f.category);
                  const subcategory = f.subcategory ? subcategories.find((s) => s.id === f.subcategory) : null;
                  return (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        {f.thumb_128 ? (
                          <img src={f.thumb_128} alt={f.name} className="w-8 h-8 object-cover border rounded" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 border rounded flex items-center justify-center text-xs text-gray-400">
                            ?
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-2 font-medium">{f.name}</td>
                      <td className="py-2 pr-2">{category ? category.name : f.category}</td>
                      <td className="py-2 pr-2">
                        {subcategory ? (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">{subcategory.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">{f.popularity}</td>
                      <td className="py-2 pr-2">{f.order}</td>
                      <td className="py-2 flex gap-2">
                        <button className="px-3 py-1 rounded border" onClick={() => startEdit(f)}>Edit</button>
                        <button className="px-3 py-1 rounded border text-red-600" onClick={() => remove(f.id!)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

