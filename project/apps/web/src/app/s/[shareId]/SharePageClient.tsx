'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExternalLink, Loader2, Lock, Clock, FileText, BookmarkPlus, AlertTriangle, LogIn, Copy, Unlock, Eye } from 'lucide-react';
import StarRating from '@/components/StarRating';
import { getToken } from '@/lib/auth';
import { api, recordShareView, type ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { generateDefaultCover } from '@/lib/platforms';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useToast } from '@/components/Toast';
import LazyImage from '@/components/LazyImage';

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
  rating?: number | null;
  url?: string;
}

interface ShareData {
  id: string;
  title: string;
  description?: string;
  hasPassword?: boolean;
  needsPassword?: boolean;
  password?: string;
  isOwner?: boolean;
  isExpired?: boolean;
  expiresAt?: string;
  shareUrl?: string;
  viewCount?: number;
  collections?: Collection[];
}

interface SharePageClientProps {
  initialData?: ShareData;
}



export default function SharePageClient({ initialData }: SharePageClientProps) {
  const params = useParams();
  const shareId = params.shareId as string;
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();

  const [data, setData] = useState<ShareData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 
  const [checking, setChecking] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [checkResult, setCheckResult] = useState<Record<string, any> | null>(null);
  const [alreadyImported, setAlreadyImported] = useState(false);

  //  /me 
  const [isOwner, setIsOwner] = useState(false);
  const [userStateLoaded, setUserStateLoaded] = useState(false);

  // 
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState(''); // 
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // 
  const isLocked = data?.needsPassword && !isOwner && !alreadyImported && !isPasswordVerified;

  useEffect(() => {
    // 
    if (initialData) return;
    fetchShareData();
  }, [shareId]);

  // isOwner / alreadyRetrieved
  useEffect(() => {
    if (!getToken() || !data?.id) return;
    fetchUserState();
  }, [data?.id]);

  const fetchUserState = async () => {
    try {
      const response = await api.get(`/s/${shareId}/me`);
      const result = response.data;
      setIsOwner(result.isOwner);
      setAlreadyImported(result.alreadyRetrieved);
      // 
      if (result.isOwner) {
        setData((prev) =>
          prev
            ? { ...prev, needsPassword: false, password: result.password || prev.password }
            : null
        );
      }
      setUserStateLoaded(true);
    } catch {
      setUserStateLoaded(true);
    }
  };

  const fetchShareData = async () => {
    try {
      const response = await api.get(`/s/${shareId}`);
      const result = response.data;
      //  API  HTML 
      if (!result || typeof result !== 'object' || !result.id) {
        setError(t('share.view.shareNotFound'));
        return;
      }
      setData(result);
      // 
      if (getToken()) {
        recordShareView(shareId).catch(() => {});
        // 
        fetchUserState();
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.response?.status === 410) {
        setError(t('share.view.shareExpired'));
      } else {
        setError(apiErr.response?.data?.message || apiErr.response?.data?.error || t('share.view.shareNotFound'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 
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

  const handleSave = async () => {
    const token = getToken();
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    // 
    if (data?.hasPassword && !isOwner && isPasswordVerified) {
      doCheckAndConfirm(verifiedPassword);
      return;
    }

    // 
    if (data?.hasPassword && !data?.isOwner) {
      setShowPasswordModal(true);
      return;
    }

    doCheckAndConfirm();
  };

  // 
  const doCheckAndConfirm = async (password?: string) => {
    setChecking(true);
    try {
      const params = new URLSearchParams();
      if (password) params.set('password', password);
      const response = await api.get(`/s/check/${shareId}?${params}`);
      const result = response.data;

      if (!result.canImport) {
        // 
        if (result.reason === 'already_imported') {
          setAlreadyImported(true);
          showToast(t('share.view.importAlreadyImported'), 'info');
        } else if (result.reason === 'list_limit_reached') {
          showAlert(t('share.view.importListLimitReached'), 'error');
        } else if (result.reason === 'collection_limit_reached') {
          showAlert(t('share.view.importCollectionLimitReached'), 'error');
        } else if (result.needPassword) {
          setShowPasswordModal(true);
        }
        return;
      }

      // 
      setCheckResult(result);
      setShowImportConfirm(true);
    } catch {
      showAlert(t('share.view.checkFailed'), 'error');
    } finally {
      setChecking(false);
    }
  };

  // 
  const doSave = async (password?: string) => {
    setSaving(true);
    setPasswordError('');
    setShowImportConfirm(false);
    try {
      const body: Record<string, string> = {};
      if (password) {
        body.password = password;
      }
      const response = await api.post(`/s/${shareId}/save`, body);
      const result = response.data;

      // 
      if (result.alreadyImported) {
        showToast(t('share.view.importAlreadyImported'), 'info');
        setSaving(false);
        return;
      }

      setSaveSuccess(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      const { savedCount, skippedCount, listName } = result.data || {};
      const saveMsg = savedCount > 0
        ? t('share.view.saveResultSaved', { count: savedCount })
        : skippedCount > 0
          ? t('share.view.saveResultSkipped', { count: skippedCount })
          : t('share.view.saveResultEmpty');
      showToast(saveMsg + (listName ? `\n${t('share.view.savedToGroup', { name: listName })}` : ''), 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      const apiErr = error as ApiError;
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
    doCheckAndConfirm(passwordInput);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center bg-paper dark:bg-ink">
        <Loader2 className="animate-spin text-chest-500 dark:text-amber-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (<div className="min-h-screen flex items-center justify-center bg-paper dark:bg-ink">
        <div className="text-center">
          <AlertTriangle size={48} className="text-taupe/30 dark:text-parchment/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-charcoal dark:text-parchment mb-2">{t('common.error')}</h1>
          <p className="text-taupe dark:text-parchment/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (<div className="min-h-screen bg-paper dark:bg-ink">
      {/* Header */}
      <header className="bg-paper dark:bg-charcoal/80 border-b border-parchment/30 dark:border-charcoal/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-charcoal dark:text-parchment">
            {isLocked ? t('share.view.contentLocked') : data.title}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-taupe dark:text-parchment/60">
            <span>{t('share.itemCount', { count: (data.collections || []).length })}</span>
            {typeof data.viewCount === 'number' && (
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {t('share.viewCount', { count: data.viewCount })}
              </span>
            )}
            {data.hasPassword && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Lock size={12} />
                {isOwner ? (
                  <>
                    {t('share.password')}{data.password || ''}
                    {data.password && (
                      <button
                        onClick={() => navigator.clipboard.writeText(data.password!).then(() => showToast(t('share.passwordCopied'), 'success')).catch(() => showToast(t('share.copyFailed'), 'error'))}
                        className="text-chest-500 dark:text-amber-400 hover:text-chest-600 flex items-center gap-0.5 ml-1"
                      >
                        <Copy size={12} /> {t('share.copy')}
                      </button>
                    )}
                  </>
                ) : (
                  t('share.view.passwordSet')
                )}
              </span>
            )}
            {data.expiresAt && (
              <span className="flex items-center gap-1 text-taupe/60 dark:text-parchment/40">
                <Clock size={12} /> {t('share.view.validUntil', { date: formatDate(data.expiresAt) })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/*  */}
      {isLocked && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-paper dark:bg-charcoal/80 rounded-xl p-6 border border-chest-200 dark:border-chest-800">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-chest-500/5 dark:bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock size={22} className="text-chest-500 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{t('share.view.passwordRequired')}</h3>
              <p className="text-taupe dark:text-parchment/60 text-sm mt-1">{t('share.view.passwordRequiredDesc')}</p>
            </div>
            <input
              type="password"
              value={verifyInput}
              onChange={(e) => { setVerifyInput(e.target.value); setVerifyError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
              placeholder={t('share.view.enterPassword')}
              className="w-full px-4 py-3 border border-parchment/40 dark:border-charcoal/40 rounded-lg focus:outline-none focus:border-chest-500 text-center text-lg bg-paper dark:bg-charcoal/50 dark:text-parchment"
              autoFocus
            />
            {verifyError && (
              <p className="text-rust text-sm mt-2 text-center">{verifyError}</p>
            )}
            <button
              onClick={handleVerifyPassword}
              disabled={!verifyInput.trim() || verifying}
              className="w-full mt-3 py-3 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-taupe/20 dark:disabled:bg-charcoal/40 transition-colors flex items-center justify-center gap-2"
            >
              {verifying ? <Loader2 size={18} className="animate-spin" /> : <Unlock size={18} />}
              {t('share.view.verifyPassword')}
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      {!isLocked && data.description && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="card p-4 flex items-start gap-3">
            <FileText size={18} className="text-taupe/60 dark:text-parchment/40 mt-0.5 flex-shrink-0" />
            <p className="text-charcoal/70 dark:text-parchment/70 text-sm whitespace-pre-wrap">{data.description}</p>
          </div>
        </div>
      )}

      {/* Save Button (non-owner users, unlocked only) */}
      {!isOwner && !isLocked && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          {getToken() ? (
            <button
              onClick={handleSave}
              disabled={saving || saveSuccess || checking || alreadyImported}
              className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                saveSuccess
                  ? 'bg-sage text-white'
                  : alreadyImported
                    ? 'bg-taupe/20 text-taupe dark:bg-charcoal/40 dark:text-parchment/40'
                    : 'bg-chest-500 text-white hover:bg-chest-600'
              } disabled:opacity-80`}
            >
              {saving || checking ? (
                <Loader2 size={18} className="animate-spin" />
              ) : saveSuccess ? (
                <>
                  <BookmarkPlus size={18} />
                  {t('share.view.savedToMyCollections')}
                </>
              ) : alreadyImported ? (
                <>
                  <BookmarkPlus size={18} />
                  {t('share.view.importAlreadyImported')}
                </>
              ) : (
                <>
                  <BookmarkPlus size={18} />
                  {t('share.view.saveToMyCollections')}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors bg-chest-500 text-white hover:bg-chest-600"
            >
              <LogIn size={18} />
              {t('share.view.loginToSave')}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.collections || []).map((item) => (
            <a
              key={item.id}
              href={isLocked ? undefined : item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group bg-white dark:bg-chest-800/50 rounded-xl overflow-hidden border border-chest-100/50 dark:border-chest-700/30 transition-all ${isLocked ? 'pointer-events-none cursor-default' : 'hover:border-amber-400/30 dark:hover:border-amber-400/20 hover:-translate-y-0.5'}`}
              onClick={isLocked ? (e) => e.preventDefault() : undefined}
            >
              <div className={`relative ${isLocked ? 'opacity-30 blur-sm select-none' : ''}`}>
                {/* Cover */}
                <LazyImage
                  src={item.coverImage || generateDefaultCover(item.platform, item.title)}
                  alt={item.title}
                  title={item.title}
                  platform={item.platform}
                  collectionId={item.id}
                  containerClassName="aspect-video bg-parchment/20 dark:bg-chest-700/40"
                  className="group-hover:scale-105 transition-transform duration-300"
                />

                {/* Platform Badge */}
                <div className="absolute top-2 left-2">
                  <PlatformBadge platform={item.platform} size="sm" />
                </div>
              </div>

                {/* Info */}
                <div className="p-4">
                  {item.rating != null && (
                    <div className="mb-1.5">
                      <StarRating value={item.rating} size={14} readonly showValue ariaLabel={t('collection.filter.rating')} />
                    </div>
                  )}
                  <h3 className="font-medium text-charcoal dark:text-parchment line-clamp-2 group-hover:text-chest-500 dark:group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h3>

                  {!isLocked && (
                    <div className="flex items-center gap-1 mt-3 text-chest-500 dark:text-amber-400 text-sm">
                      <ExternalLink size={14} />
                      <span>{t('share.view.clickToOpen')}</span>
                    </div>
                  )}
                </div>
            </a>
          ))}
        </div>

        {(data.collections || []).length === 0 && (
          <div className="text-center py-12">
            <p className="text-taupe/60 dark:text-parchment/40">{t('share.view.noContent')}</p>
          </div>
        )}
      </main>

      {/* Footer */}
      {!isLocked && (
        <footer className="border-t border-chest-100 dark:border-chest-700/50 mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center">
            <p className="text-sm text-taupe/60 dark:text-parchment/40">
              {t('share.view.generatedBy')}
            </p>
          </div>
        </footer>
      )}

      {/* Import Confirm Modal */}
      {showImportConfirm && checkResult && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={() => { setShowImportConfirm(false); setCheckResult(null); }}>
          <div className="bg-white dark:bg-chest-800/50 rounded-xl p-6 max-w-md w-full mx-4 border border-chest-100 dark:border-chest-700/50" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-chest-500/5 dark:bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookmarkPlus size={22} className="text-chest-500 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{t('share.view.importConfirmTitle')}</h3>
            </div>
            <p className="text-charcoal/70 dark:text-parchment/70 text-sm text-center mb-6">
              {t('share.view.importConfirmDesc', {
                total: checkResult.totalCount,
                duplicate: checkResult.duplicateCount,
                new: checkResult.newCount,
              })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowImportConfirm(false); setCheckResult(null); }}
                className="flex-1 py-2.5 border border-chest-200 dark:border-chest-600/40 text-charcoal/70 dark:text-parchment/70 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/40 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => doSave(data?.hasPassword && !data?.isOwner && isPasswordVerified ? verifiedPassword : undefined)}
                disabled={saving}
                className="flex-1 py-2.5 bg-chest-500 dark:bg-amber-400 text-white rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 disabled:bg-taupe/20 dark:disabled:bg-charcoal/40 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {t('share.view.importBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal (for save, kept as fallback) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordInput(''); }}>
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
  );
}
