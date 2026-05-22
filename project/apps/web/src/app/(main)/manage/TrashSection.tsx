'use client';

import { useState, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCcw, AlertTriangle, CheckSquare, Square, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import LazyImage from '@/components/LazyImage';
import { getPlatformInfo } from '@/lib/platforms';

interface TrashItem {
  id: string;
  url: string;
  title: string;
  coverImage: string | null;
  platform: string;
  deletedAt: string;
  tags: { id: string; name: string }[];
  lists: { id: string; name: string }[];
}

interface TrashPageData {
  data: TrashItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function TrashSection() {
  const { t } = useI18n();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['trash'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(`/collections/trash?page=${pageParam}&limit=40`);
      return res.data as TrashPageData;
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 30 * 1000,
    initialPageParam: 1,
  });

  const items = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

  const restoreMutation = useMutation({
    mutationFn: async (ids: string[]) => api.post('/collections/trash/restore', { ids }),
    onSuccess: (_data, ids) => {
      showToast(t('collection.trash.restoreSuccess', { count: ids.length }), 'success');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    },
    onError: () => showToast(t('collection.trash.restoreSuccess', { count: 0 }), 'error'),
  });

  const purgeMutation = useMutation({
    mutationFn: async (ids: string[]) => api.delete('/collections/trash/purge', { data: { ids } }),
    onSuccess: (_data, ids) => {
      showToast(t('collection.trash.purgeSuccess', { count: ids.length }), 'success');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    },
    onError: () => showToast(t('collection.trash.purgeSuccess', { count: 0 }), 'error'),
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }, [selectedIds.size, items]);

  const handlePurge = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('collection.trash.purgeConfirm', { count: selectedIds.size }))) return;
    purgeMutation.mutate(Array.from(selectedIds));
  }, [selectedIds, purgeMutation, t]);

  const handleRestore = useCallback(() => {
    if (selectedIds.size === 0) return;
    restoreMutation.mutate(Array.from(selectedIds));
  }, [selectedIds, restoreMutation]);

  const isMutating = restoreMutation.isPending || purgeMutation.isPending;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header - 参考设置页 card 样式 */}
      <div className="card mb-4">
        <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 size={18} className="text-chest-400" />
            <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('collection.trash.title')}</h3>
          </div>
          {items.length > 0 && selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestore}
                disabled={isMutating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} />
                {t('collection.trash.restoreSelected')}
                <span className="ml-1 text-xs opacity-70">({selectedIds.size})</span>
              </button>
              <button
                onClick={handlePurge}
                disabled={isMutating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
              >
                <AlertTriangle size={14} />
                {t('collection.trash.purgeSelected')}
                <span className="ml-1 text-xs opacity-70">({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-4 text-center">
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{total}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('collection.trash.items')}</p>
          </div>
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{selectedIds.size}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('collection.selected')}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-chest-900/80 backdrop-blur-md border-b border-chest-100 dark:border-chest-700/50 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {total > 0 && (
              <span className="text-sm text-chest-400 dark:text-parchment/50">
                {t('collection.trash.items')}: {total}
              </span>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={handleRestore}
                    disabled={isMutating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    恢复
                    <span className="ml-1 text-xs opacity-70">({selectedIds.size})</span>
                  </button>
                  <button
                    onClick={handlePurge}
                    disabled={isMutating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                  >
                    <AlertTriangle size={14} />
                    彻底删除
                    <span className="ml-1 text-xs opacity-70">({selectedIds.size})</span>
                  </button>
                </>
              )}
              <button
                onClick={toggleSelectAll}
                disabled={isMutating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-chest-500 hover:bg-chest-50 dark:text-parchment/60 dark:hover:bg-chest-800 transition-colors"
              >
                {selectedIds.size === items.length ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
                {selectedIds.size === items.length ? '取消全选' : '全选'}
              </button>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <p className="text-xs text-chest-400 dark:text-parchment/40 mt-1">
            {t('collection.trash.autoDeleteHint')}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-chest-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-chest-300 dark:text-parchment/30">
            <Trash2 size={48} strokeWidth={1.2} className="mb-4" />
            <p className="text-lg font-medium">{t('collection.trash.empty')}</p>
            <p className="text-sm mt-1">{t('collection.trash.emptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {items.map((item) => {
                const platform = getPlatformInfo(item.platform);
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative flex items-center gap-4 p-3 rounded-xl border bg-white dark:bg-chest-800/50 overflow-hidden transition-all duration-200 cursor-pointer',
                      isSelected
                        ? 'border-amber-400 ring-1 ring-amber-400/20 shadow-sm'
                        : 'border-chest-100 dark:border-chest-700/50 hover:shadow-sm hover:border-chest-200 dark:hover:border-chest-600'
                    )}
                    onClick={() => toggleSelect(item.id)}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      <div
                        className={cn(
                          'w-5 h-5 rounded flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-amber-400 text-white'
                            : 'bg-chest-100 dark:bg-chest-700 text-chest-300 dark:text-parchment/30 group-hover:bg-chest-200 dark:group-hover:bg-chest-600'
                        )}
                      >
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </div>
                    </div>

                    {/* Cover */}
                    <div className="w-16 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-chest-50 dark:bg-chest-700/30">
                      <LazyImage
                        src={item.coverImage}
                        alt={item.title}
                        platform={item.platform}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-chest-800 dark:text-parchment/90 line-clamp-1 leading-snug">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {platform && (
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: platform.color }}
                          />
                        )}
                        <span className="text-xs text-chest-400 dark:text-parchment/40 truncate">
                          {platform?.name || item.platform}
                        </span>
                        <span className="text-xs text-chest-300 dark:text-parchment/30">
                          · {new Date(item.deletedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreMutation.mutate([item.id]);
                        }}
                        disabled={isMutating}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        恢复
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t('collection.trash.purgeConfirm', { count: 1 }))) {
                            purgeMutation.mutate([item.id]);
                          }
                        }}
                        disabled={isMutating}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-6 py-2.5 text-sm font-medium rounded-xl border border-chest-200 dark:border-chest-600 text-chest-600 dark:text-parchment/70 hover:bg-chest-50 dark:hover:bg-chest-800 transition-colors disabled:opacity-50"
                >
                  {isFetchingNextPage ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : null}
                  {t('collection.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
