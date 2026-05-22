'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Link as LinkIcon, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';
import StarRating from '@/components/StarRating';
import { api, ApiError } from '@/lib/api';
import Link from 'next/link';
import { platformNames, getContrastTextColor, PLATFORMS, generateDefaultCover } from '@/lib/platforms';
import { PAGE_TYPES, DEFAULT_PAGE_TYPE, PageTypeIcon } from '@/lib/pageTypes';
import { useI18n, getListDisplayName } from '@/lib/i18n';
import CoverEditor from '@/components/CoverEditor';
import { useToast } from '@/components/Toast';
import { isLoggedIn } from '@/lib/auth';

interface Tag {
  id: string;
  name: string;
}

interface List {
  id: string;
  name: string;
  parentId: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  isDefault?: boolean;
  depth?: number;
  path?: { id: string; name: string; isDefault?: boolean }[];
  pathName?: string | null;
  hasChildren?: boolean;
}

interface Collection {
  id: string;
  url: string;
  title: string;
  coverImage: string | null;
  platform: string;
  pageType?: string;
  note: string | null;
  rating: number | null;
  tags: Tag[];
  lists: List[];
}

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const collectionId = params.id as string;

  // 客户端认证守卫
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
    }
  }, [router]);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [platform, setPlatform] = useState('other');
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [rating, setRating] = useState<number | null>(null);
  const [pageType, setPageType] = useState<string>(DEFAULT_PAGE_TYPE);
  const [newTagName, setNewTagName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // URL 解析状态
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedPlatform, setParsedPlatform] = useState('');

  // 获取收藏详情
  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      const response = await api.get(`/collections/${collectionId}`);
      return response.data.data as Collection;
    },
    enabled: !!collectionId,
  });

  // 获取所有标签
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      return response.data.data as Tag[];
    },
  });

  // 获取所有分组
  const { data: listsData } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      return response.data.data as List[];
    },
  });

  // 初始化表单数据
  useEffect(() => {
    if (collection) {
      setUrl(collection.url);
      setTitle(collection.title);
      setCoverImage(collection.coverImage || '');
      setPlatform(collection.platform);
      setNote(collection.note || '');
      setRating(collection.rating ?? null);
      setPageType(collection.pageType || DEFAULT_PAGE_TYPE);
      setSelectedTags(collection.tags.map(t => t.id));
      setSelectedList(collection.lists[0]?.id || '');
    }
  }, [collection]);

  // URL 变化时自动解析（支持分享文本和标准URL）
  const parseUrl = useCallback(async (inputStr: string) => {
    if (!inputStr || !inputStr.trim()) {
      setParseError('');
      setParsedPlatform('');
      return;
    }
    setParsing(true);
    setParseError('');
    try {
      const response = await api.post('/collections/smart-parse', { input: inputStr.trim() }, { timeout: 25000 });
      const data = (response.data.data || response.data) as { platform?: string; url?: string; title?: string; coverImage?: string } | undefined;
      setParsedPlatform(data?.platform || '');
      if (data?.url) setUrl(data.url);
      if (data?.title && !title) setTitle(data.title);
      if (data?.coverImage && !coverImage) setCoverImage(data.coverImage);
      if (data?.platform) setPlatform(data.platform);
    } catch (error: unknown) {
      const errMsg = (error as ApiError).response?.data?.error || t('add.parseFailed');
      setParseError(errMsg);
      setParsedPlatform('other');
    } finally {
      setParsing(false);
    }
  }, [title, coverImage]);

  // 更新收藏
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedList) {
        throw new Error(t('edit.pleaseSelectList'));
      }
      if (platform === 'other') {
        // 允许编辑，不拒绝未知平台
      }
      const response = await api.put(`/collections/${collectionId}`, {
        url,
        title,
        coverImage: coverImage || null,
        platform,
        pageType: pageType || DEFAULT_PAGE_TYPE,
        note: note || null,
        rating: rating ?? null,
        tagIds: selectedTags,
        listIds: [selectedList],
      });
      return response.data;
    },
    onSuccess: () => {
      // 立即更新所有 collections 查询缓存中的封面，避免返回首页时显示旧封面
      const updatedCoverImage = coverImage || null;
      const queries = queryClient.getQueriesData({ queryKey: ['collections'] });
      queries.forEach(([queryKey, oldData]) => {
        if (!oldData || !(oldData as any).pages) return;
        queryClient.setQueryData(queryKey, {
          ...(oldData as any),
          pages: (oldData as any).pages.map((page: any) => ({
            ...page,
            data: page.data.map((item: any) =>
              item.id === collectionId
                ? { ...item, coverImage: updatedCoverImage }
                : item
            ),
          })),
        });
      });

      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      showToast(t('edit.saveSuccess'), 'success');
      router.push('/');
    },
    onError: (error: ApiError) => {
      const errorCode = error.response?.data?.error as string | undefined;
      let msg: string | undefined;
      if (errorCode) {
        const i18nKey = `error.${errorCode.replace(/^ERR_/, '').toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;
        const translated = t(i18nKey);
        if (translated !== i18nKey) msg = translated;
      }
      showAlert(msg || error.response?.data?.message || error.response?.data?.error || error.message || t('edit.saveFailed'), 'error');
    },
  });

  // 删除收藏
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/collections/${collectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      showToast(t('edit.deleteSuccess'), 'success');
      router.push('/');
    },
    onError: (error: ApiError) => {
      showAlert(error.response?.data?.message || error.response?.data?.error || t('edit.deleteFailed'), 'error');
    },
  });

  // 创建新标签
  const createTagMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/tags', { name: newTagName });
      return response.data;
    },
    onSuccess: (data) => {
      setSelectedTags([...selectedTags, data.data?.id || data.id]);
      if (data.renamed) { showToast(t('common.tagRenamed', { originalName: data.originalName, name: data.name }), 'info'); }
      setNewTagName('');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  // 创建新分组
  const createListMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/lists', { name: newListName });
      return response.data;
    },
    onSuccess: (data) => {
      const newListId = data.data?.id || data.id;
      if (newListId) setSelectedList(newListId);
      if (data.renamed) { showToast(t('common.listRenamed', { originalName: data.originalName, name: data.data.name }), 'info'); }
      setNewListName('');
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (isLoadingCollection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-taupe/60">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      {/* Header */}
      <header className="bg-paper dark:bg-charcoal/80 border-b border-parchment/30 dark:border-charcoal/50 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2.5 hover:bg-parchment/10 dark:hover:bg-charcoal/50 rounded-xl transition-colors text-taupe dark:text-parchment/60 hover:text-charcoal dark:hover:text-parchment cursor-pointer">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-semibold text-charcoal dark:text-parchment">{t('edit.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(t('edit.confirmDelete'))) {
                  deleteMutation.mutate();
                }
              }}
              className="px-4 py-2 text-rust hover:bg-rust/5 dark:hover:bg-rust/10 rounded-lg transition-colors"
            >
              {t('common.delete')}
            </button>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !url || !title}
              className="px-4 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-taupe/20 dark:disabled:bg-charcoal/40 transition-colors"
            >
              {updateMutation.isPending ? t('edit.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* URL */}
          <div className="card p-4">
            <label className="label flex items-center gap-2">
              <LinkIcon size={16} />
              {t('edit.linkAddress')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('edit.pasteLinkOrShareText')}
                className="input pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {parsing && <Loader2 size={16} className="animate-spin text-chest-500 dark:text-amber-400" />}
                <button
                  type="button"
                  onClick={() => parseUrl(url)}
                  disabled={parsing || !url}
                  className="p-1.5 text-taupe hover:text-chest-500 dark:hover:text-amber-400 hover:bg-chest-500/5 dark:hover:bg-amber-400/10 rounded disabled:opacity-30"
                  title={t('edit.reParse')}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            {parseError && (
              <div className="flex items-start gap-2 mt-2 p-3 bg-rust/5 rounded-lg">
                <AlertCircle size={16} className="text-rust mt-0.5 flex-shrink-0" />
                <p className="text-sm text-rust">{parseError}</p>
              </div>
            )}
            <p className="text-xs text-taupe/60 dark:text-parchment/40 mt-1">{t('edit.supportShareText')}</p>
          </div>

          {/* Title */}
          <div className="card p-4">
            <label className="label">{t('edit.titleField')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('edit.enterTitle')}
              className="input"
            />
          </div>

          {/* Platform */}
          <div className="card p-4">
            <label className="label">{t('edit.platformField')}</label>
            {platform !== 'other' ? (
              <div className="flex items-center gap-2">
                <span className={`inline-block px-3 py-1 rounded text-sm ${getContrastTextColor(PLATFORMS.find(p => p.key === platform)?.color || '#999999')}`} style={{ backgroundColor: PLATFORMS.find(p => p.key === platform)?.color || '#6b7280' }}>
                  {platformNames[platform] || platform}
                </span>
                <span className="text-sm text-taupe/60 dark:text-parchment/40">{t('edit.autoDetected')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-500/5 rounded-lg">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-600 dark:text-amber-400">{t('edit.unrecognizedPlatform')}</span>
              </div>
            )}
          </div>

          {/* Cover Image */}
          <div className="card p-4">
            <label className="label flex items-center gap-2">
              <ImageIcon size={16} />
              {t('edit.coverImage')}
            </label>
            <CoverEditor value={coverImage} platform={platform} title={title} onChange={setCoverImage} collectionId={collectionId} url={url} />
          </div>

          {/* Note */}
          <div className="card p-4">
            <label className="label">{t('edit.note')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('edit.addNote')}
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Page Type - 移到评分上方 */}
          <div className="card p-4">
            <label className="label">{t('collection.filter.pageType')}</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PAGE_TYPES.map(type => {
                const isActive = pageType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPageType(type.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 ${
                      isActive
                        ? 'bg-charcoal/80 dark:bg-parchment/80 text-white dark:text-charcoal'
                        : 'bg-paper dark:bg-chest-800 border border-taupe/15 dark:border-parchment/10 text-charcoal dark:text-parchment hover:border-taupe/30 dark:hover:border-parchment/20'
                    }`}
                  >
                    <PageTypeIcon type={type.value} size={13} />
                    {t(type.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <label className="label">{t('collection.filter.rating')}</label>
              {rating !== null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="text-xs text-taupe hover:text-rust flex items-center gap-1"
                >
                  <X size={12} />
                  {t('common.clear')}
                </button>
              )}
            </div>
            <StarRating value={rating} onChange={setRating} size={24} showValue ariaLabel={t('collection.filter.rating')} emptyAriaLabel={t('collection.filter.noRating')} />
          </div>

          {/* Tags */}
          <div className="card p-4">
            <label className="label">{t('edit.tags')}</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tagsData?.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-chest-500 text-white'
                      : 'bg-parchment/20 dark:bg-charcoal/50 text-charcoal/70 dark:text-parchment/70 hover:bg-parchment/30 dark:hover:bg-charcoal/60'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder={t('edit.newTag')}
                className="input flex-1"
              />
              <button
                onClick={() => {
                  if (!newTagName) return;
                  const exists = tagsData?.some((t: Tag) => t.name === newTagName.trim());
                  if (exists && !confirm(t('edit.tagExists', { name: newTagName.trim() }))) return;
                  createTagMutation.mutate();
                }}
                disabled={!newTagName || createTagMutation.isPending}
                className="px-4 py-2 bg-parchment/20 dark:bg-charcoal/50 text-charcoal dark:text-parchment rounded-lg hover:bg-parchment/30 dark:hover:bg-charcoal/60 disabled:opacity-50"
              >
                {t('edit.add')}
              </button>
            </div>
          </div>

          {/* Lists */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{t('edit.groupRequired')}</label>
              <button
                onClick={() => {
                  // 展开/折叠所有
                  const allIds = listsData?.filter((l: List) => l.depth === 0 && listsData.some((item: List) => item.parentId === l.id)).map((l: List) => l.id) || [];
                  const hasExpanded = expandedIds.size > 0;
                  if (hasExpanded) {
                    setExpandedIds(new Set());
                  } else {
                    setExpandedIds(new Set(allIds));
                  }
                }}
                className="text-xs px-2 py-1 bg-parchment/20 dark:bg-charcoal/50 text-charcoal/70 dark:text-parchment/60 rounded hover:bg-parchment/30 dark:hover:bg-charcoal/60"
              >
                {expandedIds.size > 0 ? t('common.collapseAll') : t('common.expandAll')}
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto mb-3 border border-parchment/30 dark:border-charcoal/50 rounded-lg p-2">
              {(() => {
                // 构建树形结构，根据展开状态过滤
                const visibleItems: List[] = [];
                const rootItems = listsData?.filter((l: List) => !l.parentId) || [];
                
                const addChildren = (parentId: string, depth: number) => {
                  const children = listsData?.filter((l: List) => l.parentId === parentId) || [];
                  for (const child of children) {
                    visibleItems.push({ ...child, depth });
                    if (expandedIds.has(child.id)) {
                      addChildren(child.id, depth + 1);
                    }
                  }
                };
                
                for (const root of rootItems) {
                  visibleItems.push({ ...root, depth: 0 });
                  if (expandedIds.has(root.id)) {
                    addChildren(root.id, 1);
                  }
                }
                
                return visibleItems.map((list) => {
                  const indentWidth = (list.depth || 0) * 20;
                  const hasChildren = listsData?.some((l: List) => l.parentId === list.id);
                  
                  return (
                    <div
                      key={list.id}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedList === list.id
                          ? 'bg-chest-500 text-white'
                          : 'bg-parchment/10 dark:bg-charcoal/40 text-charcoal dark:text-parchment/70 hover:bg-parchment/20 dark:hover:bg-charcoal/50'
                      }`}
                      style={{ marginLeft: indentWidth }}
                    >
                      {hasChildren && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedIds(prev => {
                              const next = new Set(prev);
                              if (next.has(list.id)) {
                                next.delete(list.id);
                              } else {
                                next.add(list.id);
                              }
                              return next;
                            });
                          }}
                          className="p-1 hover:bg-black/10 rounded"
                        >
                          {expandedIds.has(list.id) ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          )}
                        </button>
                      )}
                      {!hasChildren && <span className="w-6" />}
                      <button
                        onClick={() => setSelectedList(list.id)}
                        className="flex-1 text-left truncate"
                      >
                        {getListDisplayName(list, t)}
                      </button>
                      {selectedList === list.id && (
                        <span className="text-xs opacity-80">✓</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder={t('edit.newGroup')}
                className="input flex-1"
              />
              <button
                onClick={() => {
                  if (!newListName) return;
                  const exists = listsData?.some((l: List) => l.name === newListName.trim() && !l.parentId);
                  if (exists && !confirm(t('edit.groupExists', { name: newListName.trim() }))) return;
                  createListMutation.mutate();
                }}
                disabled={!newListName || createListMutation.isPending}
                className="px-4 py-2 bg-parchment/20 dark:bg-charcoal/50 text-charcoal dark:text-parchment rounded-lg hover:bg-parchment/30 dark:hover:bg-charcoal/60 disabled:opacity-50"
              >
                {t('edit.add')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
