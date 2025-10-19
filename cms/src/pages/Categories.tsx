import { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { resizeImage } from '../lib/imageResize';
import type { Category, Subcategory } from '../types';

interface FormState {
  name: string;
  slug: string;
  cover_image: string;
  description: string;
  order: number;
  visible: boolean;
  hasSubcategories: boolean;
  tags: string[];
  isSubcategory: boolean;
  parentCategoryId?: string;
}

function emptyForm(): FormState {
  return {
    name: '',
    slug: '',
    cover_image: '',
    description: '',
    order: 0,
    visible: true,
    hasSubcategories: false,
    tags: [],
    isSubcategory: false,
    parentCategoryId: undefined,
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  useEffect(() => {
    const qCat = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubCat = onSnapshot(qCat, (snap) => {
      const rows: Category[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setCategories(rows);
    });
    
    const qSub = query(collection(db, 'subcategories'), orderBy('order', 'asc'));
    const unsubSub = onSnapshot(qSub, (snap) => {
      const rows: Subcategory[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setSubcategories(rows);
    });
    
    return () => {
      unsubCat();
      unsubSub();
    };
  }, []);

  const title = useMemo(() => {
    if (editingId) {
      return form.isSubcategory ? 'Edit Subcategory' : 'Edit Category';
    }
    return form.isSubcategory ? 'Create Subcategory' : 'Create Category';
  }, [editingId, form.isSubcategory]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setForm((f) => {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
      
      return { ...f, name, slug };
    });
  };

  // Get next order number
  const getNextOrder = () => {
    if (editingId) return form.order; // Keep existing order when editing
    
    const items = form.isSubcategory ? subcategories : categories;
    if (items.length === 0) return 0;
    
    const maxOrder = Math.max(...items.map(item => item.order || 0));
    return maxOrder + 1;
  };

  // Auto-set order when creating new item
  useEffect(() => {
    if (!editingId && form.order === 0) {
      const nextOrder = getNextOrder();
      if (nextOrder > 0) {
        setForm((f) => ({ ...f, order: nextOrder }));
      }
    }
  }, [categories.length, subcategories.length, form.isSubcategory]);

  // Auto-set cover image from parent category if subcategory and no image selected
  useEffect(() => {
    if (form.isSubcategory && form.parentCategoryId && !coverImageFile && !editingId) {
      const parentCategory = categories.find(c => c.id === form.parentCategoryId);
      if (parentCategory && parentCategory.cover_image && !form.cover_image) {
        setForm((f) => ({ ...f, cover_image: parentCategory.cover_image || '' }));
      }
    }
  }, [form.parentCategoryId, form.isSubcategory, categories, coverImageFile, editingId]);

  // Auto-update hasSubcategories for all categories based on actual subcategories
  useEffect(() => {
    categories.forEach(async (category) => {
      const actualHasSubcategories = subcategories.some(sub => sub.parentCategoryId === category.id);
      if (category.hasSubcategories !== actualHasSubcategories) {
        await updateDoc(doc(db, 'categories', category.id!), {
          hasSubcategories: actualHasSubcategories,
        });
      }
    });
  }, [subcategories.length, categories.length]);

  async function uploadCoverImageIfNeeded(existingUrl?: string): Promise<string> {
    if (!coverImageFile) return existingUrl || '';
    const resized = await resizeImage(coverImageFile, 192, 240);
    const ext = 'webp';
    const fileRef = ref(storage, `categories/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
    const buf = await resized.arrayBuffer();
    await uploadBytes(fileRef, new Uint8Array(buf), { contentType: 'image/webp' });
    return await getDownloadURL(fileRef);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate parent category if subcategory
    if (form.isSubcategory && !form.parentCategoryId) {
      alert('Please select a parent category for this subcategory');
      return;
    }
    
    setLoading(true);
    try {
      const coverImageUrl = await uploadCoverImageIfNeeded(form.cover_image);
      const collectionName = form.isSubcategory ? 'subcategories' : 'categories';
      
      // Build payload based on whether it's a category or subcategory
      const basePayload = {
        name: form.name,
        slug: form.slug.trim().toLowerCase(),
        cover_image: coverImageUrl,
        description: form.description,
        order: form.order,
        visible: form.visible,
        tags: form.tags,
        updatedAt: serverTimestamp(),
      } as any;
      
      // Add hasSubcategories only for categories, parentCategoryId only for subcategories
      const payload = form.isSubcategory 
        ? { ...basePayload, parentCategoryId: form.parentCategoryId }
        : { ...basePayload, hasSubcategories: form.hasSubcategories };

      if (editingId) {
        await updateDoc(doc(db, collectionName, editingId), payload);
      } else {
        await addDoc(collection(db, collectionName), payload);
      }
      
      setForm(emptyForm());
      setEditingId(null);
      setCoverImageFile(null);
    } finally {
      setLoading(false);
    }
  }

  function startEditCategory(cat: Category) {
    const { id, updatedAt, ...rest } = cat;
    setForm({ ...emptyForm(), ...rest, isSubcategory: false });
    setEditingId(id!);
  }

  function startEditSubcategory(subcat: Subcategory) {
    const { id, updatedAt, parentCategoryId, ...rest } = subcat;
    setForm({ ...emptyForm(), ...rest, isSubcategory: true, parentCategoryId });
    setEditingId(id!);
  }

  async function removeCategory(id: string) {
    if (!confirm('Delete this category?')) return;
    await deleteDoc(doc(db, 'categories', id));
  }

  async function removeSubcategory(id: string) {
    if (!confirm('Delete this subcategory?')) return;
    await deleteDoc(doc(db, 'subcategories', id));
  }
  
  function getCategoryName(categoryId: string): string {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Unknown';
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Categories</h2>
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
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Slug (auto-generated, editable)</label>
              <input
                className="w-full border rounded px-3 py-2 bg-gray-50"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
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
            <div>
              <label className="block text-sm mb-1">
                Cover Image (192×240) 
                {form.cover_image && !coverImageFile && form.isSubcategory && form.parentCategoryId && ' (inherited from parent)'}
                {form.cover_image && !form.isSubcategory && ' (will keep if not replaced)'}
                {form.cover_image && coverImageFile && ' (new image selected)'}
              </label>
              <input type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)} />
              {form.cover_image && (
                <div className="mt-2">
                  <img src={form.cover_image} alt="Cover preview" className="w-24 h-30 object-cover border rounded" />
                  {form.isSubcategory && form.parentCategoryId && !coverImageFile && (
                    <p className="text-xs text-gray-500 mt-1">Using parent category image</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                value={form.description || ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="visible"
                type="checkbox"
                checked={form.visible}
                onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
              />
              <label htmlFor="visible">Visible</label>
            </div>
            {!form.isSubcategory && (
              <div className="flex items-center gap-2">
                <input
                  id="hasSubcategories"
                  type="checkbox"
                  checked={form.hasSubcategories}
                  onChange={(e) => setForm((f) => ({ ...f, hasSubcategories: e.target.checked }))}
                />
                <label htmlFor="hasSubcategories">Has Subcategories</label>
                <span className="text-xs text-gray-500">(auto-updated based on actual subcategories)</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                id="isSubcategory"
                type="checkbox"
                checked={form.isSubcategory}
                onChange={(e) => {
                  const isSubcat = e.target.checked;
                  const items = isSubcat ? subcategories : categories;
                  const maxOrder = items.length === 0 ? 0 : Math.max(...items.map(item => item.order || 0));
                  const nextOrder = maxOrder + 1;
                  
                  setForm((f) => ({ 
                    ...f, 
                    isSubcategory: isSubcat, 
                    parentCategoryId: undefined,
                    order: nextOrder
                  }));
                }}
                disabled={!!editingId}
              />
              <label htmlFor="isSubcategory">Is Subcategory</label>
              {editingId && <span className="text-xs text-gray-500">(cannot change type when editing)</span>}
            </div>
            {form.isSubcategory && (
              <div>
                <label className="block text-sm mb-1">Parent Category *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.parentCategoryId || ''}
                  onChange={(e) => setForm((f) => ({ ...f, parentCategoryId: e.target.value }))}
                  required
                >
                  <option value="">Select a parent category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                    setForm(emptyForm());
                    setCoverImageFile(null);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="bg-white border rounded p-4">
          <h3 className="font-medium mb-3">Existing Categories & Subcategories</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Cover</th>
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Slug</th>
                  <th className="py-2 pr-2">Order</th>
                  <th className="py-2 pr-2">Visible</th>
                  <th className="py-2 pr-2">Has Subs</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={`cat-${c.id}`} className="border-b">
                    <td className="py-2 pr-2">
                      <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Category</span>
                    </td>
                    <td className="py-2 pr-2">
                      {c.cover_image ? (
                        <img src={c.cover_image} alt={c.name} className="w-12 h-15 object-cover border rounded" />
                      ) : (
                        <div className="w-12 h-15 bg-gray-200 border rounded flex items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-medium">{c.name}</td>
                    <td className="py-2 pr-2">{c.slug}</td>
                    <td className="py-2 pr-2">{c.order}</td>
                    <td className="py-2 pr-2">{c.visible ? 'Yes' : 'No'}</td>
                    <td className="py-2 pr-2">
                      {c.hasSubcategories ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td className="py-2 flex gap-2">
                      <button className="px-3 py-1 rounded border" onClick={() => startEditCategory(c)}>Edit</button>
                      <button className="px-3 py-1 rounded border text-red-600" onClick={() => removeCategory(c.id!)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {subcategories.map((s) => (
                  <tr key={`sub-${s.id}`} className="border-b bg-gray-50">
                    <td className="py-2 pr-2">
                      <span className="inline-block px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">Subcategory</span>
                      <div className="text-xs text-gray-500 mt-1">of {getCategoryName(s.parentCategoryId)}</div>
                    </td>
                    <td className="py-2 pr-2">
                      {s.cover_image ? (
                        <img src={s.cover_image} alt={s.name} className="w-12 h-15 object-cover border rounded" />
                      ) : (
                        <div className="w-12 h-15 bg-gray-200 border rounded flex items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-medium">{s.name}</td>
                    <td className="py-2 pr-2">{s.slug}</td>
                    <td className="py-2 pr-2">{s.order}</td>
                    <td className="py-2 pr-2">{s.visible ? 'Yes' : 'No'}</td>
                    <td className="py-2 pr-2">
                      <span className="text-xs text-gray-400">—</span>
                    </td>
                    <td className="py-2 flex gap-2">
                      <button className="px-3 py-1 rounded border" onClick={() => startEditSubcategory(s)}>Edit</button>
                      <button className="px-3 py-1 rounded border text-red-600" onClick={() => removeSubcategory(s.id!)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

