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

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-2 animate-slideIn min-w-80"
          style={{
            backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#f59e0b',
            borderColor: toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#dc2626' : '#d97706',
          }}
        >
          {toast.type === 'success' && (
            <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {toast.type === 'warning' && (
            <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-white font-medium text-sm">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

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
    isVideo: false,
  };
}

interface SortableRowProps {
  filter: Filter;
  categories: Category[];
  subcategories: Subcategory[];
  onEdit: (filter: Filter) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

function SortableRow({ filter, categories, subcategories, onEdit, onDelete, isSelected, onToggleSelect }: SortableRowProps) {
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
    <tr ref={setNodeRef} style={{...style, borderBottom: '1px solid rgba(20, 22, 25, 0.1)'}} className={`last:border-0 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-orange-50' : ''}`}>
      <td className="py-3 pr-0 pl-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(filter.id!)}
          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
        />
      </td>
      <td className="py-3 pr-0 pl-4">
        <button
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors"
          {...attributes}
          {...listeners}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 152, 39, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </td>
      <td className="py-3 pr-3">
        {filter.thumb_128 ? (
          <img src={filter.thumb_128} alt={filter.name} className="w-12 h-15 object-cover border-2 border-gray-200 rounded-lg shadow-sm" />
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
  
  // Bulk action state
  const [selectedFilterIds, setSelectedFilterIds] = useState<Set<string>>(new Set());
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTargetCategory, setDuplicateTargetCategory] = useState<string>('');
  const [duplicateTargetSubcategory, setDuplicateTargetSubcategory] = useState<string>('');
  const [duplicating, setDuplicating] = useState(false);
  
  // Assign category state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetCategory, setAssignTargetCategory] = useState<string>('');
  const [assignTargetSubcategory, setAssignTargetSubcategory] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  
  // Bulk premium edit state
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumValue, setPremiumValue] = useState<boolean>(true);
  const [updatingPremium, setUpdatingPremium] = useState(false);
  
  // Bulk visible edit state
  const [showVisibleModal, setShowVisibleModal] = useState(false);
  const [visibleValue, setVisibleValue] = useState<boolean>(true);
  const [updatingVisible, setUpdatingVisible] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

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
      const payload: any = {
        ...form,
        thumb_128: thumbUrl,
        category: form.category,
        updatedAt: serverTimestamp(),
      };

      // Only include subcategory if it has a value
      if (form.subcategory) {
        payload.subcategory = form.subcategory;
      }

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

  // Bulk action handlers
  function toggleSelectFilter(id: string) {
    setSelectedFilterIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedFilterIds.size === filteredFilters.length) {
      setSelectedFilterIds(new Set());
    } else {
      setSelectedFilterIds(new Set(filteredFilters.map(f => f.id!)));
    }
  }

  function openDuplicateModal() {
    if (selectedFilterIds.size === 0) return;
    setShowDuplicateModal(true);
    setDuplicateTargetCategory('');
    setDuplicateTargetSubcategory('');
  }

  function closeDuplicateModal() {
    setShowDuplicateModal(false);
    setDuplicateTargetCategory('');
    setDuplicateTargetSubcategory('');
  }

  async function handleDuplicateFilters() {
    if (!duplicateTargetCategory) {
      showToast('Please select a target category', 'warning');
      return;
    }
    
    setDuplicating(true);
    try {
      const batch = writeBatch(db);
      const selectedFilters = filters.filter(f => selectedFilterIds.has(f.id!));
      
      for (const filter of selectedFilters) {
        const { id, updatedAt, ...filterData } = filter;
        const newFilterData = {
          ...filterData,
          category: duplicateTargetCategory,
          subcategory: duplicateTargetSubcategory || '',
          order: filters.length + selectedFilters.indexOf(filter),
          updatedAt: serverTimestamp(),
        };
        
        const newDocRef = doc(collection(db, 'filters_feed'));
        batch.set(newDocRef, newFilterData);
      }
      
      await batch.commit();
      
      // Clear selection and close modal
      setSelectedFilterIds(new Set());
      closeDuplicateModal();
      
      showToast(`Successfully duplicated ${selectedFilters.length} filter(s)`, 'success');
    } catch (error) {
      console.error('Error duplicating filters:', error);
      showToast('Error duplicating filters. Please try again.', 'error');
    } finally {
      setDuplicating(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedFilterIds.size === 0) return;
    
    const count = selectedFilterIds.size;
    const confirmMessage = `Are you sure you want to delete ${count} filter${count > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;
    
    try {
      const batch = writeBatch(db);
      selectedFilterIds.forEach(id => {
        batch.delete(doc(db, 'filters_feed', id));
      });
      
      await batch.commit();
      setSelectedFilterIds(new Set());
      showToast(`Successfully deleted ${count} filter(s)`, 'success');
    } catch (error) {
      console.error('Error deleting filters:', error);
      showToast('Error deleting filters. Please try again.', 'error');
    }
  }

  // Get available subcategories for duplicate modal
  const availableDuplicateSubcategories = useMemo(() => {
    if (!duplicateTargetCategory) return [];
    return subcategories.filter(sub => sub.parentCategoryId === duplicateTargetCategory);
  }, [duplicateTargetCategory, subcategories]);

  // Assign category handlers
  function openAssignModal() {
    if (selectedFilterIds.size === 0) return;
    setShowAssignModal(true);
    setAssignTargetCategory('');
    setAssignTargetSubcategory('');
  }

  function closeAssignModal() {
    setShowAssignModal(false);
    setAssignTargetCategory('');
    setAssignTargetSubcategory('');
  }

  async function handleAssignCategory() {
    if (!assignTargetCategory) {
      showToast('Please select a target category', 'warning');
      return;
    }
    
    const count = selectedFilterIds.size;
    setAssigning(true);
    try {
      const batch = writeBatch(db);
      
      selectedFilterIds.forEach(id => {
        const filterRef = doc(db, 'filters_feed', id);
        batch.update(filterRef, {
          category: assignTargetCategory,
          subcategory: assignTargetSubcategory || '',
          updatedAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
      
      // Clear selection and close modal
      setSelectedFilterIds(new Set());
      closeAssignModal();
      
      showToast(`Successfully moved ${count} filter(s)`, 'success');
    } catch (error) {
      console.error('Error moving filters:', error);
      showToast('Error moving filters. Please try again.', 'error');
    } finally {
      setAssigning(false);
    }
  }

  // Get available subcategories for assign modal
  const availableAssignSubcategories = useMemo(() => {
    if (!assignTargetCategory) return [];
    return subcategories.filter(sub => sub.parentCategoryId === assignTargetCategory);
  }, [assignTargetCategory, subcategories]);

  // Bulk premium edit handlers
  function openPremiumModal() {
    if (selectedFilterIds.size === 0) return;
    setShowPremiumModal(true);
    setPremiumValue(true);
  }

  function closePremiumModal() {
    setShowPremiumModal(false);
    setPremiumValue(true);
  }

  async function handleBulkUpdatePremium() {
    const count = selectedFilterIds.size;
    setUpdatingPremium(true);
    try {
      const batch = writeBatch(db);
      
      selectedFilterIds.forEach(id => {
        const filterRef = doc(db, 'filters_feed', id);
        batch.update(filterRef, {
          isPro: premiumValue,
          updatedAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
      
      // Clear selection and close modal
      setSelectedFilterIds(new Set());
      closePremiumModal();
      
      showToast(`Successfully updated ${count} filter(s) to ${premiumValue ? 'Premium' : 'Free'}`, 'success');
    } catch (error) {
      console.error('Error updating premium status:', error);
      showToast('Error updating premium status. Please try again.', 'error');
    } finally {
      setUpdatingPremium(false);
    }
  }

  // Bulk visible edit handlers
  function openVisibleModal() {
    if (selectedFilterIds.size === 0) return;
    setShowVisibleModal(true);
    setVisibleValue(true);
  }

  function closeVisibleModal() {
    setShowVisibleModal(false);
    setVisibleValue(true);
  }

  async function handleBulkUpdateVisible() {
    const count = selectedFilterIds.size;
    setUpdatingVisible(true);
    try {
      const batch = writeBatch(db);
      
      selectedFilterIds.forEach(id => {
        const filterRef = doc(db, 'filters_feed', id);
        batch.update(filterRef, {
          visible: visibleValue,
          updatedAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
      
      // Clear selection and close modal
      setSelectedFilterIds(new Set());
      closeVisibleModal();
      
      showToast(`Successfully updated ${count} filter(s) to ${visibleValue ? 'Visible' : 'Hidden'}`, 'success');
    } catch (error) {
      console.error('Error updating visible status:', error);
      showToast('Error updating visible status. Please try again.', 'error');
    } finally {
      setUpdatingVisible(false);
    }
  }

  return (
    <div className="w-full">
      <ToastContainer toasts={toasts} />

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
          
          {/* Bulk Action Bar */}
          {selectedFilterIds.size > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-semibold text-gray-900">
                  {selectedFilterIds.size} filter{selectedFilterIds.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openAssignModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c00 0%, #e67a00 100%)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Move
                </button>
                <button
                  onClick={openDuplicateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c00 0%, #e67a00 100%)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Duplicate
                </button>
                <button
                  onClick={openPremiumModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c00 0%, #e67a00 100%)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)'}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Tier
                </button>
                <button
                  onClick={openVisibleModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c00 0%, #e67a00 100%)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)'}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Visibility
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #EA4E45 0%, #d43f36 100%)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #d43f36 0%, #c03229 100%)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #EA4E45 0%, #d43f36 100%)'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                <button
                  onClick={() => setSelectedFilterIds(new Set())}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(20, 22, 25, 0.1)' }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr className="text-left" style={{ borderBottom: '2px solid rgba(20, 22, 25, 0.1)' }}>
                    <th className="py-3 pr-3 pl-4 font-bold text-gray-700 text-xs uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedFilterIds.size === filteredFilters.length && filteredFilters.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                      />
                    </th>
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
                        isSelected={selectedFilterIds.has(f.id!)}
                        onToggleSelect={toggleSelectFilter}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        </section>

        <section className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6 w-140 flex-shrink-0 h-fit sticky top-24">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-gray-900">{title}</h3>
            </div>
            <div className="flex gap-2">
              <button 
                disabled={loading}
                type="submit"
                form="filter-form"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                style={{ 
                  background: loading ? '#FF9827' : 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)',
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c00 0%, #e67a00 100%)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)')}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingId ? 'Save' : 'Create'}
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all"
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
          </div>
          <form id="filter-form" onSubmit={handleSubmit} className="space-y-4">
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
            <div className="grid grid-cols-2 gap-3">
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
            </div>
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
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <input
                  id="isVideo"
                  type="checkbox"
                  checked={form.isVideo || false}
                  onChange={(e) => setForm((f) => ({ ...f, isVideo: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="isVideo" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Video Filter</label>
                {form.isVideo && (
                  <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                )}
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
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-y"
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
                  <img src={form.thumb_128} alt="Thumb preview" className="w-26 h-32 object-cover border-2 border-gray-300 rounded-lg shadow-sm mx-auto" />
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

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeDuplicateModal}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-gray-900">Duplicate Filters</h3>
              </div>
              <button
                onClick={closeDuplicateModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Duplicate {selectedFilterIds.size} filter{selectedFilterIds.size > 1 ? 's' : ''} to a new category and subcategory.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Category *</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white cursor-pointer"
                  value={duplicateTargetCategory}
                  onChange={(e) => {
                    setDuplicateTargetCategory(e.target.value);
                    setDuplicateTargetSubcategory('');
                  }}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {duplicateTargetCategory && availableDuplicateSubcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Target Subcategory
                    <span className="text-xs font-normal text-gray-500 ml-1">(optional)</span>
                  </label>
                  <select
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white cursor-pointer"
                    value={duplicateTargetSubcategory}
                    onChange={(e) => setDuplicateTargetSubcategory(e.target.value)}
                  >
                    <option value="">None</option>
                    {availableDuplicateSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleDuplicateFilters}
                  disabled={duplicating || !duplicateTargetCategory}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: duplicating || !duplicateTargetCategory ? '#FF9827' : 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)',
                  }}
                  onMouseEnter={(e) => !duplicating && duplicateTargetCategory && (e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c00 0%, #e67a00 100%)')}
                  onMouseLeave={(e) => !duplicating && duplicateTargetCategory && (e.currentTarget.style.background = 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)')}
                >
                  {duplicating ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Duplicating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate
                    </>
                  )}
                </button>
                <button
                  onClick={closeDuplicateModal}
                  disabled={duplicating}
                  className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Filters Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeAssignModal}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-gray-900">Move Filters</h3>
              </div>
              <button
                onClick={closeAssignModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Move {selectedFilterIds.size} filter{selectedFilterIds.size > 1 ? 's' : ''} to a different category and subcategory.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Category *</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white cursor-pointer"
                  value={assignTargetCategory}
                  onChange={(e) => {
                    setAssignTargetCategory(e.target.value);
                    setAssignTargetSubcategory('');
                  }}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {assignTargetCategory && availableAssignSubcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Target Subcategory
                    <span className="text-xs font-normal text-gray-500 ml-1">(optional)</span>
                  </label>
                  <select
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white cursor-pointer"
                    value={assignTargetSubcategory}
                    onChange={(e) => setAssignTargetSubcategory(e.target.value)}
                  >
                    <option value="">None</option>
                    {availableAssignSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleAssignCategory}
                  disabled={assigning || !assignTargetCategory}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: assigning || !assignTargetCategory ? '#8B5CF6' : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  }}
                  onMouseEnter={(e) => !assigning && assignTargetCategory && (e.currentTarget.style.background = 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)')}
                  onMouseLeave={(e) => !assigning && assignTargetCategory && (e.currentTarget.style.background = 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)')}
                >
                  {assigning ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Moving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Move
                    </>
                  )}
                </button>
                <button
                  onClick={closeAssignModal}
                  disabled={assigning}
                  className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closePremiumModal}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-gray-900">Set Premium Status</h3>
              </div>
              <button
                onClick={closePremiumModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Set premium status for {selectedFilterIds.size} filter{selectedFilterIds.size > 1 ? 's' : ''}.
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="premium"
                    checked={premiumValue === true}
                    onChange={() => setPremiumValue(true)}
                    className="w-5 h-5 text-amber-600 border-gray-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Set as Premium</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-bold rounded-full shadow-sm">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        PRO
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Mark selected filters as premium content</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="premium"
                    checked={premiumValue === false}
                    onChange={() => setPremiumValue(false)}
                    className="w-5 h-5 text-gray-600 border-gray-300 focus:ring-gray-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Set as Free</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-full">
                        FREE
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Make selected filters available to all users</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleBulkUpdatePremium}
                  disabled={updatingPremium}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: updatingPremium ? '#F59E0B' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  }}
                  onMouseEnter={(e) => !updatingPremium && (e.currentTarget.style.background = 'linear-gradient(135deg, #D97706 0%, #B45309 100%)')}
                  onMouseLeave={(e) => !updatingPremium && (e.currentTarget.style.background = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)')}
                >
                  {updatingPremium ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Update
                    </>
                  )}
                </button>
                <button
                  onClick={closePremiumModal}
                  disabled={updatingPremium}
                  className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Visible Modal */}
      {showVisibleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeVisibleModal}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-gray-900">Set Visible Status</h3>
              </div>
              <button
                onClick={closeVisibleModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Set visibility for {selectedFilterIds.size} filter{selectedFilterIds.size > 1 ? 's' : ''}.
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="visible"
                    checked={visibleValue === true}
                    onChange={() => setVisibleValue(true)}
                    className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Set as Visible</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Yes
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Make selected filters visible to users</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="visible"
                    checked={visibleValue === false}
                    onChange={() => setVisibleValue(false)}
                    className="w-5 h-5 text-gray-600 border-gray-300 focus:ring-gray-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Set as Hidden</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        No
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Hide selected filters from users</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleBulkUpdateVisible}
                  disabled={updatingVisible}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: updatingVisible ? '#10B981' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  }}
                  onMouseEnter={(e) => !updatingVisible && (e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)')}
                  onMouseLeave={(e) => !updatingVisible && (e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)')}
                >
                  {updatingVisible ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Update
                    </>
                  )}
                </button>
                <button
                  onClick={closeVisibleModal}
                  disabled={updatingVisible}
                  className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

