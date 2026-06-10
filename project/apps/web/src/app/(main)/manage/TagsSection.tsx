'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, GripVertical, ExternalLink, Tag as TagIcon, Globe } from 'lucide-react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import StarRating from '@/components/StarRating';
import { useI18n } from '@/lib/i18n';
import { generateDefaultCover } from '@/lib/platforms';
import { PlatformBadge } from '@/components/PlatformBadge';
import { EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import LazyImage from '@/components/LazyImage';

interface Tag {
  id: string;
  name: string;
  collectionCount: number;
  sortOrder?: number;
}

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
  url: string;
  rating?: number | null;
  tags: { id: string; name: string }[];
  lists: { id: string; name: string }[];
}

function TagDetailModal({ tagId, tagName, onClose }: { tagId: string; tagName: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ['collections', 'tag', tagId],
    queryFn: async () => {
      const res = await api.get(`/collections?limit=2000&tagId=${tagId}`);
      return { collections: (res.data.data || []) as Collection[], total: res.data.pagination?.total || 0 };
    },
  });
  const collections = data?.collections || [];
  const totalCount = data?.total || collections.length;

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-paper dark:bg-chest-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-chest-100 dark:border-chest-700/50">
          <div className="flex items-center gap-2">
            <TagIcon size={20} className="text-chest-500 dark:text-amber-400" />
            <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">#{tagName}</h3>
            <span className="text-sm text-taupe/70">{t('tag.collectionCount', { count: totalCount })}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/50 rounded">
            <X size={20} className="text-taupe dark:text-parchment/60" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-taupe/70">{t('common.loading')}</div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8 text-taupe/70">{t('collection.noCollections')}</div>
          ) : (
            <div className="space-y-2">
              {collections.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-parchment/10 dark:bg-chest-700/30 rounded-lg hover:bg-parchment/20 dark:hover:bg-chest-700/50 transition-colors">
                  <LazyImage src={item.coverImage || generateDefaultCover(item.platform, item.title)} alt="" platform={item.platform} collectionId={item.id}
                    containerClassName="w-16 h-12 bg-chest-100 dark:bg-chest-700 rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-charcoal dark:text-parchment text-sm line-clamp-2">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <PlatformBadge platform={item.platform} size="sm" />
                      {item.rating != null && <StarRating value={item.rating} size={12} readonly ariaLabel={t('collection.filter.rating')} />}
                      {item.lists.slice(0, 2).map(list => (
                        <span key={list.id} className="px-1.5 py-0.5 text-xs bg-parchment/20 dark:bg-chest-700/40 text-taupe dark:text-parchment/60 rounded">
                          {list.name === '__DEFAULT_LIST__' || list.name === '我的收藏' ? t('group.defaultName') : list.name}
                        </span>
                      ))}
                      {item.tags.slice(0, 3).map(tag => <span key={tag.id} className="text-xs text-taupe/70">#{tag.name}</span>)}
                      {item.tags.length > 3 && <span className="text-xs text-taupe/70">+{item.tags.length - 3}</span>}
                    </div>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="p-1.5 text-taupe/60 hover:text-chest-500 dark:hover:text-amber-400 rounded flex-shrink-0">
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-chest-100 dark:border-chest-700/50 flex justify-end">
          <Link href={`/?tagId=${tagId}&tagName=${encodeURIComponent(tagName)}`}
            className="px-4 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 text-sm font-medium flex items-center gap-1.5">
            <Globe size={14} /> {t('tag.viewInCollections')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TagsSection() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [detailTag, setDetailTag] = useState<Tag | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      const raw = response.data.data || response.data;
      return (Array.isArray(raw) ? raw : []) as Tag[];
    },
  });

  const { data: collectionsMeta } = useQuery({
    queryKey: ['collections', 'meta'],
    queryFn: async () => {
      const res = await api.get('/collections?limit=1');
      return res.data.pagination?.total || 0;
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/tags', { name }),
    onSuccess: (res: { data?: { data?: { renamed?: boolean; originalName?: string; name?: string } } }) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      closeModal();
      const data = (res.data?.data || res.data) as { renamed?: boolean; originalName?: string; name?: string } | undefined;
      if (data?.renamed) showToast(t('tag.tagNameExistsAuto', { originalName: data.originalName || '', newName: data.name || '' }), 'info');
    },
    onError: (error: ApiError) => showAlert(error.response?.data?.message || error.response?.data?.error || t('common.operationFailed'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.put(`/tags/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tags'] }); closeModal(); },
    onError: (error: ApiError) => showAlert(error.response?.data?.message || error.response?.data?.error || t('common.operationFailed'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => api.post('/tags/reorder', { items }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });

  const openCreateModal = () => { setEditingTag(null); setTagName(''); setIsModalOpen(true); };
  const openEditModal = (tag: Tag) => { setEditingTag(tag); setTagName(tag.name); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingTag(null); setTagName(''); };

  const handleSave = () => {
    if (!tagName.trim()) return;
    if (editingTag) updateMutation.mutate({ id: editingTag.id, name: tagName.trim() });
    else {
      const exists = tags?.some((t: Tag) => t.name === tagName.trim());
      if (exists && !confirm(t('tag.tagExists', { name: tagName.trim() }))) return;
      createMutation.mutate(tagName.trim());
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverIndex(index);
    const rect = e.currentTarget.getBoundingClientRect();
    setDropPosition(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
  };
  const handleDragLeave = () => { setDragOverIndex(null); setDropPosition(null); };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault(); e.stopPropagation();
    if (dragIndex === null || !tags) { setDragIndex(null); setDragOverIndex(null); setDropPosition(null); return; }
    const actualDropIndex = dropPosition === 'after' ? Math.max(dragIndex, dropIndex) : dropPosition === 'before' ? Math.min(dragIndex, dropIndex) : dropIndex;
    if (dragIndex === actualDropIndex) { setDragIndex(null); setDragOverIndex(null); setDropPosition(null); return; }
    const newTags = [...tags];
    const [movedTag] = newTags.splice(dragIndex, 1);
    newTags.splice(actualDropIndex, 0, movedTag);
    reorderMutation.mutate(newTags.map((tag, index) => ({ id: tag.id, sortOrder: index })));
    setDragIndex(null); setDragOverIndex(null); setDropPosition(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); setDropPosition(null); };

  const totalTagCollections = collectionsMeta || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header - 参考设置页 card 样式 */}
      <div className="card mb-4">
        <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TagIcon size={18} className="text-chest-400" />
            <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('tag.management')}</h3>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5">
            <Plus size={16} /> {t('tag.newTag')}
          </button>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-4 text-center">
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{tags?.length || 0}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.tags')}</p>
          </div>
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{totalTagCollections}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.collections')}</p>
          </div>
        </div>
      </div>

      {/* Tag List */}
      <div className="flex-1 overflow-y-auto px-1">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="skeleton w-4 h-4 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-24 rounded-full" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
                <div className="flex gap-1">
                  <div className="skeleton w-8 h-8 rounded-lg" />
                  <div className="skeleton w-8 h-8 rounded-lg" />
                  <div className="skeleton w-8 h-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : !tags || tags.length === 0 ? (
          <EmptyState icon={<TagIcon size={40} />} title={t('tag.noTags')} description={t('tag.noTagsHint')}
            action={<button onClick={openCreateModal} className="btn-primary btn"><Plus size={16} /> {t('tag.newTag')}</button>} />
        ) : (
          <div className="space-y-4">
            {tags.map((tag, index) => (
              <div key={tag.id}
                className={`card p-4 flex items-center justify-between transition-all group ${
                  dragOverIndex === index && dropPosition === 'before' ? 'border-t-2 border-chest-500 dark:border-amber-400 mt-[-1px]' : ''
                } ${dragOverIndex === index && dropPosition === 'after' ? 'border-b-2 border-chest-500 dark:border-amber-400 mb-[-1px]' : ''}${
                  dragOverIndex === index && !dropPosition ? 'border-chest-500 dark:border-amber-400 border-2' : ''
                }${dragIndex === index ? ' opacity-50' : ''}`}
                onDragOver={(e) => handleDragOver(e, index)} onDragLeave={handleDragLeave}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(e, index); }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div draggable onDragStart={(e) => { e.stopPropagation(); handleDragStart(index); }} onDragEnd={handleDragEnd} onClick={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing text-taupe/40 dark:text-parchment/20 hover:text-taupe flex items-center justify-center w-8 h-8 rounded hover:bg-parchment/10 dark:hover:bg-charcoal/50 transition-colors">
                    <GripVertical size={16} />
                  </div>
                  <button onClick={() => setDetailTag(tag)} className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity">
                    <h3 className="font-medium text-charcoal dark:text-parchment">#{tag.name}</h3>
                    <p className="text-sm text-taupe dark:text-parchment/60 mt-1">{t('tag.collectionCount', { count: tag.collectionCount })}</p>
                  </button>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setDetailTag(tag)} className="p-2 text-taupe/60 hover:text-chest-500 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded-lg transition-colors" title={t('group.viewInCollections')}>
                    <ExternalLink size={16} />
                  </button>
                  <button onClick={() => openEditModal(tag)} className="p-2 text-taupe/60 hover:text-chest-500 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => { if (confirm(t('tag.deleteConfirm'))) deleteMutation.mutate(tag.id); }}
                    className="p-2 text-taupe/60 hover:text-rust hover:bg-rust/5 dark:hover:bg-rust/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Tag Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
          <div className="bg-paper dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{editingTag ? t('tag.editTag') : t('tag.newTag')}</h3>
              <button onClick={closeModal} className="p-1 hover:bg-parchment/10 dark:hover:bg-charcoal/50 rounded"><X size={20} className="text-taupe" /></button>
            </div>
            <input type="text" placeholder={t('tag.tagName')} value={tagName} onChange={(e) => setTagName(e.target.value)} maxLength={20} autoFocus className="input mb-4" />
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2 border border-parchment/40 dark:border-charcoal/40 rounded-lg hover:bg-parchment/5 dark:hover:bg-charcoal/50 text-charcoal dark:text-parchment">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={!tagName.trim() || createMutation.isPending} className="flex-1 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-taupe/20">{t('tag.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Detail Modal */}
      {detailTag && <TagDetailModal tagId={detailTag.id} tagName={detailTag.name} onClose={() => setDetailTag(null)} />}
    </div>
  );
}
