'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Upload,
  Smartphone, ExternalLink, Globe, ChevronDown, Check,
  Search, Layers, ChevronRight, Loader2,
  Trash2, RotateCcw, AlertTriangle, CheckSquare, Square, Copy,
} from 'lucide-react';
import { api, type ApiError } from '@/lib/api';
import { getUser, setUser as saveUser } from '@/lib/auth';

import { platformNames, PLATFORMS, getContrastTextColor, getPlatformInfo } from '@/lib/platforms';
import { UsernameModal, PasswordModal, EmailModal } from '@/components/modals/AccountModals';
import { useI18n } from '@/lib/i18n';
import { EmptyState } from '@/components/ui';
import LazyImage from '@/components/LazyImage';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import ImportExportSection from './ImportExportSection';
import AutoBackupSection from './AutoBackupSection';
import CollectionViewConfig from './CollectionViewConfig';

interface PlatformStat {
  platform: string;
  name?: string;
  count: number;
  color?: string;
}

interface Overview {
  collectionCount: number;
  listCount: number;
  shareCount: number;
  tagCount: number;
  shareViewCount: number;
}

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

function TrashSection({ inline }: { inline?: boolean }) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['trash', page],
    queryFn: async () => {
      const res = await api.get(`/collections/trash?page=${page}&limit=20`);
      return res.data as TrashPageData;
    },
    staleTime: 30 * 1000,
  });

  const items = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const isMutating = restoreMutation.isPending || purgeMutation.isPending;

  return inline ? (
    <div>
      {items.length > 0 && (
        <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {total > 0 && (
              <span className="text-xs text-chest-400 dark:text-parchment/50">{total} {t('collection.trash.items')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => restoreMutation.mutate(Array.from(selectedIds))}
                  disabled={isMutating}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  {t('collection.trash.restoreSelected')}
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('collection.trash.purgeConfirm', { count: selectedIds.size }))) {
                      purgeMutation.mutate(Array.from(selectedIds));
                    }
                  }}
                  disabled={isMutating}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors disabled:opacity-50"
                >
                  <AlertTriangle size={12} />
                  {t('collection.trash.purgeSelected')}
                </button>
              </>
            )}
            <button
              onClick={toggleSelectAll}
              disabled={isMutating}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded text-chest-500 hover:bg-chest-50 dark:text-parchment/60 dark:hover:bg-chest-800 transition-colors"
            >
              {selectedIds.size === items.length ? <CheckSquare size={14} /> : <Square size={14} />}
              {selectedIds.size === items.length ? t('collection.trash.deselectAll') : t('collection.trash.selectAll')}
            </button>
          </div>
        </div>
      )}
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-chest-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-chest-300 dark:text-parchment/30">
            <Trash2 size={36} strokeWidth={1.2} className="mb-3" />
            <p className="text-sm font-medium">{t('collection.trash.empty')}</p>
            <p className="text-xs mt-1">{t('collection.trash.emptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => {
                const platform = getPlatformInfo(item.platform);
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`group relative flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-chest-800/50 overflow-hidden transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/30'
                        : 'border-chest-100 dark:border-chest-700/50 hover:shadow-card-hover hover:border-chest-200 dark:hover:border-chest-600'
                    }`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-amber-400 text-white'
                          : 'bg-chest-100 dark:bg-chest-700 text-chest-300 dark:text-parchment/30 group-hover:bg-chest-200 dark:group-hover:bg-chest-600'
                      }`}>
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </div>
                    </div>
                    <div className="w-20 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-chest-50 dark:bg-chest-700/30">
                      <LazyImage
                        src={item.coverImage}
                        alt={item.title}
                        title={item.title}
                        platform={item.platform}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-chest-800 dark:text-parchment/90 line-clamp-2 leading-snug">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {platform && (
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: platform.color }} />
                        )}
                        <span className="text-xs text-chest-400 dark:text-parchment/40 truncate">{platform?.name || item.platform}</span>
                        <span className="text-xs text-chest-300 dark:text-parchment/30">
                          · {t('collection.trash.deletedAt', { date: new Date(item.deletedAt).toLocaleDateString() })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); restoreMutation.mutate([item.id]); }}
                        disabled={isMutating}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        {t('collection.trash.restore')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t('collection.trash.purgeConfirm', { count: 1 }))) {
                            purgeMutation.mutate([item.id]);
                          }
                        }}
                        disabled={isMutating}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs rounded border border-chest-200 dark:border-chest-600 text-chest-500 dark:text-parchment/70 disabled:opacity-40 hover:bg-chest-50 dark:hover:bg-chest-800 transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-chest-400 dark:text-parchment/50">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs rounded border border-chest-200 dark:border-chest-600 text-chest-500 dark:text-parchment/70 disabled:opacity-40 hover:bg-chest-50 dark:hover:bg-chest-800 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  ) : (
    <div className="card">
      <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 size={18} className="text-chest-400" />
          <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('collection.trash.title')}</h3>
          {total > 0 && (
            <span className="text-xs text-chest-400 dark:text-parchment/50">{total}</span>
          )}
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => restoreMutation.mutate(Array.from(selectedIds))}
                  disabled={isMutating}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  {t('collection.trash.restoreSelected')}
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('collection.trash.purgeConfirm', { count: selectedIds.size }))) {
                      purgeMutation.mutate(Array.from(selectedIds));
                    }
                  }}
                  disabled={isMutating}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors disabled:opacity-50"
                >
                  <AlertTriangle size={12} />
                  {t('collection.trash.purgeSelected')}
                </button>
              </>
            )}
            <button
              onClick={toggleSelectAll}
              disabled={isMutating}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded text-chest-500 hover:bg-chest-50 dark:text-parchment/60 dark:hover:bg-chest-800 transition-colors"
            >
              {selectedIds.size === items.length ? <CheckSquare size={14} /> : <Square size={14} />}
              {selectedIds.size === items.length ? t('collection.trash.deselectAll') : t('collection.trash.selectAll')}
            </button>
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-chest-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-chest-300 dark:text-parchment/30">
            <Trash2 size={36} strokeWidth={1.2} className="mb-3" />
            <p className="text-sm font-medium">{t('collection.trash.empty')}</p>
            <p className="text-xs mt-1">{t('collection.trash.emptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => {
                const platform = getPlatformInfo(item.platform);
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`group relative flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-chest-800/50 overflow-hidden transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/30'
                        : 'border-chest-100 dark:border-chest-700/50 hover:shadow-card-hover hover:border-chest-200 dark:hover:border-chest-600'
                    }`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-amber-400 text-white'
                          : 'bg-chest-100 dark:bg-chest-700 text-chest-300 dark:text-parchment/30 group-hover:bg-chest-200 dark:group-hover:bg-chest-600'
                      }`}>
                        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </div>
                    </div>
                    <div className="w-20 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-chest-50 dark:bg-chest-700/30">
                      <LazyImage
                        src={item.coverImage}
                        alt={item.title}
                        title={item.title}
                        platform={item.platform}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-chest-800 dark:text-parchment/90 line-clamp-2 leading-snug">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {platform && (
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: platform.color }} />
                        )}
                        <span className="text-xs text-chest-400 dark:text-parchment/40 truncate">{platform?.name || item.platform}</span>
                        <span className="text-xs text-chest-300 dark:text-parchment/30">
                          · {t('collection.trash.deletedAt', { date: new Date(item.deletedAt).toLocaleDateString() })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); restoreMutation.mutate([item.id]); }}
                        disabled={isMutating}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        {t('collection.trash.restore')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t('collection.trash.purgeConfirm', { count: 1 }))) {
                            purgeMutation.mutate([item.id]);
                          }
                        }}
                        disabled={isMutating}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs rounded border border-chest-200 dark:border-chest-600 text-chest-500 dark:text-parchment/70 disabled:opacity-40 hover:bg-chest-50 dark:hover:bg-chest-800 transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-chest-400 dark:text-parchment/50">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs rounded border border-chest-200 dark:border-chest-600 text-chest-500 dark:text-parchment/70 disabled:opacity-40 hover:bg-chest-50 dark:hover:bg-chest-800 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==================== Main Settings Page ====================

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { t, locale, setLocale } = useI18n();
  const { showToast, showAlert } = useToast();
  const [user, setLocalUser] = useState<Record<string, unknown> | null>(null);
  const [modal, setModal] = useState<string | null>(null);

  // 使用构建时环境变量判断市场（china/global）
  // NEXT_PUBLIC_MARKET 在 .env.china 或 .env.production 中设置
  const isChinaEnv = process.env.NEXT_PUBLIC_MARKET === 'china';

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Duplicate Detection
  const [duplicateResults, setDuplicateResults] = useState<Array<{
    type: 'url' | 'title';
    items: Array<{ id: string; title: string; url: string; platform: string; coverImage: string | null; createdAt: string }>;
    similarity: number;
  }> | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [keepIds, setKeepIds] = useState<Record<number, string>>({});

  // Section collapse
  const [platformStatsExpanded, setPlatformStatsExpanded] = useState(true);
  const [duplicateExpanded, setDuplicateExpanded] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'data' | 'system' | 'other'>('data');

  const userTier = (user?.userTier as string) || 'medium';
  const canUseDuplicate = userTier === 'heavy' || userTier === 'super';
  const canUseUltimate = userTier === 'super';
  const canUseBackup = userTier === 'heavy' || userTier === 'super';

  // Scan duplicates mutation
  const scanMutation = useMutation({
    mutationFn: () => api.post('/collections/scan-duplicates'),
    onSuccess: (res) => {
      const groups = (res.data.data || res.data) as Array<{
        type: 'url' | 'title';
        items: Array<{ id: string; title: string; url: string; platform: string; coverImage: string | null; createdAt: string }>;
        similarity: number;
      }>;
      setDuplicateResults(groups);
      if (groups.length === 0) {
        showToast(t('settings.noDuplicates'), 'success');
      }
    },
    onError: (error: ApiError) => {
      const data = error.response?.data;
      const message = (data?.message || data?.error || t('common.error')) as string;
      showAlert(message, 'error');
    },
  });

  // Merge duplicates mutation
  const mergeMutation = useMutation({
    mutationFn: ({ keepId, removeIds }: { keepId: string; removeIds: string[] }) =>
      api.post('/collections/merge-duplicates', { keepId, removeIds }),
    onSuccess: () => {
      showToast(t('settings.mergeSuccess'), 'success');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['stats-overview'] });
      // Refresh duplicate results by re-scanning
      scanMutation.mutate();
    },
    onError: (error: ApiError) => {
      const data = error.response?.data;
      const message = (data?.message || data?.error || t('common.error')) as string;
      showAlert(message, 'error');
    },
  });

  // 点击外部关闭语言下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  useEffect(() => { setLocalUser(getUser()); }, []);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.data || res.data;
      saveUser(userData);
      setLocalUser(userData);
    } catch { /* ignore */ }
  };

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['stats-platforms'],
    queryFn: async () => { const r = await api.get('/stats/platforms'); return (r.data.data || r.data) as PlatformStat[]; },
  });

  const { data: overview } = useQuery({
    queryKey: ['stats-overview'],
    queryFn: async () => { const r = await api.get('/stats/overview'); return (r.data.data || r.data) as Overview; },
  });

  const totalCollections = overview?.collectionCount || 0;

  const tabItems: { key: 'data' | 'system' | 'other'; label: string; icon: typeof Layers }[] = [
    { key: 'data', label: t('profile.dataManagement'), icon: Layers },
    { key: 'system', label: t('profile.systemSettings'), icon: Smartphone },
    { key: 'other', label: t('profile.other'), icon: ExternalLink },
  ];

  const handleKeepNewest = (groupIdx: number) => {
    const group = duplicateResults?.[groupIdx];
    if (!group) return;
    const newest = [...group.items].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    if (!newest) return;
    const removeIds = group.items.filter(i => i.id !== newest.id).map(i => i.id);
    mergeMutation.mutate({ keepId: newest.id, removeIds });
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">

          {/* Page Header */}
          <div>
            <h2 className="text-2xl font-bold text-charcoal dark:text-parchment tracking-tight">{t('settings.title')}</h2>
            <p className="text-sm text-taupe mt-1 dark:text-parchment/60">{t('settings.description')}</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-chest-500/5 dark:bg-chest-700/20 rounded-xl">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-chest-600 text-chest-500 dark:text-amber-400 shadow-sm'
                      : 'text-taupe/70 dark:text-parchment/50 hover:text-charcoal dark:hover:text-parchment'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ===== Data Management Tab ===== */}
          {activeTab === 'data' && (
            <div className="space-y-6">

          {/* ===== Overview Stats ===== */}
          <div className="card">
            <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
              <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.stats')}</h3>
            </div>
            {overview && (
              <div className="px-5 py-4 grid grid-cols-5 gap-4 text-center">
                <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3"><p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{overview.collectionCount}</p><p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.collections')}</p></div>
                <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3"><p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{overview.listCount}</p><p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.groups')}</p></div>
                <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3"><p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{overview.shareCount}</p><p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.shares')}</p></div>
                <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3"><p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{overview.tagCount}</p><p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.tags')}</p></div>
                <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3"><p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{overview.shareViewCount}</p><p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.shareViews')}</p></div>
              </div>
            )}
          </div>

          {/* ===== Platform Stats ===== */}
          <div className="card">
            <button
              onClick={() => setPlatformStatsExpanded(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-parchment/5 dark:hover:bg-chest-700/10 transition-colors"
            >
              <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.platformStats')}</h3>
              <ChevronDown size={18} className={`text-taupe dark:text-parchment/60 transition-transform duration-200 ${platformStatsExpanded ? 'rotate-180' : ''}`} />
            </button>
            {platformStatsExpanded && (
              <div className="divide-y divide-chest-50 dark:divide-chest-800/50 border-t border-chest-100 dark:border-chest-700/50">
                {!stats || stats.length === 0 ? (
                  <EmptyState
                    icon={<BarChart3 size={36} />}
                    title={t('common.noData')}
                    description={t('settings.noStatsHint')}
                  />
                ) : stats.map((s: PlatformStat) => {
                  const pct = totalCollections > 0 ? (s.count / totalCollections) * 100 : 0;
                  return (
                    <div key={s.platform} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${getContrastTextColor(s.color || '#6b7280')}`} style={{ backgroundColor: s.color || '#6b7280' }}>{s.name || platformNames[s.platform] || s.platform}</span>
                          {PLATFORMS.find(p => p.key === s.platform)?.isEcommerce && (
                            <span className="px-1.5 py-0.5 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs rounded">{t('settings.ecommerce')}</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-charcoal/80 dark:text-parchment/80">{s.count}</span>
                      </div>
                      <div className="w-full h-2 bg-parchment/20 dark:bg-chest-700/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color || '#6366f1' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ImportExportSection />

          <AutoBackupSection userTier={userTier} />

          {/* ===== Duplicate Detection ===== */}
          <div className="card">
            <button
              onClick={() => setDuplicateExpanded(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-parchment/5 dark:hover:bg-chest-700/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Copy size={18} className="text-chest-400" />
                <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.duplicateDetect')}</h3>
              </div>
              <div className="flex items-center gap-2">
                {!canUseDuplicate && (
                  <span className="text-xs px-2 py-0.5 rounded bg-chest-500/10 text-chest-500 dark:text-amber-400">{t('settings.proRequired')}</span>
                )}
                <ChevronDown size={18} className={`text-taupe dark:text-parchment/60 transition-transform duration-200 ${duplicateExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {duplicateExpanded && (
              <div className="px-5 py-4 space-y-4 border-t border-chest-100 dark:border-chest-700/50">
              {!canUseDuplicate ? (
                <div className="text-sm text-taupe/70 dark:text-parchment/50 text-center py-2">
                  {t('settings.upgradeHint')}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-taupe/70 dark:text-parchment/50">
                      {duplicateResults
                        ? t('settings.duplicateGroupsFound', { count: duplicateResults.length })
                        : t('settings.scanDuplicates')}
                    </p>
                    <button
                      onClick={() => scanMutation.mutate()}
                      disabled={scanMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-taupe/20 text-sm transition-colors cursor-pointer"
                    >
                      {scanMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      {t('settings.scanDuplicates')}
                    </button>
                  </div>

                  {duplicateResults && duplicateResults.length > 0 && (
                    <div className="space-y-3">
                      {duplicateResults.map((group, idx) => (
                        <div key={idx} className="border border-chest-100 dark:border-chest-700/50 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedGroup(expandedGroup === idx ? null : idx)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-chest-500/5 dark:bg-chest-700/20 hover:bg-chest-500/10 dark:hover:bg-chest-700/30 transition-colors text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded ${group.type === 'url' ? 'bg-rust/10 text-rust' : 'bg-sage/10 text-sage'}`}>
                                {group.type === 'url' ? t('settings.urlDuplicates') : t('settings.titleDuplicates')}
                              </span>
                              <span className="text-sm font-medium text-charcoal dark:text-parchment">
                                {group.items.length} items
                              </span>
                              {group.type === 'title' && (
                                <span className="text-xs text-taupe dark:text-parchment/60">
                                  {t('settings.similarity')}: {Math.round(group.similarity * 100)}%
                                </span>
                              )}
                            </div>
                            <ChevronRight size={16} className={`text-taupe transition-transform ${expandedGroup === idx ? 'rotate-90' : ''}`} />
                          </button>

                          {expandedGroup === idx && (
                            <div className="px-4 py-3 space-y-2">
                              {group.type === 'url' && (
                                <div className="flex justify-end pb-1">
                                  <button
                                    onClick={() => handleKeepNewest(idx)}
                                    disabled={mergeMutation.isPending}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 transition-colors disabled:opacity-50"
                                  >
                                    {mergeMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    {t('settings.keepNewest')}
                                  </button>
                                </div>
                              )}
                              {group.items.map((item) => (
                                <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-chest-500/5 dark:hover:bg-chest-700/20 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`group-${idx}`}
                                    checked={keepIds[idx] === item.id}
                                    onChange={() => setKeepIds(prev => ({ ...prev, [idx]: item.id }))}
                                    className="accent-chest-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-charcoal dark:text-parchment truncate">{item.title}</p>
                                    <p className="text-xs text-taupe dark:text-parchment/60 truncate">{item.url}</p>
                                  </div>
                                  <span className="text-xs text-taupe/60 dark:text-parchment/40 capitalize">{item.platform}</span>
                                </label>
                              ))}

                              <div className="pt-2 flex justify-end">
                                <button
                                  onClick={() => {
                                    const keepId = keepIds[idx];
                                    if (!keepId) {
                                      showAlert('Please select one to keep', 'error');
                                      return;
                                    }
                                    const removeIds = group.items.filter(i => i.id !== keepId).map(i => i.id);
                                    mergeMutation.mutate({ keepId, removeIds });
                                  }}
                                  disabled={mergeMutation.isPending}
                                  className="flex items-center gap-2 px-4 py-2 bg-rust text-white rounded-lg hover:bg-rust/90 disabled:bg-taupe/20 text-sm transition-colors cursor-pointer"
                                >
                                  {mergeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
                                  {t('settings.merge')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            )}
          </div>

            </div>
          )}

          {/* ===== System Settings Tab ===== */}
          {activeTab === 'system' && (
            <div className="space-y-6">

          {/* ===== Language ===== */}
          <div className="card">
            <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
              <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.language')}</h3>
            </div>
            <div className="px-5 py-4">
              <div className="relative inline-block" ref={langDropdownRef}>
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-chest-200 dark:border-chest-600/40 bg-parchment/20 dark:bg-chest-700/40 text-charcoal dark:text-parchment hover:bg-parchment/30 dark:hover:bg-chest-700/60 transition-colors cursor-pointer"
                >
                  <Globe size={16} />
                  <span>
                    {locale === 'zh' ? t('settings.languageZh')
                      : locale === 'ja' ? t('settings.languageJa')
                      : locale === 'ko' ? t('settings.languageKo')
                      : locale === 'fr' ? t('settings.languageFr')
                      : locale === 'de' ? t('settings.languageDe')
                      : t('settings.languageEn')}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showLangDropdown && (
                  <div className="absolute left-0 top-full mt-1.5 w-40 bg-white dark:bg-chest-800 border border-chest-200 dark:border-chest-600/40 rounded-lg shadow-lg z-50 overflow-hidden">
                    {([
                      { key: 'zh', label: t('settings.languageZh') },
                      { key: 'en', label: t('settings.languageEn') },
                      { key: 'ja', label: t('settings.languageJa') },
                      { key: 'ko', label: t('settings.languageKo') },
                      { key: 'fr', label: t('settings.languageFr') },
                      { key: 'de', label: t('settings.languageDe') },
                    ] as { key: typeof locale; label: string }[]).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => { setLocale(key); setShowLangDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                          locale === key
                            ? 'bg-chest-500 text-white'
                            : 'text-charcoal dark:text-parchment hover:bg-chest-50 dark:hover:bg-chest-700'
                        }`}
                      >
                        <span>{label}</span>
                        {locale === key && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <CollectionViewConfig />

          {/* ===== Extension Download ===== */}
          <div className="card">
            <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
              <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.extensionDownload')}</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-taupe/70 dark:text-parchment/50">{t('settings.extensionDownloadDesc')}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://chrome.google.com/webstore/detail/linkchest-collection/abcdefghijklmnopqrstuvwxyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-chest-500 text-white rounded-lg hover:bg-chest-600 flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>{t('settings.chromeWebStore')}</span>
                  <ExternalLink size={14} className="opacity-70" />
                </a>
                <a
                  href="https://linkchest.net/download/extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-parchment/20 dark:bg-chest-700/40 text-charcoal/80 dark:text-parchment/80 border-2 border-solid border-chest-200 dark:border-chest-600/40 rounded-lg hover:bg-chest-500/5 dark:hover:bg-chest-700/60 flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload size={16} />
                  <span>{t('settings.localDownload')}</span>
                  <ExternalLink size={14} className="opacity-70" />
                </a>
              </div>
            </div>
          </div>

          {/* ===== APP Download ===== */}
          <div className="card">
            <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
              <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.appDownload')}</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-taupe/70 dark:text-parchment/50">{t('settings.appDownloadDesc')}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={isChinaEnv ? (process.env.NEXT_PUBLIC_YINGYONGBAO_URL || 'https://a.app.qq.com/o/simple.jsp?pkgid=com.linkchest.app') : 'https://play.google.com/store/apps/details?id=com.linkchest.app'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-chest-500 text-white rounded-lg hover:bg-chest-600 flex items-center justify-center gap-2 transition-colors"
                >
                  <Smartphone size={16} />
                  <span>{isChinaEnv ? t('settings.downloadYingYongBao') : 'Google Play'}</span>
                  <ExternalLink size={14} className="opacity-70" />
                </a>
                <a
                  href={isChinaEnv ? (process.env.NEXT_PUBLIC_IOS_DOWNLOAD_URL_CN || 'https://apps.apple.com/app/linkchest/id6744165709') : (process.env.NEXT_PUBLIC_IOS_DOWNLOAD_URL || 'https://apps.apple.com/app/linkchest/id6744165709')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-parchment/20 dark:bg-chest-700/40 text-charcoal/80 dark:text-parchment/80 border-2 border-solid border-chest-200 dark:border-chest-600/40 rounded-lg hover:bg-chest-500/5 dark:hover:bg-chest-700/60 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.71 19.91c-.36.36-.84.56-1.35.56-.51 0-.99-.2-1.35-.56-.36-.36-.56-.84-.56-1.35s.2-.99.56-1.35c.36-.36.84-.56 1.35-.56.51 0 .99.2 1.35.56.36.36.56.84.56 1.35s-.2.99-.56 1.35zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/></svg>
                  <span>{t('settings.downloadIOS')}</span>
                  <ExternalLink size={14} className="opacity-70" />
                </a>
                <a
                  href="https://linkchest.net/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-parchment/20 dark:bg-chest-700/40 text-charcoal/80 dark:text-parchment/80 border-2 border-solid border-chest-200 dark:border-chest-600/40 rounded-lg hover:bg-chest-500/5 dark:hover:bg-chest-700/60 flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload size={16} />
                  <span>{t('settings.downloadApk')}</span>
                  <ExternalLink size={14} className="opacity-70" />
                </a>
              </div>
            </div>
          </div>

            </div>
          )}

          {/* ===== Other Tab ===== */}
          {activeTab === 'other' && (
            <div className="space-y-6">

          {/* ===== Legal ===== */}
          <div className="card">
            <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
              <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.legal')}</h3>
            </div>
            <div className="px-5 py-4 space-y-2">
              <Link href="/terms" className="flex items-center justify-between py-2 text-sm text-charcoal dark:text-parchment hover:text-chest-500 dark:hover:text-amber-400 transition-colors">
                <span>{t('terms.title')}</span>
                <ExternalLink size={14} className="text-taupe" />
              </Link>
              <Link href="/privacy" className="flex items-center justify-between py-2 text-sm text-charcoal dark:text-parchment hover:text-chest-500 dark:hover:text-amber-400 transition-colors">
                <span>{t('privacy.title')}</span>
                <ExternalLink size={14} className="text-taupe" />
              </Link>
            </div>
          </div>

          {/* ===== Feedback ===== */}
          <div className="card">
            <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
              <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('profile.feedback')}</h3>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-parchment/5 dark:bg-chest-800/30 rounded-lg border border-chest-200 dark:border-chest-600/40">
                  <p className="text-lg font-bold text-charcoal dark:text-parchment tracking-widest text-center font-mono">support@linkchest.net</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('support@linkchest.net');
                    showToast(t('account.referralCopied'), 'success');
                  }}
                  className="p-3 border border-taupe/15 dark:border-parchment/10 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/40 text-charcoal dark:text-parchment transition-colors"
                  title={t('common.copy')}
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>
          </div>
            </div>
          )}

        </div>
      </main>


    </>
  );
}
