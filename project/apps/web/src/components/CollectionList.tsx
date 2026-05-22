'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, X, LayoutGrid, LayoutTemplate, Filter, ChevronDown, Tag as TagIcon, Move, Check, CheckSquare, MinusCircle, ArrowLeft, XCircle, Archive, Inbox, Loader2, FolderOpen, Trash2, Edit2, ExternalLink, ArrowUpDown, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { useI18n, getListDisplayName, getListPathDisplayName } from '@/lib/i18n';
import { platformNames, getContrastTextColor, PLATFORMS, generateDefaultCover } from '@/lib/platforms';
import { PAGE_TYPES, PageTypeIcon, getPageTypeConfig } from '@/lib/pageTypes';
import LazyImage from './LazyImage';
import UndoToast from './UndoToast';
import { EmptyState, CollectionSkeletonGrid, CollectionSkeletonList } from './ui';
import StarRating from './StarRating';
import dynamic from 'next/dynamic';

const CollectionDetailModal = dynamic(() => import('./CollectionDetailModal'), { ssr: false });
import { useToast } from './Toast';
import type { DisplayFieldKey, CollectionViews } from '@/app/(main)/settings/CollectionViewConfig';
import { useLocalCollectionViews } from '@/hooks/useLocalCollectionViews';

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

// 获取排序后的字段配置
function getSortedFields(views: CollectionViews | undefined, mode: 'webGrid' | 'webList'): { key: DisplayFieldKey; enabled: boolean }[] {
  if (!views?.[mode]?.fields) {
    return [
      { key: 'cover', enabled: true },
      { key: 'title', enabled: true },
      { key: 'platform', enabled: true },
      { key: 'rating', enabled: true },
      { key: 'pageType', enabled: false },
      { key: 'tags', enabled: true },
      { key: 'lists', enabled: true },
      { key: 'note', enabled: true },
      { key: 'createdAt', enabled: false },
    ];
  }
  return [...views[mode].fields]
    .sort((a, b) => a.order - b.order)
    .map(f => ({ key: f.key, enabled: f.enabled }));
}

export default function CollectionList() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // 移除 mounted 状态，避免人为延迟数据请求一帧
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
  const [showSortModal, setShowSortModal] = useState(false);

  // 视图配置（本地存储）
  const { views: collectionViews } = useLocalCollectionViews();
  const viewConfig = getSortedFields(collectionViews, viewMode === 'grid' ? 'webGrid' : 'webList');
  const enabledFields = new Set(viewConfig.filter(f => f.enabled).map(f => f.key));

  // URL参数筛选：从分组页/标签页点击跳转
  const [urlFilterLabel, setUrlFilterLabel] = useState('');
  const [urlFilterType, setUrlFilterType] = useState<'list' | 'tag' | null>(null);
  const [urlFilterId, setUrlFilterId] = useState('');

  // 批量操作状态
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModal, setBatchModal] = useState<'list' | 'tag' | null>(null);

  // 滚动位置记忆 + 自动加载更多
  const listContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 读取URL参数
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
    // 恢复滚动位置
    const savedScroll = sessionStorage.getItem('collectionListScroll');
    if (savedScroll && listContainerRef.current) {
      listContainerRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, [searchParams]);

  // 记忆滚动位置
  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      sessionStorage.setItem('collectionListScroll', String(container.scrollTop));
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Toast 自动消失
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 无限滚动查询：筛选条件传给后端，分页懒加载
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
    staleTime: 30 * 1000,
  });

  // Tags & Lists for filter dropdowns
  interface TagItem { id: string; name: string; }
  interface ListItem { id: string; name: string; isDefault?: boolean; depth?: number; }

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
  const totalCount = data?.pages[0]?.pagination?.total || 0;
  const hasMore = hasNextPage;

  // 虚拟滚动：跟踪容器宽度以计算每行列数
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

  // 自动加载更多（IntersectionObserver）
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

  // 后端已处理筛选，前端直接使用聚合结果
  const collections = allCollections;

  // 虚拟滚动：按行虚拟化，每行 2 列（desktop）
  const COLS = containerWidth >= 1024 ? 2 : 1;
  const ROW_HEIGHT = 156; // 虚拟滚动行高
  const ITEM_HEIGHT = 140; // 实际 item 高度，小于 ROW_HEIGHT 形成竖直间距
  const virtualizer = useVirtualizer({
    count: Math.ceil(collections.length / COLS),
    getScrollElement: () => listContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // 批量操作
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
    // 清除URL参数
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  // 删除收藏（带撤销）
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

  // 撤销删除
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

  // 批量移除分组
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

  // 批量移除标签
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

  // 获取当前可见的平台
  const availablePlatforms = Array.from(new Set(allCollections.map(c => c.platform))).sort();

  const togglePlatformFilter = (platform: string) => {
    const newSet = new Set(filterPlatforms);
    if (newSet.has(platform)) newSet.delete(platform); else newSet.add(platform);
    setFilterPlatforms(newSet);
  };

  const hasActiveFilters = filterPlatforms.size > 0 || filterTagIds.size > 0 || filterListIds.size > 0 || filterHasRating !== null;
  const activeFilterCount = filterPlatforms.size + filterTagIds.size + filterListIds.size + (filterHasRating !== null ? 1 : 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header - 整合为单行紧凑布局 */}
      <div className="px-6 pt-5 pb-4 border-b border-parchment/20 dark:border-charcoal/40 bg-paper dark:bg-charcoal/80">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {urlFilterLabel && (
              <Link href="/" onClick={clearUrlFilter} className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-charcoal dark:hover:text-parchment hover:bg-parchment/10 dark:hover:bg-charcoal/30 rounded-lg transition-colors">
                <ArrowLeft size={18} />
              </Link>
            )}
            <h2 className="text-xl font-bold text-charcoal dark:text-parchment tracking-tight">
              {urlFilterLabel ? urlFilterLabel : t('collection.myCollections')}
            </h2>
            {!urlFilterLabel && !editMode && (
              <span className="ml-1 px-2.5 py-1 text-xs font-semibold bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300 rounded-full">
                {collections.length}
              </span>
            )}
            {urlFilterLabel && (
              <button
                onClick={clearUrlFilter}
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
              onClick={() => {
                setFilterPlatforms(new Set());
                setFilterTagIds(new Set());
                setFilterListIds(new Set());
                setFilterHasRating(null);
                clearUrlFilter();
                setTimeout(() => refetch(), 0);
              }}
              className="px-3 h-9 text-xs font-medium text-taupe/60 dark:text-parchment/40 hover:text-taupe dark:hover:text-parchment/70 hover:bg-parchment/20 dark:hover:bg-charcoal/30 rounded-lg transition-colors cursor-pointer"
            >
              {t('collection.clearFilter')}
            </button>
          )}

          {/* 多选 */}
          {editMode ? (
            <>
              <button onClick={() => { setEditMode(false); clearSelection(); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-parchment/20 dark:bg-charcoal/30 text-charcoal/70 dark:text-parchment/70 hover:bg-parchment/30 dark:hover:bg-charcoal/40 rounded-lg transition-colors cursor-pointer" title={t('collection.cancel')}>
                <X size={13} />
              </button>
            </>
          ) : collections.length > 0 && (
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

          {/* 视图设置 */}
          {!editMode && (
            <Link
              href="/settings"
              className="p-2 rounded-lg bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40 transition-all duration-150 cursor-pointer"
              title="视图设置"
            >
              <Settings size={15} />
            </Link>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 p-4 bg-parchment/10 dark:bg-charcoal/20 rounded-xl border border-parchment/20 dark:border-charcoal/30 space-y-3 animate-slide-down">
            {/* Rating filter chips */}
            <div>
              <label className="text-xs font-semibold text-taupe dark:text-parchment/60 mb-2 block tracking-wide uppercase">{t('collection.filter.rating')}</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterHasRating(filterHasRating === true ? null : true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${filterHasRating === true ? 'bg-amber-500 text-white' : 'bg-paper dark:bg-charcoal/50 border border-parchment/30 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-taupe/40 dark:hover:border-charcoal/50'}`}
                >
                  {filterHasRating === true && <XCircle size={11} />}
                  {t('collection.filter.hasRating')}
                </button>
                <button
                  onClick={() => setFilterHasRating(filterHasRating === false ? null : false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${filterHasRating === false ? 'bg-taupe/60 text-white' : 'bg-paper dark:bg-charcoal/50 border border-parchment/30 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-taupe/40 dark:hover:border-charcoal/50'}`}
                >
                  {filterHasRating === false && <XCircle size={11} />}
                  {t('collection.filter.noRating')}
                </button>
                {filterHasRating !== null && (
                  <button
                    onClick={() => setFilterHasRating(null)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40 transition-all cursor-pointer"
                  >
                    <XCircle size={11} />
                    {t('collection.filter.clear')}
                  </button>
                )}
              </div>
            </div>
            {/* Multi-select platform chips */}
            <div>
              <label className="text-xs font-semibold text-taupe dark:text-parchment/60 mb-2 block tracking-wide uppercase">{t('collection.filter.platform')}</label>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map(platform => {
                  const isActive = filterPlatforms.has(platform);
                  const platformInfo = PLATFORMS.find(p => p.key === platform);
                  const color = platformInfo?.color || '#6b7280';
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatformFilter(platform)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${isActive ? 'text-white' : 'bg-paper dark:bg-charcoal/50 border border-parchment/30 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-taupe/40 dark:hover:border-charcoal/50'}`}
                      style={isActive ? { backgroundColor: color } : undefined}
                    >
                      {isActive && <XCircle size={11} />}
                      {platformNames[platform] || platform}
                    </button>
                  );
                })}
                {filterPlatforms.size > 0 && (
                  <button
                    onClick={() => setFilterPlatforms(new Set())}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40 transition-all cursor-pointer"
                  >
                    <XCircle size={11} />
                    {t('collection.filter.clear')}
                  </button>
                )}
              </div>
            </div>
            {/* Page type filter */}
            <div>
              <label className="text-xs font-semibold text-taupe dark:text-parchment/60 mb-2 block tracking-wide uppercase">{t('collection.filter.pageType')}</label>
              <div className="flex flex-wrap gap-2">
                {PAGE_TYPES.map(type => {
                  const isActive = filterPageType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setFilterPageType(isActive ? '' : type.value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${isActive ? 'bg-charcoal/80 dark:bg-parchment/80 text-white dark:text-charcoal' : 'bg-paper dark:bg-charcoal/50 border border-parchment/30 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-taupe/40 dark:hover:border-charcoal/50'}`}
                    >
                      {isActive && <XCircle size={11} />}
                      <PageTypeIcon type={type.value} size={13} />
                      {t(type.labelKey)}
                    </button>
                  );
                })}
                {filterPageType && (
                  <button
                    onClick={() => setFilterPageType('')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40 transition-all cursor-pointer"
                  >
                    <XCircle size={11} />
                    {t('collection.filter.clear')}
                  </button>
                )}
              </div>
            </div>
            {/* Multi-select tag chips */}
            <div>
              <label className="text-xs font-semibold text-taupe dark:text-parchment/60 mb-2 block tracking-wide uppercase">{t('collection.filter.tag')}</label>
              <div className="flex flex-wrap gap-2">
                {tagsData?.map((tag: TagItem) => {
                  const isActive = filterTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const newSet = new Set(filterTagIds);
                        if (newSet.has(tag.id)) newSet.delete(tag.id); else newSet.add(tag.id);
                        setFilterTagIds(newSet);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${isActive ? 'bg-chest-500 text-white' : 'bg-paper dark:bg-charcoal/50 border border-parchment/30 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-taupe/40 dark:hover:border-charcoal/50'}`}
                    >
                      {isActive && <XCircle size={11} />}
                      #{tag.name}
                    </button>
                  );
                })}
                {filterTagIds.size > 0 && (
                  <button
                    onClick={() => setFilterTagIds(new Set())}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40 transition-all cursor-pointer"
                  >
                    <XCircle size={11} />
                    {t('collection.filter.clear')}
                  </button>
                )}
              </div>
            </div>
            {/* Multi-select group chips */}
            <div>
              <label className="text-xs font-semibold text-taupe dark:text-parchment/60 mb-2 block tracking-wide uppercase">{t('collection.filter.group')}</label>
              <div className="flex flex-wrap gap-2">
                {listsData?.map((list: ListItem) => {
                  const isActive = filterListIds.has(list.id);
                  return (
                    <button
                      key={list.id}
                      onClick={() => {
                        const newSet = new Set(filterListIds);
                        if (newSet.has(list.id)) newSet.delete(list.id); else newSet.add(list.id);
                        setFilterListIds(newSet);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${isActive ? 'bg-chest-500 text-white' : 'bg-paper dark:bg-charcoal/50 border border-parchment/30 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-taupe/40 dark:hover:border-charcoal/50'}`}
                    >
                      {isActive && <XCircle size={11} />}
                      {getListPathDisplayName(list, t)}
                    </button>
                  );
                })}
                {filterListIds.size > 0 && (
                  <button
                    onClick={() => setFilterListIds(new Set())}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-parchment/20 dark:bg-charcoal/30 text-taupe dark:text-parchment/60 hover:bg-parchment/30 dark:hover:bg-charcoal/40 transition-all cursor-pointer"
                  >
                    <XCircle size={11} />
                    {t('collection.filter.clear')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
          viewMode === 'grid' ? <CollectionSkeletonGrid count={8} /> : <CollectionSkeletonGrid count={8} />
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
          <div
            style={{
              position: 'relative',
              height: virtualizer.getTotalSize(),
            }}
          >
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
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: itemLeft,
                      width: itemWidth,
                      height: ITEM_HEIGHT,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                {editMode && (
                  <div className="absolute top-3 left-3 z-10">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(item.id) ? 'bg-chest-500 border-chest-500' : 'border-parchment/40 dark:border-charcoal/50 bg-paper/90 dark:bg-charcoal/90'}`}>
                      {selectedIds.has(item.id) && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                )}
                <div className="flex gap-4">
                  {/* Cover with hover zoom */}
                  {enabledFields.has('cover') && (
                    <div className="w-28 h-20 rounded-xl flex-shrink-0 overflow-hidden relative group shadow-sm">
                      <LazyImage
                        src={item.coverImage}
                        alt={item.title}
                        platform={item.platform}
                        collectionId={item.id}
                        containerClassName="w-full h-full"
                        className="transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Platform badge on cover */}
                      {enabledFields.has('platform') && (
                        <div
                          className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-white text-[10px] font-semibold z-10 backdrop-blur-sm"
                          style={{ backgroundColor: platformColor + 'cc' }}
                        >
                          {platformNames[item.platform] || item.platform}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content - 优化信息层级 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {/* 主标题 */}
                    {enabledFields.has('title') && (
                      <h3 className="font-semibold text-sm text-charcoal dark:text-parchment line-clamp-1 leading-snug group-hover:text-chest-600 dark:group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h3>
                    )}

                    {/* 页面类型 */}
                    {enabledFields.has('pageType') && item.pageType && item.pageType !== 'other' && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <PageTypeIcon type={item.pageType} size={10} />
                        <span className="text-[10px] text-taupe/50 dark:text-parchment/40">
                          {t(`pageType.${item.pageType}`)}
                        </span>
                      </div>
                    )}

                    {/* 第二行：笔记或URL */}
                    {enabledFields.has('note') && item.note ? (
                      <p className="text-xs text-taupe/50 dark:text-parchment/40 line-clamp-1 mt-0.5">
                        {item.note}
                      </p>
                    ) : (
                      <p className="text-xs text-taupe/40 dark:text-parchment/30 line-clamp-1 mt-0.5 truncate">
                        {item.url}
                      </p>
                    )}

                    {/* 第三行：评分 + 标签 + 分组 */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {enabledFields.has('rating') && item.rating != null && item.rating > 0 && (
                        <StarRating value={item.rating} size={12} readonly ariaLabel={t('collection.filter.rating')} />
                      )}
                      <div className="flex flex-wrap items-center gap-1">
                        {enabledFields.has('tags') && item.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="px-1.5 py-0.5 bg-parchment/30 dark:bg-charcoal/40 text-taupe/70 dark:text-parchment/50 text-[10px] rounded-md"
                          >
                            #{tag.name}
                          </span>
                        ))}
                        {enabledFields.has('lists') && item.lists.slice(0, 1).map((list) => (
                          <span
                            key={list.id}
                            className="px-1.5 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300/80 text-[10px] rounded-md flex items-center gap-0.5"
                          >
                            <FolderOpen size={8} />
                            {getListDisplayName(list, t)}
                          </span>
                        ))}
                        {enabledFields.has('createdAt') && item.createdAt && (
                          <span className="text-[10px] text-taupe/40 dark:text-parchment/30">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {item.tags.length + item.lists.length > 3 && (
                          <span className="text-[10px] text-taupe/40 dark:text-parchment/30">
                            +{item.tags.length + item.lists.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 悬停操作按钮 - 非编辑模式下显示 */}
                  {!editMode && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 self-center">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-taupe/40 hover:text-chest-500 dark:hover:text-amber-400 hover:bg-chest-50 dark:hover:bg-chest-800/50 rounded-lg transition-colors"
                        onClick={e => e.stopPropagation()}
                        title="打开链接"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <Link
                        href={`/edit/${item.id}`}
                        className="p-2 text-taupe/40 hover:text-chest-500 dark:hover:text-amber-400 hover:bg-chest-50 dark:hover:bg-chest-800/50 rounded-lg transition-colors"
                        onClick={e => e.stopPropagation()}
                        title="编辑"
                      >
                        <Edit2 size={14} />
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                        className="p-2 text-taupe/40 hover:text-rust hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions - only show in edit mode */}
                {editMode && (
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-parchment/10 dark:border-charcoal/30">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMoveModal({ type: 'list', item }); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-charcoal dark:text-parchment hover:bg-parchment/10 dark:hover:bg-charcoal/30 rounded-lg transition-colors"
                    >
                      <Move size={14} />
                      {t('collection.moveToGroup')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMoveModal({ type: 'tag', item }); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-charcoal dark:text-parchment hover:bg-parchment/10 dark:hover:bg-charcoal/30 rounded-lg transition-colors"
                    >
                      <TagIcon size={14} />
                      {t('collection.addTag')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-rust hover:bg-rust/5 dark:hover:bg-rust/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                      {t('collection.delete')}
                    </button>
                  </div>
                )}
              </div>
              );
              });
            })}
          </div>
          ) : (
          /* Card masonry view - Pinterest style */
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
                  {/* Edit mode checkbox */}
                  {editMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIds.has(item.id) ? 'bg-chest-500 border-chest-500' : 'border-white/80 bg-black/30 backdrop-blur-sm'}`}>
                        {selectedIds.has(item.id) && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  )}
                  {/* Cover Image - 3:4 竖版比例 */}
                  {enabledFields.has('cover') && (
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <LazyImage
                        src={item.coverImage}
                        alt={item.title}
                        platform={item.platform}
                        collectionId={item.id}
                        containerClassName="w-full h-full"
                        className="group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                      {/* Platform badge */}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {enabledFields.has('pageType') && item.pageType && item.pageType !== 'other' && (
                          <span className="p-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                            <PageTypeIcon type={item.pageType} size={10} />
                          </span>
                        )}
                        {enabledFields.has('platform') && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-full shadow-sm backdrop-blur-sm ${getContrastTextColor(platformColor)}`}
                            style={{ backgroundColor: platformColor + 'dd' }}
                          >
                            {platformNames[item.platform] || item.platform}
                          </span>
                        )}
                      </div>
                      {/* Hover overlay with quick actions */}
                      {!editMode && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3 gap-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full bg-white/90 text-charcoal hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                            onClick={e => e.stopPropagation()}
                            title="打开链接"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <Link
                            href={`/edit/${item.id}`}
                            className="p-2 rounded-full bg-white/90 text-charcoal hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                            onClick={e => e.stopPropagation()}
                            title="编辑"
                          >
                            <Edit2 size={14} />
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                            className="p-2 rounded-full bg-white/90 text-rust hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Card Info - 小红书风格 */}
                  <div className="p-2.5">
                    {enabledFields.has('title') && (
                      <h3 className="font-medium text-charcoal dark:text-parchment text-sm line-clamp-2 leading-snug group-hover:text-chest-600 dark:group-hover:text-amber-300 transition-colors">{item.title}</h3>
                    )}
                    {enabledFields.has('note') && item.note && (
                      <p className="text-[10px] text-taupe/50 dark:text-parchment/40 mt-0.5 line-clamp-1">{item.note}</p>
                    )}
                    {enabledFields.has('rating') && item.rating != null && item.rating > 0 && (
                      <div className="mt-1">
                        <StarRating value={item.rating} size={11} readonly ariaLabel={t('collection.filter.rating')} />
                      </div>
                    )}
                    {/* 标签和分组整合为一行 */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {enabledFields.has('tags') && item.tags.slice(0, 2).map(tag => (
                        <span key={tag.id} className="text-[9px] px-1.5 py-0.5 bg-parchment/30 dark:bg-charcoal/40 text-taupe/60 dark:text-parchment/50 rounded-md">#{tag.name}</span>
                      ))}
                      {enabledFields.has('lists') && item.lists.slice(0, 1).map(list => (
                        <span key={list.id} className="text-[9px] px-1.5 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300/80 rounded-md truncate max-w-[60px]">
                          {getListDisplayName(list, t)}
                        </span>
                      ))}
                      {enabledFields.has('createdAt') && item.createdAt && (
                        <span className="text-[9px] text-taupe/40 dark:text-parchment/30">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      )}
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
        {/* 自动加载更多触发器 */}
        <div ref={loadMoreRef} className="text-center py-6">
          {hasMore ? (
            <>
              <p className="text-sm text-taupe/60 dark:text-parchment/40 mb-2">
                {t('collection.showCount', { shown: allCollections.length, total: totalCount })}
              </p>
              {isFetchingNextPage && (
                <div className="flex items-center justify-center gap-2 text-sm text-taupe/60 dark:text-parchment/40">
                  <Loader2 size={16} className="animate-spin" />
                  {t('common.loading') || '加载中...'}
                </div>
              )}
            </>
          ) : collections.length > 0 && (
            <p className="text-xs text-taupe/40 dark:text-parchment/30">
              {t('collection.allLoaded', { count: collections.length })}
            </p>
          )}
        </div>
      </div>

      {/* Undo Toast */}
      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={handleUndo}
          onClose={() => setToast(null)}
        />
      )}



      {/* Collection Detail Modal */}
      {detailItem && (
        <CollectionDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Move/Tag Modal */}
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
                    <button
                      key={list.id}
                      onClick={async () => {
                        try {
                          if (isCurrent) return;
                          await api.put(`/collections/${moveModal.item.id}`, { listIds: [list.id] });
                          queryClient.invalidateQueries({ queryKey: ['collections'] });
                          setMoveModal(null);
                        } catch { showAlert(t('common.operationFailed'), 'error'); }
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-between ${isCurrent ? 'border-chest-500 dark:border-amber-400 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300' : 'border-parchment/30 dark:border-charcoal/40 hover:border-taupe/40 dark:hover:border-charcoal/50'}`}
                      style={{ marginLeft: indentWidth }}
                    >
                      <span className="flex items-center gap-2 text-charcoal dark:text-parchment">
                        <FolderOpen size={16} />{getListPathDisplayName(list, t)}
                        {list.isDefault && <span className="px-1 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300 text-xs rounded">{t('collection.default')}</span>}
                      </span>
                      {isCurrent && <Check size={16} />}
                    </button>
                  );
                })
              ) : (
                <>
                  {tagsData?.map((tag: TagItem) => {
                    const isCurrent = moveModal.item.tags.some(t => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={async () => {
                          try {
                            const currentTagIds = moveModal.item.tags.map(t => t.id);
                            const newTagIds = isCurrent
                              ? currentTagIds.filter(id => id !== tag.id)
                              : [...currentTagIds, tag.id];
                            await api.put(`/collections/${moveModal.item.id}`, { tagIds: newTagIds });
                            queryClient.invalidateQueries({ queryKey: ['collections'] });
                            setMoveModal(null);
                          } catch { showAlert(t('common.operationFailed'), 'error'); }
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-between ${isCurrent ? 'border-chest-500 dark:border-amber-400 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300' : 'border-parchment/30 dark:border-charcoal/40 hover:border-taupe/40 dark:hover:border-charcoal-50'}`}
                      >
                        <span className="flex items-center gap-2 text-charcoal dark:text-parchment">
                          <TagIcon size={16} />#{tag.name}
                        </span>
                        {isCurrent && <Check size={16} />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 批量操作模态框 - 移到分组/加标签 */}
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
                    <button
                      key={list.id}
                      onClick={async () => {
                        try {
                          await api.post('/collections/batch-move-lists', { collectionIds: Array.from(selectedIds), listId: list.id });
                          queryClient.invalidateQueries({ queryKey: ['collections'] });
                          setSelectedIds(new Set());
                          setEditMode(false);
                          setBatchModal(null);
                        } catch { showAlert(t('common.operationFailed'), 'error'); }
                      }}
                      className="w-full text-left px-4 py-2.5 rounded-lg border border-parchment/30 dark:border-charcoal/40 hover:border-taupe/40 dark:hover:border-charcoal/50 transition-colors flex items-center gap-2 text-charcoal dark:text-parchment"
                      style={{ marginLeft: indentWidth }}
                    >
                      <FolderOpen size={16} />
                      <span className="flex-1">{getListPathDisplayName(list, t)}</span>
                      {list.isDefault && <span className="px-1 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300 text-xs rounded">{t('collection.default')}</span>}
                    </button>
                  );
                })
              ) : (
                tagsData?.map((tag: TagItem) => (
                  <button
                    key={tag.id}
                    onClick={async () => {
                      try {
                        await api.post('/collections/batch-add-tags', { collectionIds: Array.from(selectedIds), tagIds: [tag.id] });
                        queryClient.invalidateQueries({ queryKey: ['collections'] });
                        setSelectedIds(new Set());
                        setEditMode(false);
                        setBatchModal(null);
                      } catch { showAlert(t('common.operationFailed'), 'error'); }
                    }}
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
