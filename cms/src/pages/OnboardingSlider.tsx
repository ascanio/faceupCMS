import { useEffect, useState } from 'react';
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
import type { OnboardingSlider } from '../types';
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
  title: string;
  text: string;
  before_image_url: string;
  after_image_url: string;
  order: number;
  visible: boolean;
  showUI: boolean;
}

function emptyForm(): FormState {
  return {
    title: '',
    text: '',
    before_image_url: '',
    after_image_url: '',
    order: 0,
    visible: true,
    showUI: true,
  };
}

interface SortableSliderRowProps {
  slider: OnboardingSlider;
  onEdit: (slider: OnboardingSlider) => void;
  onDelete: (id: string) => void;
}

function SortableSliderRow({ slider, onEdit, onDelete }: SortableSliderRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slider.id!,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderBottom: '1px solid rgba(20, 22, 25, 0.1)',
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50 transition-colors">
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
      <td className="py-3 pr-3 font-semibold" style={{ color: '#141619' }}>{slider.title}</td>
      <td className="py-3 pr-3 text-sm text-gray-600 max-w-xs truncate">{slider.text}</td>
      <td className="py-3 pr-3">
        {slider.before_image_url ? (
          <img src={slider.before_image_url} alt="Before" className="w-12 h-auto object-cover border-2 border-gray-200 rounded-lg shadow-sm" />
        ) : (
          <div className="w-12 h-25 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        {slider.after_image_url ? (
          <img src={slider.after_image_url} alt="After" className="w-12 h-auto object-cover border-2 border-gray-200 rounded-lg shadow-sm" />
        ) : (
          <div className="w-12 h-25 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </td>
      <td className="py-3 pr-3 text-sm text-gray-700 font-medium">{slider.order}</td>
      <td className="py-3 pr-3">
        {slider.visible ? (
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
        {slider.showUI !== false ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
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
          onClick={() => onEdit(slider)}
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
          onClick={() => onDelete(slider.id!)}
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

export default function OnboardingSliderPage() {
  const [sliders, setSliders] = useState<OnboardingSlider[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const q = query(collection(db, 'onboarding_sliders'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const rows: OnboardingSlider[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setSliders(rows);
    });
    
    return () => unsubscribe();
  }, []);

  // Get next order number
  const getNextOrder = () => {
    if (editingId) return form.order; // Keep existing order when editing
    
    if (sliders.length === 0) return 0;
    
    const maxOrder = Math.max(...sliders.map(item => item.order || 0));
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
  }, [sliders.length]);

  // Check if a WebP file is animated by reading the file structure
  async function isAnimatedWebP(file: File): Promise<boolean> {
    if (!file.type.includes('webp') && !file.name.toLowerCase().endsWith('.webp')) {
      return false;
    }
    
    try {
      // Read first 64 bytes to check for ANIM chunk
      // Animated WebP files have "ANIM" chunk in their structure
      const buffer = await file.slice(0, 64).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // WebP files start with "RIFF"
      const header = String.fromCharCode(...bytes.slice(0, 4));
      if (header !== 'RIFF') return false;
      
      // Check for "WEBP" identifier at offset 8
      const webpId = String.fromCharCode(...bytes.slice(8, 12));
      if (webpId !== 'WEBP') return false;
      
      // Search for "ANIM" chunk in the first 64 bytes
      // ANIM chunk typically appears after the VP8X chunk header
      const fileString = String.fromCharCode(...bytes);
      return fileString.includes('ANIM');
    } catch (error) {
      console.warn('Error checking for animated WebP:', error);
      // If we can't determine and it's a WebP file, assume it might be animated to preserve it
      return file.type.includes('webp') || file.name.toLowerCase().endsWith('.webp');
    }
  }

  // Resize and upload image helper with format preservation for WebP
  async function resizeAndUploadImage(
    file: File, 
    existingUrl: string, 
    type: 'before' | 'after'
  ): Promise<string> {
    if (!file) return existingUrl;
    
    // Check if it's an animated WebP
    const isAnimated = await isAnimatedWebP(file);
    
    // For animated WebP, upload directly without canvas processing to preserve animation
    if (isAnimated) {
      const fileRef = ref(
        storage, 
        `onboarding_sliders/${type}_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`
      );
      await uploadBytes(fileRef, file, { contentType: 'image/webp' });
      const url = await getDownloadURL(fileRef);
      return url;
    }
    
    // For non-animated images, resize and convert
    const resized = await resizeImage(file, 620, 1344);
    
    // Determine output format: preserve WebP, convert others to JPG
    const isWebP = file.type.includes('webp');
    const outputFormat = isWebP ? 'image/webp' : 'image/jpeg';
    const extension = isWebP ? 'webp' : 'jpg';
    const quality = isWebP ? 0.9 : 0.9; // 90% quality for both
    
    // Create a new File object with proper format
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        canvas.width = 620;
        canvas.height = 1344;
        ctx?.drawImage(img, 0, 0, 620, 1344);
        
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            const fileRef = ref(
              storage, 
              `onboarding_sliders/${type}_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`
            );
            const buf = await blob.arrayBuffer();
            await uploadBytes(fileRef, new Uint8Array(buf), { contentType: outputFormat });
            const url = await getDownloadURL(fileRef);
            resolve(url);
          },
          outputFormat,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(resized);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    setLoading(true);
    try {
      const beforeImageUrl = beforeImageFile 
        ? await resizeAndUploadImage(beforeImageFile, form.before_image_url, 'before')
        : form.before_image_url;
        
      const afterImageUrl = afterImageFile
        ? await resizeAndUploadImage(afterImageFile, form.after_image_url, 'after')
        : form.after_image_url;

      const payload = {
        title: form.title,
        text: form.text,
        before_image_url: beforeImageUrl,
        after_image_url: afterImageUrl,
        order: form.order,
        visible: form.visible,
        showUI: form.showUI,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'onboarding_sliders', editingId), payload);
      } else {
        await addDoc(collection(db, 'onboarding_sliders'), payload);
      }
      
      setForm(emptyForm());
      setEditingId(null);
      setBeforeImageFile(null);
      setAfterImageFile(null);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(slider: OnboardingSlider) {
    const { id, updatedAt, ...rest } = slider;
    setForm({ 
      ...emptyForm(), 
      ...rest,
      showUI: rest.showUI !== undefined ? rest.showUI : true, // Default to true if not set
    });
    setEditingId(id!);
  }

  async function remove(id: string) {
    if (!confirm('Delete this onboarding slider?')) return;
    await deleteDoc(doc(db, 'onboarding_sliders', id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sliders.findIndex((s) => s.id === active.id);
    const newIndex = sliders.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSliders = arrayMove(sliders, oldIndex, newIndex);

    // Update local state immediately for better UX
    setSliders(reorderedSliders);

    // Update Firestore with new order values
    const batch = writeBatch(db);
    reorderedSliders.forEach((slider, index) => {
      if (slider.id) {
        batch.update(doc(db, 'onboarding_sliders', slider.id), { order: index });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error updating slider order:', error);
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#141619' }}>Onboarding Sliders</h3>
                <p className="text-xs text-gray-500">Manage onboarding slides</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: 'rgba(255, 152, 39, 0.1)', borderColor: 'rgba(255, 152, 39, 0.3)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FF9827' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#cc7820' }}>
                {sliders.length} total
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(20, 22, 25, 0.1)' }}>
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr className="text-left" style={{ borderBottom: '2px solid rgba(20, 22, 25, 0.1)' }}>
                  <th className="py-3 pr-3 pl-3 font-bold text-gray-700 text-xs uppercase tracking-wider"></th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Title</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Text</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Before</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">After</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Order</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Visible</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Show UI</th>
                  <th className="py-3 pr-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sliders.map((s) => s.id!)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {sliders.map((s) => (
                      <SortableSliderRow
                        key={s.id}
                        slider={s}
                        onEdit={startEdit}
                        onDelete={remove}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
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
            <h3 className="font-bold text-lg text-gray-900">
              {editingId ? 'Edit Slider' : 'Create Slider'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
              <input
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="Enter title"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Text *</label>
              <textarea
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                rows={3}
                required
                placeholder="Enter description text"
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
            <div className="py-3 border-t border-gray-200 space-y-3">
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
                  id="showUI"
                  type="checkbox"
                  checked={form.showUI}
                  onChange={(e) => setForm((f) => ({ ...f, showUI: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="showUI" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">Show UI</label>
                {form.showUI && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Before Image 
                <span className="text-xs font-normal text-gray-500 ml-1">(JPG/WebP 620×1344, animated WebP supported)</span>
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setBeforeImageFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer"
              />
              {form.before_image_url && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <img src={form.before_image_url} alt="Before preview" className="w-auto h-40 object-cover border-2 border-gray-300 rounded-lg shadow-sm mx-auto" />
                  {beforeImageFile && (
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                After Image 
                <span className="text-xs font-normal text-gray-500 ml-1">(JPG/WebP 620×1344, animated WebP supported)</span>
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setAfterImageFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer"
              />
              {form.after_image_url && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <img src={form.after_image_url} alt="After preview" className="w-auto h-40 object-cover border-2 border-gray-300 rounded-lg shadow-sm mx-auto" />
                  {afterImageFile && (
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
                    setForm(emptyForm());
                    setBeforeImageFile(null);
                    setAfterImageFile(null);
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


