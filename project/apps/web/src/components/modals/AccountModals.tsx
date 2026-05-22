'use client';

import { useState, useRef } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';
import { api, type ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';

// ==================== UsernameModal ====================

export function UsernameModal({ current, onClose, onSuccess }: { current: string; onClose: () => void; onSuccess: (v: string) => void }) {
  const [value, setValue] = useState(current);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const overlayMouseDownRef = useRef(false);

  const checkAvailability = async () => {
    if (!value.trim() || value.trim() === current) { setAvailable(null); return; }
    setChecking(true);
    try {
      const res = await api.get(`/auth/check-username?username=${encodeURIComponent(value.trim())}`);
      setAvailable(res.data.available);
    } catch { setAvailable(false); }
    finally { setChecking(false); }
  };

  const save = async () => {
    if (!value.trim()) return;
    try {
      await api.patch('/auth/profile', { username: value.trim(), nickname: value.trim() });
      onSuccess(value.trim());
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      showAlert(apiErr.response?.data?.message || apiErr.response?.data?.error || t('account.saveFailed'), 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50"
      onMouseDown={(e) => { overlayMouseDownRef.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (overlayMouseDownRef.current && e.target === e.currentTarget) onClose();
        overlayMouseDownRef.current = false;
      }}
    >
      <div className="bg-white dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm border border-chest-500/[0.06] dark:border-parchment/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{t('account.setUsername')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded"><X size={20} className="text-taupe dark:text-taupe-light" /></button>
        </div>
        <input
          type="text" value={value} onChange={e => { setValue(e.target.value); setAvailable(null); }}
          onBlur={checkAvailability} maxLength={20} autoFocus placeholder={t('account.usernamePlaceholder')}
          className="input mb-2"
        />
        {checking && <p className="text-sm text-taupe dark:text-taupe-light/70 mb-2">{t('account.checking')}</p>}
        {available === true && <p className="text-sm text-sage mb-2 flex items-center gap-1"><Check size={14} /> {t('account.usernameAvailable')}</p>}
        {available === false && <p className="text-sm text-rust mb-2 flex items-center gap-1"><AlertTriangle size={14} /> {t('account.usernameTaken')}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-parchment/30 dark:border-chest-700/50 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/30 text-charcoal/80 dark:text-parchment/70">{t('common.cancel')}</button>
          <button onClick={save} disabled={!value.trim() || available === false} className="flex-1 py-2 bg-chest-500 dark:bg-amber-400 text-parchment dark:text-ink rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 disabled:bg-parchment/40 dark:disabled:bg-chest-600/50">{t('common.save')}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== PasswordModal ====================

export function PasswordModal({ hasPassword, onClose, onSuccess, showGoogleWarning }: { hasPassword: boolean; onClose: () => void; onSuccess: () => void; showGoogleWarning?: boolean }) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const overlayMouseDownRef = useRef(false);

  const save = async () => {
    if (!newPwd || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPwd)) { showToast(t('account.passwordMinLength'), 'error'); return; }
    if (newPwd !== confirmPwd) { showToast(t('account.passwordMismatch'), 'error'); return; }
    try {
      if (hasPassword) {
        await api.put('/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd });
      } else {
        await api.post('/auth/set-password', { password: newPwd });
      }
      showToast(hasPassword ? t('account.passwordChangeSuccess') : t('account.passwordSetSuccess'), 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      showAlert(apiErr.response?.data?.message || apiErr.response?.data?.error || t('common.operationFailed'), 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50"
      onMouseDown={(e) => { overlayMouseDownRef.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (overlayMouseDownRef.current && e.target === e.currentTarget) onClose();
        overlayMouseDownRef.current = false;
      }}
    >
      <div className="bg-white dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm border border-chest-500/[0.06] dark:border-parchment/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{hasPassword ? t('account.changePassword') : t('account.setPassword')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded"><X size={20} className="text-taupe dark:text-taupe-light" /></button>
        </div>
        {showGoogleWarning && (
          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{t('login.googleSetPasswordWarning')}</span>
          </div>
        )}
        {hasPassword && (
          <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder={t('account.oldPassword')} className="input mb-3" />
        )}
        <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder={t('account.newPassword')} className="input mb-1" />
        <p className="text-xs text-taupe dark:text-taupe-light/60 mb-3">{t('account.passwordHint')}</p>
        <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder={t('account.confirmNewPassword')} className="input mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-parchment/30 dark:border-chest-700/50 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/30 text-charcoal/80 dark:text-parchment/70">{t('common.cancel')}</button>
          <button onClick={save} disabled={!newPwd || !confirmPwd} className="flex-1 py-2 bg-chest-500 dark:bg-amber-400 text-parchment dark:text-ink rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 disabled:bg-parchment/40 dark:disabled:bg-chest-600/50">{t('common.save')}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== EmailModal ====================

export function EmailModal({ current, onClose, onSuccess }: { current: string; onClose: () => void; onSuccess: (v: string) => void }) {
  const [email, setEmail] = useState(current);
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const overlayMouseDownRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isChanging = !!current && email.trim() !== current;

  const sendCode = async () => {
    const target = email.trim();
    if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      showToast(t('login.invalidEmailFormat'), 'error');
      return;
    }
    try {
      setSending(true);
      const payload = { email: target, type: 'email' };
      const response = await api.post('/auth/send-code', payload);
      const devCode = response.data?.code;
      if (devCode) {
        showToast(t('login.yourCodeIs', { code: devCode }), 'info');
      } else {
        showToast(t('login.codeSent'), 'success');
      }
      setCountdown(60);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { if (countdownTimerRef.current) clearInterval(countdownTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      showAlert(apiErr.response?.data?.message || apiErr.response?.data?.error || t('login.sendCodeFailed'), 'error');
    } finally {
      setSending(false);
    }
  };

  const save = async () => {
    if (!email || !email.includes('@')) { showToast(t('account.pleaseEnterEmailAddr'), 'error'); return; }
    if (isChanging && !code.trim()) { showToast(t('login.enterCode'), 'error'); return; }
    try {
      const payload: Record<string, string> = { email: email.trim() };
      if (isChanging) payload.code = code.trim();
      await api.patch('/auth/profile', payload);
      showToast(t('account.emailBindSuccess'), 'success');
      onSuccess(email.trim());
      onClose();
    } catch (err: unknown) { const apiErr = err as ApiError; showAlert(apiErr.response?.data?.message || apiErr.response?.data?.error || t('account.saveFailed'), 'error'); }
  };

  return (
    <div
      className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50"
      onMouseDown={(e) => { overlayMouseDownRef.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (overlayMouseDownRef.current && e.target === e.currentTarget) onClose();
        overlayMouseDownRef.current = false;
      }}
    >
      <div className="bg-white dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm border border-chest-500/[0.06] dark:border-parchment/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{current ? t('account.changeEmail') : t('account.bindEmail')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded"><X size={20} className="text-taupe dark:text-taupe-light" /></button>
        </div>
        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setCode(''); }} placeholder={t('account.pleaseEnterEmail')} className="input mb-3" autoFocus />
        {isChanging && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={6}
              placeholder={t('login.enterCode')}
              className="input flex-1"
            />
            <button
              onClick={sendCode}
              disabled={countdown > 0 || sending}
              className="px-3 py-2 border border-parchment/30 dark:border-chest-700/50 rounded-lg text-sm text-charcoal/80 dark:text-parchment/70 hover:bg-parchment/10 dark:hover:bg-chest-700/30 disabled:opacity-50 whitespace-nowrap"
            >
              {countdown > 0 ? `${countdown}s` : t('login.getCode')}
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-parchment/30 dark:border-chest-700/50 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/30 text-charcoal/80 dark:text-parchment/70">{t('common.cancel')}</button>
          <button onClick={save} disabled={!email.trim() || (isChanging && !code.trim())} className="flex-1 py-2 bg-chest-500 dark:bg-amber-400 text-parchment dark:text-ink rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 disabled:bg-parchment/40 dark:disabled:bg-chest-600/50">{t('common.save')}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== EmailSetupModal ====================

export function EmailSetupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const overlayMouseDownRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendCode = async () => {
    const target = email.trim();
    if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      showToast(t('login.invalidEmailFormat'), 'error');
      return;
    }
    try {
      setSending(true);
      const payload = { email: target, type: 'email' };
      const response = await api.post('/auth/send-code', payload);
      const devCode = response.data?.code;
      if (devCode) {
        showToast(t('login.yourCodeIs', { code: devCode }), 'info');
      } else {
        showToast(t('login.codeSent'), 'success');
      }
      setCountdown(60);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { if (countdownTimerRef.current) clearInterval(countdownTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      showAlert(apiErr.response?.data?.message || apiErr.response?.data?.error || t('login.sendCodeFailed'), 'error');
    } finally {
      setSending(false);
    }
  };

  const goToPassword = () => {
    if (!email || !email.includes('@')) {
      showToast(t('account.pleaseEnterEmailAddr'), 'error');
      return;
    }
    if (!code.trim()) {
      showToast(t('login.enterCode'), 'error');
      return;
    }
    setStep('password');
  };

  const save = async () => {
    if (!password || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      showToast(t('account.passwordMinLength'), 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast(t('account.passwordMismatch'), 'error');
      return;
    }
    try {
      await api.patch('/auth/profile', { email: email.trim(), code: code.trim(), password });
      showToast(t('account.emailAndPasswordSetSuccess'), 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      showAlert(apiErr.response?.data?.message || apiErr.response?.data?.error || t('account.saveFailed'), 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50"
      onMouseDown={(e) => { overlayMouseDownRef.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (overlayMouseDownRef.current && e.target === e.currentTarget) onClose();
        overlayMouseDownRef.current = false;
      }}
    >
      <div className="bg-white dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm border border-chest-500/[0.06] dark:border-parchment/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-charcoal dark:text-parchment">{t('account.setupEmailAndPassword')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded"><X size={20} className="text-taupe dark:text-taupe-light" /></button>
        </div>
        <p className="text-sm text-taupe dark:text-parchment/60 mb-4">{t('account.setupEmailDesc')}</p>

        {step === 'email' && (
          <>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('account.pleaseEnterEmail')} className="input mb-3" autoFocus />
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={6}
                placeholder={t('login.enterCode')}
                className="input flex-1"
              />
              <button
                onClick={sendCode}
                disabled={countdown > 0 || sending}
                className="px-3 py-2 border border-parchment/30 dark:border-chest-700/50 rounded-lg text-sm text-charcoal/80 dark:text-parchment/70 hover:bg-parchment/10 dark:hover:bg-chest-700/30 disabled:opacity-50 whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : t('login.getCode')}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border border-parchment/30 dark:border-chest-700/50 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/30 text-charcoal/80 dark:text-parchment/70">{t('account.ignoreForNow')}</button>
              <button onClick={goToPassword} disabled={!email.trim() || !code.trim()} className="flex-1 py-2 bg-chest-500 dark:bg-amber-400 text-parchment dark:text-ink rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 disabled:bg-parchment/40 dark:disabled:bg-chest-600/50">{t('common.next')}</button>
            </div>
          </>
        )}

        {step === 'password' && (
          <>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('account.setPassword')} className="input mb-1" autoFocus />
            <p className="text-xs text-taupe dark:text-taupe-light/60 mb-3">{t('account.passwordHint')}</p>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('account.confirmNewPassword')} className="input mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setStep('email')} className="flex-1 py-2 border border-parchment/30 dark:border-chest-700/50 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/30 text-charcoal/80 dark:text-parchment/70">{t('common.back')}</button>
              <button onClick={save} disabled={!password || !confirmPassword} className="flex-1 py-2 bg-chest-500 dark:bg-amber-400 text-parchment dark:text-ink rounded-lg hover:bg-chest-600 dark:hover:bg-amber-500 disabled:bg-parchment/40 dark:disabled:bg-chest-600/50">{t('common.save')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


