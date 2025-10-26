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
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { resizeImage } from '../lib/imageResize';
import type { Category, Subcategory } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface SortableCategoryRowProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

function SortableCategoryRow({ category, onEdit, onDelete }: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id!,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b">
      <td className="py-2 pr-2">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          {...attributes}
          {...listeners}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </td>
      <td className="py-2 pr-2">
        <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Category</span>
      </td>
      <td className="py-2 pr-2">
        {category.cover_image ? (
          <img src={category.cover_image} alt={category.name} className="w-12 h-15 object-cover border rounded" />
        ) : (
          <div className="w-12 h-15 bg-gray-200 border rounded flex items-center justify-center text-xs text-gray-400">
            No image
          </div>
        )}
      </td>
      <td className="py-2 pr-2 font-medium">{category.name}</td>
      <td className="py-2 pr-2">{category.slug}</td>
      <td className="py-2 pr-2">{category.order}</td>
      <td className="py-2 pr-2">{category.visible ? 'Yes' : 'No'}</td>
      <td className="py-2 pr-2">
        {category.hasSubcategories ? (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Yes</span>
        ) : (
          <span className="text-xs text-gray-400">No</span>
        )}
      </td>
      <td className="py-2 flex gap-2">
        <button className="px-3 py-1 rounded border" onClick={() => onEdit(category)}>
          Edit
        </button>
        <button className="px-3 py-1 rounded border text-red-600" onClick={() => onDelete(category.id!)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

interface SortableSubcategoryRowProps {
  subcategory: Subcategory;
  getCategoryName: (id: string) => string;
  onEdit: (subcategory: Subcategory) => void;
  onDelete: (id: string) => void;
}

function SortableSubcategoryRow({ subcategory, getCategoryName, onEdit, onDelete }: SortableSubcategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subcategory.id!,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b bg-gray-50">
      <td className="py-2 pr-2">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          {...attributes}
          {...listeners}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </td>
      <td className="py-2 pr-2">
        <span className="inline-block px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">Subcategory</span>
        <div className="text-xs text-gray-500 mt-1">of {getCategoryName(subcategory.parentCategoryId)}</div>
      </td>
      <td className="py-2 pr-2">
        {subcategory.cover_image ? (
          <img src={subcategory.cover_image} alt={subcategory.name} className="w-12 h-15 object-cover border rounded" />
        ) : (
          <div className="w-12 h-15 bg-gray-200 border rounded flex items-center justify-center text-xs text-gray-400">
            No image
          </div>
        )}
      </td>
      <td className="py-2 pr-2 font-medium">{subcategory.name}</td>
      <td className="py-2 pr-2">{subcategory.slug}</td>
      <td className="py-2 pr-2">{subcategory.order}</td>
      <td className="py-2 pr-2">{subcategory.visible ? 'Yes' : 'No'}</td>
      <td className="py-2 pr-2">
        <span className="text-xs text-gray-400">—</span>
      </td>
      <td className="py-2 flex gap-2">
        <button className="px-3 py-1 rounded border" onClick={() => onEdit(subcategory)}>
          Edit
        </button>
        <button className="px-3 py-1 rounded border text-red-600" onClick={() => onDelete(subcategory.id!)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  
  // View filter: 'both', 'categories', or 'subcategories'
  const [viewFilter, setViewFilter] = useState<'both' | 'categories' | 'subcategories'>('both');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Filtered lists based on view selection
  const visibleCategories = useMemo(() => {
    return viewFilter === 'subcategories' ? [] : categories;
  }, [viewFilter, categories]);

  const visibleSubcategories = useMemo(() => {
    return viewFilter === 'categories' ? [] : subcategories;
  }, [viewFilter, subcategories]);

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
    // Preserve the original file extension and content type
    const ext = resized.type === 'image/png' ? 'png' : 'jpg';
    const fileRef = ref(storage, `categories/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
    const buf = await resized.arrayBuffer();
    await uploadBytes(fileRef, new Uint8Array(buf), { contentType: resized.type });
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

  async function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedCategories = arrayMove(categories, oldIndex, newIndex);

    // Update local state immediately for better UX
    setCategories(reorderedCategories);

    // Update Firestore with new order values
    const batch = writeBatch(db);
    reorderedCategories.forEach((category, index) => {
      if (category.id) {
        batch.update(doc(db, 'categories', category.id), { order: index });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error updating category order:', error);
      // Revert on error - the snapshot listener will restore the correct order
    }
  }

  async function handleSubcategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = subcategories.findIndex((s) => s.id === active.id);
    const newIndex = subcategories.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSubcategories = arrayMove(subcategories, oldIndex, newIndex);

    // Update local state immediately for better UX
    setSubcategories(reorderedSubcategories);

    // Update Firestore with new order values
    const batch = writeBatch(db);
    reorderedSubcategories.forEach((subcategory, index) => {
      if (subcategory.id) {
        batch.update(doc(db, 'subcategories', subcategory.id), { order: index });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error updating subcategory order:', error);
      // Revert on error - the snapshot listener will restore the correct order
    }
  }

  return (
    <div className="w-full">

      <div className="flex gap-6">
        <section className="bg-white border rounded p-4 w-96 flex-shrink-0">
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

        <section className="bg-white border rounded p-4 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Categories</h3>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">View:</label>
                <select
                  className="border rounded px-3 py-1 text-sm"
                  value={viewFilter}
                  onChange={(e) => setViewFilter(e.target.value as 'both' | 'categories' | 'subcategories')}
                >
                  <option value="both">All ({categories.length + subcategories.length})</option>
                  <option value="categories">Categories Only ({categories.length})</option>
                  <option value="subcategories">Subcategories Only ({subcategories.length})</option>
                </select>
              </div>
              
              <span className="text-sm text-gray-500">
                ({visibleCategories.length + visibleSubcategories.length} displayed)
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2 w-10"></th>
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
              {viewFilter !== 'subcategories' && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                  <SortableContext items={visibleCategories.map((c) => c.id!)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {visibleCategories.map((c) => (
                        <SortableCategoryRow
                          key={c.id}
                          category={c}
                          onEdit={startEditCategory}
                          onDelete={removeCategory}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </DndContext>
              )}
              {viewFilter !== 'categories' && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubcategoryDragEnd}>
                  <SortableContext items={visibleSubcategories.map((s) => s.id!)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {visibleSubcategories.map((s) => (
                        <SortableSubcategoryRow
                          key={s.id}
                          subcategory={s}
                          getCategoryName={getCategoryName}
                          onEdit={startEditSubcategory}
                          onDelete={removeSubcategory}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </DndContext>
              )}
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

