import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Category, Filter, Subcategory } from '../types';

export default function FiltersListPage() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('');

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

  // Get category name by ID
  const getCategoryName = (categoryId: string): string => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Unknown';
  };

  // Get subcategory name by ID
  const getSubcategoryName = (subcategoryId: string | undefined): string => {
    if (!subcategoryId) return 'No Subcategory';
    const subcat = subcategories.find(s => s.id === subcategoryId);
    return subcat ? subcat.name : 'Unknown';
  };

  // Generate text content for copying
  const listText = useMemo(() => {
    return filteredFilters.map(filter => {
      const categoryName = getCategoryName(filter.category);
      const subcategoryName = getSubcategoryName(filter.subcategory);
      const refInfo = filter.supports_reference_images ? ' / Allow Ref: Yes' : '';
      
      return `${categoryName} / ${subcategoryName} / ${filter.name} / ${filter.prompt}${refInfo}`;
    }).join('\n');
  }, [filteredFilters, categories, subcategories]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(listText);
    alert('List copied to clipboard!');
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white border-2 border-gray-200 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#141619' }}>Filters List</h3>
              <p className="text-xs text-gray-500">Copy-friendly filter list</p>
            </div>
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Category:</label>
              <select
                className="border-2 border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer bg-white"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setFilterSubcategory('');
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            
            {filterCategory && availableFilterSubcategories.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Subcategory:</label>
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
              </div>
            )}
            
            {(filterCategory || filterSubcategory) && (
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
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
                {filteredFilters.length} filter{filteredFilters.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <button
              onClick={copyToClipboard}
              disabled={filteredFilters.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}
              onMouseEnter={(e) => filteredFilters.length > 0 && (e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c00 0%, #e67a00 100%)')}
              onMouseLeave={(e) => filteredFilters.length > 0 && (e.currentTarget.style.background = 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy List
            </button>
          </div>
        </div>

        <div className="space-y-1 font-mono text-sm bg-gray-50 rounded-lg p-4 border-2 border-gray-200 max-h-[70vh] overflow-y-auto">
          {filteredFilters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="font-sans">No filters found</p>
              <p className="text-xs font-sans mt-1">Try adjusting your filter settings</p>
            </div>
          ) : (
            filteredFilters.map((filter) => {
              const categoryName = getCategoryName(filter.category);
              const subcategoryName = getSubcategoryName(filter.subcategory);
              
              return (
                <div
                  key={filter.id}
                  className="py-2 px-3 hover:bg-white rounded transition-colors border-l-4"
                  style={{ borderLeftColor: filter.supports_reference_images ? '#10b981' : '#e5e7eb' }}
                >
                  <span className="text-gray-600 select-all">
                    {categoryName} / {subcategoryName} / <span className="font-semibold text-gray-900">{filter.name}</span> / {filter.prompt}{filter.supports_reference_images && <span className="font-semibold text-green-600"> / Allow aditional images: Yes</span>}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700 mb-2">Format:</p>
          <p className="font-mono bg-gray-100 p-2 rounded">Category Name / Subcategory Name / Filter Name / Prompt [/ Allow aditional images: Yes]</p>
          <p className="mt-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }}></span>
              Green border = Supports reference images
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

