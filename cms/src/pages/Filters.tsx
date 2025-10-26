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
    <tr ref={setNodeRef} style={style} className="border-b last:border-0 hover:bg-indigo-50/30 transition-colors">
      <td className="py-3 pr-3">
        <button
          className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-indigo-100 rounded-lg transition-colors"
          {...attributes}
          {...listeners}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </td>
      <td className="py-3 pr-3">
        {filter.thumb_128 ? (
          <img src={filter.thumb_128} alt={filter.name} className="w-10 h-10 object-cover border-2 border-gray-200 rounded-lg shadow-sm" />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </td>
      <td className="py-3 pr-3 font-semibold text-gray-900">
        <div className="flex items-center gap-2">
          {filter.name}
          {filter.isPro && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-bold rounded-full shadow-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              PRO
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
          {category ? category.name : filter.category}
        </span>
      </td>
      <td className="py-3 pr-3">
        {subcategory ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #FF9827 20%, #cc7820 100%)' }}>{subcategory.name}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="py-3 pr-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {filter.popularity}
        </span>
      </td>
      <td className="py-3 pr-3 text-sm text-gray-700 font-medium">{filter.order}</td>
      <td className="py-3 pr-3">
        {filter.visible ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            No
          </span>
        )}
      </td>
      <td className="py-3 flex gap-2">
        <button 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-medium hover:text-white transition-all duration-200 shadow-sm hover:shadow-md" 
          style={{ borderColor: '#FF9827', color: '#FF9827' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FF9827';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#FF9827';
          }}
          onClick={() => onEdit(filter)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-medium hover:text-white transition-all duration-200 shadow-sm hover:shadow-md" 
          style={{ borderColor: '#EA4E45', color: '#EA4E45' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EA4E45';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#EA4E45';
          }}
          onClick={() => onDelete(filter.id!)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
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
        <section className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#141619' }}>Filters</h3>
                <p className="text-xs text-gray-500">Manage your content filters</p>
              </div>
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Filter by:</label>
                <select
                  className="border-2 border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer bg-white"
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
                  className="border-2 border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer bg-white"
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                  onClick={() => {
                    setFilterCategory('');
                    setFilterSubcategory('');
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
              
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: 'rgba(255, 152, 39, 0.1)', borderColor: 'rgba(255, 152, 39, 0.3)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FF9827' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-sm font-semibold" style={{ color: '#cc7820' }}>
                  {filteredFilters.length} of {filters.length}
                </span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr className="text-left border-b-2 border-gray-200">
                    <th className="py-3 pr-3 pl-3 font-bold text-gray-700 text-xs uppercase tracking-wider"></th>
                    <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Thumb</th>
                    <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Name</th>
                    <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Category</th>
                    <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Subcategory</th>
                    <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Popularity</th>
                    <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Order</th>
                    <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Visible</th>
                    <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Actions</th>
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

        <section className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6 w-96 flex-shrink-0 h-fit sticky top-24">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-gray-900">{title}</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
              <input
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Enter filter name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
              <select
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white cursor-pointer"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subcategory 
                  <span className="text-xs font-normal text-gray-500 ml-1">(optional)</span>
                </label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white cursor-pointer"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Popularity</label>
                <input
                  type="number"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={form.popularity}
                  onChange={(e) => setForm((f) => ({ ...f, popularity: Number(e.target.value) }))}
                  required
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Order
                  <span className="text-xs font-normal text-gray-500 ml-1">(auto)</span>
                </label>
                <input
                  type="number"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-3 py-3 border-t border-gray-200">
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                <input
                  id="isPro"
                  type="checkbox"
                  checked={form.isPro}
                  onChange={(e) => setForm((f) => ({ ...f, isPro: e.target.checked }))}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="isPro" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Premium (Pro)</label>
                {form.isPro && (
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <input
                  id="visible"
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="visible" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Visible</label>
                {form.visible && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <input
                  id="supports_reference_images"
                  type="checkbox"
                  checked={form.supports_reference_images || false}
                  onChange={(e) => setForm((f) => ({ ...f, supports_reference_images: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="supports_reference_images" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Supports Reference Images</label>
              </div>
            </div>
            {form.supports_reference_images && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Max Reference Images</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white cursor-pointer"
                  value={form.max_reference_images || 1}
                  onChange={(e) => setForm((f) => ({ ...f, max_reference_images: Number(e.target.value) }))}
                >
                  <option value={1}>1 image</option>
                  <option value={2}>2 images</option>
                  <option value={3}>3 images</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Prompt *</label>
              <textarea
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                required
                rows={4}
                placeholder="Enter the prompt for this filter"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tags 
                <span className="text-xs font-normal text-gray-500 ml-1">(comma separated)</span>
              </label>
              <input
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={(form.tags || []).join(', ')}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))
                }
                placeholder="tag1, tag2, tag3"
              />
              {form.tags && form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md" style={{ backgroundColor: 'rgba(255, 152, 39, 0.15)', color: '#cc7820' }}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Thumbnail 
                <span className="text-xs font-normal text-gray-500 ml-1">(192×240)</span>
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer"
              />
              {form.thumb_128 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <img src={form.thumb_128} alt="Thumb preview" className="w-20 h-20 object-cover border-2 border-gray-300 rounded-lg shadow-sm mx-auto" />
                  {!file && (form.category || form.subcategory) && (
                    <p className="text-xs text-gray-600 mt-2 text-center flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Using {form.subcategory ? 'subcategory' : 'category'} image
                    </p>
                  )}
                  {file && (
                    <p className="text-xs text-indigo-600 mt-2 text-center font-medium flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      New image selected
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button 
                disabled={loading} 
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                style={{ 
                  background: loading ? '#FF9827' : 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)',
                  boxShadow: '0 10px 25px -5px rgba(255, 152, 39, 0.3)'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c00 0%, #e67a00 100%)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)')}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingId ? 'Save Changes' : 'Create'}
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all"
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
      </div>
    </div>
  );
}

