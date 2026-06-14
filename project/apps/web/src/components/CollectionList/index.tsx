'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { X, Inbox, Loader2, FolderOpen, Move, Tag as TagIcon, MinusCircle, Trash2, Check, Edit2, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { useI18n, getListDisplayName, getListPathDisplayName } from '@/lib/i18n';
import { platformNames, PLATFORMS, getContrastTextColor } from '@/lib/platforms';
import { PlatformBadge } from '../PlatformBadge';
import { PAGE_TYPES, PageTypeIcon } from '@/lib/pageTypes';
import LazyImage from '../LazyImage';
import UndoToast from '../UndoToast';
import { EmptyState, CollectionSkeletonGrid } from '../ui';
import StarRating from '../StarRating';
import dynamic from 'next/dynamic';
import CollectionHeader from './CollectionHeader';
import CollectionFilterPanel from './CollectionFilterPanel';

const CollectionDetailModal = dynamic(() => import('../CollectionDetailModal'), { ssr: false });
import { useToast } from '../Toast';

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
  pageType?: string;
  note: string | null;
  rating?: number | null;
  tags: { id: string; name: string }[];
  lists: { id: string; name: string; isDefault?: boolean }[];
  url: string;
  createdAt?: string;
}

interface TagItem { id: string; name: string; }
interface ListItem { id: string; name: string; isDefault?: boolean; depth?: number; }

export default function CollectionList() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toast, setToast] = useState<{ id: string; message: string; restoreData: Collection } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'card'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPlatforms, setFilterPlatforms] = useState<Set<string>>(new Set());
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [filterListIds, setFilterListIds] = useState<Set<string>>(new Set());
  const [filterHasRating, setFilterHasRating] = useState<boolean | null>(null);
  const [filterPageType, setFilterPageType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'rating'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [moveModal, setMoveModal] = useState<{ type: 'list' | 'tag'; item: Collection } | null>(null);
  const [detailItem, setDetailItem] = useState<Collection | null>(null);

  // URL参数筛选
  const [urlFilterLabel, setUrlFilterLabel] = useState('');
  const [urlFilterType, setUrlFilterType] = useState<'list' | 'tag' | null>(null);
  const [urlFilterId, setUrlFilterId] = useState('');

  // 批量操作状态
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModal, setBatchModal] = useState<'list' | 'tag' | null>(null);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listId = searchParams.get('listId');
    const listName = searchParams.get('listName');
    const tagId = searchParams.get('tagId');
    const tagName = searchParams.get('tagName');
    if (listId) {
      setFilterListIds(new Set([listId]));
      setUrlFilterId(listId);
      setUrlFilterType('list');
      setUrlFilterLabel(listName || t('sidebar.groups'));
    } else if (tagId) {
      setFilterTagIds(new Set([tagId]));
      setUrlFilterId(tagId);
      setUrlFilterType('tag');
      setUrlFilterLabel(`#${tagName || t('collection.tag')}`);
    }
    const savedScroll = sessionStorage.getItem('collectionListScroll');
    if (savedScroll && listContainerRef.current) {
      listContainerRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, [searchParams]);

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      sessionStorage.setItem('collectionListScroll', String(container.scrollTop));
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['collections', Array.from(filterTagIds).sort().join(','), Array.from(filterListIds).sort().join(','), debouncedSearch, Array.from(filterPlatforms).sort().join(','), filterHasRating, filterPageType, sortBy, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', '40');
      if (filterTagIds.size > 0) params.set('tagIds', Array.from(filterTagIds).join(','));
      if (filterListIds.size > 0) params.set('listIds', Array.from(filterListIds).join(','));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterPlatforms.size > 0) params.set('platforms', Array.from(filterPlatforms).join(','));
      if (filterHasRating !== null) params.set('hasRating', filterHasRating ? 'true' : 'false');
      if (filterPageType) params.set('pageType', filterPageType);
      if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
      if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
      const response = await api.get(`/collections?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!getToken(),
    staleTime: 5 * 1000,
  });

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => { const r = await api.get('/tags'); return (r.data.data || r.data) as TagItem[]; },
    enabled: !!getToken(),
  });

  const { data: listsData } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => { const r = await api.get('/lists/flat'); return (r.data.data || r.data) as ListItem[]; },
    enabled: !!getToken(),
  });

  const allCollections: Collection[] = data?.pages.flatMap((page: { data: Collection[] }) =>
    (page.data || []).map((item: Collection) => ({
      ...item,
      tags: item.tags || [],
      lists: item.lists || [],
    }))
  ) || [];

  // 检测列表中是否有"稍后解析"的收藏（标题是 URL 占位符），有则自动轮询刷新
  const hasParsingItems = allCollections.some(c => c.title && /^https?:\/\//i.test(c.title) && c.title.length >= 20);
  useEffect(() => {
    if (!hasParsingItems) return;
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [hasParsingItems, refetch]);

  const totalCount = data?.pages[0]?.pagination?.total || 0;
  const hasMore = hasNextPage;

  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { root: listContainerRef.current, rootMargin: '200px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const collections = allCollections;
  const COLS = containerWidth >= 1024 ? 2 : 1;
  const ROW_HEIGHT = 156;
  const ITEM_HEIGHT = 140;
  const virtualizer = useVirtualizer({
    count: Math.ceil(collections.length / COLS),
    getScrollElement: () => listContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/collections/batch-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedIds(new Set());
      setEditMode(false);
      showToast(t('edit.deleteSuccess'), 'success');
    },
  });

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => setSelectedIds(new Set(collections.map(c => c.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const clearUrlFilter = () => {
    if (urlFilterType === 'list') setFilterListIds(new Set());
    else if (urlFilterType === 'tag') setFilterTagIds(new Set());
    setUrlFilterType(null);
    setUrlFilterLabel('');
    setUrlFilterId('');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleDelete = useCallback(async (item: Collection) => {
    if (!confirm(t('collection.deleteConfirm'))) return;
    try {
      await api.delete(`/collections/${item.id}`);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setDetailItem(null);
      setToast({
        id: item.id,
        message: t('collection.deleted', { title: item.title }),
        restoreData: item,
      });
    } catch {
      showAlert(t('common.operationFailed'), 'error');
    }
  }, [queryClient, showToast, showAlert]);

  const handleUndo = useCallback(async () => {
    if (!toast?.restoreData) return;
    const item = toast.restoreData;
    try {
      await api.post('/collections', {
        url: item.url,
        title: item.title,
        coverImage: item.coverImage,
        platform: item.platform,
        note: item.note,
        rating: item.rating,
        tagIds: item.tags.map(t => t.id),
        listIds: item.lists.map(l => l.id),
      });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    } catch {
      showAlert(t('collection.undoFailed'), 'error');
    }
    setToast(null);
  }, [toast, queryClient, showToast, showAlert]);

  const handleBatchRemoveFromList = useCallback(async () => {
    if (filterListIds.size === 0) { showToast(t('collection.noGroupFilter'), 'error'); return; }
    if (!confirm(t('collection.removeFromGroupConfirm', { count: selectedIds.size }))) return;
    try {
      await api.post('/collections/batch-update', {
        collectionIds: Array.from(selectedIds),
        removeListIds: Array.from(filterListIds),
      });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedIds(new Set());
      setEditMode(false);
    } catch { showAlert(t('common.operationFailed'), 'error'); }
  }, [selectedIds, filterListIds, queryClient, showToast, showAlert]);

  const handleBatchRemoveFromTag = useCallback(async () => {
    if (filterTagIds.size === 0) { showToast(t('collection.noGroupFilter'), 'error'); return; }
    if (!confirm(t('collection.removeFromTagConfirm', { count: selectedIds.size }))) return;
    try {
      await api.post('/collections/batch-update', {
        collectionIds: Array.from(selectedIds),
        removeTagIds: Array.from(filterTagIds),
      });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedIds(new Set());
      setEditMode(false);
    } catch { showAlert(t('common.operationFailed'), 'error'); }
  }, [selectedIds, filterTagIds, queryClient, showToast, showAlert]);

  const availablePlatforms = Array.from(new Set(allCollections.map(c => c.platform))).sort();
  const hasActiveFilters = filterPlatforms.size > 0 || filterTagIds.size > 0 || filterListIds.size > 0 || filterHasRating !== null;
  const activeFilterCount = filterPlatforms.size + filterTagIds.size + filterListIds.size + (filterHasRating !== null ? 1 : 0);

  const handleClearAllFilters = () => {
    setFilterPlatforms(new Set());
    setFilterTagIds(new Set());
    setFilterListIds(new Set());
    setFilterHasRating(null);
    clearUrlFilter();
    setTimeout(() => refetch(), 0);
  };

  return (
    <div className="h-full flex flex-col">
      <CollectionHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        editMode={editMode}
        setEditMode={setEditMode}
        collectionsLength={collections.length}
        urlFilterLabel={urlFilterLabel}
        onClearUrlFilter={clearUrlFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        setSortBy={setSortBy}
        setSortOrder={setSortOrder}
        onClearAllFilters={handleClearAllFilters}
      />

      {showFilters && (
        <CollectionFilterPanel
          filterPlatforms={filterPlatforms}
          setFilterPlatforms={setFilterPlatforms}
          filterTagIds={filterTagIds}
          setFilterTagIds={setFilterTagIds}
          filterListIds={filterListIds}
          setFilterListIds={setFilterListIds}
          filterHasRating={filterHasRating}
          setFilterHasRating={setFilterHasRating}
          filterPageType={filterPageType}
          setFilterPageType={setFilterPageType}
          availablePlatforms={availablePlatforms}
          tagsData={tagsData}
          listsData={listsData}
        />
      )}

      {/* 批量操作栏 */}
      {editMode && (
        <div className="px-6 py-3 bg-chest-500/5 dark:bg-amber-400/5 border-b border-chest-500/10 dark:border-amber-400/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={selectedIds.size === collections.length ? clearSelection : selectAll} className="px-3 py-1.5 text-xs text-chest-600 dark:text-amber-300 bg-chest-500/5 dark:bg-amber-400/10 hover:bg-chest-500/10 dark:hover:bg-amber-400/15 rounded-lg">
              {selectedIds.size === collections.length ? t('collection.deselectAll') : t('collection.selectAll')}
            </button>
            <span className="text-sm text-chest-600 dark:text-amber-300 font-medium">{t('collection.selectedItems', { count: selectedIds.size })}</span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setBatchModal('list')} className="px-3 py-1.5 text-xs text-chest-600 dark:text-amber-300 bg-chest-500/5 dark:bg-amber-400/10 hover:bg-chest-500/10 dark:hover:bg-amber-400/15 rounded-lg flex items-center gap-1"><FolderOpen size={12} /> {t('collection.moveToGroup')}</button>
              <button onClick={() => setBatchModal('tag')} className="px-3 py-1.5 text-xs text-sage dark:text-sage/80 bg-sage/5 dark:bg-sage/10 hover:bg-sage/10 dark:hover:bg-sage/15 rounded-lg flex items-center gap-1"><TagIcon size={12} /> {t('collection.addTag')}</button>
              {filterTagIds.size > 0 && (
                <button onClick={handleBatchRemoveFromTag} className="px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 rounded-lg flex items-center gap-1"><MinusCircle size={12} /> {t('collection.removeTag')}</button>
              )}
              {filterListIds.size > 0 && (
                <button onClick={handleBatchRemoveFromList} className="px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 rounded-lg flex items-center gap-1"><MinusCircle size={12} /> {t('collection.removeGroup')}</button>
              )}
              <button onClick={() => { if (confirm(t('collection.deleteConfirm'))) batchDeleteMutation.mutate(Array.from(selectedIds)); }} className="px-3 py-1.5 text-xs text-rust dark:text-rust/90 bg-rust/5 dark:bg-rust/10 hover:bg-rust/10 dark:hover:bg-rust/15 rounded-lg flex items-center gap-1"><Trash2 size={12} /> {t('collection.delete')}</button>
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div ref={listContainerRef} className="flex-1 overflow-y-auto p-6" aria-label={t('collection.myCollections')}>
        {isLoading ? (
          <CollectionSkeletonGrid count={8} />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-rust/5 dark:bg-rust/10 flex items-center justify-center mb-4">
              <X size={24} className="text-rust" />
            </div>
            <p className="text-rust font-medium mb-2">{t('common.loadFailed', { error: (error as Error)?.message || '' })}</p>
            <button onClick={() => refetch()} className="btn-secondary btn-sm mt-2">{t('common.retry')}</button>
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            icon={<Inbox size={40} />}
            title={t('collection.noCollections')}
            description={urlFilterLabel ? t('collection.noCollectionsInFilter', { label: urlFilterLabel }) : t('collection.noCollectionsHint')}
            action={
              <Link href="/add" className="btn-primary btn">
                {t('collection.addFirst')}
              </Link>
            }
          />
        ) : (
          viewMode === 'grid' ? (
          <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const rowStart = virtualRow.index * COLS;
              const rowItems = collections.slice(rowStart, rowStart + COLS);
              return rowItems.map((item, colIdx) => {
                if (!item) return null;
                const platformColor = PLATFORMS.find(p => p.key === item.platform)?.color || '#6b7280';
                const isLeft = colIdx === 0;
                const itemWidth = COLS === 1 ? '100%' : isLeft ? 'calc(50% - 8px)' : 'calc(50% - 8px)';
                const itemLeft = COLS === 1 ? 0 : isLeft ? 0 : 'calc(50% + 8px)';
                return (
                  <div
                    key={item.id}
                    className={`p-4 relative cursor-pointer group rounded-xl border border-chest-100/50 dark:border-chest-700/30 bg-white dark:bg-chest-800/50 shadow-sm hover:shadow-md hover:border-amber-400/20 dark:hover:border-amber-400/20 transition-all duration-200 ${editMode && selectedIds.has(item.id) ? 'ring-2 ring-chest-500 dark:ring-amber-400' : ''}`}
                    onClick={() => editMode ? toggleSelect(item.id) : setDetailItem(item)}
                    style={{ position: 'absolute', top: 0, left: itemLeft, width: itemWidth, height: ITEM_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                  >
                {editMode && (
                  <div className="absolute top-3 left-3 z-10">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(item.id) ? 'bg-chest-500 border-chest-500' : 'border-parchment/40 dark:border-charcoal/50 bg-paper/90 dark:bg-charcoal/90'}`}>
                      {selectedIds.has(item.id) && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="w-28 h-20 rounded-xl flex-shrink-0 overflow-hidden relative group shadow-sm">
                    <LazyImage src={item.coverImage} alt={item.title} title={item.title} platform={item.platform} collectionId={item.id} containerClassName="w-full h-full" className="transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute bottom-1.5 left-1.5 z-10">
                      <PlatformBadge platform={item.platform} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold text-sm text-charcoal dark:text-parchment line-clamp-1 leading-snug group-hover:text-chest-600 dark:group-hover:text-amber-300 transition-colors">{item.title}</h3>
                    {item.note ? (
                      <p className="text-xs text-taupe/50 dark:text-parchment/40 line-clamp-1 mt-0.5">{item.note}</p>
                    ) : (
                      <p className="text-xs text-taupe/40 dark:text-parchment/30 line-clamp-1 mt-0.5 truncate">{item.url}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.rating != null && item.rating > 0 && (
                        <StarRating value={item.rating} size={12} readonly ariaLabel={t('collection.filter.rating')} />
                      )}
                      <div className="flex flex-wrap items-center gap-1">
                        {item.tags.slice(0, 2).map((tag) => (
                          <span key={tag.id} className="px-1.5 py-0.5 bg-parchment/30 dark:bg-charcoal/40 text-taupe/70 dark:text-parchment/50 text-[10px] rounded-md">#{tag.name}</span>
                        ))}
                        {item.lists.slice(0, 1).map((list) => (
                          <span key={list.id} className="px-1.5 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300/80 text-[10px] rounded-md flex items-center gap-0.5">
                            <FolderOpen size={8} />{getListDisplayName(list, t)}
                          </span>
                        ))}
                        {item.tags.length + item.lists.length > 3 && (
                          <span className="text-[10px] text-taupe/40 dark:text-parchment/30">+{item.tags.length + item.lists.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!editMode && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 self-center">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 text-taupe/40 hover:text-chest-500 dark:hover:text-amber-400 hover:bg-chest-50 dark:hover:bg-chest-800/50 rounded-lg transition-colors" onClick={e => e.stopPropagation()} title="打开链接">
                        <ExternalLink size={14} />
                      </a>
                      <Link href={`/edit/${item.id}`} className="p-2 text-taupe/40 hover:text-chest-500 dark:hover:text-amber-400 hover:bg-chest-50 dark:hover:bg-chest-800/50 rounded-lg transition-colors" onClick={e => e.stopPropagation()} title="编辑">
                        <Edit2 size={14} />
                      </Link>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="p-2 text-taupe/40 hover:text-rust hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="删除">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

              </div>
              );
              });
            })}
          </div>
          ) : (
          /* Card masonry view */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 stagger-children">
            {collections.map((item) => {
              const platformColor = PLATFORMS.find(p => p.key === item.platform)?.color || '#6b7280';
              return (
                <div
                  key={item.id}
                  className={`relative cursor-pointer group rounded-xl overflow-hidden border border-chest-100/50 dark:border-chest-700/30 bg-white dark:bg-chest-800/50 shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-amber-400/30 dark:hover:border-amber-400/30 transition-all duration-300 ${editMode && selectedIds.has(item.id) ? 'ring-2 ring-chest-500 dark:ring-amber-400' : ''}`}
                  onClick={() => editMode ? toggleSelect(item.id) : setDetailItem(item)}
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 320px' }}
                >
                  {editMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIds.has(item.id) ? 'bg-chest-500 border-chest-500' : 'border-white/80 bg-black/30 backdrop-blur-sm'}`}>
                        {selectedIds.has(item.id) && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  )}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <LazyImage src={item.coverImage} alt={item.title} title={item.title} platform={item.platform} collectionId={item.id} containerClassName="w-full h-full" className="group-hover:scale-105 transition-transform duration-500 ease-out" />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {item.pageType && item.pageType !== 'other' && (
                        <span className="p-1 rounded-full bg-black/50 text-white backdrop-blur-sm"><PageTypeIcon type={item.pageType} size={10} /></span>
                      )}
                      <PlatformBadge platform={item.platform} size="sm" />
                    </div>
                    {!editMode && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3 gap-2">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/90 text-charcoal hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg" onClick={e => e.stopPropagation()} title="打开链接"><ExternalLink size={14} /></a>
                        <Link href={`/edit/${item.id}`} className="p-2 rounded-full bg-white/90 text-charcoal hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg" onClick={e => e.stopPropagation()} title="编辑"><Edit2 size={14} /></Link>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="p-2 rounded-full bg-white/90 text-rust hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg" title="删除"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h3 className="font-medium text-charcoal dark:text-parchment text-sm line-clamp-2 leading-snug group-hover:text-chest-600 dark:group-hover:text-amber-300 transition-colors">{item.title}</h3>
                    {item.note && (
                      <p className="text-[10px] text-taupe/50 dark:text-parchment/40 mt-0.5 line-clamp-1">{item.note}</p>
                    )}
                    {item.rating != null && item.rating > 0 && (
                      <div className="mt-1"><StarRating value={item.rating} size={11} readonly ariaLabel={t('collection.filter.rating')} /></div>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {item.tags.slice(0, 2).map(tag => (
                        <span key={tag.id} className="text-[9px] px-1.5 py-0.5 bg-parchment/30 dark:bg-charcoal/40 text-taupe/60 dark:text-parchment/50 rounded-md">#{tag.name}</span>
                      ))}
                      {item.lists.slice(0, 1).map(list => (
                        <span key={list.id} className="text-[9px] px-1.5 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300/80 rounded-md truncate max-w-[60px]">{getListDisplayName(list, t)}</span>
                      ))}
                      {item.tags.length + item.lists.length > 3 && (
                        <span className="text-[9px] text-taupe/40 dark:text-parchment/30">+{item.tags.length + item.lists.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )
        )}
        <div ref={loadMoreRef} className="text-center py-6">
          {hasMore ? (
            <>
              <p className="text-sm text-taupe/60 dark:text-parchment/40 mb-2">{t('collection.showCount', { shown: allCollections.length, total: totalCount })}</p>
              {isFetchingNextPage && (
                <div className="flex items-center justify-center gap-2 text-sm text-taupe/60 dark:text-parchment/40">
                  <Loader2 size={16} className="animate-spin" />{t('common.loading') || '加载中...'}
                </div>
              )}
            </>
          ) : collections.length > 0 && (
            <p className="text-xs text-taupe/40 dark:text-parchment/30">{t('collection.allLoaded', { count: collections.length })}</p>
          )}
        </div>
      </div>

      {toast && (
        <UndoToast message={toast.message} onUndo={handleUndo} onClose={() => setToast(null)} />
      )}

      {detailItem && (
        <CollectionDetailModal item={detailItem} onClose={() => setDetailItem(null)} onDelete={handleDelete} editMode={editMode} />
      )}

      {moveModal && (
        <div className="modal-overlay" onClick={() => setMoveModal(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-charcoal dark:text-parchment">{moveModal.type === 'list' ? t('collection.moveToGroupTitle') : t('collection.addTagTitle')}</h3>
              <button onClick={() => setMoveModal(null)} className="p-2 hover:bg-parchment/10 dark:hover:bg-charcoal/30 rounded-lg transition-colors cursor-pointer"><X size={18} className="text-taupe dark:text-parchment/60" /></button>
            </div>
            <p className="text-sm text-taupe dark:text-parchment/60 mb-4">{moveModal.type === 'list' ? t('collection.selectTargetGroup') : t('collection.selectTagsToAdd')}</p>
            <div className="space-y-2">
              {moveModal.type === 'list' ? (
                listsData?.map((list: ListItem) => {
                  const isCurrent = moveModal.item.lists.some(l => l.id === list.id);
                  const indentWidth = (list.depth || 0) * 16;
                  return (
                    <button key={list.id} onClick={async () => { try { if (isCurrent) return; await api.put(`/collections/${moveModal.item.id}`, { listIds: [list.id] }); queryClient.invalidateQueries({ queryKey: ['collections'] }); setMoveModal(null); } catch { showAlert(t('common.operationFailed'), 'error'); } }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-between ${isCurrent ? 'border-chest-500 dark:border-amber-400 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300' : 'border-parchment/30 dark:border-charcoal/40 hover:border-taupe/40 dark:hover:border-charcoal/50'}`}
                      style={{ marginLeft: indentWidth }}
                    >
                      <span className="flex items-center gap-2 text-charcoal dark:text-parchment"><FolderOpen size={16} />{getListPathDisplayName(list, t)}{list.isDefault && <span className="px-1 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300 text-xs rounded">{t('collection.default')}</span>}</span>
                      {isCurrent && <Check size={16} />}
                    </button>
                  );
                })
              ) : (
                tagsData?.map((tag: TagItem) => {
                  const isCurrent = moveModal.item.tags.some(t => t.id === tag.id);
                  return (
                    <button key={tag.id} onClick={async () => { try { const currentTagIds = moveModal.item.tags.map(t => t.id); const newTagIds = isCurrent ? currentTagIds.filter(id => id !== tag.id) : [...currentTagIds, tag.id]; await api.put(`/collections/${moveModal.item.id}`, { tagIds: newTagIds }); queryClient.invalidateQueries({ queryKey: ['collections'] }); setMoveModal(null); } catch { showAlert(t('common.operationFailed'), 'error'); } }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-between ${isCurrent ? 'border-chest-500 dark:border-amber-400 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300' : 'border-parchment/30 dark:border-charcoal/40 hover:border-taupe/40 dark:hover:border-charcoal-50'}`}
                    >
                      <span className="flex items-center gap-2 text-charcoal dark:text-parchment"><TagIcon size={16} />#{tag.name}</span>
                      {isCurrent && <Check size={16} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {batchModal && (
        <div className="modal-overlay" onClick={() => setBatchModal(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-charcoal dark:text-parchment">{batchModal === 'list' ? t('collection.batchMoveToGroup') : t('collection.batchAddTags')}</h3>
              <button onClick={() => setBatchModal(null)} className="p-2 hover:bg-parchment/10 dark:hover:bg-charcoal/30 rounded-lg transition-colors cursor-pointer"><X size={18} className="text-taupe dark:text-parchment/60" /></button>
            </div>
            <p className="text-sm text-taupe dark:text-parchment/60 mb-4">{t('collection.selectedItemsTarget', { count: selectedIds.size, target: batchModal === 'list' ? t('collection.selectTargetGroup') : t('collection.selectTagsToAdd') })}</p>
            <div className="space-y-2">
              {batchModal === 'list' ? (
                listsData?.map((list: ListItem) => {
                  const indentWidth = (list.depth || 0) * 16;
                  return (
                    <button key={list.id} onClick={async () => { try { await api.post('/collections/batch-move-lists', { collectionIds: Array.from(selectedIds), listId: list.id }); queryClient.invalidateQueries({ queryKey: ['collections'] }); setSelectedIds(new Set()); setEditMode(false); setBatchModal(null); } catch { showAlert(t('common.operationFailed'), 'error'); } }}
                      className="w-full text-left px-4 py-2.5 rounded-lg border border-parchment/30 dark:border-charcoal/40 hover:border-taupe/40 dark:hover:border-charcoal/50 transition-colors flex items-center gap-2 text-charcoal dark:text-parchment"
                      style={{ marginLeft: indentWidth }}
                    >
                      <FolderOpen size={16} /><span className="flex-1">{getListPathDisplayName(list, t)}</span>{list.isDefault && <span className="px-1 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300 text-xs rounded">{t('collection.default')}</span>}
                    </button>
                  );
                })
              ) : (
                tagsData?.map((tag: TagItem) => (
                  <button key={tag.id} onClick={async () => { try { await api.post('/collections/batch-add-tags', { collectionIds: Array.from(selectedIds), tagIds: [tag.id] }); queryClient.invalidateQueries({ queryKey: ['collections'] }); setSelectedIds(new Set()); setEditMode(false); setBatchModal(null); } catch { showAlert(t('common.operationFailed'), 'error'); } }}
                    className="w-full text-left px-4 py-2.5 rounded-lg border border-parchment/30 dark:border-charcoal/40 hover:border-taupe/40 dark:hover:border-charcoal/50 transition-colors flex items-center gap-2 text-charcoal dark:text-parchment"
                  >
                    <TagIcon size={16} />#{tag.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
