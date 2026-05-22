'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

export function useCollectionFilters() {
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterPlatforms, setFilterPlatforms] = useState<Set<string>>(new Set());
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [filterListIds, setFilterListIds] = useState<Set<string>>(new Set());

  // URL参数筛选：从分组页/标签页点击跳转
  const [urlFilterLabel, setUrlFilterLabel] = useState('');
  const [urlFilterType, setUrlFilterType] = useState<'list' | 'tag' | null>(null);
  const [urlFilterId, setUrlFilterId] = useState('');

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
  }, [searchParams, t]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const togglePlatformFilter = (platform: string) => {
    const newSet = new Set(filterPlatforms);
    if (newSet.has(platform)) newSet.delete(platform);
    else newSet.add(platform);
    setFilterPlatforms(newSet);
  };

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

  const hasActiveFilters = filterPlatforms.size > 0 || filterTagIds.size > 0 || filterListIds.size > 0;
  const activeFilterCount = filterPlatforms.size + filterTagIds.size + filterListIds.size;

  return {
    searchQuery, setSearchQuery, debouncedSearch,
    filterPlatforms, setFilterPlatforms, togglePlatformFilter,
    filterTagIds, setFilterTagIds,
    filterListIds, setFilterListIds,
    urlFilterLabel, urlFilterType, urlFilterId,
    clearUrlFilter,
    hasActiveFilters, activeFilterCount,
  };
}
