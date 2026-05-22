'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, X, LayoutGrid, LayoutTemplate, Filter, ChevronDown, CheckSquare, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface CollectionHeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  viewMode: 'grid' | 'card';
  setViewMode: (m: 'grid' | 'card') => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  collectionsLength: number;
  urlFilterLabel: string;
  onClearUrlFilter: () => void;
  sortBy: 'createdAt' | 'rating';
  sortOrder: 'asc' | 'desc';
  setSortBy: (v: 'createdAt' | 'rating') => void;
  setSortOrder: (v: 'asc' | 'desc') => void;
  onClearAllFilters: () => void;
}

export default function CollectionHeader({
  searchQuery, setSearchQuery, viewMode, setViewMode,
  showFilters, setShowFilters, hasActiveFilters, activeFilterCount,
  editMode, setEditMode, collectionsLength, urlFilterLabel,
  onClearUrlFilter, sortBy, sortOrder, setSortBy, setSortOrder,
  onClearAllFilters,
}: CollectionHeaderProps) {
  const { t } = useI18n();
  const [showSortModal, setShowSortModal] = useState(false);

  return (
    <div className="px-6 pt-5 pb-4 border-b border-parchment/20 dark:border-charcoal/40 bg-paper dark:bg-charcoal/80">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {urlFilterLabel && (
            <Link href="/" onClick={onClearUrlFilter} className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-charcoal dark:hover:text-parchment hover:bg-parchment/10 dark:hover:bg-charcoal/30 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </Link>
          )}
          <h2 className="text-xl font-bold text-charcoal dark:text-parchment tracking-tight">
            {urlFilterLabel ? urlFilterLabel : t('collection.myCollections')}
          </h2>
          {!urlFilterLabel && !editMode && (
            <span className="ml-1 px-2.5 py-1 text-xs font-semibold bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300 rounded-full">
              {collectionsLength}
            </span>
          )}
          {urlFilterLabel && (
            <button
              onClick={onClearUrlFilter}
              className="text-xs px-2.5 py-1 font-medium text-taupe dark:text-parchment/60 hover:bg-parchment/10 dark:hover:bg-charcoal/30 rounded-lg transition-colors"
            >
              {t('collection.clearFilter')}
            </button>
          )}
        </div>
      </div>

      {/* 工具栏：搜索 + 筛选 + 多选 + 视图切换 单行 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe/60 dark:text-parchment/40" size={16} />
          <input
            type="text"
            placeholder={t('collection.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input h-9 pl-9 pr-9 text-sm rounded-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe/40 dark:text-parchment/30 hover:text-taupe dark:hover:text-parchment/60 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${hasActiveFilters ? 'bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300 border border-chest-500/15 dark:border-amber-400/20' : 'bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40'}`}
          title={t('collection.filterTitle')}
        >
          <Filter size={13} />
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 bg-chest-500 text-white text-[10px] rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={13} className={`transition-transform duration-150 ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Sort button + modal */}
        <div className="relative">
          <button
            onClick={() => setShowSortModal(!showSortModal)}
            className="h-9 px-3 flex items-center gap-1.5 text-xs font-medium rounded-lg bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40 transition-colors cursor-pointer"
            title={t('collection.sort')}
          >
            <ArrowUpDown size={14} />
          </button>
          {showSortModal && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortModal(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-paper dark:bg-charcoal border border-parchment/30 dark:border-charcoal/50 rounded-xl shadow-lg overflow-hidden animate-slide-down">
                {[
                  { value: 'createdAt-desc', label: t('collection.addedTime'), icon: '↓' },
                  { value: 'createdAt-asc', label: t('collection.addedTime'), icon: '↑' },
                  { value: 'rating-desc', label: t('collection.filter.rating'), icon: '↓' },
                  { value: 'rating-asc', label: t('collection.filter.rating'), icon: '↑' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const [by, order] = opt.value.split('-') as ['createdAt' | 'rating', 'asc' | 'desc'];
                      setSortBy(by);
                      setSortOrder(order);
                      setShowSortModal(false);
                    }}
                    className={`w-full px-4 py-2.5 text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                      sortBy + '-' + sortOrder === opt.value
                        ? 'bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300'
                        : 'text-charcoal/70 dark:text-parchment/70 hover:bg-parchment/10 dark:hover:bg-charcoal/30'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] opacity-60">{opt.icon}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearAllFilters}
            className="px-3 h-9 text-xs font-medium text-taupe/60 dark:text-parchment/40 hover:text-taupe dark:hover:text-parchment/70 hover:bg-parchment/20 dark:hover:bg-charcoal/30 rounded-lg transition-colors cursor-pointer"
          >
            {t('collection.clearFilter')}
          </button>
        )}

        {/* 多选 */}
        {editMode ? (
          <button onClick={() => setEditMode(false)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-parchment/20 dark:bg-charcoal/30 text-charcoal/70 dark:text-parchment/70 hover:bg-parchment/30 dark:hover:bg-charcoal/40 rounded-lg transition-colors cursor-pointer" title={t('collection.cancel')}>
            <X size={13} />
          </button>
        ) : collectionsLength > 0 && (
          <button onClick={() => setEditMode(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-parchment/20 dark:bg-charcoal/30 text-charcoal/70 dark:text-parchment/70 hover:bg-parchment/30 dark:hover:bg-charcoal/40 rounded-lg transition-colors cursor-pointer" title={t('collection.batchManage')}>
            <CheckSquare size={13} />
          </button>
        )}

        {/* 视图切换 */}
        {!editMode && (
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'card' : 'grid')}
            className="p-2 rounded-lg bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40 transition-all duration-150 cursor-pointer"
            title={viewMode === 'grid' ? t('collection.cardView') : t('collection.gridView')}
          >
            {viewMode === 'grid' ? <LayoutTemplate size={15} /> : <LayoutGrid size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}
