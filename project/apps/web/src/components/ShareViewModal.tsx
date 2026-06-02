'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2, Lock, Clock, FileText, Calendar, Copy, BookmarkPlus, Unlock, Eye, FolderOpen } from 'lucide-react';
import StarRating from '@/components/StarRating';
import { api, recordShareView, type ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { generateDefaultCover } from '@/lib/platforms';
import { PlatformBadge } from './PlatformBadge';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import LazyImage from '@/components/LazyImage';

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
  rating?: number | null;
  url?: string;
  tags: { nameCn?: string; nameEn?: string }[];
  lists: { id: string; name: string }[];
}

interface ShareData {
  id: string;
  title: string;
  description?: string;
  hasPassword?: boolean;
  needsPassword?: boolean;
  password?: string;
  isOwner?: boolean;
  alreadyRetrieved?: boolean;
  expiresAt?: string;
  createdAt: string;
  viewCount?: number;
  collections?: Collection[];
}

export default function ShareViewModal({ shareId, onClose, showSaveButton }: { shareId: string; onClose: () => void; showSaveButton?: boolean }) {
  const { t, locale } = useI18n();
  const { showToast, showAlert } = useToast();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 密码遮罩模式
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState(''); // 已验证的密码，保存时传给后端
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const isLocked = data?.hasPassword && !data?.isOwner && !isPasswordVerified && !data?.alreadyRetrieved;

  useEffect(() => {
    api.get(`/s/${shareId}`)
      .then(res => {
        const result = res.data;
        setData(result);
        setLoading(false);
        // 登录用户浏览后自动上报（静默处理失败）
        if (getToken()) {
          recordShareView(shareId).catch(() => {});
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || err.response?.data?.error || t('share.view.shareNotFound'));
        setLoading(false);
      });
  }, [shareId]);

  const formatDate = (dateStr: string) => {
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    return new Date(dateStr).toLocaleString(dateLocale, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // 密码验证（解锁查看）
  const handleVerifyPassword = async () => {
    if (!verifyInput.trim()) {
      setVerifyError(t('share.view.pleaseEnterPassword'));
      return;
    }
    setVerifying(true);
    setVerifyError('');
    try {
      const response = await api.post(`/s/${shareId}/verify`, { password: verifyInput.trim() });
      const verifiedData = response.data;
      setData({
        ...data!,
        ...verifiedData,
        needsPassword: false,
      });
      setIsPasswordVerified(true);
      setVerifiedPassword(verifyInput.trim());
      setVerifyInput('');
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const errMsg = apiErr.response?.data?.message || apiErr.response?.data?.error || t('share.view.passwordWrong');
      setVerifyError(errMsg);
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = () => {
    const token = getToken();
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    // 已验证密码后保存，直接传已验证的密码
    if (data?.hasPassword && !data?.isOwner && isPasswordVerified) {
      doSave(verifiedPassword);
      return;
    }
    if (data?.hasPassword && !data?.isOwner) {
      setShowPasswordModal(true);
      return;
    }
    doSave();
  };

  const doSave = async (password?: string) => {
    setSaving(true);
    setPasswordError('');
    try {
      const body: Record<string, string> = {};
      if (password) body.password = password;
      const response = await api.post(`/s/${shareId}/save`, body);
      const result = response.data;
      setSaveSuccess(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      // Use i18n for save result instead of backend Chinese message
      const { savedCount, skippedCount, listName } = result.data || {};
      const saveMsg = savedCount > 0
        ? t('share.view.saveResultSaved', { count: savedCount })
        : skippedCount > 0
          ? t('share.view.saveResultSkipped', { count: skippedCount })
          : t('share.view.saveResultEmpty');
      showToast(saveMsg + (listName ? `\n${t('share.view.savedToGroup', { name: listName })}` : ''), 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      let errorMsg = t('share.view.saveFailed');
      if (apiErr.response?.status === 403 && apiErr.response?.data?.needPassword) {
        errorMsg = t('share.view.needPasswordDesc');
      } else if (apiErr.response?.status === 401) {
        errorMsg = t('share.view.passwordWrong');
      } else if (apiErr.response?.data?.message || apiErr.response?.data?.error) {
        errorMsg = (apiErr.response?.data?.message || apiErr.response?.data?.error || 'Unknown error') as string;
      }
      if (showPasswordModal && (apiErr.response?.status === 401 || apiErr.response?.status === 403)) {
        setPasswordError(errorMsg);
      } else {
        showAlert(errorMsg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (!passwordInput) {
      setPasswordError(t('share.view.pleaseEnterPassword'));
      return;
    }
    doSave(passwordInput);
  };

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-chest-800/50 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-chest-100 dark:border-chest-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-chest-100 dark:border-chest-700/50">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin text-chest-500 dark:text-amber-400" size={18} />
              <span className="text-taupe dark:text-parchment/60">{t('share.view.loading')}</span>
            </div>
          ) : error ? (
            <span className="text-rust">{error}</span>
          ) : (
            <div>
              <h3 className="font-semibold text-charcoal dark:text-parchment">
                {isLocked ? t('share.view.contentLocked') : data?.title}
              </h3>
              <p className="text-sm text-taupe dark:text-parchment/60 flex items-center gap-2">
                <span>{(data?.collections || []).length} {t('nav.collections')}</span>
                {typeof data?.viewCount === 'number' && (
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {t('share.viewCount', { count: data.viewCount })}
                  </span>
                )}
              </p>
            </div>
          )}
          <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded">
            <X size={20} className="text-taupe dark:text-parchment/60" />
          </button>
        </div>

        {/* Password Verify Area (locked) */}
        {isLocked && !loading && !error && (
          <div className="px-4 py-4 border-b border-chest-100 dark:border-chest-700/50 bg-chest-500/5 dark:bg-amber-400/10">
            <div className="text-center mb-3">
              <div className="w-10 h-10 bg-chest-100 dark:bg-chest-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock size={18} className="text-chest-500 dark:text-amber-400" />
              </div>
              <h4 className="text-sm font-semibold text-charcoal dark:text-parchment">{t('share.view.passwordRequired')}</h4>
              <p className="text-taupe dark:text-parchment/60 text-xs mt-1">{t('share.view.passwordRequiredDesc')}</p>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={verifyInput}
                onChange={(e) => { setVerifyInput(e.target.value); setVerifyError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                placeholder={t('share.view.enterPassword')}
                className="flex-1 px-3 py-2 border border-parchment/30 dark:border-chest-600/40 rounded-lg focus:outline-none focus:border-chest-500 dark:focus:border-amber-400 text-center bg-white dark:bg-chest-800/50 dark:text-parchment text-sm"
                autoFocus
              />
              <button
                onClick={handleVerifyPassword}
                disabled={!verifyInput.trim() || verifying}
                className="px-4 py-2 bg-chest-500 dark:bg-amber-400 text-white rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 disabled:bg-taupe/20 dark:disabled:bg-charcoal/40 transition-colors flex items-center gap-1.5 text-sm"
              >
                {verifying ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                {t('share.view.verifyPassword')}
              </button>
            </div>
            {verifyError && (
              <p className="text-rust text-xs mt-1.5 text-center">{verifyError}</p>
            )}
          </div>
        )}

        {/* Share Details (unlocked or no password) */}
        {!loading && !error && data && !isLocked && (
          <div className="px-4 py-3 border-b border-chest-100 dark:border-chest-700/50 bg-parchment/10 dark:bg-chest-800/30 space-y-1.5">
            {data.description && (
              <div className="flex items-start gap-2 text-sm text-charcoal/70 dark:text-parchment/70">
                <FileText size={14} className="text-taupe/60 dark:text-parchment/40 mt-0.5 flex-shrink-0" />
                <span>{data.description}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-taupe dark:text-parchment/60">
              {data.hasPassword && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Lock size={12} />
                  {data.isOwner ? (
                    <>
                      {t('share.password')} {data.password || '••••'}
                      {data.password && (
                        <button
                          onClick={() => navigator.clipboard.writeText(data.password!).then(() => showToast(t('share.passwordCopied'), 'success')).catch(() => showToast(t('share.copyFailed'), 'error'))}
                          className="text-chest-500 dark:text-amber-400 hover:text-chest-600 dark:hover:text-amber-500 flex items-center gap-0.5 ml-1"
                        >
                          <Copy size={10} /> {t('share.copy')}
                        </button>
                      )}
                    </>
                  ) : data.alreadyRetrieved ? (
                    t('share.view.passwordUsed')
                  ) : (
                    t('share.view.passwordSet')
                  )}
                </span>
              )}
              {data.expiresAt && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {t('share.view.validUntil', { date: formatDate(data.expiresAt) })}
                </span>
              )}
              {data.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(data.createdAt)}
                </span>
              )}
            </div>

            {/* Save Button */}
            {showSaveButton && !data.isOwner && (
              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || saveSuccess}
                  className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                    saveSuccess
                      ? 'bg-sage text-white'
                      : 'bg-chest-500 dark:bg-amber-400 text-white hover:bg-chest-600 dark:hover:bg-amber-500'
                  } disabled:opacity-80`}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : saveSuccess ? (
                    <>
                      <BookmarkPlus size={16} />
                      {t('share.view.savedToMyCollections')}
                    </>
                  ) : (
                    <>
                      <BookmarkPlus size={16} />
                      {t('share.view.saveToMyCollections')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-chest-500 dark:text-amber-400" size={24} />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-taupe/60 dark:text-parchment/40">{error}</div>
          ) : (
            <div className="space-y-2">
              {(data?.collections || []).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 bg-parchment/10 dark:bg-chest-700/40 rounded-lg transition-colors ${isLocked ? '' : 'hover:bg-parchment/20 dark:hover:bg-chest-700/50'}`}
                >
                  <LazyImage
                    src={item.coverImage || generateDefaultCover(item.platform, item.title)}
                    alt=""
                    title={item.title}
                    platform={item.platform}
                    collectionId={item.id}
                    containerClassName={`w-16 h-12 bg-chest-100 dark:bg-chest-700 rounded flex-shrink-0 ${isLocked ? 'opacity-30 blur-sm select-none' : ''}`}
                  />
                  <div className={`flex-1 min-w-0 ${isLocked ? 'opacity-30 blur-sm select-none' : ''}`}>
                    <p className="font-medium text-charcoal dark:text-parchment text-sm line-clamp-2">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <PlatformBadge platform={item.platform} size="sm" />
                      {item.rating != null && (
                        <StarRating value={item.rating} size={12} readonly ariaLabel={t('collection.filter.rating')} />
                      )}
                      {/* 分组 */}
                      {item.lists?.slice(0, 2).map(list => (
                        <span key={list.id} className="px-1.5 py-0.5 text-xs bg-parchment/20 dark:bg-chest-700/40 text-taupe dark:text-parchment/60 rounded flex items-center gap-0.5">
                          <FolderOpen size={10} />
                          {list.name === '__DEFAULT_LIST__' || list.name === '我的收藏'
                            ? t('group.defaultName')
                            : list.name}
                        </span>
                      ))}
                      {item.lists && item.lists.length > 2 && (
                        <span className="text-xs text-taupe/70">+{item.lists.length - 2}</span>
                      )}
                      {/* 标签 */}
                      {item.tags?.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs text-taupe/70">
                          #{locale === 'zh' ? (tag.nameCn || tag.nameEn) : (tag.nameEn || tag.nameCn)}
                        </span>
                      ))}
                      {item.tags && item.tags.length > 3 && (
                        <span className="text-xs text-taupe/70">+{item.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                  {!isLocked && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 text-taupe/60 hover:text-chest-500 dark:hover:text-amber-400 rounded flex-shrink-0"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password Modal (for save, kept as fallback) */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-[60]" onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordInput(''); }}>
            <div className="bg-white dark:bg-chest-800/50 rounded-xl p-6 max-w-md w-full mx-4 border border-chest-100 dark:border-chest-700/50" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-chest-500/5 dark:bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock size={22} className="text-chest-500 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{t('share.view.needPassword')}</h3>
                <p className="text-taupe dark:text-parchment/60 text-sm mt-1">{t('share.view.needPasswordDesc')}</p>
              </div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder={t('share.view.enterPassword')}
                className="w-full px-4 py-3 border border-parchment/30 dark:border-chest-600/40 rounded-lg focus:outline-none focus:border-chest-500 dark:focus:border-amber-400 text-center text-lg bg-white dark:bg-chest-800/50 dark:text-parchment"
                autoFocus
              />
              {passwordError && (
                <p className="text-rust text-sm mt-2 text-center">{passwordError}</p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordInput(''); }}
                  className="flex-1 py-2.5 border border-chest-200 dark:border-chest-600/40 text-charcoal/70 dark:text-parchment/70 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/40 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!passwordInput || saving}
                  className="flex-1 py-2.5 bg-chest-500 dark:bg-amber-400 text-white rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 disabled:bg-taupe/20 dark:disabled:bg-charcoal/40 transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t('share.view.confirmSave')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
