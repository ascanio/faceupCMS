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
import type { Category, Filter, Subcategory } from '../types';
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
    visible: true,
    supports_reference_images: false,
    max_reference_images: 1,
  };
}

interface SortableRowProps {
  filter: Filter;
  categories: Category[];
  subcategories: Subcategory[];
  onEdit: (filter: Filter) => void;
  onDelete: (id: string) => void;
}

function SortableRow({ filter, categories, subcategories, onEdit, onDelete }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: filter.id!,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const category = categories.find((c) => c.id === filter.category);
  const subcategory = filter.subcategory ? subcategories.find((s) => s.id === filter.subcategory) : null;

  return (
    <tr ref={setNodeRef} style={style} className="border-b last:border-0">
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
        {filter.thumb_128 ? (
          <img src={filter.thumb_128} alt={filter.name} className="w-8 h-8 object-cover border rounded" />
        ) : (
          <div className="w-8 h-8 bg-gray-200 border rounded flex items-center justify-center text-xs text-gray-400">
            ?
          </div>
        )}
      </td>
      <td className="py-2 pr-2 font-medium">{filter.name}</td>
      <td className="py-2 pr-2">{category ? category.name : filter.category}</td>
      <td className="py-2 pr-2">
        {subcategory ? (
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">{subcategory.name}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="py-2 pr-2">{filter.popularity}</td>
      <td className="py-2 pr-2">{filter.order}</td>
      <td className="py-2 pr-2">
        <span className={`text-xs px-2 py-1 rounded ${filter.visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {filter.visible ? 'Yes' : 'No'}
        </span>
      </td>
      <td className="py-2 flex gap-2">
        <button className="px-3 py-1 rounded border" onClick={() => onEdit(filter)}>
          Edit
        </button>
        <button className="px-3 py-1 rounded border text-red-600" onClick={() => onDelete(filter.id!)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function FiltersPage() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [form, setForm] = useState<Omit<Filter, 'id'>>(() => emptyFilter());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Filter state for table
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    const resized = await resizeImage(file, 192, 240);
    // Preserve the original file extension and content type
    const ext = resized.type === 'image/png' ? 'png' : 'jpg';
    const fileRef = ref(storage, `filters/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
    const buf = await resized.arrayBuffer();
    await uploadBytes(fileRef, new Uint8Array(buf), { contentType: resized.type });
    return await getDownloadURL(fileRef);
  }

  // Get filtered subcategories based on selected category in form
  const availableSubcategories = useMemo(() => {
    if (!form.category) return [];
    return subcategories.filter(sub => sub.parentCategoryId === form.category);
  }, [form.category, subcategories]);

  // Get available subcategories for filter dropdown based on selected filter category
  const availableFilterSubcategories = useMemo(() => {
    if (!filterCategory) return subcategories;
    return subcategories.filter(sub => sub.parentCategoryId === filterCategory);
  }, [filterCategory, subcategories]);

  // Filter the filters list based on selected category and/or subcategory
  const filteredFilters = useMemo(() => {
    let result = filters;
    
    if (filterCategory) {
      result = result.filter(f => f.category === filterCategory);
    }
    
    if (filterSubcategory) {
      result = result.filter(f => f.subcategory === filterSubcategory);
    }
    
    return result;
  }, [filters, filterCategory, filterSubcategory]);

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

  // Reset subcategory filter when category filter changes
  useEffect(() => {
    if (filterCategory && filterSubcategory) {
      const subcategory = subcategories.find(s => s.id === filterSubcategory);
      if (!subcategory || subcategory.parentCategoryId !== filterCategory) {
        setFilterSubcategory('');
      }
    }
  }, [filterCategory, filterSubcategory, subcategories]);

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // When filtering is active, work with the filtered list
    const workingList = filterCategory || filterSubcategory ? filteredFilters : filters;
    
    const oldIndex = workingList.findIndex((f) => f.id === active.id);
    const newIndex = workingList.findIndex((f) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedList = arrayMove(workingList, oldIndex, newIndex);

    // If filtering is active, only update the order of the filtered items
    if (filterCategory || filterSubcategory) {
      // Update local state for filtered items
      const updatedFilters = filters.map(filter => {
        const indexInReordered = reorderedList.findIndex(f => f.id === filter.id);
        if (indexInReordered !== -1) {
          return { ...filter, order: reorderedList[indexInReordered].order };
        }
        return filter;
      });
      setFilters(updatedFilters);

      // Update Firestore only for the reordered filtered items
      const batch = writeBatch(db);
      reorderedList.forEach((filter, index) => {
        if (filter.id) {
          const newOrder = index;
          batch.update(doc(db, 'filters_feed', filter.id), { order: newOrder });
        }
      });

      try {
        await batch.commit();
      } catch (error) {
        console.error('Error updating filter order:', error);
      }
    } else {
      // No filtering - reorder entire list as before
      setFilters(reorderedList);

      const batch = writeBatch(db);
      reorderedList.forEach((filter, index) => {
        if (filter.id) {
          batch.update(doc(db, 'filters_feed', filter.id), { order: index });
        }
      });

      try {
        await batch.commit();
      } catch (error) {
        console.error('Error updating filter order:', error);
      }
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this filter?')) return;
    await deleteDoc(doc(db, 'filters_feed', id));
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
                <label className="block text-sm mb-1">Order</label>
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
            <div className="flex items-center gap-2">
              <input
                id="visible"
                type="checkbox"
                checked={form.visible}
                onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
              />
              <label htmlFor="visible">Visible</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="supports_reference_images"
                type="checkbox"
                checked={form.supports_reference_images || false}
                onChange={(e) => setForm((f) => ({ ...f, supports_reference_images: e.target.checked }))}
              />
              <label htmlFor="supports_reference_images">Supports Reference Images</label>
            </div>
            {form.supports_reference_images && (
              <div>
                <label className="block text-sm mb-1">Max Reference Images</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.max_reference_images || 1}
                  onChange={(e) => setForm((f) => ({ ...f, max_reference_images: Number(e.target.value) }))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            )}
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
                Thumbnail (192×240)
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

        <section className="bg-white border rounded p-4 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">
              Filters
            </h3>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Filter by:</label>
                <select
                  className="border rounded px-3 py-1 text-sm"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {filterCategory && (
                <select
                  className="border rounded px-3 py-1 text-sm"
                  value={filterSubcategory}
                  onChange={(e) => setFilterSubcategory(e.target.value)}
                >
                  <option value="">All Subcategories</option>
                  {availableFilterSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              
              {(filterCategory || filterSubcategory) && (
                <button
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    setFilterCategory('');
                    setFilterSubcategory('');
                  }}
                >
                  Clear filters
                </button>
              )}
              
              <span className="text-sm text-gray-500">
                ({filteredFilters.length} of {filters.length})
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2 w-10"></th>
                    <th className="py-2 pr-2">Thumb</th>
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Category</th>
                    <th className="py-2 pr-2">Subcategory</th>
                    <th className="py-2 pr-2">Popularity</th>
                    <th className="py-2 pr-2">Order</th>
                    <th className="py-2 pr-2">Visible</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <SortableContext items={filteredFilters.map((f) => f.id!)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {filteredFilters.map((f) => (
                      <SortableRow
                        key={f.id}
                        filter={f}
                        categories={categories}
                        subcategories={subcategories}
                        onEdit={startEdit}
                        onDelete={remove}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        </section>
      </div>
    </div>
  );
}

