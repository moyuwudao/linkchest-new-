'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Copy, Trash2, Eye, EyeOff, ExternalLink, Lock, Inbox, Send, FolderOpen,
  Search, Link as LinkIcon, Share2, Download, RefreshCw, Clock, CalendarClock,
} from 'lucide-react';
import { api, recordShareView } from '@/lib/api';
import ShareViewModal from '@/components/ShareViewModal';
import { useI18n, getListDisplayName } from '@/lib/i18n';
import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';

interface Share {
  id: string;
  title: string;
  type: 'ALL' | 'LIST' | 'TAG' | 'MULTI_TAG' | 'MULTI_LIST' | 'COLLECTION' | 'CUSTOM';
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  itemCount: number;
  viewCount?: number;
  hasPassword?: boolean;
  password?: string;
}

interface ShareList {
  id: string;
  name: string;
  description: string | null;
  collectionCount: number;
  createdAt: string;
  isDefault?: boolean;
  sourceShareId?: string | null;
}

interface ImportList extends ShareList {
  sourceType?: string;
  sourceShareId?: string | null;
}

function buildTypeLabels(t: (key: string) => string) {
  return {
    ALL: t('share.typeAll'),
    LIST: t('share.typeGroup'),
    LISTS: t('share.typeGroups'),
    TAG: t('share.typeTag'),
    TAGS: t('share.typeTags'),
    MULTI_LIST: t('share.typeMultiGroup'),
    MULTI_TAG: t('share.typeMultiTag'),
    COLLECTION: t('share.typeCollection'),
    COLLECTIONS: t('share.typeCollections'),
    CUSTOM: t('share.typeCustom'),
  };
}

export default function SharesSection() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'created' | 'imported'>('created');
  const [viewingShareId, setViewingShareId] = useState<string | null>(null);
  const [viewingShareListId, setViewingShareListId] = useState<string | null>(null);
  const [viewingOpenedShareId, setViewingOpenedShareId] = useState<string | null>(null);
  const [shareInput, setShareInput] = useState('');
  const [showShareInputModal, setShowShareInputModal] = useState(false);
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  const [editExpiresIn, setEditExpiresIn] = useState<'1h' | '24h' | '1w' | 'never'>('never');

  const typeLabels = buildTypeLabels(t);

  const userTier = ((typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('linkchest_user') || '{}') : {}).userTier as string) || 'medium';
  const canEditExpiry = userTier !== 'medium';

  const handleShareNavigate = () => {
    const input = shareInput.trim();
    if (!input) return;
    let shareId: string | null = null;
    const urlMatch = input.match(/\/s\/([a-zA-Z0-9]+)/);
    if (urlMatch) shareId = urlMatch[1];
    if (!shareId && /^[a-zA-Z][a-zA-Z0-9]{5,}$/.test(input)) shareId = input;
    if (shareId) { setViewingOpenedShareId(shareId); setShareInput(''); setShowShareInputModal(false); return; }
    showToast(t('share.unrecognizedShare'), 'error');
  };

  const { data: shares, isLoading } = useQuery({
    queryKey: ['shares'],
    queryFn: async () => {
      const response = await api.get('/shares');
      return (response.data.data || response.data) as Share[];
    },
  });

  const { data: shareLists, isLoading: isLoadingShareLists } = useQuery({
    queryKey: ['share-lists'],
    queryFn: async () => {
      try {
        const response = await api.get('/lists');
        const allLists = (response.data.data || response.data) as ImportList[];
        const sharePrefixes = ['来自分享:', 'From share:'];
        const isFromShareDesc = (desc?: string | null) => desc ? sharePrefixes.some(p => desc.startsWith(p)) : false;
        return allLists.filter((l) => isFromShareDesc(l.description) || l.sourceType === 'import') as ShareList[];
      } catch { return [] as ShareList[]; }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shares/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shares'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(`/shares/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shares'] }),
  });

  const updateExpiresMutation = useMutation({
    mutationFn: ({ id, expiresIn }: { id: string; expiresIn: string }) => api.put(`/shares/${id}/expires`, { expiresIn }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shares'] }); setEditingShareId(null); showToast(t('share.expiryUpdated'), 'success'); },
    onError: (error: any) => showToast(error.response?.data?.message || error.response?.data?.error || t('share.expiryUpdateFailed'), 'error'),
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['share-lists'] }); setViewingShareListId(null); },
  });

  const syncCoversMutation = useMutation({
    mutationFn: (shareId: string) => api.post(`/import/${shareId}/sync-covers`),
    onSuccess: (response) => {
      const { synced, skipped } = response.data?.data || {};
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      showToast(t('share.syncCoversSuccess', { synced: synced || 0, skipped: skipped || 0 }), 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || error.response?.data?.error || t('share.syncCoversFailed'), 'error'),
  });

  const copyLink = async (shareId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = `${window.location.origin}/s/${shareId}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
        showToast(t('share.linkCopied'), 'success');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(t('share.linkCopied'), 'success');
      }
    } catch { showToast(t('share.copyFailed') + ': ' + link, 'error'); }
  };

  const copyPassword = async (password: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(password);
        showToast(t('share.passwordCopied'), 'success');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = password;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(t('share.passwordCopied'), 'success');
      }
    } catch { showToast(t('share.copyFailed'), 'error'); }
  };

  const tabCount = () => activeTab === 'created' ? shares?.length || 0 : shareLists?.length || 0;

  const createdCount = shares?.length || 0;
  const importedCount = shareLists?.length || 0;
  const totalViews = shares?.reduce((sum, s) => sum + (s.viewCount || 0), 0) || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header - 参考设置页 card 样式 */}
      <div className="card mb-4">
        <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 size={18} className="text-chest-400" />
            <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('share.shareLinks')}</h3>
          </div>
          {activeTab === 'created' ? (
            <Link href="/shares/create" className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5">
              <Plus size={16} /> {t('share.createShare')}
            </Link>
          ) : (
            <button onClick={() => setShowShareInputModal(true)} className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5">
              <LinkIcon size={16} /> {t('share.openShare')}
            </button>
          )}
        </div>
        <div className="px-5 py-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{createdCount}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('share.iCreated')}</p>
          </div>
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{importedCount}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('share.iReceived')}</p>
          </div>
          <div className="bg-chest-500/5 dark:bg-amber-400/10 rounded-xl py-3">
            <p className="text-2xl font-bold text-chest-500 dark:text-amber-400">{totalViews}</p>
            <p className="text-xs text-taupe/70 dark:text-parchment/40 mt-1">{t('share.totalViews') || '总访问'}</p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="px-1 pt-0 pb-2">
        <div className="flex gap-1 bg-parchment/20 dark:bg-charcoal/60 rounded-lg p-1 w-fit">
          <button onClick={() => setActiveTab('created')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'created' ? 'bg-paper dark:bg-chest-800 text-chest-500 dark:text-amber-400' : 'text-taupe hover:text-charcoal dark:hover:text-parchment'
            }`}>
            <Send size={14} /> {t('share.iCreated')}
          </button>
          <button onClick={() => setActiveTab('imported')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'imported' ? 'bg-paper dark:bg-chest-800 text-chest-500 dark:text-amber-400' : 'text-taupe hover:text-charcoal dark:hover:text-parchment'
            }`}>
            <Download size={14} /> {t('share.iReceived')}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-1">
        {activeTab === 'created' && (
          isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="skeleton h-5 w-20 rounded-full" />
                      <div className="skeleton h-5 w-48 rounded" />
                      <div className="skeleton h-4 w-24 rounded" />
                    </div>
                    <div className="flex gap-1">
                      <div className="skeleton w-8 h-8 rounded-lg" />
                      <div className="skeleton w-8 h-8 rounded-lg" />
                      <div className="skeleton w-8 h-8 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !shares || shares.length === 0 ? (
            <EmptyState icon={<Share2 size={40} />} title={t('share.noShares')} description={t('share.createFirstHint')}
              action={<Link href="/shares/create" className="btn-primary btn">{t('share.createFirst')}</Link>} />
          ) : (
            <div className="space-y-4">
              {shares.map((share) => (
                <div key={share.id} className={`card p-4 ${!share.isActive ? 'opacity-60' : ''} cursor-pointer hover:border-amber-400/20 dark:hover:border-amber-400/10 transition-colors group`}
                  onClick={() => { setViewingShareId(share.id); recordShareView(share.id).catch(() => {}); }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-chest-500/5 text-chest-500 dark:text-amber-400 text-xs rounded">{typeLabels[share.type]}</span>
                        {!share.isActive && (
                          <span className="px-2 py-0.5 bg-parchment/20 dark:bg-charcoal/50 text-taupe dark:text-parchment/60 text-xs rounded">{t('share.disabled')}</span>
                        )}
                        {share.expiresAt && (() => {
                          const isExpired = new Date(share.expiresAt) < new Date();
                          return (
                            <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${isExpired ? 'bg-rust/10 text-rust dark:text-rust' : 'bg-parchment/20 dark:bg-charcoal/50 text-taupe dark:text-parchment/60'}`}>
                              <Clock size={10} />
                              {isExpired ? t('share.expired') : t('share.expiresAt', { date: new Date(share.expiresAt).toLocaleDateString('zh-CN') })}
                            </span>
                          );
                        })()}
                      </div>
                      <h3 className="font-medium text-charcoal dark:text-parchment">{share.title}</h3>
                      <p className="text-sm text-taupe mt-1 flex items-center gap-2">
                        <span>{t('share.itemCount', { count: share.itemCount })}</span>
                        {typeof share.viewCount === 'number' && (
                          <span className="flex items-center gap-1"><Eye size={12} /> {t('share.viewCount', { count: share.viewCount })}</span>
                        )}
                      </p>
                      {share.hasPassword && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <Lock size={12} /> {t('share.password')}
                            <code className="font-mono bg-parchment/20 dark:bg-charcoal/50 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-400">
                              {share.password || '****'}
                            </code>
                            {share.password && (
                              <button onClick={(e) => copyPassword(share.password!, e)} className="ml-0.5 text-xs text-chest-500 dark:text-amber-400 hover:underline">{t('share.copy')}</button>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(share.id); }}
                        className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-chest-500 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded-lg transition-colors"
                        title={share.isActive ? t('share.disable') : t('share.enable')}>
                        {share.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button onClick={(e) => copyLink(share.id, e)} disabled={!share.isActive}
                        className={`p-2 rounded-lg transition-colors ${share.isActive ? 'text-taupe/60 dark:text-parchment/40 hover:text-chest-500 hover:bg-chest-500/5 dark:hover:bg-amber-400/10' : 'text-taupe/20 dark:text-parchment/10 cursor-not-allowed'}`}
                        title={t('share.copyLink')}>
                        <Copy size={18} />
                      </button>
                      <a href={share.isActive ? `/s/${share.id}` : undefined} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => { e.stopPropagation(); if (!share.isActive) e.preventDefault(); }}
                        className={`p-2 rounded-lg transition-colors ${share.isActive ? 'text-taupe/60 dark:text-parchment/40 hover:text-chest-500 hover:bg-chest-500/5 dark:hover:bg-amber-400/10' : 'text-taupe/20 dark:text-parchment/10 cursor-not-allowed pointer-events-none'}`}
                        title={t('share.newWindow')}>
                        <ExternalLink size={18} />
                      </a>
                      {canEditExpiry && (
                        <button onClick={(e) => { e.stopPropagation(); setEditingShareId(share.id); setEditExpiresIn('never'); }}
                          className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-chest-500 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded-lg transition-colors"
                          title={t('share.adjustExpiry')}>
                          <CalendarClock size={18} />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); if (confirm(t('share.deleteShareConfirm'))) deleteMutation.mutate(share.id); }}
                        disabled={!share.isActive}
                        className={`p-2 rounded-lg transition-colors ${share.isActive ? 'text-taupe/60 dark:text-parchment/40 hover:text-rust hover:bg-rust/5 dark:hover:bg-rust/10' : 'text-taupe/20 dark:text-parchment/10 cursor-not-allowed'}`}
                        title={t('common.delete')}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'imported' && (
          <div className="space-y-4">
            {isLoadingShareLists ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="card p-4">
                    <div className="flex items-center gap-3">
                      <div className="skeleton w-10 h-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-5 w-48 rounded" />
                        <div className="skeleton h-4 w-24 rounded" />
                      </div>
                      <div className="skeleton w-8 h-8 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !shareLists || shareLists.length === 0 ? (
              <EmptyState icon={<Inbox size={40} />} title={t('share.noReceived')} description={t('share.openShareHint')}
                action={<button onClick={() => setShowShareInputModal(true)} className="btn-primary btn"><LinkIcon size={14} /> {t('share.openShare')}</button>} />
            ) : (
              <div className="space-y-4">
                {shareLists.map((list) => {
                  const shareId = list.sourceShareId || (() => {
                    const desc = list.description;
                    if (!desc) return '';
                    for (const p of ['来自分享:', 'From share:']) { if (desc.startsWith(p)) return desc.slice(p.length).trim(); }
                    return '';
                  })() || '';
                  return (
                    <div key={list.id} className="card overflow-hidden group">
                      <div className="p-4 cursor-pointer hover:bg-parchment/5 dark:hover:bg-charcoal/60 transition-colors" onClick={() => shareId && setViewingShareListId(shareId)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-chest-500/5 dark:bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                              <FolderOpen size={20} className="text-chest-500 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-charcoal dark:text-parchment truncate">{getListDisplayName(list, t)}</h3>
                                <span className="px-1.5 py-0.5 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400 text-xs rounded flex-shrink-0">{t('share.fromShare')}</span>
                              </div>
                              <p className="text-sm text-taupe dark:text-parchment/60 mt-0.5">
                                {t('share.itemCount', { count: list.collectionCount })} · {new Date(list.createdAt).toLocaleDateString('zh-CN')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {shareId && (
                              <button onClick={(e) => { e.stopPropagation(); if (confirm(t('share.syncCoversConfirm'))) syncCoversMutation.mutate(shareId); }}
                                disabled={syncCoversMutation.isPending}
                                className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-chest-500 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded-lg transition-colors"
                                title={t('share.syncCovers')}>
                                <RefreshCw size={16} className={syncCoversMutation.isPending && syncCoversMutation.variables === shareId ? 'animate-spin' : ''} />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); if (confirm(t('share.deleteCollectionConfirm', { name: getListDisplayName(list, t) }))) deleteListMutation.mutate(list.id); }}
                              className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-rust hover:bg-rust/5 dark:hover:bg-rust/10 rounded-lg transition-colors"
                              title={t('share.deleteCollection')}>
                              <Trash2 size={16} />
                            </button>
                            {shareId && (
                              <button onClick={(e) => { e.stopPropagation(); setViewingShareListId(shareId); }}
                                className="p-2 text-taupe/60 dark:text-parchment/40 hover:text-chest-500 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded-lg transition-colors"
                                title={t('share.viewShare')}>
                                <Eye size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Open share modal */}
      {showShareInputModal && (
        <div className="modal-overlay" onClick={() => setShowShareInputModal(false)}>
          <div className="modal-content max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-charcoal dark:text-parchment mb-2">{t('share.openShare')}</h3>
              <p className="text-sm text-taupe dark:text-parchment/60 mb-4">{t('share.enterShareCode')}</p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe/60" size={16} />
                  <input type="text" value={shareInput} onChange={(e) => setShareInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleShareNavigate(); setShowShareInputModal(false); } }}
                    placeholder={t('share.pasteShareLink')} autoFocus
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-parchment/40 rounded-lg focus:outline-none focus:border-chest-500 bg-parchment/10 dark:bg-charcoal/50 dark:border-charcoal/40 dark:text-parchment dark:placeholder-parchment/40" />
                </div>
                <button onClick={() => { handleShareNavigate(); setShowShareInputModal(false); }} className="btn-primary btn-sm flex-shrink-0 cursor-pointer">
                  {t('share.openShareLink')}
                </button>
              </div>
              <button onClick={() => setShowShareInputModal(false)} className="mt-4 w-full text-center text-sm text-taupe/60 hover:text-taupe dark:hover:text-parchment/80 transition-colors cursor-pointer">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingShareId && <ShareViewModal shareId={viewingShareId} onClose={() => setViewingShareId(null)} />}
      {viewingShareListId && <ShareViewModal shareId={viewingShareListId} onClose={() => setViewingShareListId(null)} />}
      {viewingOpenedShareId && <ShareViewModal shareId={viewingOpenedShareId} showSaveButton onClose={() => setViewingOpenedShareId(null)} />}

      {/* Adjust expiry modal */}
      {editingShareId && (
        <div className="modal-overlay" onClick={() => setEditingShareId(null)}>
          <div className="modal-content max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-charcoal dark:text-parchment mb-4">{t('share.adjustExpiry')}</h3>
              <div className="space-y-2 mb-6">
                {[
                  { value: '1h', label: t('share.create.1hour') },
                  { value: '24h', label: t('share.create.1day') },
                  { value: '1w', label: t('share.create.1week') },
                  { value: 'never', label: t('share.create.forever') },
                ].map((option) => (
                  <label key={option.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    editExpiresIn === option.value ? 'border-chest-500 bg-chest-500/5 dark:border-amber-400 dark:bg-amber-400/10' : 'border-parchment/30 dark:border-charcoal/50 hover:bg-parchment/10 dark:hover:bg-charcoal/50'
                  }`}>
                    <input type="radio" name="expiresIn" value={option.value} checked={editExpiresIn === option.value}
                      onChange={() => setEditExpiresIn(option.value as '1h' | '24h' | '1w' | 'never')} className="accent-chest-500" />
                    <span className="text-sm text-charcoal dark:text-parchment">{option.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditingShareId(null)} className="flex-1 py-2.5 text-sm font-medium border border-parchment/40 dark:border-charcoal/50 rounded-lg text-charcoal dark:text-parchment hover:bg-parchment/10 dark:hover:bg-charcoal/50 transition-colors">
                  {t('common.cancel')}
                </button>
                <button onClick={() => updateExpiresMutation.mutate({ id: editingShareId, expiresIn: editExpiresIn })}
                  disabled={updateExpiresMutation.isPending}
                  className="flex-1 py-2.5 text-sm font-medium bg-chest-500 dark:bg-amber-400 text-white dark:text-chest-900 rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 transition-colors disabled:opacity-50">
                  {updateExpiresMutation.isPending ? t('common.loading') : t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
