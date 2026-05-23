'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, FolderOpen, GripVertical, ExternalLink, Globe, ChevronRight, ChevronDown, FolderPlus, Filter } from 'lucide-react';
import { api, type ApiError } from '@/lib/api';
import StarRating from '@/components/StarRating';
import { useI18n, getListDisplayName, getListPathDisplayName } from '@/lib/i18n';
import { generateDefaultCover } from '@/lib/platforms';
import { PlatformBadge } from '@/components/PlatformBadge';
import { EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import LazyImage from '@/components/LazyImage';

const DEFAULT_LIST_KEYS = ['__DEFAULT_LIST__', '我的收藏'];

interface ListItem {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  depth?: number;
  isDefault?: boolean;
  sortOrder?: number;
  path?: { id: string; name: string; isDefault?: boolean }[];
  pathName?: string | null;
  children?: ListItem[];
}

interface FlatListItem extends ListItem {
  depth: number;
  hasChildren: boolean;
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

function buildTreeDisplay(items: ListItem[], expandedIds: Set<string>, parentId: string | null = null, depth: number = 0): FlatListItem[] {
  const result: FlatListItem[] = [];
  const children = items.filter(item => item.parentId === parentId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  for (const child of children) {
    const hasChildren = items.some(item => item.parentId === child.id);
    result.push({ ...child, depth, hasChildren });
    if (hasChildren && expandedIds.has(child.id)) {
      result.push(...buildTreeDisplay(items, expandedIds, child.id, depth + 1));
    }
  }
  return result;
}

function ListDetailModal({ listId, listName, lists, onClose }: { listId: string; listName: string; lists: ListItem[]; onClose: () => void }) {
  const { t } = useI18n();
  const [onlyCurrent, setOnlyCurrent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['collections', 'list', listId, onlyCurrent],
    queryFn: async () => {
      if (onlyCurrent) {
        const res = await api.get(`/collections?limit=2000&directListId=${listId}`);
        return { collections: (res.data.data || []) as Collection[], total: res.data.pagination?.total || 0, onlyCurrent: true };
      }
      const res = await api.get(`/collections?limit=2000&listId=${listId}`);
      return { collections: (res.data.data || []) as Collection[], total: res.data.pagination?.total || 0, onlyCurrent: false };
    },
  });

  const collections = data?.collections || [];
  const totalCount = data?.total || collections.length;

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-paper dark:bg-chest-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-chest-100 dark:border-chest-700/50">
          <div className="flex items-center gap-2">
            <FolderOpen size={20} className="text-chest-500 dark:text-amber-400" />
            <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{listName}</h3>
            <span className="text-sm text-taupe/70">{t('group.collectionCount', { count: totalCount })}</span>
            {data?.onlyCurrent && (
              <span className="px-1.5 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400 text-xs rounded">
                {t('group.onlyCurrentGroup')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOnlyCurrent(prev => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                onlyCurrent ? 'text-chest-500 dark:text-amber-400 bg-chest-500/5 dark:bg-amber-400/10' : 'text-taupe hover:bg-parchment/20 dark:hover:bg-chest-700/50'
              }`}
              title={onlyCurrent ? t('group.includeSubGroups') : t('group.onlyCurrentGroup')}>
              <Filter size={14} />
              {onlyCurrent ? t('group.includeSubGroups') : t('group.onlyCurrentGroup')}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/50 rounded">
              <X size={20} className="text-taupe dark:text-parchment/60" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-taupe/70">{t('common.loading')}</div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8 text-taupe/70">{t('collection.noCollections')}</div>
          ) : (
            <div className="space-y-2">
              {collections.map(item => {
                const directList = item.lists.find(l => l.id === listId);
                const otherLists = item.lists.filter(l => l.id !== listId);
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-parchment/10 dark:bg-chest-700/30 rounded-lg hover:bg-parchment/20 dark:hover:bg-chest-700/50 transition-colors">
                    <LazyImage src={item.coverImage || generateDefaultCover(item.platform, item.title)} alt="" platform={item.platform} collectionId={item.id}
                      containerClassName="w-16 h-12 bg-chest-100 dark:bg-chest-700 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-charcoal dark:text-parchment text-sm line-clamp-2">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <PlatformBadge platform={item.platform} size="sm" />
                        {item.rating != null && (
                          <StarRating value={item.rating} size={12} readonly ariaLabel={t('collection.filter.rating')} />
                        )}
                        {directList && (
                          <span className="px-1.5 py-0.5 text-xs bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400 rounded flex items-center gap-0.5">
                            <FolderOpen size={10} />
                            {directList.name === '__DEFAULT_LIST__' || directList.name === '我的收藏' ? t('group.defaultName') : directList.name}
                          </span>
                        )}
                        {otherLists.map(list => (
                          <span key={list.id} className="px-1.5 py-0.5 text-xs bg-parchment/20 dark:bg-chest-700/40 text-taupe dark:text-parchment/60 rounded">
                            {list.name === '__DEFAULT_LIST__' || list.name === '我的收藏' ? t('group.defaultName') : list.name}
                          </span>
                        ))}
                        {item.tags.slice(0, 3).map(tag => (
                          <span key={tag.id} className="text-xs text-taupe/70">#{tag.name}</span>
                        ))}
                        {item.tags.length > 3 && <span className="text-xs text-taupe/70">+{item.tags.length - 3}</span>}
                      </div>
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="p-1.5 text-taupe/60 hover:text-chest-500 dark:hover:text-amber-400 rounded flex-shrink-0">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-chest-100 dark:border-chest-700/50 flex justify-end">
          <Link href={`/?listId=${listId}&listName=${encodeURIComponent(listName)}`}
            className="px-4 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 text-sm font-medium flex items-center gap-1.5">
            <Globe size={14} /> {t('group.viewInCollections')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ListsSection() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<FlatListItem | null>(null);
  const [listName, setListName] = useState('');
  const [listDesc, setListDesc] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [detailList, setDetailList] = useState<{ id: string; name: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createSubModal, setCreateSubModal] = useState(false);
  const [selectedParentForCreate, setSelectedParentForCreate] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [reorderTimer, setReorderTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data: lists, isLoading } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      return (response.data.data || []) as (ListItem & { depth: number; pathName: string | null })[];
    },
  });

  const { data: collectionsMeta } = useQuery({
    queryKey: ['collections', 'meta'],
    queryFn: async () => {
      const res = await api.get('/collections?limit=1');
      return res.data.pagination?.total || 0;
    },
  });

  const treeData = lists ? buildTreeDisplay(lists as ListItem[], expandedIds) : [];

  const parentMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!lists) return map;
    for (const item of lists as ListItem[]) {
      const pid = item.parentId ?? '__ROOT__';
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(item.id);
    }
    return map;
  }, [lists]);

  function isDescendant(draggedId: string, targetId: string): boolean {
    const children = parentMap.get(draggedId) ?? [];
    for (const childId of children) {
      if (childId === targetId) return true;
      if (isDescendant(childId, targetId)) return true;
    }
    return false;
  }

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number; parentId: string | null }[]) => api.post('/lists/reorder', { items }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lists'] }); setDraggingId(null); setDropTargetId(null); },
    onError: (error: ApiError) => { showAlert(error.response?.data?.message || error.response?.data?.error || t('common.operationFailed'), 'error'); setDraggingId(null); setDropTargetId(null); },
  });

  const debouncedReorder = (items: { id: string; sortOrder: number; parentId: string | null }[]) => {
    if (reorderTimer) clearTimeout(reorderTimer);
    if (reorderMutation.isPending) {
      const timer = setTimeout(() => reorderMutation.mutate(items), 100);
      setReorderTimer(timer);
    } else {
      reorderMutation.mutate(items);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: FlatListItem) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    setDraggingId(item.id);
  };

  const handleDragOver = (e: React.DragEvent, item: FlatListItem) => {
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggingId && item.id !== draggingId && lists) {
      if (!isDescendant(draggingId, item.id)) {
        setDropTargetId(item.id);
        const rect = e.currentTarget.getBoundingClientRect();
        setDropPosition(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
      } else { setDropTargetId(null); setDropPosition(null); }
    }
  };

  const handleDrop = (e: React.DragEvent, targetItem: FlatListItem) => {
    e.preventDefault(); e.stopPropagation();
    if (!draggingId || !lists || draggingId === targetItem.id) { setDraggingId(null); setDropTargetId(null); setDropPosition(null); return; }
    if (isDescendant(draggingId, targetItem.id)) { showToast(t('group.cannotMoveToDescendant'), 'error'); setDraggingId(null); setDropTargetId(null); setDropPosition(null); return; }
    const draggedItem = (lists as ListItem[]).find(l => l.id === draggingId);
    if (!draggedItem || draggedItem.isDefault) { setDraggingId(null); setDropTargetId(null); setDropPosition(null); return; }

    const targetParentId = targetItem.parentId;
    const allSiblings = (lists as ListItem[]).filter(l => l.parentId === targetParentId && l.id !== draggingId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const newOrder: { id: string; sortOrder: number; parentId: string | null }[] = [];
    let insertedDragged = false;
    for (const sibling of allSiblings) {
      if (sibling.id === targetItem.id && !insertedDragged) {
        if (dropPosition === 'after') {
          newOrder.push({ id: sibling.id, sortOrder: newOrder.length, parentId: sibling.parentId });
          newOrder.push({ id: draggingId, sortOrder: newOrder.length, parentId: targetParentId });
        } else {
          newOrder.push({ id: draggingId, sortOrder: newOrder.length, parentId: targetParentId });
          newOrder.push({ id: sibling.id, sortOrder: newOrder.length, parentId: sibling.parentId });
        }
        insertedDragged = true;
      } else if (sibling.id !== targetItem.id) {
        newOrder.push({ id: sibling.id, sortOrder: newOrder.length, parentId: sibling.parentId });
      }
    }
    if (!insertedDragged) newOrder.push({ id: draggingId, sortOrder: newOrder.length, parentId: targetParentId });
    debouncedReorder(newOrder);
    setDropPosition(null);
  };

  const handleDragEnd = () => { setDraggingId(null); setDropTargetId(null); setDropPosition(null); };
  const handleDragLeave = () => { setDropTargetId(null); setDropPosition(null); };

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; parentId?: string | null }) => api.post('/lists', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] }); closeModal(); setCreateSubModal(false);
      const data = (res.data?.data || res.data) as { renamed?: boolean; originalName?: string; name?: string } | undefined;
      if (data?.renamed) showToast(t('group.nameExistsAuto', { originalName: data.originalName || '', newName: data.name || '' }), 'info');
    },
    onError: (error: ApiError) => showAlert(error.response?.data?.message || error.response?.data?.error || t('common.operationFailed'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string; parentId?: string | null } }) => api.put(`/lists/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lists'] }); closeModal(); },
    onError: (error: ApiError) => showAlert(error.response?.data?.message || error.response?.data?.error || t('common.operationFailed'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      const movedChildren = res.data?.movedChildren || 0;
      if (movedChildren > 0) showToast(t('group.deleteSuccessWithChildren', { count: movedChildren }), 'success');
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const openCreateModal = () => { setEditingList(null); setListName(''); setListDesc(''); setParentId(null); setIsModalOpen(true); };
  const openEditModal = (item: FlatListItem) => {
    setEditingList(item);
    const isDefaultList = ['__DEFAULT_LIST__', '我的收藏'].includes(item.name);
    setListName(isDefaultList ? t('group.defaultName') : item.name);
    setListDesc(item.description && !['__DEFAULT_LIST_DESC__', '__DEFAULT_LIST__'].includes(item.description) ? item.description : '');
    setParentId(item.parentId);
    setIsModalOpen(true);
  };
  const openCreateSubModal = (pid: string) => { setSelectedParentForCreate(pid); setEditingList(null); setListName(''); setListDesc(''); setCreateSubModal(true); };
  const closeModal = () => { setIsModalOpen(false); setCreateSubModal(false); setEditingList(null); setListName(''); setListDesc(''); setParentId(null); };

  const handleSave = () => {
    if (!listName.trim()) return;
    const data = { name: listName.trim(), description: listDesc.trim() || undefined, parentId: editingList ? editingList.parentId : parentId };
    if (editingList) updateMutation.mutate({ id: editingList.id, data }); else createMutation.mutate(data);
  };

  const handleSaveSub = () => {
    if (!listName.trim()) return;
    createMutation.mutate({ name: listName.trim(), description: listDesc.trim() || undefined, parentId: selectedParentForCreate });
  };

  const totalCollections = collectionsMeta || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header - 参考设置页 card 样式 */}
      <div className="card mb-4">
        <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen size={18} className="text-chest-400" />
            <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('group.management')}</h3>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 cursor-pointer text-sm px-3 py-1.5">
            <Plus size={16} /> {t('group.newGroup')}
          </button>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-4 text-center">
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{lists?.length || 0}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.groups')}</p>
          </div>
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{totalCollections}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('settings.collections')}</p>
          </div>
        </div>
      </div>

      {/* Tree List */}
      <div className="flex-1 overflow-y-auto px-1">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-chest-800">
                <div className="skeleton w-6 h-6 rounded" /><div className="skeleton w-5 h-5 rounded" />
                <div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/3 rounded" /><div className="skeleton h-3 w-1/4 rounded" /></div>
              </div>
            ))}
          </div>
        ) : !lists || lists.length === 0 ? (
          <EmptyState icon={<FolderOpen size={40} />} title={t('group.noGroups')} description={t('group.noGroupsHint')}
            action={<button onClick={openCreateModal} className="btn-primary btn"><Plus size={16} /> {t('group.newGroup')}</button>} />
        ) : (
          <div className="space-y-4">
            {treeData.map((item) => (
              <div key={item.id} draggable={!item.isDefault} onDragStart={(e) => handleDragStart(e, item)} onDragOver={(e) => handleDragOver(e, item)}
                onDrop={(e) => handleDrop(e, item)} onDragEnd={handleDragEnd} onDragLeave={handleDragLeave}
                className={`flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-chest-800/50 hover:bg-parchment/30 dark:hover:bg-chest-700/40 transition-colors group ${
                  draggingId === item.id ? 'opacity-40' : ''
                } ${dropTargetId === item.id && dropPosition === 'before' ? 'border-t-2 border-chest-500 dark:border-amber-400 mt-[-1px]' : ''}${
                  dropTargetId === item.id && dropPosition === 'after' ? 'border-b-2 border-chest-500 dark:border-amber-400 mb-[-1px]' : ''
                }${dropTargetId === item.id && !dropPosition ? 'ring-2 ring-amber-400/60 dark:ring-amber-400/50 bg-chest-500/5 dark:bg-amber-400/10' : ''}`}
                style={{ marginLeft: item.depth * 24 }}>
                {item.hasChildren ? (
                  <button onClick={() => toggleExpand(item.id)} className="p-1 hover:bg-parchment/40 dark:hover:bg-chest-700/60 rounded">
                    {expandedIds.has(item.id) ? <ChevronDown size={16} className="text-taupe/60 dark:text-parchment/40" /> : <ChevronRight size={16} className="text-taupe/60 dark:text-parchment/40" />}
                  </button>
                ) : <div className="w-6" />}
                {!item.isDefault ? (
                  <div className="cursor-grab active:cursor-grabbing text-taupe/30 dark:text-parchment/20 hover:text-taupe/50 dark:hover:text-parchment/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={16} />
                  </div>
                ) : <div className="w-4" />}
                <FolderOpen size={18} className="text-chest-500 dark:text-amber-400 flex-shrink-0" />
                <button onClick={() => setDetailList({ id: item.id, name: getListPathDisplayName(item, t) })} className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-charcoal dark:text-parchment">{getListDisplayName(item, t)}</span>
                    {item.isDefault && <span className="px-1.5 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400 text-xs rounded">{t('collection.default')}</span>}
                  </div>
                  {item.path && item.path.length > 0 && (
                    <p className="text-xs text-taupe/60 dark:text-parchment/40 mt-0.5">
                      {item.path.map(p => p.isDefault || DEFAULT_LIST_KEYS.includes(p.name) ? t('group.defaultName') : p.name).join(' / ')}
                    </p>
                  )}
                  {item.description && !['__DEFAULT_LIST_DESC__', '__DEFAULT_LIST__'].includes(item.description) && (
                    <p className="text-sm text-taupe dark:text-parchment/60 mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                  <p className="text-xs text-taupe/60 dark:text-parchment/40 mt-1">
                    {t('group.collectionCount', { count: item.totalCollectionCount || item.collectionCount })}
                    {item.totalCollectionCount && item.totalCollectionCount !== item.collectionCount && <span className="ml-1 text-taupe/40 dark:text-parchment/20">({item.collectionCount} 直接)</span>}
                  </p>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!item.isDefault && (
                    <>
                      {(!item.depth || item.depth < 2) && (
                        <button onClick={() => openCreateSubModal(item.id)} className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-chest-500 dark:hover:text-amber-400 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded-lg transition-colors" title={t('group.newSubGroup')}>
                          <FolderPlus size={16} />
                        </button>
                      )}
                      <button onClick={() => openEditModal(item)} className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-chest-500 dark:hover:text-amber-400 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => { if (confirm(t('group.deleteConfirm', { name: getListDisplayName(item, t) }))) deleteMutation.mutate(item.id); }}
                        className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-rust hover:bg-rust/5 dark:hover:bg-rust/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailList && <ListDetailModal listId={detailList.id} listName={detailList.name} lists={lists as ListItem[]} onClose={() => setDetailList(null)} />}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-charcoal dark:text-parchment">{editingList ? t('group.editGroup') : t('group.newGroup')}</h3>
              <button onClick={closeModal} className="p-2 text-taupe/60 hover:text-charcoal dark:hover:text-parchment hover:bg-parchment/20 dark:hover:bg-chest-700/50 rounded-lg transition-colors cursor-pointer"><X size={18} /></button>
            </div>
            {parentId && lists && (
              <div className="flex items-center gap-2 bg-parchment/10 dark:bg-chest-700/30 p-2 rounded-lg mb-3 text-sm">
                <FolderOpen size={14} className="text-chest-500 dark:text-amber-400" />
                <span className="text-taupe dark:text-parchment/60">{t('group.subGroupOf')} {lists.find((l: ListItem) => l.id === parentId)?.name || ''}</span>
              </div>
            )}
            <input type="text" placeholder={t('group.groupName')} value={listName} onChange={(e) => setListName(e.target.value)} maxLength={30} autoFocus className="input mb-3" />
            <textarea placeholder={t('group.description')} value={listDesc} onChange={(e) => setListDesc(e.target.value)} maxLength={200} rows={3} className="input resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2 border border-chest-200 dark:border-chest-600/40 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/40 text-charcoal/80 dark:text-parchment/80">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={!listName.trim() || createMutation.isPending} className="flex-1 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-chest-200 dark:disabled:bg-chest-700">{t('group.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sub Group Modal */}
      {createSubModal && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
          <div className="bg-paper dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCreateSubModal(false)} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/50 rounded"><ChevronRight size={20} className="text-taupe dark:text-parchment/60" /></button>
                <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{t('group.newSubGroup')}</h3>
              </div>
              <button onClick={() => setCreateSubModal(false)} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/50 rounded"><X size={20} className="text-taupe dark:text-parchment/60" /></button>
            </div>
            <input type="text" placeholder={t('group.groupName')} value={listName} onChange={(e) => setListName(e.target.value)} maxLength={30} autoFocus className="input mb-3" />
            <textarea placeholder={t('group.description')} value={listDesc} onChange={(e) => setListDesc(e.target.value)} maxLength={200} rows={3} className="input resize-none mb-4" />
            <button onClick={handleSaveSub} disabled={!listName.trim() || createMutation.isPending} className="w-full py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-chest-200 dark:disabled:bg-chest-700">{t('group.save')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
