'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link2, Sparkles, Palette, Loader2, ImageIcon, RefreshCw, Library, Lock, Shuffle } from 'lucide-react';
import { api, type ApiError } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { generateDefaultCover } from '@/lib/platforms';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useQuery } from '@tanstack/react-query';

type CoverMode = 'url' | 'ai' | 'gradient' | 'library';

interface CoverEditorProps {
  value: string;
  platform: string;
  title?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  collectionId?: string;
  url?: string;
}

function inferModeFromValue(val: string): CoverMode {
  if (!val || val.startsWith('data:image/svg')) return 'gradient';
  if (val.startsWith('data:image/') || val.includes('cos.') || val.includes('myqcloud.com')) return 'library';
  return 'url';
}

function isSystemCoverValue(val: string, systemCovers: { cosUrl: string }[]): boolean {
  if (!val) return false;
  return systemCovers.some((c) => c.cosUrl === val);
}

function isLibraryCoverValue(val: string): boolean {
  if (!val) return false;
  return val.includes('cos.') || val.includes('myqcloud.com');
}

export default function CoverEditor({ value, platform, title, onChange, disabled, collectionId, url }: CoverEditorProps) {
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState<CoverMode>('gradient');
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gradientSvg = useMemo(() => generateDefaultCover(platform, title), [platform, title]);

  const { data: systemCoversData, refetch: refetchSystemCovers } = useQuery({
    queryKey: ['systemCovers'],
    queryFn: async () => {
      const response = await api.get('/upload/system-covers');
      return response.data;
    },
    enabled: true,
  });

  const systemCovers = useMemo(() => {
    return (systemCoversData?.data || []) as { id: string; cosUrl: string }[];
  }, [systemCoversData]);

  const [randomAiCover, setRandomAiCover] = useState<{ id: string; cosUrl: string } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const inferred = inferModeFromValue(value);
    setMode(inferred);
    setUrlInput(value || '');
  }, [isMounted, value]);

  useEffect(() => {
    if (!isMounted || systemCovers.length === 0 || randomAiCover) return;
    const randomIndex = Math.floor(Math.random() * systemCovers.length);
    setRandomAiCover(systemCovers[randomIndex]);
  }, [isMounted, systemCovers, randomAiCover]);

  const [userTier, setUserTier] = useState('medium');
  useEffect(() => {
    const user = getUser();
    setUserTier((user?.userTier as string) || 'medium');
  }, []);
  const canUploadCover = userTier === 'heavy' || userTier === 'super';

  const { data: coverLibraryData, refetch: refetchCovers } = useQuery({
    queryKey: ['coverLibrary'],
    queryFn: async () => {
      const response = await api.get('/upload/covers?limit=50');
      return response.data;
    },
    enabled: true,
  });

  const libraryCovers = useMemo(() => {
    return (coverLibraryData?.data || []) as { id: string; cosUrl: string }[];
  }, [coverLibraryData]);

  const latestLibraryCover = libraryCovers[0] || null;

  const urlCoverAvailable = useMemo(() => {
    return !!value && !value.startsWith('data:image/svg') && !isLibraryCoverValue(value) && !isSystemCoverValue(value, systemCovers);
  }, [value, systemCovers]);

  const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(img.src);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('图片加载失败，可能是不支持的格式'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFile = useCallback(async (file: File) => {
    if (!canUploadCover) {
      showToast(t('cover.upgradeToUpload'), 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('cover.uploadTooLarge'), 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast(t('cover.uploadInvalid'), 'error');
      return;
    }

    setUploading(true);
    try {
      const base64 = await compressImage(file, 1200, 1200, 0.8);
      const response = await api.post('/upload/cover', { imageData: base64, originalName: file.name });
      const data = (response.data.data || response.data) as { url?: string } | undefined;
      if (data?.url) {
        onChange(data.url);
        setMode('library');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const respData = apiErr.response?.data as Record<string, unknown> | undefined;
      const msg = respData?.message as string || respData?.error as string || (err instanceof Error ? err.message : '') || t('cover.uploadFailed');
      const status = apiErr.response?.status;
      if (status === 413) {
        showAlert(t('cover.uploadTooLarge'), 'error');
      } else if (msg === 'QUOTA_EXCEEDED') {
        showAlert(t('cover.quotaExceeded'), 'error');
      } else {
        showAlert(msg, 'error');
      }
    } finally {
      setUploading(false);
    }
  }, [onChange, t, canUploadCover, showToast, showAlert]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canUploadCover) {
      showToast(t('cover.upgradeToUpload'), 'error');
      return;
    }
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile, canUploadCover, t, showToast]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleSyncCover = useCallback(async () => {
    if (!collectionId) return;
    setSyncing(true);
    try {
      const response = await api.post(`/collections/${collectionId}/sync-cover`);
      const data = response.data?.data;
      if (data?.synced && data.coverImage) {
        onChange(data.coverImage);
        showToast(t('edit.syncCoverSuccess'), 'success');
      } else if (data?.reason === 'same_cover') {
        showToast(t('edit.syncCoverSame'), 'info');
      } else {
        showAlert(t('edit.syncCoverFailed'), 'error');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const msg = apiErr.response?.data?.message || apiErr.response?.data?.error || t('edit.syncCoverFailed');
      showAlert(msg, 'error');
    } finally {
      setSyncing(false);
    }
  }, [collectionId, onChange, t, showToast, showAlert]);

  const handleRefreshCover = useCallback(async () => {
    if (!url) return;
    setSyncing(true);
    try {
      const response = await api.post('/collections/parse-url', { url });
      const data = response.data?.data;
      if (data?.coverImage) {
        setUrlInput(data.coverImage);
        onChange(data.coverImage);
        setMode('url');
        showToast(t('edit.syncCoverSuccess'), 'success');
      } else {
        showToast(t('edit.syncCoverFailed'), 'error');
      }
    } catch {
      showToast(t('edit.syncCoverFailed'), 'error');
    } finally {
      setSyncing(false);
    }
  }, [url, onChange, t, showToast]);

  const handleShuffleAi = useCallback(() => {
    if (systemCovers.length === 0) return;
    let newIndex = Math.floor(Math.random() * systemCovers.length);
    if (randomAiCover && systemCovers.length > 1) {
      while (systemCovers[newIndex].cosUrl === randomAiCover.cosUrl) {
        newIndex = Math.floor(Math.random() * systemCovers.length);
      }
    }
    const newCover = systemCovers[newIndex];
    setRandomAiCover(newCover);
  }, [systemCovers, randomAiCover]);

  const handleSelectMode = useCallback((newMode: CoverMode) => {
    setMode(newMode);
    if (newMode === 'gradient') {
      onChange('');
    } else if (newMode === 'url') {
      if (urlInput) {
        onChange(urlInput);
      }
    } else if (newMode === 'ai') {
      if (randomAiCover) {
        onChange(randomAiCover.cosUrl);
      }
    } else if (newMode === 'library') {
      if (latestLibraryCover) {
        onChange(latestLibraryCover.cosUrl);
      }
    }
  }, [urlInput, randomAiCover, latestLibraryCover, onChange]);

  const urlCoverPreview = useMemo(() => {
    if (urlCoverAvailable) return value;
    return null;
  }, [urlCoverAvailable, value]);

  const gradientCoverPreview = gradientSvg;

  const libraryCoverPreview = useMemo(() => {
    if (latestLibraryCover) return latestLibraryCover.cosUrl;
    return null;
  }, [latestLibraryCover]);

  const aiCoverPreview = useMemo(() => {
    if (randomAiCover) return randomAiCover.cosUrl;
    return null;
  }, [randomAiCover]);

  const isUrlSelected = mode === 'url';
  const isGradientSelected = mode === 'gradient';
  const isLibrarySelected = mode === 'library';
  const isAiSelected = mode === 'ai';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectMode('url')}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-all duration-200',
              isUrlSelected
                ? 'border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-300'
                : 'border-parchment/20 dark:border-charcoal/40 bg-parchment/5 dark:bg-charcoal/20 text-charcoal/60 dark:text-parchment/50 hover:bg-parchment/10 dark:hover:bg-charcoal/30',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Link2 size={16} className={isUrlSelected ? 'text-amber-500' : ''} />
            <span>{t('cover.modeUrl')}</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectMode('gradient')}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-all duration-200',
              isGradientSelected
                ? 'border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-300'
                : 'border-parchment/20 dark:border-charcoal/40 bg-parchment/5 dark:bg-charcoal/20 text-charcoal/60 dark:text-parchment/50 hover:bg-parchment/10 dark:hover:bg-charcoal/30',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Palette size={16} className={isGradientSelected ? 'text-amber-500' : ''} />
            <span>{t('cover.modeGradient')}</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectMode('library')}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-all duration-200',
              isLibrarySelected
                ? 'border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-300'
                : 'border-parchment/20 dark:border-charcoal/40 bg-parchment/5 dark:bg-charcoal/20 text-charcoal/60 dark:text-parchment/50 hover:bg-parchment/10 dark:hover:bg-charcoal/30',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Library size={16} className={isLibrarySelected ? 'text-amber-500' : ''} />
            <span>{t('cover.modeLibrary')}</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectMode('ai')}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-all duration-200',
              isAiSelected
                ? 'border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-300'
                : 'border-parchment/20 dark:border-charcoal/40 bg-parchment/5 dark:bg-charcoal/20 text-charcoal/60 dark:text-parchment/50 hover:bg-parchment/10 dark:hover:bg-charcoal/30',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Sparkles size={16} className={isAiSelected ? 'text-amber-500' : ''} />
            <span>{t('cover.modeAi')}</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            disabled={disabled || !urlCoverAvailable}
            onClick={() => urlCoverAvailable && handleSelectMode('url')}
            className={cn(
              'relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all',
              isUrlSelected
                ? 'border-amber-400 ring-1 ring-amber-400/30'
                : 'border-parchment/20 dark:border-charcoal/40',
              (!urlCoverAvailable || disabled) && 'opacity-40 cursor-not-allowed'
            )}
          >
            {urlCoverPreview ? (
              <img
                src={urlCoverPreview}
                alt="URL cover"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-parchment/5 dark:bg-charcoal/20">
                <Link2 size={20} className="text-taupe/30 dark:text-parchment/20" />
                <span className="text-[10px] text-taupe/40 dark:text-parchment/30 text-center px-1">
                  {url ? t('cover.urlNotAvailable') : t('cover.urlNeedParse')}
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectMode('gradient')}
            className={cn(
              'relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all',
              isGradientSelected
                ? 'border-amber-400 ring-1 ring-amber-400/30'
                : 'border-parchment/20 dark:border-charcoal/40 hover:border-parchment/40 dark:hover:border-charcoal/60'
            )}
          >
            <img
              src={gradientCoverPreview}
              alt="gradient cover"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectMode('library')}
            className={cn(
              'relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all',
              isLibrarySelected
                ? 'border-amber-400 ring-1 ring-amber-400/30'
                : 'border-parchment/20 dark:border-charcoal/40 hover:border-parchment/40 dark:hover:border-charcoal/60'
            )}
          >
            {libraryCoverPreview ? (
              <img
                src={libraryCoverPreview}
                alt="library cover"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-parchment/5 dark:bg-charcoal/20">
                <ImageIcon size={20} className="text-taupe/30 dark:text-parchment/20" />
                <span className="text-[10px] text-taupe/40 dark:text-parchment/30 text-center px-1">
                  {t('cover.tapToUpload')}
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelectMode('ai')}
            className={cn(
              'relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all',
              isAiSelected
                ? 'border-amber-400 ring-1 ring-amber-400/30'
                : 'border-parchment/20 dark:border-charcoal/40 hover:border-parchment/40 dark:hover:border-charcoal/60'
            )}
          >
            {aiCoverPreview ? (
              <img
                src={aiCoverPreview}
                alt="AI cover"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-parchment/5 dark:bg-charcoal/20">
                <Sparkles size={20} className="text-taupe/30 dark:text-parchment/20" />
                <span className="text-[10px] text-taupe/40 dark:text-parchment/30 text-center px-1">
                  {t('cover.loadingCovers')}
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {mode === 'url' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setUrlInput(val);
                  onChange(val);
                }}
                placeholder={t('cover.urlPlaceholder')}
                className="input w-full"
                disabled={disabled}
              />
              {(url || collectionId) && (
                <button
                  type="button"
                  onClick={collectionId ? handleSyncCover : handleRefreshCover}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {syncing ? t('edit.syncingCover') : t('edit.syncCover')}
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'gradient' && (
          <div className="space-y-2">
            <p className="text-[11px] text-taupe/40 dark:text-parchment/30">
              {t('cover.gradientHint', { platform: platform || 'Other' })}
            </p>
          </div>
        )}

        {mode === 'library' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelect}
            />

            {!canUploadCover && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                <Lock size={14} className="text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t('cover.uploadProOnly')}</span>
                <span className="text-xs text-taupe dark:text-parchment/50">{t('cover.upgradeToUpload')}</span>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-taupe dark:text-taupe-light/70 mb-2">{t('cover.myCovers')}</p>
              <div className="max-h-[200px] overflow-y-auto pr-1">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {/* 第一个位置：拖拽上传入口 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canUploadCover) {
                        showToast(t('cover.upgradeToUpload'), 'error');
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={cn(
                      'relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1',
                      dragOver
                        ? 'border-amber-400 bg-amber-400/5'
                        : 'border-parchment/30 dark:border-charcoal/50 bg-parchment/5 dark:bg-charcoal/20 hover:border-parchment/50 dark:hover:border-charcoal/70'
                    )}
                  >
                    {uploading ? (
                      <Loader2 size={20} className="animate-spin text-amber-400" />
                    ) : (
                      <>
                        <ImageIcon size={20} className="text-taupe/30 dark:text-parchment/20" />
                        <span className="text-[10px] text-taupe/40 dark:text-parchment/30 text-center px-1">
                          {t('cover.dragToUpload')}
                        </span>
                      </>
                    )}
                  </button>

                  {libraryCovers.map((cover) => (
                    <button
                      key={cover.id}
                      type="button"
                      onClick={() => {
                        onChange(cover.cosUrl);
                      }}
                      className={cn(
                        'relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all',
                        value === cover.cosUrl
                          ? 'border-amber-400 ring-1 ring-amber-400/30'
                          : 'border-parchment/20 dark:border-charcoal/40 hover:border-parchment/40 dark:hover:border-charcoal/60'
                      )}
                    >
                      <img src={cover.cosUrl} alt="cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-taupe/40 dark:text-parchment/30">
              {t('cover.uploadShareHint')}
            </p>
          </div>
        )}

        {mode === 'ai' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleShuffleAi}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <Shuffle size={14} />
                {t('cover.randomCover')}
              </button>
              <button
                type="button"
                onClick={() => refetchSystemCovers()}
                className="text-xs text-amber-500 hover:text-amber-600 transition-colors"
              >
                {t('cover.refreshLibrary')}
              </button>
            </div>

            {systemCovers.length > 0 ? (
              <div className="max-h-[200px] overflow-y-auto pr-1">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {systemCovers.map((cover) => (
                    <button
                      key={cover.id}
                      type="button"
                      onClick={() => {
                        setRandomAiCover(cover);
                        onChange(cover.cosUrl);
                      }}
                      className={cn(
                        'relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all',
                        (randomAiCover?.cosUrl === cover.cosUrl || value === cover.cosUrl)
                          ? 'border-amber-400 ring-1 ring-amber-400/30'
                          : 'border-parchment/20 dark:border-charcoal/40 hover:border-parchment/40 dark:hover:border-charcoal/60'
                      )}
                    >
                      <img src={cover.cosUrl} alt="cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border border-parchment/20 dark:border-charcoal/40 bg-parchment/5 dark:bg-charcoal/20 text-center">
                <Library size={32} className="text-taupe/30 dark:text-parchment/20" />
                <p className="text-sm text-charcoal/60 dark:text-parchment/50">{t('cover.noCoversInLibrary')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
