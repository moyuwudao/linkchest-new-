'use client';

import Link from 'next/link';
import { X, Globe, ExternalLink, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { useI18n, getListDisplayName } from '@/lib/i18n';
import { platformNames, getContrastTextColor, PLATFORMS } from '@/lib/platforms';
import { PageTypeIcon, getPageTypeConfig } from '@/lib/pageTypes';
import LazyImage from './LazyImage';
import StarRating from './StarRating';

interface CollectionItem {
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

interface CollectionDetailModalProps {
  item: CollectionItem;
  onClose: () => void;
  onDelete: (item: CollectionItem) => void;
}

export default function CollectionDetailModal({ item, onClose, onDelete }: CollectionDetailModalProps) {
  const { t } = useI18n();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Cover */}
        <div className="w-full h-48 bg-parchment/30 dark:bg-charcoal/40 overflow-hidden">
          <LazyImage
            src={item.coverImage}
            alt={item.title}
            platform={item.platform}
            collectionId={item.id}
            containerClassName="w-full h-full"
            eager
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 mr-3">
              <h3 className="text-lg font-display font-semibold text-charcoal dark:text-parchment line-clamp-2">{item.title}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-charcoal/40 rounded flex-shrink-0">
              <X size={20} className="text-taupe dark:text-parchment/60" />
            </button>
          </div>

          {/* Platform badge & Page Type */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2.5 py-1 text-xs rounded font-medium ${getContrastTextColor(PLATFORMS.find(p => p.key === item.platform)?.color || '#999999')}`}
              style={{ backgroundColor: PLATFORMS.find(p => p.key === item.platform)?.color || '#6b7280' }}>
              {platformNames[item.platform] || item.platform}
            </span>
            {item.pageType && (
              <span className="px-2.5 py-1 text-xs rounded font-medium bg-parchment/30 dark:bg-charcoal/40 text-taupe dark:text-parchment/60 flex items-center gap-1">
                <PageTypeIcon type={item.pageType} size={12} />
                {t(getPageTypeConfig(item.pageType).labelKey)}
              </span>
            )}
          </div>

          {/* URL */}
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-start gap-2 text-sm text-chest-500 dark:text-amber-400 hover:text-chest-600 dark:hover:text-amber-300 mb-4">
            <Globe size={14} className="flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2 break-all">{item.url}</span>
          </a>

          {/* Note */}
          {item.note && (
            <div className="mb-4 p-3 bg-parchment/20 dark:bg-charcoal/30 rounded-lg">
              <p className="text-xs font-medium text-taupe/60 dark:text-parchment/40 mb-1">{t('collection.detail.note')}</p>
              <p className="text-sm text-charcoal/80 dark:text-parchment/70 whitespace-pre-wrap">{item.note}</p>
            </div>
          )}

          {/* Rating - priority above tags */}
          {item.rating != null && item.rating > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-taupe/60 dark:text-parchment/40 mb-1.5">{t('collection.filter.rating')}</p>
              <StarRating value={item.rating} size={20} readonly showValue ariaLabel={t('collection.filter.rating')} />
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-taupe dark:text-parchment/60 mb-1.5">{t('collection.detail.tags')}</p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(tag => (
                  <span key={tag.id} className="px-2.5 py-1 bg-parchment/20 dark:bg-charcoal/30 text-charcoal/70 dark:text-parchment/70 text-xs rounded-full">
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lists */}
          {item.lists.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-taupe dark:text-parchment/60 mb-1.5">{t('collection.detail.groups')}</p>
              <div className="flex flex-wrap gap-1.5">
                {item.lists.map(list => (
                  <span key={list.id} className="px-2.5 py-1 bg-chest-500/5 dark:bg-amber-400/10 text-chest-600 dark:text-amber-300 text-xs rounded-full flex items-center gap-1">
                    <FolderOpen size={10} />
                    {getListDisplayName(list, t)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Added Time */}
          {item.createdAt && (
            <div className="mb-6">
              <p className="text-xs font-medium text-taupe dark:text-parchment/60 mb-1">{t('collection.addedTime')}</p>
              <p className="text-sm text-charcoal/70 dark:text-parchment/70">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-parchment/20 dark:border-charcoal/40">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-chest-500 text-white rounded-lg hover:bg-chest-600 text-center text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={14} />
              {t('collection.detail.openLink')}
            </a>
            <Link
              href={`/edit/${item.id}`}
              className="flex-1 py-2.5 border border-parchment/30 dark:border-charcoal/40 text-charcoal dark:text-parchment/80 rounded-lg hover:bg-parchment/10 dark:hover:bg-charcoal/30 text-center text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <Edit2 size={14} />
              {t('collection.detail.edit')}
            </Link>
            <button
              onClick={() => onDelete(item)}
              className="flex-1 py-2.5 border border-rust/20 dark:border-rust/30 text-rust rounded-lg hover:bg-rust/5 dark:hover:bg-rust/10 text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <Trash2 size={14} />
              {t('collection.detail.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
