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
    <tr ref={setNodeRef} style={style} className="border-b hover:bg-gray-50 transition-colors">
      <td className="py-3 pr-3">
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
        {category.cover_image ? (
          <img src={category.cover_image} alt={category.name} className="w-12 h-15 object-cover border-2 border-gray-200 rounded-lg shadow-sm" />
        ) : (
          <div className="w-12 h-15 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Category
        </span>
      </td>
      <td className="py-3 pr-3 font-semibold" style={{ color: '#141619' }}>{category.name}</td>
      <td className="py-3 pr-3 text-sm text-gray-600 font-mono">{category.slug}</td>
      <td className="py-3 pr-3 text-sm text-gray-700 font-medium">{category.order}</td>
      <td className="py-3 pr-3">
        {category.visible ? (
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
      <td className="py-3 pr-3">
        {category.hasSubcategories ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Yes
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
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
          onClick={() => onEdit(category)}
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
          onClick={() => onDelete(category.id!)}
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
    backgroundColor: 'rgba(255, 152, 39, 0.05)',
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b hover:bg-gray-50 transition-colors">
      <td className="py-3 pr-3">
        <button
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors"
          {...attributes}
          {...listeners}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 152, 39, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </td>
      <td className="py-3 pr-3">
        {subcategory.cover_image ? (
          <img src={subcategory.cover_image} alt={subcategory.name} className="w-12 h-15 object-cover border-2 rounded-lg shadow-sm" style={{ borderColor: 'rgba(255, 152, 39, 0.3)' }} />
        ) : (
          <div className="w-12 h-15 border-2 rounded-lg flex items-center justify-center text-xs" style={{ background: 'linear-gradient(135deg, rgba(255, 152, 39, 0.1) 0%, rgba(255, 152, 39, 0.2) 100%)', borderColor: 'rgba(255, 152, 39, 0.3)', color: 'rgba(255, 152, 39, 0.7)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white shadow-sm w-fit" style={{ background: 'linear-gradient(135deg, #FF9827 20%, #cc7820 100%)' }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Subcategory
          </span>
          <div className="text-xs font-medium" style={{ color: '#cc7820' }}>↳ {getCategoryName(subcategory.parentCategoryId)}</div>
        </div>
      </td>
      <td className="py-3 pr-3 font-semibold" style={{ color: '#141619' }}>{subcategory.name}</td>
      <td className="py-3 pr-3 text-sm text-gray-600 font-mono">{subcategory.slug}</td>
      <td className="py-3 pr-3 text-sm text-gray-700 font-medium">{subcategory.order}</td>
      <td className="py-3 pr-3">
        {subcategory.visible ? (
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
      <td className="py-3 pr-3">
        <span className="text-xs text-gray-400">—</span>
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
          onClick={() => onEdit(subcategory)}
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
          onClick={() => onDelete(subcategory.id!)}
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
        <section className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#141619' }}>Categories & Subcategories</h3>
                <p className="text-xs text-gray-500">Manage your content categories</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">View:</label>
                <select
                  className="border-2 border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer bg-white"
                  value={viewFilter}
                  onChange={(e) => setViewFilter(e.target.value as 'both' | 'categories' | 'subcategories')}
                >
                  <option value="both">All ({categories.length + subcategories.length})</option>
                  <option value="categories">Categories Only ({categories.length})</option>
                  <option value="subcategories">Subcategories Only ({subcategories.length})</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: 'rgba(255, 152, 39, 0.1)', borderColor: 'rgba(255, 152, 39, 0.3)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FF9827' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-sm font-semibold" style={{ color: '#cc7820' }}>
                  {visibleCategories.length + visibleSubcategories.length} displayed
                </span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr className="text-left border-b-2 border-gray-200">
                  <th className="py-3 pr-3 pl-3 font-bold text-gray-700 text-xs uppercase tracking-wider"></th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Cover</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Type</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Name</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Slug</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Order</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Visible</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Has Subs</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Actions</th>
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
                onChange={(e) => handleNameChange(e.target.value)}
                required
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Slug 
                <span className="text-xs font-normal text-gray-500 ml-1">(auto-generated, editable)</span>
              </label>
              <input
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-mono text-sm"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                required
                placeholder="auto-generated-slug"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order 
                <span className="text-xs font-normal text-gray-500 ml-1">(auto-assigned, editable)</span>
              </label>
              <input
                type="number"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cover Image 
                <span className="text-xs font-normal text-gray-500 ml-1">(192×240)</span>
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer"
              />
              {form.cover_image && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <img src={form.cover_image} alt="Cover preview" className="w-24 h-30 object-cover border-2 border-gray-300 rounded-lg shadow-sm mx-auto" />
                  {form.isSubcategory && form.parentCategoryId && !coverImageFile && (
                    <p className="text-xs text-gray-600 mt-2 text-center flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Using parent category image
                    </p>
                  )}
                  {coverImageFile && (
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                value={form.description || ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-3 py-3 border-t border-gray-200">
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
              {!form.isSubcategory && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <input
                    id="hasSubcategories"
                    type="checkbox"
                    checked={form.hasSubcategories}
                    onChange={(e) => setForm((f) => ({ ...f, hasSubcategories: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="hasSubcategories" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Has Subcategories</label>
                  {form.hasSubcategories && (
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              )}
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
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
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer mt-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="isSubcategory" className={`text-sm font-medium text-gray-700 ${editingId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Is Subcategory</label>
                  {editingId && <p className="text-xs text-gray-500 mt-1">Cannot change type when editing</p>}
                </div>
              </div>
            </div>
            {form.isSubcategory && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Category *</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white cursor-pointer"
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
      </div>
    </div>
  );
}

