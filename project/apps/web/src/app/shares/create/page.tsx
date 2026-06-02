'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Check, Copy, Search, X, Lock, Clock, FileText, Image, Layers, Star } from 'lucide-react';
import { api, type ApiError } from '@/lib/api';
import { useI18n, getListDisplayName, getListPathDisplayName } from '@/lib/i18n';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { isLoggedIn } from '@/lib/auth';
import LazyImage from '@/components/LazyImage';
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
}

interface Tag {
  id: string;
  name: string;
  collectionCount: number;
}

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
}

type ShareType = 'ALL' | 'COLLECTION' | 'LIST' | 'TAG' | 'MULTI_LIST' | 'MULTI_TAG';

export default function CreateSharePage() {
  const router = useRouter();
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const queryClient = useQueryClient();

  // 客户端认证守卫
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
    }
  }, [router]);
  const [shareType, setShareType] = useState<ShareType>('ALL');
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [customTitle, setCustomTitle] = useState('');
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState<'1h' | '24h' | '1w' | 'never'>('never');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list' | 'card'>('grid');
  const [includeRating, setIncludeRating] = useState(false);

  const userTier = ((typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('linkchest_user') || '{}') : {}).userTier as string) || 'medium';
  const canUseUltimate = userTier === 'super';
  const canUseProFeatures = userTier !== 'medium'; // 密码保护和有效期设置仅限专业版/旗舰版

  const { data: listsData } = useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      const data = response.data.data || response.data;
      return data as List[];
    },
  });

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      const data = response.data.data || response.data;
      return data as Tag[];
    },
  });

  const { data: collectionsData } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await api.get('/collections');
      const data = response.data.data || response.data;
      return data as Collection[];
    },
  });

  const lists = listsData || [];
  const tags = tagsData || [];
  const collections = collectionsData || [];

  const filteredCollections = collections.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/shares', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      setGeneratedLink(response.data.shareUrl);
      if (password) {
        showToast(t('share.create.linkGenerated') + '\n\n' + t('share.view.password', { password }) + '\n\n' + t('share.create.viewPasswordAnytime'), 'success');
      }
    },
    onError: (error: ApiError) => {
      const data = error.response?.data;
      const message = (data?.details
        || data?.message
        || data?.error
        || data?.errors?.[0]?.msg
        || t('errors.SHARE_CREATE_FAILED')) as string;
      showAlert(message, 'error');
    },
  });

  const handleCreate = () => {
    let title = customTitle || '';
    const data: Record<string, unknown> = { type: shareType };

    switch (shareType) {
      case 'ALL':
        if (!title) title = t('share.typeAll');
        break;
      case 'LIST':
        if (selectedLists.length === 0) {
          showToast(t('share.create.pleaseSelectGroup'), 'error');
          return;
        }
        if (!title) {
          title = selectedLists.length === 1
            ? lists.find(l => l.id === selectedLists[0])?.name || t('share.create.groupShare')
            : t('share.create.groupsShare', { count: selectedLists.length });
        }
        data.listIds = selectedLists;
        break;
      case 'TAG':
        if (selectedTags.length === 0) {
          showToast(t('share.create.pleaseSelectTag'), 'error');
          return;
        }
        if (!title) {
          title = selectedTags.length === 1
            ? `#${tags.find(tg => tg.id === selectedTags[0])?.name}` || t('share.create.tagShare')
            : t('share.create.tagsShare', { count: selectedTags.length });
        }
        data.tagIds = selectedTags;
        break;
      case 'COLLECTION':
        if (selectedCollections.length === 0) {
          showToast(t('share.create.pleaseSelectCollection'), 'error');
          return;
        }
        if (!title) title = t('share.create.collectionShare', { count: selectedCollections.length });
        data.collectionIds = selectedCollections;
        break;
    }

    data.title = title;
    if (password) data.password = password;
    if (expiresIn !== 'never') data.expiresIn = expiresIn;
    if (description.trim()) data.description = description.trim();
    if (canUseUltimate && coverImage.trim()) data.coverImage = coverImage.trim();
    if (canUseUltimate) data.layout = layout;
    if (canUseProFeatures && includeRating) data.includeRating = true;

    createMutation.mutate(data);
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      showToast(t('share.create.linkCopied'), 'success');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = generatedLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(t('share.create.linkCopied'), 'success');
      } catch {
        showAlert(t('share.create.copyFailed'), 'error');
      }
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      douyin: '🎵',
      bilibili: '📺',
      xiaohongshu: '📕',
      weibo: '🌐',
      wechat: '💬',
      toutiao: '📰',
      youtube: '📺',
    };
    return icons[platform] || '🔗';
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/manage"
            className="p-2.5 hover:bg-parchment/10 dark:hover:bg-charcoal/50 rounded-xl transition-colors text-taupe dark:text-parchment/60 hover:text-charcoal dark:hover:text-parchment cursor-pointer"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-charcoal dark:text-parchment">{t('share.create.title')}</h1>
        </div>

        {generatedLink ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-sage" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-charcoal dark:text-parchment">{t('share.create.linkGenerated')}</h2>
            <p className="text-taupe dark:text-parchment/60 mb-6">
              {t('share.create.copyToShare')}
            </p>

            <div className="bg-parchment/10 dark:bg-charcoal/50 p-4 rounded-lg mb-6">
              <p className="text-charcoal/70 dark:text-parchment/70 break-all">{generatedLink}</p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={copyLink}
                className="btn-primary flex items-center gap-2"
              >
                <Copy size={18} />
                {t('share.create.copyLink')}
              </button>
              <Link href="/manage" className="btn-secondary">
                {t('share.create.done')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card p-6">
              <label className="block text-sm font-medium text-charcoal/80 dark:text-parchment/80 mb-3">
                {t('share.create.selectRange')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { type: 'ALL' as ShareType, label: t('share.create.allCollections'), desc: t('share.create.shareAll') },
                  { type: 'COLLECTION' as ShareType, label: t('share.create.collection'), desc: t('share.create.multiSelectCollections') },
                  { type: 'LIST' as ShareType, label: t('share.create.group'), desc: t('share.create.multiSelectGroups') },
                  { type: 'TAG' as ShareType, label: t('share.create.tag'), desc: t('share.create.multiSelectTags') },
                ].map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      setShareType(option.type);
                      setSelectedLists([]);
                      setSelectedTags([]);
                      setSelectedCollections([]);
                      setSearchQuery('');
                    }}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      shareType === option.type
                        ? 'border-chest-500 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400'
                        : 'border-parchment/40 dark:border-charcoal/40 hover:border-parchment/60 dark:hover:border-charcoal/60'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs mt-1 opacity-70">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {shareType === 'COLLECTION' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-charcoal/80 dark:text-parchment/80">
                    {t('share.create.selectCollections')}
                  </label>
                  <span className="text-sm text-taupe dark:text-parchment/60">
                    {t('share.create.selectedCount', { count: selectedCollections.length })}
                  </span>
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe/60 dark:text-parchment/40" size={18} />
                  <input
                    type="text"
                    placeholder={t('share.create.searchCollections')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-parchment/40 dark:border-charcoal/40 rounded-lg focus:outline-none focus:border-chest-500 bg-paper dark:bg-charcoal/50 dark:text-parchment"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe/60 hover:text-taupe dark:hover:text-parchment/80"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredCollections.length === 0 ? (
                    <p className="text-taupe/60 dark:text-parchment/40 text-center py-8">
                      {searchQuery ? t('share.create.noMatchCollections') : t('share.create.noCollections')}
                    </p>
                  ) : (
                    filteredCollections.map((collection) => (
                      <button
                        key={collection.id}
                        onClick={() => {
                          if (selectedCollections.includes(collection.id)) {
                            setSelectedCollections(selectedCollections.filter(id => id !== collection.id));
                          } else {
                            setSelectedCollections([...selectedCollections, collection.id]);
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          selectedCollections.includes(collection.id)
                            ? 'border-chest-500 bg-chest-500/5 dark:bg-amber-400/10'
                            : 'border-parchment/40 dark:border-charcoal/40 hover:border-parchment/60 dark:hover:border-charcoal/60'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          selectedCollections.includes(collection.id)
                            ? 'bg-chest-500 border-chest-500'
                            : 'border-taupe/40 dark:border-parchment/30'
                        }`}>
                          {selectedCollections.includes(collection.id) && <Check size={14} className="text-white" />}
                        </div>
                        <div className="w-12 h-12 bg-parchment/10 dark:bg-charcoal/50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {collection.coverImage ? (
                            <LazyImage
                              src={collection.coverImage}
                              alt=""
                              title={collection.title}
                              platform={collection.platform}
                              collectionId={collection.id}
                              containerClassName="w-12 h-12 rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <span className="text-lg">{getPlatformIcon(collection.platform)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-charcoal dark:text-parchment truncate">{collection.title}</p>
                          <p className="text-sm text-taupe dark:text-parchment/60">{collection.platform}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {shareType === 'LIST' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-charcoal/80 dark:text-parchment/80">
                    {t('share.create.selectGroups')}
                  </label>
                  <span className="text-sm text-taupe dark:text-parchment/60">
                    {t('share.create.selectedCount', { count: selectedLists.length })}
                  </span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {lists.length === 0 ? (
                    <p className="text-taupe/60 dark:text-parchment/40 text-center py-8">{t('share.create.noGroups')}</p>
                  ) : (
                    lists.map((list) => {
                      const indentWidth = (list.depth || 0) * 16;
                      return (
                        <button
                          key={list.id}
                          onClick={() => {
                            if (selectedLists.includes(list.id)) {
                              setSelectedLists(selectedLists.filter(id => id !== list.id));
                            } else {
                              setSelectedLists([...selectedLists, list.id]);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            selectedLists.includes(list.id)
                              ? 'border-chest-500 bg-chest-500/5 dark:bg-amber-400/10'
                              : 'border-parchment/40 dark:border-charcoal/40 hover:border-parchment/60 dark:hover:border-charcoal/60'
                          }`}
                          style={{ marginLeft: indentWidth }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                              selectedLists.includes(list.id)
                                ? 'bg-chest-500 border-chest-500'
                                : 'border-taupe/40 dark:border-parchment/30'
                            }`}>
                              {selectedLists.includes(list.id) && <Check size={14} className="text-white" />}
                            </div>
                            <span className="text-charcoal dark:text-parchment">{getListPathDisplayName(list, t)}</span>
                          </div>
                          <span className="text-sm text-taupe/60 dark:text-parchment/40">
                            {t('group.collectionCount', { count: list.totalCollectionCount || list.collectionCount })}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {shareType === 'TAG' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-charcoal/80 dark:text-parchment/80">
                    {t('share.create.selectTags')}
                  </label>
                  <span className="text-sm text-taupe dark:text-parchment/60">
                    {t('share.create.selectedCount', { count: selectedTags.length })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-taupe/60 dark:text-parchment/40 w-full text-center py-8">{t('share.create.noTags')}</p>
                  ) : (
                    tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          if (selectedTags.includes(tag.id)) {
                            setSelectedTags(selectedTags.filter(id => id !== tag.id));
                          } else {
                            setSelectedTags([...selectedTags, tag.id]);
                          }
                        }}
                        className={`px-4 py-2 rounded-full transition-colors flex items-center gap-2 ${
                          selectedTags.includes(tag.id)
                            ? 'bg-chest-500 text-white'
                            : 'bg-parchment/20 dark:bg-charcoal/50 text-charcoal/70 dark:text-parchment/70 hover:bg-parchment/30 dark:hover:bg-charcoal/60'
                        }`}
                      >
                        {selectedTags.includes(tag.id) && <Check size={14} />}
                        #{tag.name} ({tag.collectionCount})
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="card p-6 space-y-5">
              <h3 className="text-sm font-medium text-charcoal/80 dark:text-parchment/80">{t('share.create.settings')}</h3>

              <div>
                <label className="block text-sm text-taupe dark:text-parchment/60 mb-1.5">{t('share.create.shareTitle')}</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={t('share.create.shareTitlePlaceholder')}
                  maxLength={100}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-parchment/40 dark:border-charcoal/40 rounded-lg focus:outline-none focus:border-chest-500 text-sm bg-paper dark:bg-charcoal/50 dark:text-parchment"
                />
              </div>

              {canUseProFeatures && (
                <>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm text-taupe dark:text-parchment/60 mb-1.5">
                      <Lock size={14} />
                      {t('share.create.accessPassword')}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('share.create.noPasswordPublic')}
                      maxLength={20}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-parchment/40 dark:border-charcoal/40 rounded-lg focus:outline-none focus:border-chest-500 text-sm bg-paper dark:bg-charcoal/50 dark:text-parchment"
                    />
                    {password && password.length < 4 && (
                      <p className="text-xs text-rust mt-1">{t('share.create.passwordMinLength')}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm text-taupe dark:text-parchment/60 mb-1.5">
                      <Clock size={14} />
                      {t('share.create.validity')}
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: '1h' as const, label: t('share.create.1hour') },
                        { value: '24h' as const, label: t('share.create.1day') },
                        { value: '1w' as const, label: t('share.create.1week') },
                        { value: 'never' as const, label: t('share.create.forever') },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setExpiresIn(option.value)}
                          className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                            expiresIn === option.value
                              ? 'border-chest-500 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400'
                              : 'border-parchment/40 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-parchment/60 dark:hover:border-charcoal/60'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-sm text-taupe dark:text-parchment/60">
                      <Star size={14} />
                      {t('share.create.includeRating')}
                    </label>
                    <button
                      onClick={() => setIncludeRating(!includeRating)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        includeRating ? 'bg-chest-500' : 'bg-parchment/30 dark:bg-charcoal/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        includeRating ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-sm text-taupe dark:text-parchment/60 mb-1.5">
                  <FileText size={14} />
                  {t('share.create.remark')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('share.create.remarkPlaceholder')}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3 py-2 border border-parchment/40 dark:border-charcoal/40 rounded-lg focus:outline-none focus:border-chest-500 text-sm resize-none bg-paper dark:bg-charcoal/50 dark:text-parchment"
                />
                <p className="text-xs text-taupe/60 dark:text-parchment/40 mt-1 text-right">{description.length}/1000</p>
              </div>

              {canUseUltimate && (
                <>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm text-taupe dark:text-parchment/60 mb-1.5">
                      <Image size={14} />
                      {t('share.create.coverImage')}
                    </label>
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder={t('share.create.coverImagePlaceholder')}
                      className="w-full px-3 py-2 border border-parchment/40 dark:border-charcoal/40 rounded-lg focus:outline-none focus:border-chest-500 text-sm bg-paper dark:bg-charcoal/50 dark:text-parchment"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm text-taupe dark:text-parchment/60 mb-1.5">
                      <Layers size={14} />
                      {t('share.create.layout')}
                    </label>
                    <div className="flex gap-2">
                      {([
                        { value: 'grid' as const, label: t('share.create.layoutGrid') },
                        { value: 'list' as const, label: t('share.create.layoutList') },
                        { value: 'card' as const, label: t('share.create.layoutCard') },
                      ]).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setLayout(option.value)}
                          className={`flex-1 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                            layout === option.value
                              ? 'border-chest-500 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400'
                              : 'border-parchment/40 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-parchment/60 dark:hover:border-charcoal/60'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Link
                href="/manage"
                className="flex-1 py-2.5 text-center border border-parchment/40 dark:border-charcoal/40 rounded-lg hover:bg-parchment/5 dark:hover:bg-charcoal/50 text-charcoal dark:text-parchment"
              >
                {t('share.create.cancel')}
              </Link>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || (password.length > 0 && password.length < 4)}
                className="flex-1 py-2.5 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-taupe/20 dark:disabled:bg-charcoal/40 flex items-center justify-center gap-2"
              >
                {createMutation.isPending && (
                  <Loader2 size={18} className="animate-spin" />
                )}
                {t('share.create.generateLink')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
