import React, { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PromptCategory, PromptOption } from '../types';
import * as LucideIcons from 'lucide-react';
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

interface CategoryFormState {
  name: string;
  icon: string;
  iconWeb: string;
  order: number;
  visible: boolean;
  multiSelect: boolean;
  tags: string[];
}

interface OptionFormState {
  id: string;
  label: string;
  value: string;
  order: number;
  visible: boolean;
  defaultSelected: boolean;
  tags: string[];
  categoryId: string;
}

function emptyCategoryForm(): CategoryFormState {
  return {
    name: '',
    icon: '',
    iconWeb: '',
    order: 0,
    visible: true,
    multiSelect: false,
    tags: [],
  };
}

function emptyOptionForm(): OptionFormState {
  return {
    id: '',
    label: '',
    value: '',
    order: 0,
    visible: true,
    defaultSelected: false,
    tags: [],
    categoryId: '',
  };
}

// Component to dynamically render Lucid icons
function LucidIcon({ name, className = '', size = 20 }: { name: string; className?: string; size?: number }) {
  if (!name) return null;
  
  // Convert icon name to PascalCase (e.g., "user" -> "User", "user-circle" -> "UserCircle")
  const iconName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[iconName] as React.ComponentType<{ className?: string; size?: number }>;
  
  if (!IconComponent) {
    // Fallback: show a generic icon if the icon name doesn't exist
    return (
      <span 
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        title={name}
      >
        <svg 
          style={{ width: `${size}px`, height: `${size}px` }}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" 
          />
        </svg>
      </span>
    );
  }
  
  return <IconComponent className={className} size={size} />;
}

interface SortableOptionRowProps {
  option: PromptOption;
  category: PromptCategory;
  onEditOption: (category: PromptCategory, option: PromptOption) => void;
  onDeleteOption: (category: PromptCategory, optionId: string) => void;
  isLast: boolean;
}

function SortableOptionRow({ 
  option, 
  category,
  onEditOption,
  onDeleteOption,
  isLast,
}: SortableOptionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `option-${category.id}-${option.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderBottom: isLast ? '1px solid rgba(20, 22, 25, 0.1)' : 'none',
  };

  return (
    <tr 
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <td className="py-2 pl-12">
        <button
          className="cursor-grab active:cursor-grabbing p-1 rounded-lg transition-colors"
          {...attributes}
          {...listeners}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(147, 51, 234, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-6 bg-gray-300"></div>
          <span className="font-medium text-sm" style={{ color: '#141619' }}>{option.label}</span>
        </div>
      </td>
      <td className="py-2 pr-3 text-sm text-gray-600">{option.order}</td>
      <td className="py-2 pr-3">
        {option.visible ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            No
          </span>
        )}
      </td>
      <td className="py-2 pr-3">
        {option.defaultSelected ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            Default
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="py-2 pr-3">
        <div className="text-xs text-gray-500 truncate max-w-xs" title={option.value}>
          {option.value}
        </div>
      </td>
      <td className="py-2 flex gap-2">
        <button 
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border-2 transition-all"
          style={{ borderColor: '#9333ea', color: '#9333ea' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#9333ea';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9333ea';
          }}
          onClick={() => onEditOption(category, option)}
        >
          Edit
        </button>
        <button 
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border-2 transition-all"
          style={{ borderColor: '#EA4E45', color: '#EA4E45' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EA4E45';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#EA4E45';
          }}
          onClick={() => onDeleteOption(category, option.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

interface SortableCategoryRowProps {
  category: PromptCategory;
  expandedCategories: Set<string>;
  onToggleExpand: (id: string) => void;
  onEditCategory: (category: PromptCategory) => void;
  onDeleteCategory: (id: string) => void;
  onExportCategory: (category: PromptCategory) => void;
  onEditOption: (category: PromptCategory, option: PromptOption) => void;
  onDeleteOption: (category: PromptCategory, optionId: string) => void;
  onOptionDragEnd: (category: PromptCategory, event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function SortableCategoryRow({ 
  category, 
  expandedCategories, 
  onToggleExpand,
  onEditCategory, 
  onDeleteCategory,
  onExportCategory,
  onEditOption,
  onDeleteOption,
  onOptionDragEnd,
  sensors,
}: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id!,
  });

  const isExpanded = expandedCategories.has(category.id!);
  const options = category.options || [];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderBottom: '1px solid rgba(20, 22, 25, 0.1)',
  };

  return (
    <>
      <tr 
        ref={setNodeRef} 
        style={style} 
        className="hover:bg-gray-50 transition-colors"
      >
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
          <button
            onClick={() => onToggleExpand(category.id!)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {category.iconWeb && <LucidIcon name={category.iconWeb} className="text-gray-700" size={20} />}
            <span className="font-semibold" style={{ color: '#141619' }}>{category.name}</span>
          </button>
        </td>
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
          {category.multiSelect ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              Multi
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
              Single
            </span>
          )}
        </td>
        <td className="py-3 pr-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            {options.length}
          </span>
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
            onClick={() => onEditCategory(category)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-medium hover:text-white transition-all duration-200 shadow-sm hover:shadow-md" 
            style={{ borderColor: '#9333ea', color: '#9333ea' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#9333ea';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9333ea';
            }}
            onClick={() => onExportCategory(category)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
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
            onClick={() => onDeleteCategory(category.id!)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </td>
      </tr>
      {isExpanded && options.length > 0 && (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter} 
          onDragEnd={(event) => onOptionDragEnd(category, event)}
        >
          <SortableContext 
            items={options.map(o => `option-${category.id}-${o.id}`)} 
            strategy={verticalListSortingStrategy}
          >
            {options
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((option, idx) => (
                <SortableOptionRow
                  key={option.id}
                  option={option}
                  category={category}
                  onEditOption={onEditOption}
                  onDeleteOption={onDeleteOption}
                  isLast={idx === options.length - 1}
                />
              ))}
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}

export default function PromptCategoriesPage() {
  const [categories, setCategories] = useState<PromptCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(() => emptyCategoryForm());
  const [optionForm, setOptionForm] = useState<OptionFormState>(() => emptyOptionForm());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showMasterPromptModal, setShowMasterPromptModal] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState('');
  const [masterPromptVersion, setMasterPromptVersion] = useState('1.0');
  const [savingMasterPrompt, setSavingMasterPrompt] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedJson, setExportedJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  
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
    const q = query(collection(db, 'promptCategories'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows: PromptCategory[] = snap.docs.map((d) => ({ 
        id: d.id, 
        ...(d.data() as any),
        options: d.data().options || []
      }));
      setCategories(rows);
    });
    
    return () => unsub();
  }, []);

  // Load master prompt
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'masterPrompt', 'default_master_prompt'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMasterPrompt(data.prompt || '');
        setMasterPromptVersion(data.version || '1.0');
      } else {
        // Document doesn't exist yet, initialize with empty prompt
        setMasterPrompt('');
        setMasterPromptVersion('1.0');
      }
    }, () => {
      // Document doesn't exist, that's okay
      setMasterPrompt('');
      setMasterPromptVersion('1.0');
    });
    
    return () => unsub();
  }, []);

  const getNextCategoryOrder = () => {
    if (editingCategoryId) return categoryForm.order;
    if (categories.length === 0) return 0;
    const maxOrder = Math.max(...categories.map(c => c.order || 0));
    return maxOrder + 1;
  };

  const getNextOptionOrder = (category: PromptCategory) => {
    if (editingOptionId) return optionForm.order;
    if (!category.options || category.options.length === 0) return 0;
    const maxOrder = Math.max(...category.options.map(o => o.order || 0));
    return maxOrder + 1;
  };

  useEffect(() => {
    if (!editingCategoryId && !isCreatingOption && categoryForm.order === 0) {
      const nextOrder = getNextCategoryOrder();
      if (nextOrder > 0) {
        setCategoryForm((f) => ({ ...f, order: nextOrder }));
      }
    }
  }, [categories.length, isCreatingOption]);

  useEffect(() => {
    if (isCreatingOption && optionForm.categoryId) {
      const category = categories.find(c => c.id === optionForm.categoryId);
      if (category && !editingOptionId && optionForm.order === 0) {
        const nextOrder = getNextOptionOrder(category);
        if (nextOrder > 0) {
          setOptionForm((f) => ({ ...f, order: nextOrder }));
        }
      }
    }
  }, [isCreatingOption, optionForm.categoryId, categories, editingOptionId]);

  function toggleExpand(categoryId: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: categoryForm.name,
        icon: categoryForm.icon,
        iconWeb: categoryForm.iconWeb,
        order: categoryForm.order,
        visible: categoryForm.visible,
        multiSelect: categoryForm.multiSelect,
        tags: categoryForm.tags,
        options: editingCategoryId ? categories.find(c => c.id === editingCategoryId)?.options || [] : [],
        updatedAt: serverTimestamp(),
      };

      if (editingCategoryId) {
        await updateDoc(doc(db, 'promptCategories', editingCategoryId), payload);
        showToast('Category updated successfully');
      } else {
        await addDoc(collection(db, 'promptCategories'), payload);
        showToast('Category created successfully');
      }
      
      setCategoryForm(emptyCategoryForm());
      setEditingCategoryId(null);
      setIsCreatingOption(false);
    } catch (error) {
      showToast('Error saving category', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOptionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!optionForm.categoryId) {
      showToast('Please select a category', 'warning');
      return;
    }

    setLoading(true);
    try {
      const category = categories.find(c => c.id === optionForm.categoryId);
      if (!category) {
        showToast('Category not found', 'error');
        return;
      }

      const newOption: PromptOption = {
        id: editingOptionId || `option_${Date.now()}`,
        label: optionForm.label,
        value: optionForm.value,
        order: optionForm.order,
        visible: optionForm.visible,
        defaultSelected: optionForm.defaultSelected,
        tags: optionForm.tags,
      };

      const updatedOptions = editingOptionId
        ? category.options.map(o => o.id === editingOptionId ? newOption : o)
        : [...(category.options || []), newOption];

      await updateDoc(doc(db, 'promptCategories', optionForm.categoryId), {
        options: updatedOptions,
        updatedAt: serverTimestamp(),
      });

      showToast(editingOptionId ? 'Option updated successfully' : 'Option created successfully');
      const wasEditing = !!editingOptionId;
      setOptionForm(emptyOptionForm());
      setEditingOptionId(null);
      
      if (wasEditing) {
        setIsCreatingOption(false);
      } else {
        const nextOrder = getNextOptionOrder(category);
        setOptionForm((f) => ({ ...f, categoryId: optionForm.categoryId, order: nextOrder }));
      }
    } catch (error) {
      showToast('Error saving option', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function startEditCategory(category: PromptCategory) {
    setCategoryForm({
      name: category.name,
      icon: category.icon,
      iconWeb: category.iconWeb || '',
      order: category.order,
      visible: category.visible,
      multiSelect: category.multiSelect,
      tags: category.tags || [],
    });
    setEditingCategoryId(category.id!);
    setIsCreatingOption(false);
    setOptionForm(emptyOptionForm());
    setEditingOptionId(null);
    // Expand the category to show its options
    if (!expandedCategories.has(category.id!)) {
      setExpandedCategories(prev => new Set(prev).add(category.id!));
    }
  }

  function startEditOption(category: PromptCategory, option: PromptOption) {
    setOptionForm({
      id: option.id,
      label: option.label,
      value: option.value,
      order: option.order,
      visible: option.visible,
      defaultSelected: option.defaultSelected,
      tags: option.tags || [],
      categoryId: category.id!,
    });
    setEditingOptionId(option.id);
    setIsCreatingOption(true);
    setCategoryForm(emptyCategoryForm());
    setEditingCategoryId(null);
    // Expand the category to show its options
    if (!expandedCategories.has(category.id!)) {
      setExpandedCategories(prev => new Set(prev).add(category.id!));
    }
  }

  async function removeCategory(id: string) {
    if (!confirm('Delete this category? All options will be deleted too.')) return;
    await deleteDoc(doc(db, 'promptCategories', id));
    showToast('Category deleted successfully');
  }

  async function removeOption(category: PromptCategory, optionId: string) {
    if (!confirm('Delete this option?')) return;

    const updatedOptions = category.options.filter(o => o.id !== optionId);
    await updateDoc(doc(db, 'promptCategories', category.id!), {
      options: updatedOptions,
      updatedAt: serverTimestamp(),
    });
    showToast('Option deleted successfully');
  }

  async function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedCategories = arrayMove(categories, oldIndex, newIndex);

    setCategories(reorderedCategories);

    const batch = writeBatch(db);
    reorderedCategories.forEach((category, index) => {
      if (category.id) {
        batch.update(doc(db, 'promptCategories', category.id), { order: index });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error updating category order:', error);
    }
  }

  async function handleOptionDragEnd(category: PromptCategory, event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Extract option IDs from the drag event IDs (format: "option-{categoryId}-{optionId}")
    const activeId = String(active.id).replace(`option-${category.id}-`, '');
    const overId = String(over.id).replace(`option-${category.id}-`, '');

    const options = category.options || [];
    const oldIndex = options.findIndex((o) => o.id === activeId);
    const newIndex = options.findIndex((o) => o.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedOptions = arrayMove(options, oldIndex, newIndex);

    // Update order values
    const updatedOptions = reorderedOptions.map((option, index) => ({
      ...option,
      order: index,
    }));

    try {
      await updateDoc(doc(db, 'promptCategories', category.id!), {
        options: updatedOptions,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating option order:', error);
      showToast('Error updating option order', 'error');
    }
  }

  function resetForms() {
    setCategoryForm(emptyCategoryForm());
    setOptionForm(emptyOptionForm());
    setEditingCategoryId(null);
    setEditingOptionId(null);
    setIsCreatingOption(false);
  }

  function handleExportCategory(category: PromptCategory) {
    // Create Firebase-compatible JSON (excluding Firestore-specific fields)
    const exportData = {
      id: category.id || '',
      name: category.name,
      icon: category.icon,
      iconWeb: category.iconWeb || '',
      order: category.order,
      visible: category.visible,
      multiSelect: category.multiSelect,
      tags: category.tags || [],
      options: (category.options || []).map(option => ({
        id: option.id,
        label: option.label,
        value: option.value,
        order: option.order,
        visible: option.visible,
        defaultSelected: option.defaultSelected,
        tags: option.tags || [],
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    setExportedJson(jsonString);
    setShowExportModal(true);
    setCopied(false);
  }

  async function handleCopyToClipboard() {
    try {
      await navigator.clipboard.writeText(exportedJson);
      setCopied(true);
      showToast('JSON copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast('Failed to copy to clipboard', 'error');
      console.error('Failed to copy:', error);
    }
  }

  async function handleImport() {
    if (!importJson.trim()) {
      showToast('Please paste JSON data', 'warning');
      return;
    }

    setImporting(true);
    try {
      let dataToImport: any;
      
      // Try to parse JSON
      try {
        dataToImport = JSON.parse(importJson);
      } catch (parseError) {
        showToast('Invalid JSON format', 'error');
        setImporting(false);
        return;
      }

      // Handle both single object and array
      const categoriesToImport = Array.isArray(dataToImport) ? dataToImport : [dataToImport];
      
      let imported = 0;
      let updated = 0;
      let errors = 0;

      for (const categoryData of categoriesToImport) {
        try {
          // Validate required fields
          if (!categoryData.name) {
            errors++;
            continue;
          }

          const payload = {
            name: categoryData.name,
            icon: categoryData.icon || '',
            iconWeb: categoryData.iconWeb || '',
            order: categoryData.order ?? 0,
            visible: categoryData.visible !== undefined ? categoryData.visible : true,
            multiSelect: categoryData.multiSelect !== undefined ? categoryData.multiSelect : false,
            tags: categoryData.tags || [],
            options: categoryData.options || [],
            updatedAt: serverTimestamp(),
          };

          // Check if category exists by ID or name
          const existingCategory = categories.find(
            c => c.id === categoryData.id || c.name === categoryData.name
          );

          if (existingCategory) {
            // Update existing category
            await updateDoc(doc(db, 'promptCategories', existingCategory.id!), payload);
            updated++;
          } else {
            // Create new category
            await addDoc(collection(db, 'promptCategories'), payload);
            imported++;
          }
        } catch (error) {
          console.error('Error importing category:', categoryData.name, error);
          errors++;
        }
      }

      // Show results
      if (errors === 0) {
        showToast(
          `Successfully imported ${imported} new and updated ${updated} categories`,
          'success'
        );
      } else {
        showToast(
          `Imported ${imported} new, updated ${updated}, ${errors} errors`,
          errors === categoriesToImport.length ? 'error' : 'warning'
        );
      }

      setShowImportModal(false);
      setImportJson('');
    } catch (error) {
      showToast('Error importing data', 'error');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  }

  async function handleSaveMasterPrompt() {
    setSavingMasterPrompt(true);
    try {
      const payload = {
        id: 'default_master_prompt',
        prompt: masterPrompt,
        updatedAt: serverTimestamp(),
        version: masterPromptVersion,
      };

      const docRef = doc(db, 'masterPrompt', 'default_master_prompt');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, payload);
        showToast('Master prompt updated successfully');
      } else {
        await setDoc(docRef, payload);
        showToast('Master prompt saved successfully');
      }
      
      setShowMasterPromptModal(false);
    } catch (error) {
      showToast('Error saving master prompt', 'error');
      console.error(error);
    } finally {
      setSavingMasterPrompt(false);
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#141619' }}>Prompt Categories</h3>
                <p className="text-xs text-gray-500">Manage prompt categories and options</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMasterPromptModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                style={{ borderColor: '#9333ea', color: '#9333ea' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#9333ea';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9333ea';
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Master Prompt
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                style={{ borderColor: '#10b981', color: '#10b981' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#10b981';
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import
              </button>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: 'rgba(255, 152, 39, 0.1)', borderColor: 'rgba(255, 152, 39, 0.3)' }}>
                <span className="text-sm font-semibold" style={{ color: '#cc7820' }}>
                  {categories.length} categories
                </span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(20, 22, 25, 0.1)' }}>
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr className="text-left" style={{ borderBottom: '2px solid rgba(20, 22, 25, 0.1)' }}>
                  <th className="py-3 pr-3 pl-3 font-bold text-gray-700 text-xs uppercase tracking-wider"></th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Name</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Order</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Visible</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Multi-Select</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Value</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                  <SortableContext items={categories.map(c => c.id!)} strategy={verticalListSortingStrategy}>
                    {categories.map((category) => (
                      <SortableCategoryRow
                        key={category.id}
                        category={category}
                        expandedCategories={expandedCategories}
                        onToggleExpand={toggleExpand}
                        onEditCategory={startEditCategory}
                        onDeleteCategory={removeCategory}
                        onExportCategory={handleExportCategory}
                        onEditOption={startEditOption}
                        onDeleteOption={removeOption}
                        onOptionDragEnd={handleOptionDragEnd}
                        sensors={sensors}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6 w-140 flex-shrink-0 h-fit sticky top-24">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-gray-900">
              {editingCategoryId ? 'Edit Category' : editingOptionId ? 'Edit Option' : isCreatingOption ? 'Create Option' : 'Create Category'}
            </h3>
          </div>

          {/* Tabbed Switch */}
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg border-2 border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingOption(false);
                  setEditingCategoryId(null);
                  setEditingOptionId(null);
                  setCategoryForm(emptyCategoryForm());
                  setOptionForm(emptyOptionForm());
                  const nextOrder = getNextCategoryOrder();
                  if (nextOrder > 0) {
                    setCategoryForm((f) => ({ ...f, order: nextOrder }));
                  }
                }}
                disabled={!!editingCategoryId || !!editingOptionId}
                className={`flex-1 px-4 py-2.5 rounded-md font-semibold text-sm transition-all ${
                  !isCreatingOption && !editingOptionId
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } ${(editingCategoryId || editingOptionId) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingOption(true);
                  setEditingCategoryId(null);
                  setEditingOptionId(null);
                  setCategoryForm(emptyCategoryForm());
                  setOptionForm(emptyOptionForm());
                  if (categories.length > 0) {
                    const firstCategory = categories[0];
                    setOptionForm((f) => ({ 
                      ...f, 
                      categoryId: firstCategory.id!,
                      order: getNextOptionOrder(firstCategory)
                    }));
                  }
                }}
                disabled={!!editingCategoryId || !!editingOptionId}
                className={`flex-1 px-4 py-2.5 rounded-md font-semibold text-sm transition-all ${
                  isCreatingOption && !editingCategoryId
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } ${(editingCategoryId || editingOptionId) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Option
              </button>
            </div>
            {(editingCategoryId || editingOptionId) && (
              <p className="text-xs text-gray-500 mt-2 text-center">Cannot change mode while editing</p>
            )}
          </div>

          {isCreatingOption ? (
            <form onSubmit={handleOptionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white cursor-pointer"
                  value={optionForm.categoryId}
                  onChange={(e) => {
                    const categoryId = e.target.value;
                    setOptionForm((f) => ({ ...f, categoryId }));
                    const category = categories.find(c => c.id === categoryId);
                    if (category && !editingOptionId) {
                      const nextOrder = getNextOptionOrder(category);
                      setOptionForm((f) => ({ ...f, order: nextOrder }));
                    }
                  }}
                  required
                  disabled={!!editingOptionId}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Label *</label>
                <input
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  value={optionForm.label}
                  onChange={(e) => setOptionForm((f) => ({ ...f, label: e.target.value }))}
                  required
                  placeholder="Enter option label"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Value *</label>
                <textarea
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  value={optionForm.value}
                  onChange={(e) => setOptionForm((f) => ({ ...f, value: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Enter option value (prompt text)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Order</label>
                <input
                  type="number"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  value={optionForm.order}
                  onChange={(e) => setOptionForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-3 py-3 border-t border-gray-200">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <input
                    id="optionVisible"
                    type="checkbox"
                    checked={optionForm.visible}
                    onChange={(e) => setOptionForm((f) => ({ ...f, visible: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="optionVisible" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Visible</label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <input
                    id="defaultSelected"
                    type="checkbox"
                    checked={optionForm.defaultSelected}
                    onChange={(e) => setOptionForm((f) => ({ ...f, defaultSelected: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="defaultSelected" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Default Selected</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  value={(optionForm.tags || []).join(', ')}
                  onChange={(e) =>
                    setOptionForm((f) => ({ ...f, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))
                  }
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  disabled={loading} 
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: loading ? '#9333ea' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                    boxShadow: '0 10px 25px -5px rgba(147, 51, 234, 0.3)'
                  }}
                >
                  {loading ? 'Saving...' : (editingOptionId ? 'Save Option' : 'Create Option')}
                </button>
                {(editingOptionId || isCreatingOption) && (
                  <button
                    type="button"
                    className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all"
                    onClick={resetForms}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Icon (SF Symbol)</label>
                <input
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="person.crop.circle"
                />
                <p className="text-xs text-gray-500 mt-1">SF Symbol name for iOS app</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Icon Web (Lucid Icon)</label>
                <input
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={categoryForm.iconWeb}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, iconWeb: e.target.value }))}
                  placeholder="User"
                />
                <p className="text-xs text-gray-500 mt-1">Lucid icon name for web app</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Order</label>
                <input
                  type="number"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={categoryForm.order}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-3 py-3 border-t border-gray-200">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <input
                    id="visible"
                    type="checkbox"
                    checked={categoryForm.visible}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, visible: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="visible" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Visible</label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <input
                    id="multiSelect"
                    type="checkbox"
                    checked={categoryForm.multiSelect}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, multiSelect: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="multiSelect" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Multi-Select</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={(categoryForm.tags || []).join(', ')}
                  onChange={(e) =>
                    setCategoryForm((f) => ({ ...f, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))
                  }
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  disabled={loading} 
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: loading ? '#FF9827' : 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)',
                    boxShadow: '0 10px 25px -5px rgba(255, 152, 39, 0.3)'
                  }}
                >
                  {loading ? 'Saving...' : (editingCategoryId ? 'Save Changes' : 'Create')}
                </button>
                {editingCategoryId && (
                  <button
                    type="button"
                    className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all"
                    onClick={resetForms}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Master Prompt Modal */}
      {showMasterPromptModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setShowMasterPromptModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Master Prompt</h3>
                  <p className="text-xs text-gray-500">System prompt used by the app</p>
                </div>
              </div>
              <button
                onClick={() => setShowMasterPromptModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  System Prompt
                </label>
                <textarea
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none font-mono text-sm"
                  value={masterPrompt}
                  onChange={(e) => setMasterPrompt(e.target.value)}
                  rows={15}
                  placeholder="Enter the master system prompt that will be used by the app..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  This prompt will be used as the base system prompt when generating prompts from categories and options.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  disabled={savingMasterPrompt} 
                  onClick={handleSaveMasterPrompt}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: savingMasterPrompt ? '#9333ea' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                    boxShadow: '0 10px 25px -5px rgba(147, 51, 234, 0.3)'
                  }}
                >
                  {savingMasterPrompt ? (
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
                      Save Master Prompt
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMasterPromptModal(false)}
                  className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setShowExportModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Export Category</h3>
                  <p className="text-xs text-gray-500">Firebase-compatible JSON</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <pre className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 overflow-auto text-sm font-mono" style={{ height: '600px' }}>
                  <code>{exportedJson}</code>
                </pre>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleCopyToClipboard}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: copied ? '#10b981' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy JSON
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-5 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => !importing && setShowImportModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Import Categories</h3>
                  <p className="text-xs text-gray-500">Paste JSON to import or update categories</p>
                </div>
              </div>
              <button
                onClick={() => !importing && setShowImportModal(false)}
                disabled={importing}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  JSON Data (single category or array of categories)
                </label>
                <textarea
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none font-mono text-sm"
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  rows={20}
                  placeholder='Paste JSON here...\n\nExample single category:\n{\n  "id": "subject",\n  "name": "Subject Rules",\n  "icon": "person.crop.circle",\n  "order": 1,\n  "visible": true,\n  "multiSelect": true,\n  "tags": ["photo", "video"],\n  "options": [...]\n}\n\nOr array of categories:\n[{...}, {...}]'
                  disabled={importing}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Supports both single category objects and arrays. Categories with matching IDs or names will be updated, others will be created.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  disabled={importing || !importJson.trim()} 
                  onClick={handleImport}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  style={{ 
                    background: importing ? '#10b981' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {importing ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import Categories
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
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
