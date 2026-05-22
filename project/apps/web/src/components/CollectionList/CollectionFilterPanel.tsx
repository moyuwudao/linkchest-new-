'use client';

import { XCircle } from 'lucide-react';
import { useI18n, getListPathDisplayName } from '@/lib/i18n';
import { PLATFORMS, platformNames } from '@/lib/platforms';
import { PAGE_TYPES, PageTypeIcon } from '@/lib/pageTypes';

interface TagItem { id: string; name: string; }
interface ListItem { id: string; name: string; isDefault?: boolean; depth?: number; }

interface CollectionFilterPanelProps {
  filterPlatforms: Set<string>;
  setFilterPlatforms: (s: Set<string>) => void;
  filterTagIds: Set<string>;
  setFilterTagIds: (s: Set<string>) => void;
  filterListIds: Set<string>;
  setFilterListIds: (s: Set<string>) => void;
  filterHasRating: boolean | null;
  setFilterHasRating: (v: boolean | null) => void;
  filterPageType: string;
  setFilterPageType: (v: string) => void;
  availablePlatforms: string[];
  tagsData?: TagItem[];
  listsData?: ListItem[];
}

export default function CollectionFilterPanel({
  filterPlatforms, setFilterPlatforms,
  filterTagIds, setFilterTagIds,
  filterListIds, setFilterListIds,
  filterHasRating, setFilterHasRating,
  filterPageType, setFilterPageType,
  availablePlatforms, tagsData, listsData,
}: CollectionFilterPanelProps) {
  const { t } = useI18n();

  const togglePlatformFilter = (platform: string) => {
    const newSet = new Set(filterPlatforms);
    if (newSet.has(platform)) newSet.delete(platform); else newSet.add(platform);
    setFilterPlatforms(newSet);
  };

  return (
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
  );
}
